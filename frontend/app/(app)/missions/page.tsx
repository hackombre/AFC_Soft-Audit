'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useMission } from '@/lib/mission-context';
import type {
  AnswerOut,
  DocumentItem,
  QuestionDef,
  QuestionnaireNode,
  QuestionnaireStructure,
  GuideFile,
} from '@/lib/types';
import {
  flattenNavigable,
  isQuestionVisible,
  questionDisplayNumber,
  type AnswerMap,
} from '@/lib/questionnaire-utils';
import QuestionnaireTree from '@/components/questionnaire/QuestionnaireTree';
import QuestionField from '@/components/questionnaire/QuestionField';

function ancestorIds(
  nodes: QuestionnaireNode[],
  targetId: string,
  trail: string[] = []
): string[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return trail;

    const found = ancestorIds(
      n.children,
      targetId,
      [...trail, n.id]
    );

    if (found) return found;
  }

  return null;
}

type StepSaveState =
  | 'idle'
  | 'dirty'
  | 'saving'
  | 'saved';

interface CommentState {
  [questionId: string]: string;
}

function cleanLabel(label: string): string {
  return label
    .replace(/\s+[A-Z]-[\w.-]+$/u, '')
    .trim();
}

function formatAnswer(value: unknown): string {
  if (value == null || value === '') {
    return 'Pas de réponse';
  }

  if (Array.isArray(value)) {
    return value.length
      ? value.map((v) => formatAnswer(v)).join(', ')
      : 'Pas de réponse';
  }

  if (typeof value === 'object') {
    const entries = Object.entries(
      value as Record<string, unknown>
    );

    if (!entries.length) {
      return 'Pas de réponse';
    }

    return entries
      .map(([k, v]) => `${k}: ${formatAnswer(v)}`)
      .join(' ; ');
  }

  return String(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function nodeLevelLabel(
  node: QuestionnaireNode,
  path: string[]
): string {
  return `${node.id} ${node.label}`;
}

function isStructuredNode(
  node: QuestionnaireNode
): boolean {
  return (
    node.layout === 'structured' ||
    node.questions.some(
      (q) =>
        q.type === 'label' &&
        (
          /^(?:a\)|b\)|c\)|d\)|e\)|f\))/i.test(
            cleanLabel(q.label)
          ) ||
          Boolean(q.guide_files?.length)
        )
    )
  );
}

function isConclusionQuestion(
  q: QuestionDef
): boolean {
  return (
    q.type === 'textarea' &&
    /conclusion|observation/i.test(
      cleanLabel(q.label)
    )
  );
}

function collectConclusions(
  node: QuestionnaireNode,
  path: string[],
  out: {
    question: QuestionDef;
    node: QuestionnaireNode;
    path: string[];
  }[] = []
) {
  for (const q of node.questions) {
    if (isConclusionQuestion(q)) {
      out.push({
        question: q,
        node,
        path: [...path, node.label],
      });
    }
  }

  node.children.forEach((child) =>
    collectConclusions(
      child,
      [...path, node.label],
      out
    )
  );

  return out;
}

/* =========================================================
   RAPPORT
========================================================= */

function countReportData(
  nodes: QuestionnaireNode[],
  answers: AnswerMap
) {
  let elements = 0;
  let questions = 0;
  let answered = 0;

  function walk(list: QuestionnaireNode[]) {
    list.forEach((node) => {
      elements += 1;

      node.questions.forEach((q) => {
        if (q.type === 'label') {
          return;
        }

        if (!isQuestionVisible(q, answers)) {
          return;
        }

        questions += 1;

        const value = answers[q.id];

        const hasValue =
          value !== undefined &&
          value !== null &&
          value !== '' &&
          !(
            Array.isArray(value) &&
            value.length === 0
          );

        if (hasValue) {
          answered += 1;
        }
      });

      if (node.children?.length) {
        walk(node.children);
      }
    });
  }

  walk(nodes);

  return {
    elements,
    questions,
    answered,
  };
}

function hasAnswerValue(value: unknown): boolean {
  return (
    value !== undefined &&
    value !== null &&
    value !== '' &&
    !(
      Array.isArray(value) &&
      value.length === 0
    )
  );
}

export default function MissionsWorkspacePage() {
  const {
    activeMission,
    entities,
    loading: missionLoading,
  } = useMission();

  const { currentUser } = useAuth();
  const router = useRouter();

  const [structure, setStructure] =
    useState<QuestionnaireStructure | null>(null);

  const [answers, setAnswers] =
    useState<AnswerMap>({});

  const [comments, setComments] =
    useState<CommentState>({});

  const [documents, setDocuments] =
    useState<DocumentItem[]>([]);

  const [activeId, setActiveId] =
    useState<string>('');

  const [expanded, setExpanded] =
    useState<Set<string>>(new Set());

  const [loading, setLoading] =
    useState(true);

  const [uploadingFor, setUploadingFor] =
    useState<string | null>(null);

  const [dirtyQuestions, setDirtyQuestions] =
    useState<Set<string>>(new Set());

  const [saveState, setSaveState] =
    useState<StepSaveState>('idle');

  /* =======================================================
     RAPPORT
  ======================================================= */

  const [showReport, setShowReport] =
    useState(false);

  const [questionToFocus, setQuestionToFocus] =
    useState<string | null>(null);

  useEffect(() => {
    api
      .getStructure()
      .then((s) => {
        const struct =
          s as QuestionnaireStructure;

        setStructure(struct);

        const flat =
          flattenNavigable(
            struct.sections
          );

        if (flat.length > 0) {
          setActiveId(
            flat[0].node.id
          );

          setExpanded(
            new Set(
              ancestorIds(
                struct.sections,
                flat[0].node.id
              ) ?? []
            )
          );
        }
      })
      .catch((error) => {
        console.error(
          '[AFCsoft] Erreur chargement questionnaire :',
          error
        );
      });
  }, []);

  const loadMissionData = useCallback(() => {
    if (!activeMission) {
      setAnswers({});
      setComments({});
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    Promise.all([
      api.getAnswers(activeMission.id),
      api.listDocuments(activeMission.id),
    ])
      .then(([rows, docs]) => {
        const amap: AnswerMap = {};
        const cmap: CommentState = {};

        (rows as AnswerOut[]).forEach((r) => {
          amap[r.question_id] = r.value;

          if (r.comment) {
            cmap[r.question_id] =
              r.comment;
          }
        });

        const entity = entities.find(
          (e) =>
            e.id ===
            activeMission.entity_id
        );

        const toAutoSave: [
          string,
          string
        ][] = [];

        if (
          entity?.raison_sociale &&
          !amap['A-1-1']
        ) {
          amap['A-1-1'] =
            entity.raison_sociale;

          toAutoSave.push([
            'A-1-1',
            entity.raison_sociale,
          ]);
        }

        if (
          entity?.forme_juridique &&
          !amap['A-1-2']
        ) {
          amap['A-1-2'] =
            entity.forme_juridique;

          toAutoSave.push([
            'A-1-2',
            entity.forme_juridique,
          ]);
        }

        if (
          entity?.rccm &&
          !amap['A-1-8']
        ) {
          amap['A-1-8'] =
            entity.rccm;

          toAutoSave.push([
            'A-1-8',
            entity.rccm,
          ]);
        }

        setAnswers(amap);
        setComments(cmap);
        setDocuments(
          docs as DocumentItem[]
        );
        setDirtyQuestions(
          new Set()
        );
        setSaveState('idle');
        setLoading(false);

        toAutoSave.forEach(
          ([qid, value]) => {
            api
              .saveAnswer(
                activeMission.id,
                qid,
                value,
                cmap[qid] ?? null
              )
              .catch(() => {});
          }
        );
      })
      .catch((error) => {
        console.error(
          '[AFCsoft] Erreur chargement données mission :',
          error
        );

        setLoading(false);
      });
  }, [activeMission, entities]);

  useEffect(() => {
    loadMissionData();
  }, [loadMissionData]);

  const flat = useMemo(
    () =>
      structure
        ? flattenNavigable(
            structure.sections
          )
        : [],
    [structure]
  );

  const activeIndex = flat.findIndex(
    (f) => f.node.id === activeId
  );

  const current =
    activeIndex >= 0
      ? flat[activeIndex]
      : null;

  const prevNode =
    activeIndex > 0
      ? flat[activeIndex - 1]
      : null;

  const nextNode =
    activeIndex >= 0 &&
    activeIndex < flat.length - 1
      ? flat[activeIndex + 1]
      : null;

  const docsByQuestion = useMemo(() => {
    const map: Record<
      string,
      DocumentItem[]
    > = {};

    documents.forEach((d) => {
      if (d.question_id) {
        (
          map[d.question_id] ??=
            []
        ).push(d);
      }
    });

    return map;
  }, [documents]);

  const READ_ONLY_FROM_ENTITY =
    new Set([
      'A-1-1',
      'A-1-2',
      'A-1-8',
    ]);

  function handleAnswerChange(
    questionId: string,
    value: unknown
  ) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));

    setDirtyQuestions((prev) => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });

    setSaveState('dirty');
  }

  function handleCommentChange(
    questionId: string,
    comment: string
  ) {
    setComments((prev) => ({
      ...prev,
      [questionId]: comment,
    }));

    setDirtyQuestions((prev) => {
      const next = new Set(prev);
      next.add(questionId);
      return next;
    });

    setSaveState('dirty');
  }

  const saveDirtyAnswers =
    useCallback(
      async (): Promise<boolean> => {
        if (
          !activeMission ||
          dirtyQuestions.size === 0
        ) {
          return true;
        }

        const ids =
          Array.from(dirtyQuestions);

        setSaveState('saving');

        try {
          await Promise.all(
            ids.map((id) =>
              api.saveAnswer(
                activeMission.id,
                id,
                answers[id],
                comments[id] || null
              )
            )
          );

          setDirtyQuestions(
            (prev) => {
              const next =
                new Set(prev);

              ids.forEach((id) =>
                next.delete(id)
              );

              return next;
            }
          );

          setSaveState('saved');

          return true;
        } catch {
          setSaveState('dirty');
          return false;
        }
      },
      [
        activeMission,
        dirtyQuestions,
        answers,
        comments,
      ]
    );

  async function selectNode(id: string) {
    if (
      id !== activeId &&
      dirtyQuestions.size > 0
    ) {
      const saved =
        await saveDirtyAnswers();

      if (!saved) return;
    }

    setShowReport(false);
    
    setQuestionToFocus(null);

    setActiveId(id);

    if (structure) {
      setExpanded(
        (prev) =>
          new Set([
            ...prev,
            ...(ancestorIds(
              structure.sections,
              id
            ) ?? []),
          ])
      );
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  async function handleAttach(
    questionId: string,
    nodeId: string,
    files: FileList | null
  ) {
    if (
      !files ||
      files.length === 0 ||
      !activeMission
    ) {
      return;
    }

    setUploadingFor(questionId);

    try {
      for (const file of Array.from(files)) {
        let q: QuestionDef | undefined;

        if (structure) {
          const findQuestion = (
            nodes: QuestionnaireNode[]
          ): QuestionDef | undefined => {
            for (const node of nodes) {
              const found =
                node.questions.find(
                  (item) =>
                    item.id === questionId
                );

              if (found) {
                return found;
              }

              const nested =
                findQuestion(node.children);

              if (nested) {
                return nested;
              }
            }

            return undefined;
          };

          q = findQuestion(
            structure.sections
          );
        }

        await api.uploadDocument(
          activeMission.id,
          nodeId,
          file,
          {
            category:
              q?.document_category ??
              'recus',
            questionId,
          }
        );
      }

      setDocuments(
        (await api.listDocuments(
          activeMission.id
        )) as DocumentItem[]
      );
    } finally {
      setUploadingFor(null);
    }
  }

  async function handleRemoveAttachment(
    documentId: string
  ) {
    if (!activeMission) return;

    await api.deleteDocument(
      documentId
    );

    setDocuments(
      (await api.listDocuments(
        activeMission.id
      )) as DocumentItem[]
    );
  }

  async function handleGuideDownload(
    guide: GuideFile
  ) {
    try {
      let templateId =
        guide.id?.trim();

      if (!templateId) {
        const downloadUrl =
          guide.download_url ||
          guide.url ||
          '';

        const parts =
          downloadUrl
            .split('/')
            .filter(Boolean);

        const downloadIndex =
          parts.lastIndexOf(
            'download'
          );

        if (
          downloadIndex > 0
        ) {
          templateId =
            parts[
              downloadIndex - 1
            ];
        }
      }

      if (!templateId) {
        throw new Error(
          'Identifiant du modèle introuvable.'
        );
      }

      console.log(
        '[AFCsoft] Téléchargement modèle :',
        {
          templateId,
          filename: guide.label,
        }
      );

      const blob =
        await api.downloadGuideTemplate(
          templateId
        );

      if (
        !blob ||
        blob.size === 0
      ) {
        throw new Error(
          'Le fichier téléchargé est vide.'
        );
      }

      const objectUrl =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          'a'
        );

      link.href = objectUrl;
      link.download =
        guide.label ||
        'modele-guide';

      link.style.display =
        'none';

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.setTimeout(
        () => {
          window.URL.revokeObjectURL(
            objectUrl
          );
        },
        1000
      );
    } catch (error) {
      console.error(
        '[AFCsoft] Erreur téléchargement modèle :',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Impossible de télécharger le modèle.';

      window.alert(
        `Impossible de télécharger le modèle.\n\n${message}`
      );
    }
  }

  const visibleQuestions =
    current
      ? current.node.questions.filter(
          (q) =>
            isQuestionVisible(
              q,
              answers
            )
        )
      : [];

  const stepHasUnsaved =
    current
      ? current.node.questions.some(
          (q) =>
            dirtyQuestions.has(
              q.id
            )
        )
      : false;

  const isStructuredStep =
    current
      ? isStructuredNode(
          current.node
        )
      : false;

  /* =======================================================
     RAPPORT : STATISTIQUES
  ======================================================= */

  const reportStats = useMemo(() => {
    if (!structure) {
      return {
        elements: 0,
        questions: 0,
        answered: 0,
      };
    }

    return countReportData(
      structure.sections,
      answers
    );
  }, [structure, answers]);

  const reportUnanswered =
    Math.max(
      0,
      reportStats.questions -
        reportStats.answered
    );

  /* =======================================================
     RAPPORT : NUMÉROTATION
  ======================================================= */

  function getReportQuestionNumber(
    nodeId: string,
    questionId: string,
    nodeQuestions: QuestionDef[]
  ): number | null {
    if (!structure) {
      return null;
    }

    const number =
      questionDisplayNumber(
        structure.sections,
        nodeId,
        questionId,
        nodeQuestions,
        answers
      );

    if (
      typeof number !== 'number' ||
      number <= 0
    ) {
      return null;
    }

    return number;
  }

  /* =======================================================
     RAPPORT : OUVRIR UNE QUESTION
  ======================================================= */

  const editQuestionFromReport =
    useCallback(
      async (
        nodeId: string,
        questionId: string
      ) => {
        const saved =
          await saveDirtyAnswers();

        if (!saved) {
          return;
        }

        setShowReport(false);
        
        setActiveId(nodeId);
        setQuestionToFocus(
          questionId
        );

        if (structure) {
          setExpanded(
            (prev) =>
              new Set([
                ...prev,
                ...(ancestorIds(
                  structure.sections,
                  nodeId
                ) ?? []),
              ])
          );
        }
      },
      [
        saveDirtyAnswers,
        structure,
      ]
    );

  /* =======================================================
     RAPPORT : ÉDITER LE RAPPORT
  ======================================================= */
  async function handleEditReport(pagesOverride?: typeof flat) {
    const saved = await saveDirtyAnswers();
    if (!saved) return;

    try {
      const {
        AlignmentType,
        Document,
        ExternalHyperlink,
        Footer,
        Header,
        HeadingLevel,
        PageBreak,
        PageNumber,
        Packer,
        Paragraph,
        TableOfContents,
        TabStopType,
        TextRun,
      } = await import('docx');

      const children: any[] = [];
      const BLUE = '1E88E5';
      const GRAY = '666666';

      const pages =
        pagesOverride ??
        (activeIndex >= 0
          ? flat
          : current
            ? [current]
            : []);

      const entity = entities.find(
        (e) => e.id === activeMission?.entity_id
      );

      const entityName =
        entity?.name ??
        entity?.raison_sociale ??
        entity?.sigle ??
        'Non renseignée';

      const closingDate = activeMission?.closing_date
        ? new Date(
            `${activeMission.closing_date}T00:00:00`
          ).toLocaleDateString('fr-FR')
        : 'JJ/MM/AAAA';

      const getNodeHierarchicalNumber = (targetId: string): string => {
        if (!structure?.sections?.length) return '';

        const walk = (
          nodes: QuestionnaireNode[],
          parentNumber = ''
        ): string | null => {
          for (let index = 0; index < nodes.length; index += 1) {
            const node = nodes[index];
            const number = parentNumber
              ? `${parentNumber}.${index + 1}`
              : `${index + 1}`;

            if (node.id === targetId) return number;

            if (node.children?.length) {
              const childNumber = walk(node.children, number);
              if (childNumber) return childNumber;
            }
          }
          return null;
        };

        return walk(structure.sections) ?? '';
      };

      const getNodeHierarchy = (targetId: string): Array<{
        node: QuestionnaireNode;
        number: string;
        level: number;
      }> => {
        if (!structure?.sections?.length) return [];

        const walk = (
          nodes: QuestionnaireNode[],
          parentNumber = '',
          ancestors: Array<{ node: QuestionnaireNode; number: string; level: number }> = []
        ): Array<{ node: QuestionnaireNode; number: string; level: number }> | null => {
          for (let index = 0; index < nodes.length; index += 1) {
            const node = nodes[index];
            const number = parentNumber
              ? `${parentNumber}.${index + 1}`
              : `${index + 1}`;
            const level = ancestors.length + 1;
            const current = [...ancestors, { node, number, level }];

            if (node.id === targetId) return current;

            if (node.children?.length) {
              const child = walk(node.children, number, current);
              if (child) return child;
            }
          }
          return null;
        };

        return walk(structure.sections) ?? [];
      };

      const visibleQuestions = (node: QuestionnaireNode) =>
        node.questions.filter((q) => isQuestionVisible(q, answers));

      const getDocumentFilename = (documentItem: DocumentItem): string => {
        const item = documentItem as any;
        const filename =
          item.filename ??
          item.file_name ??
          item.original_filename ??
          item.original_name ??
          item.name ??
          'Document';
        return String(filename).trim() || 'Document';
      };

      const getDriveUrl = (documentItem: DocumentItem): string | null => {
        const item = documentItem as any;
        const directUrl =
          item.drive_url ??
          item.webViewLink ??
          item.web_view_link ??
          item.drive_link ??
          item.google_drive_url ??
          item.googleDriveUrl ??
          item.url ??
          null;

        if (typeof directUrl === 'string' && directUrl.trim()) {
          return directUrl.trim();
        }

        const driveFileId =
          item.drive_file_id ??
          item.google_drive_id ??
          item.googleDriveId ??
          item.file_id ??
          null;

        if (typeof driveFileId === 'string' && driveFileId.trim()) {
          return `https://drive.google.com/file/d/${encodeURIComponent(driveFileId.trim())}/view`;
        }

        return null;
      };

      const addHeading = (text: string, level: 1 | 2 | 3 | 4 | 5) => {
        const headingMap = {
          1: HeadingLevel.HEADING_1,
          2: HeadingLevel.HEADING_2,
          3: HeadingLevel.HEADING_3,
          4: HeadingLevel.HEADING_4,
          5: HeadingLevel.HEADING_5,
        } as const;

        children.push(
          new Paragraph({
            heading: headingMap[level],
            spacing: {
              before: level === 1 ? 300 : level === 2 ? 230 : 180,
              after: 120,
            },
            children: [
              new TextRun({
                text,
                bold: true,
                color: BLUE,
                size: level === 1 ? 28 : level === 2 ? 24 : 22,
              }),
            ],
          })
        );
      };

      /* PAGE DE GARDE */
      children.push(
        new Paragraph({
          heading: HeadingLevel.TITLE,
          alignment: AlignmentType.CENTER,
          spacing: { before: 2200, after: 500 },
          children: [
            new TextRun({
              text: 'Synthèse des questions-réponses',
              bold: true,
              color: BLUE,
              size: 40,
            }),
          ],
        })
      );

      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 700 },
          children: [
            new TextRun({
              text: activeMission?.name ?? 'Rapport de mission',
              bold: true,
              size: 28,
            }),
          ],
        })
      );

      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 250 },
          children: [
            new TextRun({
              text: `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
              color: GRAY,
              size: 22,
            }),
          ],
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Fait par : ' }),
            new TextRun({ text: '____________________________' }),
            new TextRun({ text: '\tLe : JJ/MM/AAAA' }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: 4000 }],
          spacing: { before: 600, after: 180 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Revu par : ' }),
            new TextRun({ text: '____________________________' }),
            new TextRun({ text: '\tLe : JJ/MM/AAAA' }),
          ],
          tabStops: [{ type: TabStopType.RIGHT, position: 4000 }],
          spacing: { after: 400 },
        })
      );

      children.push(new Paragraph({ children: [new PageBreak()] }));

      /* SOMMAIRE : le titre n'est pas lui-même un Heading Word. */
      children.push(
        new Paragraph({
          spacing: { before: 100, after: 250 },
          children: [
            new TextRun({
              text: 'Sommaire',
              bold: true,
              color: BLUE,
              size: 28,
            }),
          ],
        })
      );

      children.push(
        new TableOfContents('Table des matières', {
          hyperlink: true,
          headingStyleRange: '1-5',
        })
      );

      /*
       * Pas de saut de page manuel ici : la scission en deux
       * sections Word (page de garde + sommaire d'un côté, corps
       * du rapport de l'autre, un peu plus bas) démarre déjà
       * physiquement une nouvelle page. C'est aussi ce point de
       * bascule qui définit où la numérotation de page repart à
       * 1 : la page où commence effectivement le contenu (dont
       * « Acceptation et poursuite de la mission », toujours en
       * tête de l'arbre du questionnaire) doit correspondre à la
       * page 1 telle qu'affichée dans le pied de page ET telle
       * que Word l'indiquera lui-même dans le sommaire une fois
       * le champ recalculé à l'ouverture.
       */
      const bodySectionStart = children.length;

      /*
       * Chaque niveau est numéroté explicitement dans le document :
       * 1. Étape
       * 1.1. Sous-étape
       * 1.1.1. Sous-sous-étape
       *
       * On utilise les index réels de la structure et non les IDs
       * internes tels que A-1-1.
       */
      const addNodes = (nodes: QuestionnaireNode[], depth = 0, parentNumber = '') => {
        nodes.forEach((node, index) => {
          const number = parentNumber
            ? `${parentNumber}.${index + 1}`
            : `${index + 1}`;

          const headingLevel = Math.min(depth + 1, 5) as
            | 1
            | 2
            | 3
            | 4
            | 5;

          addHeading(`${number}. ${cleanLabel(node.label)}`, headingLevel);

          const questions = visibleQuestions(node);

          questions.forEach((q) => {
            if (q.type === 'label') {
              children.push(
                new Paragraph({
                  spacing: { before: 120, after: 100 },
                  children: [
                    new TextRun({
                      text: cleanLabel(q.label),
                      bold: true,
                      size: 21,
                    }),
                  ],
                })
              );
              return;
            }

            const value = answers[q.id];
            const answerText = formatAnswer(value);
            const questionNumber = getReportQuestionNumber(node.id, q.id, questions);
            const cleanQuestion = cleanLabel(q.label);
            const questionTitle =
              questionNumber !== null
                ? `${questionNumber}. ${cleanQuestion}`
                : cleanQuestion;

            /* Question */
            children.push(
              new Paragraph({
                keepNext: true,
                spacing: { before: 260, after: 100 },
                children: [
                  new TextRun({
                    text: questionTitle,
                    bold: true,
                    size: 21,
                  }),
                ],
              })
            );

            /* Réponse */
            children.push(
              new Paragraph({
                spacing: { after: 100 },
                children: [
                  new TextRun({
                    text: answerText || 'Pas de réponse',
                    size: 21,
                  }),
                ],
              })
            );

            /* Commentaire */
            const comment = comments[q.id];
            if (comment && comment.trim()) {
              children.push(
                new Paragraph({
                  spacing: { after: 100 },
                  children: [
                    new TextRun({
                      text: `Commentaire : ${comment.trim()}`,
                      italics: true,
                      color: GRAY,
                      size: 20,
                    }),
                  ],
                })
              );
            }

            /* Documents joints */
            const questionDocs = docsByQuestion[q.id] ?? [];
            if (questionDocs.length > 0) {
              children.push(
                new Paragraph({
                  spacing: { before: 80, after: 80 },
                  children: [
                    new TextRun({
                      text: 'Documents joints :',
                      bold: true,
                      color: GRAY,
                      size: 20,
                    }),
                  ],
                })
              );

              questionDocs.forEach((documentItem) => {
                const filename = getDocumentFilename(documentItem);
                const driveUrl = getDriveUrl(documentItem);

                children.push(
                  new Paragraph({
                    spacing: { after: 45 },
                    indent: { left: 300 },
                    children: [
                      new TextRun({ text: '📎 ', size: 20 }),
                      new TextRun({
                        text: filename,
                        bold: true,
                        size: 20,
                      }),
                    ],
                  })
                );

                if (driveUrl) {
                  children.push(
                    new Paragraph({
                      spacing: { after: 90 },
                      indent: { left: 600 },
                      children: [
                        new ExternalHyperlink({
                          link: driveUrl,
                          children: [
                            new TextRun({
                              text: 'Ouvrir le Drive pour consulter le fichier',
                              color: '0563C1',
                              underline: {},
                              size: 19,
                            }),
                          ],
                        }),
                      ],
                    })
                  );
                } else {
                  children.push(
                    new Paragraph({
                      spacing: { after: 90 },
                      indent: { left: 600 },
                      children: [
                        new TextRun({
                          text: 'Lien Drive indisponible',
                          italics: true,
                          color: GRAY,
                          size: 18,
                        }),
                      ],
                    })
                  );
                }
              });
            }

            /* Séparation nette entre deux questions. */
            children.push(
              new Paragraph({
                spacing: { before: 40, after: 220 },
                children: [new TextRun({ text: '' })],
              })
            );
          });

          if (node.children?.length) {
            addNodes(node.children, depth + 1, number);
          }
        });
      };

      if (pagesOverride) {
        pages.forEach((page, pageIndex) => {
          /*
           * En mode "Éditer" d'une page, on conserve exactement la
           * hiérarchie du rapport : Étape -> Sous-étape -> Sous-sous-étape
           * avant les questions de la page.
           *
           * Chaque page exportée commence sur une vraie page Word. Cela rend
           * la correspondance entre les rubriques du sommaire et les pages
           * beaucoup plus stable après mise à jour du champ TOC dans Word.
           */
          if (pageIndex > 0) {
            children.push(new Paragraph({ children: [new PageBreak()] }));
          }

          const hierarchy = getNodeHierarchy(page.node.id);
          const currentHierarchy = hierarchy.length
            ? hierarchy
            : [{
                node: page.node,
                number: getNodeHierarchicalNumber(page.node.id) || '1',
                level: 1,
              }];

          /* Afficher tous les niveaux parents avant la page courante. */
          currentHierarchy.forEach(({ node, number, level }) => {
            const headingLevel = Math.min(level, 5) as 1 | 2 | 3 | 4 | 5;
            addHeading(
              `${number}. ${cleanLabel(node.label)}`,
              headingLevel
            );
          });

          const node = page.node;
          const questions = visibleQuestions(node);
            questions.forEach((q) => {
              if (q.type === 'label') {
                children.push(
                  new Paragraph({
                    spacing: { before: 120, after: 100 },
                    children: [
                      new TextRun({
                        text: cleanLabel(q.label),
                        bold: true,
                        size: 21,
                      }),
                    ],
                  })
                );
                return;
              }

              const answerText = formatAnswer(answers[q.id]);
              const questionNumber = getReportQuestionNumber(node.id, q.id, questions);
              const questionTitle =
                questionNumber !== null
                  ? `${questionNumber}. ${cleanLabel(q.label)}`
                  : cleanLabel(q.label);

              children.push(
                new Paragraph({
                  keepNext: true,
                  spacing: { before: 260, after: 100 },
                  children: [new TextRun({ text: questionTitle, bold: true, size: 21 })],
                })
              );
              children.push(
                new Paragraph({
                  spacing: { after: 100 },
                  children: [new TextRun({ text: answerText || 'Pas de réponse', size: 21 })],
                })
              );

              const comment = comments[q.id];
              if (comment && comment.trim()) {
                children.push(
                  new Paragraph({
                    spacing: { after: 100 },
                    children: [
                      new TextRun({
                        text: `Commentaire : ${comment.trim()}`,
                        italics: true,
                        color: GRAY,
                        size: 20,
                      }),
                    ],
                  })
                );
              }

              const questionDocs = docsByQuestion[q.id] ?? [];
              if (questionDocs.length > 0) {
                children.push(
                  new Paragraph({
                    spacing: { before: 80, after: 80 },
                    children: [
                      new TextRun({
                        text: 'Documents joints :',
                        bold: true,
                        color: GRAY,
                        size: 20,
                      }),
                    ],
                  })
                );

                questionDocs.forEach((documentItem) => {
                  const filename = getDocumentFilename(documentItem);
                  const driveUrl = getDriveUrl(documentItem);
                  children.push(
                    new Paragraph({
                      spacing: { after: 45 },
                      indent: { left: 300 },
                      children: [
                        new TextRun({ text: '📎 ', size: 20 }),
                        new TextRun({ text: filename, bold: true, size: 20 }),
                      ],
                    })
                  );

                  if (driveUrl) {
                    children.push(
                      new Paragraph({
                        spacing: { after: 90 },
                        indent: { left: 600 },
                        children: [
                          new ExternalHyperlink({
                            link: driveUrl,
                            children: [
                              new TextRun({
                                text: 'Ouvrir le Drive pour consulter le fichier',
                                color: '0563C1',
                                underline: {},
                                size: 19,
                              }),
                            ],
                          }),
                        ],
                      })
                    );
                  } else {
                    children.push(
                      new Paragraph({
                        spacing: { after: 90 },
                        indent: { left: 600 },
                        children: [
                          new TextRun({
                            text: 'Lien Drive indisponible',
                            italics: true,
                            color: GRAY,
                            size: 18,
                          }),
                        ],
                      })
                    );
                  }
                });
              }

              children.push(
                new Paragraph({
                  spacing: { before: 40, after: 220 },
                  children: [new TextRun({ text: '' })],
                })
              );
            });
        });
      } else if (structure?.sections) {
        addNodes(structure.sections);
      }

      const header = new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: entityName,
                size: 18,
              }),
              new TextRun({ text: '\t' }),
              new TextRun({
                text: `Exercice clos le ${closingDate}`,
                size: 18,
              }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: 9000 }],
          }),
        ],
      });

      const footer = new Footer({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: `Edition du ${new Date().toLocaleDateString('fr-FR')}`,
                size: 16,
              }),
              new TextRun({ text: '\t', size: 16 }),
              new TextRun({ text: 'Page ', size: 16 }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
              new TextRun({ text: ' / ', size: 16 }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 }),
            ],
            tabStops: [{ type: TabStopType.RIGHT, position: 9000 }],
          }),
        ],
      });

      const doc = new Document({
        /* Word recalculera le champ de table des matières à l'ouverture.
           Les numéros de page d'un TOC ne peuvent pas être calculés de façon
           fiable par docx.js avant la mise en page finale de Word. */
        features: {
          updateFields: true,
        },
        /*
         * Deux sections Word plutôt qu'une :
         *
         * 1. Page de garde + sommaire — pas de redémarrage de
         *    numérotation particulier, peu importe ici.
         * 2. Corps du rapport — la numérotation de page repart
         *    explicitement à 1 (pageNumbers.start) exactement là
         *    où commence le contenu, dont la première rubrique
         *    est toujours « Acceptation et poursuite de la
         *    mission » (tête de l'arbre du questionnaire). Word
         *    démarre de toute façon une nouvelle page à chaque
         *    nouvelle section : aucun saut de page manuel requis
         *    entre les deux.
         *
         * Le sommaire (champ Word natif) reflète les numéros de
         * page réels une fois recalculé à l'ouverture (features
         * .updateFields ci-dessus) : comme il lit la numérotation
         * telle qu'affichée par la section, la page 1 du pied de
         * page et la page 1 indiquée dans le sommaire pour
         * « Acceptation et poursuite de la mission » coïncident.
         */
        sections: [
          {
            properties: {
              page: {
                margin: {
                  top: 900,
                  right: 1100,
                  bottom: 900,
                  left: 1100,
                },
              },
            },
            headers: { default: header },
            footers: { default: footer },
            children: children.slice(0, bodySectionStart),
          },
          {
            properties: {
              page: {
                margin: {
                  top: 900,
                  right: 1100,
                  bottom: 900,
                  left: 1100,
                },
                pageNumbers: {
                  start: 1,
                },
              },
            },
            headers: { default: header },
            footers: { default: footer },
            children: children.slice(bodySectionStart),
          },
        ],
        styles: {
          default: {
            document: {
              run: {
                font: 'Arial',
                size: 21,
              },
            },
          },
          paragraphStyles: [
            {
              id: 'ReportNormal',
              name: 'Report Normal',
              basedOn: 'Normal',
              next: 'Normal',
              run: {
                font: 'Arial',
                size: 21,
              },
              paragraph: {
                spacing: { after: 90 },
              },
            },
          ],
        },
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');

      const safeName = (activeMission?.name ?? 'rapport-mission')
        .replace(/[<>:"/\\|?*]+/g, '-')
        .trim();

      link.href = url;
      link.download = `${safeName || 'rapport-mission'}.docx`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        '[AFCsoft] Erreur lors de la génération du rapport Word:',
        error
      );

      const message =
        error instanceof Error ? error.message : String(error);

      window.alert(
        `Impossible de générer le fichier Word.\n\n${message}`
      );
    }
  }

  /* =======================================================
     RAPPORT : AFFICHAGE RÉCURSIF
  ======================================================= */

  function renderReportNodes(
    nodes: QuestionnaireNode[],
    depth = 0
  ): ReactNode {
    return nodes.map((node) => {
      const visibleNodeQuestions =
        node.questions.filter(
          (q) =>
            isQuestionVisible(
              q,
              answers
            )
        );

      return (
        <div
          key={node.id}
          className="mb-6"
        >
          {/* ÉLÉMENT / ÉTAPE / SOUS-ÉTAPE */}
          <div
            className="rounded-xl border bg-white"
            style={{
              borderColor:
                depth === 0
                  ? '#bfdbfe'
                  : '#e2e8f0',
            }}
          >
            <div
              className="px-5 py-4"
              style={{
                background:
                  depth === 0
                    ? '#eff6ff'
                    : '#f8fafc',
                borderBottom:
                  '1px solid #e2e8f0',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold"
                  style={{
                    background:
                      depth === 0
                        ? '#2563eb'
                        : '#e2e8f0',
                    color:
                      depth === 0
                        ? 'white'
                        : '#475569',
                  }}
                >
                  {node.id}
                </div>

                <div className="min-w-0">
                  <div
                    className="font-semibold"
                    style={{
                      color:
                        '#0f172a',
                    }}
                  >
                    {cleanLabel(
                      node.label
                    )}
                  </div>

                  {node.summary &&
                    node.summary !==
                      'conclusions' && (
                      <p
                        className="mt-1 text-xs"
                        style={{
                          color:
                            '#64748b',
                        }}
                      >
                        {node.summary}
                      </p>
                    )}
                </div>
              </div>
            </div>

            {/* QUESTIONS DU NŒUD */}
            {visibleNodeQuestions.length >
              0 && (
              <div className="divide-y divide-gray-100">
                {visibleNodeQuestions.map(
                  (q) => {
                    if (
                      q.type ===
                      'label'
                    ) {
                      return (
                        <div
                          key={q.id}
                          className="px-5 py-3"
                        >
                          <div
                            className="text-sm font-semibold"
                            style={{
                              color:
                                '#334155',
                            }}
                          >
                            {cleanLabel(
                              q.label
                            )}
                          </div>
                        </div>
                      );
                    }

                    const value =
                      answers[q.id];

                    const answerText =
                      formatAnswer(
                        value
                      );

                    const hasAnswer =
                      hasAnswerValue(
                        value
                      );

                    const questionDocs =
                      docsByQuestion[
                        q.id
                      ] ?? [];

                    /*
                     * IMPORTANT :
                     * On récupère ici uniquement
                     * la numérotation numérique
                     * existante.
                     *
                     * Si la question n'a pas
                     * de numéro, null est utilisé
                     * et aucun numéro n'est affiché.
                     */
                    const reportNumber =
                      getReportQuestionNumber(
                        node.id,
                        q.id,
                        visibleNodeQuestions
                      );

                    return (
                      <div
                        key={q.id}
                        id={`question-${q.id}`}
                        className="px-5 py-4"
                      >
                        <div className="flex items-start gap-4">

                          <div className="min-w-0 flex-1">

                            {/* QUESTION */}
                            <div className="flex items-start gap-2">
                              {reportNumber !==
                                null && (
                                <div
                                  className="shrink-0 rounded-md px-2 py-1 text-xs font-bold"
                                  style={{
                                    background:
                                      '#eff6ff',
                                    color:
                                      '#2563eb',
                                  }}
                                >
                                  {reportNumber}
                                </div>
                              )}

                              <div
                                className="text-sm font-semibold leading-6"
                                style={{
                                  color:
                                    '#0f172a',
                                }}
                              >
                                {cleanLabel(
                                  q.label
                                )}
                              </div>
                            </div>

                            <>
                                {/* ÉTAT */}
                                <div
                                  className="mt-3 flex items-center gap-2"
                                >
                                  <span
                                    className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                    style={{
                                      background:
                                        hasAnswer
                                          ? '#dcfce7'
                                          : '#f1f5f9',
                                      color:
                                        hasAnswer
                                          ? '#166534'
                                          : '#64748b',
                                    }}
                                  >
                                    <span className="mr-1.5">
                                      {hasAnswer
                                        ? '✓'
                                        : '○'}
                                    </span>

                                    {hasAnswer
                                      ? 'Répondu'
                                      : 'Non répondu'}
                                  </span>
                                </div>

                                {/* RÉPONSE */}
                                <div
                                  className="mt-2 rounded-lg px-3 py-2.5 text-sm whitespace-pre-wrap"
                                  style={{
                                    background:
                                      hasAnswer
                                        ? '#f0fdf4'
                                        : '#f8fafc',
                                    border:
                                      hasAnswer
                                        ? '1px solid #bbf7d0'
                                        : '1px solid #e2e8f0',
                                    color:
                                      hasAnswer
                                        ? '#166534'
                                        : '#64748b',
                                  }}
                                >
                                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide">
                                    {hasAnswer
                                      ? 'Réponse'
                                      : 'À compléter'}
                                  </div>

                                  {answerText}
                                </div>

                                {/* COMMENTAIRE */}
                                {comments[
                                  q.id
                                ] && (
                                  <div
                                    className="mt-2 rounded-lg px-3 py-2.5 text-sm whitespace-pre-wrap"
                                    style={{
                                      background:
                                        '#fffbeb',
                                      border:
                                        '1px solid #fde68a',
                                      color:
                                        '#92400e',
                                    }}
                                  >
                                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide">
                                      Commentaire
                                    </div>

                                    {
                                      comments[
                                        q.id
                                      ]
                                    }
                                  </div>
                                )}

                                {/* DOCUMENTS */}
                                {questionDocs.length >
                                  0 && (
                                  <div className="mt-2">
                                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                                      Documents
                                    </div>

                                    <div className="flex flex-wrap gap-2">
                                      {questionDocs.map(
                                        (
                                          doc
                                        ) => (
                                          <div
                                            key={
                                              doc.id
                                            }
                                            className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs text-gray-600"
                                          >
                                            📎{' '}
                                            {
                                              doc.filename
                                            }
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>
                                )}
                              </>
                          </div>

                          {/* FLÈCHE VERS LA QUESTION */}
                          <button
                              type="button"
                              title="Ouvrir cette question et modifier la réponse"
                              aria-label="Modifier cette question"
                              onClick={() => {
                                void editQuestionFromReport(
                                  node.id,
                                  q.id
                                );
                              }}
                              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg font-bold transition hover:bg-blue-50"
                              style={{
                                borderColor:
                                  '#bfdbfe',
                                color:
                                  '#2563eb',
                                background:
                                  'white',
                              }}
                            >
                              →
                            </button>

                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {/* NŒUD SANS QUESTION */}
            {visibleNodeQuestions.length ===
              0 &&
              node.children.length ===
                0 && (
                <div
                  className="px-5 py-4 text-sm"
                  style={{
                    color:
                      '#94a3b8',
                  }}
                >
                  Aucun contenu renseigné
                  pour cet élément.
                </div>
              )}
          </div>

          {/* SOUS-NŒUDS */}
          {node.children?.length >
            0 && (
            <div
              className="mt-4 ml-4 border-l-2 pl-4"
              style={{
                borderColor:
                  '#e2e8f0',
              }}
            >
              {renderReportNodes(
                node.children,
                depth + 1
              )}
            </div>
          )}
        </div>
      );
    });
  }

  /* =======================================================
     EXPORT WORD
  ======================================================= */

  function renderQuestionHtml(
    q: QuestionDef,
    number: number | null,
    missionAnswers: AnswerMap,
    missionComments: CommentState,
    missionDocs: DocumentItem[],
  ) {
    const label =
      cleanLabel(q.label);

    const answer =
      formatAnswer(
        missionAnswers[q.id]
      );

    const comment =
      missionComments[q.id]
        ? `<div class="export-comment"><strong>Commentaire :</strong><br>${escapeHtml(
            missionComments[q.id]
          )}</div>`
        : '';

    const docs =
      missionDocs
        .filter(
          (d) =>
            d.question_id ===
            q.id
        )
        .map(
          (d) =>
            `<div class="export-attachment">📎 ${escapeHtml(
              d.filename
            )}</div>`
        )
        .join('');

    if (q.type === 'label') {
      return `<div class="export-label">${escapeHtml(
        label
      )}</div>`;
    }

    const numberText =
      number == null
        ? ''
        : escapeHtml(
            String(number)
          );

    return `<div class="export-question">
      <div class="export-question-line">
        ${
          numberText
            ? `<span class="export-question-id">${numberText}</span>`
            : ''
        }
        <span class="export-question-text">${escapeHtml(
          label
        )}</span>
      </div>
      <div class="export-answer">${escapeHtml(
        answer
      )}</div>
      ${comment}${docs}
    </div>`;
  }

  function renderStructuredHtml(
    qs: QuestionDef[]
  ) {
    let html = '';

    for (const q of qs) {
      const label =
        cleanLabel(q.label);

      if (q.type === 'label') {
        const isSubheading =
          /^(?:a\)|b\)|c\)|d\)|e\)|f\))\s*/i.test(
            label
          );

        if (isSubheading) {
          html += `<div class="export-structure-heading">${escapeHtml(
            label
          )}</div>`;
        } else {
          html += `<div class="export-guide">${escapeHtml(
            label
          )}</div>`;

          if (q.guide_files?.length) {
            html += `<div class="export-guide-files">${q.guide_files
              .map(
                (g) =>
                  `<span>📄 ${escapeHtml(
                    g.label
                  )}</span>`
              )
              .join('<br>')}</div>`;
          }
        }
      } else {
        html += renderQuestionHtml(
          q,
          null,
          answers,
          comments,
          documents
        );
      }
    }

    return html;
  }

  function getNodeAncestors(
    targetId: string
  ): QuestionnaireNode[] {
    if (!structure) return [];

    const result: QuestionnaireNode[] =
      [];

    function walk(
      nodes: QuestionnaireNode[],
      trail: QuestionnaireNode[]
    ): boolean {
      for (const node of nodes) {
        const nextTrail = [
          ...trail,
          node,
        ];

        if (
          node.id === targetId
        ) {
          result.push(
            ...nextTrail
          );

          return true;
        }

        if (
          walk(
            node.children,
            nextTrail
          )
        ) {
          return true;
        }
      }

      return false;
    }

    walk(
      structure.sections,
      []
    );

    return result;
  }

  function renderExportHierarchy(
    node: QuestionnaireNode
  ) {
    const ancestors =
      getNodeAncestors(
        node.id
      );

    if (!ancestors.length) {
      return '';
    }

    return `<div class="export-hierarchy">
      ${ancestors
        .map(
          (
            ancestor,
            index
          ) => {
            const level =
              ancestor.id.split(
                '.'
              ).length;

            const currentClass =
              index ===
              ancestors.length - 1
                ? ' current'
                : '';

            const title =
              cleanLabel(
                ancestor.label
              );

            return `<div class="export-hierarchy-row level-${Math.min(
              level,
              3
            )}${currentClass}">
              <span class="export-hierarchy-number">${escapeHtml(
                ancestor.id
              )}</span>
              <span class="export-hierarchy-title">${escapeHtml(
                title
              )}</span>
            </div>`;
          }
        )
        .join('')}
    </div>`;
  }

  function renderTocRow(
    node: QuestionnaireNode
  ) {
    const depth =
      node.id.split('.').length;

    const cls =
      depth === 1
        ? 'toc-1'
        : depth === 2
          ? 'toc-2'
          : 'toc-3';

    return `<div class="toc-row ${cls}">
      <span class="toc-number">${escapeHtml(
        node.id
      )}</span>
      <span class="toc-title">${escapeHtml(
        cleanLabel(
          node.label
        )
      )}</span>
      <span class="toc-leader"></span>
    </div>`;
  }

  /**
   * Édition d'une page : utilise exactement le même générateur Word et
   * le même modèle que la rubrique Rapport.
   *
   * Le document contient toutes les pages précédentes jusqu'à la page
   * actuellement sélectionnée, dans le même ordre que la navigation.
   */
  function downloadStepForEditing() {
    if (!current || !structure || !activeMission) {
      return;
    }

    const pages =
      activeIndex >= 0
        ? flat.slice(0, activeIndex + 1)
        : [current];

    void handleEditReport(pages);
  }

  async function goToDocumentation() {
    const saved =
      await saveDirtyAnswers();

    if (saved) {
      router.push(
        '/documentation'
      );
    }
  }

  return (
    <div className="flex flex-1 overflow-hidden">

      {!activeMission && (
        <div
          className="flex-1 flex items-center justify-center"
          style={{
            background:
              '#fafbfd',
          }}
        >
          <div className="text-center max-w-sm">
            <p
              className="text-sm font-medium mb-1"
              style={{
                color:
                  '#0f172a',
              }}
            >
              {missionLoading
                ? 'Chargement…'
                : 'Choisissez une entité ou aucune mission'}
            </p>

            {!missionLoading && (
              <p
                className="text-sm"
                style={{
                  color:
                    '#94a3b8',
                }}
              >
                Sélectionnez une entité
                dans la barre latérale ;
                aucune mission n’est ouverte
                tant que vous n’en choisissez
                pas une.
              </p>
            )}
          </div>
        </div>
      )}

      {activeMission &&
        !structure && (
          <div className="flex-1 flex items-center justify-center">
            <div
              className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
              style={{
                borderColor:
                  '#2563eb',
                borderTopColor:
                  'transparent',
              }}
            />
          </div>
        )}

      {activeMission &&
        structure && (
          <>
            {/* =================================================
                SIDEBAR MISSION
            ================================================= */}

            <div
              className="flex flex-col shrink-0"
              style={{
                width: '300px',
                background:
                  'white',
                borderRight:
                  '1px solid #eef2f7',
              }}
            >
              <div
                className="px-4 py-3.5"
                style={{
                  borderBottom:
                    '1px solid #eef2f7',
                }}
              >
                <p
                  className="text-sm font-semibold"
                  style={{
                    color:
                      '#0f172a',
                  }}
                >
                  Audit de{' '}
                  {activeMission.name}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto py-2">

                {structure.sections.map(
                  (section) => (
                    <div
                      key={
                        section.id
                      }
                    >
                      <QuestionnaireTree
                        nodes={[
                          section,
                        ]}
                        activeId={
                          activeId
                        }
                        expanded={
                          expanded
                        }
                        onToggleExpand={
                          toggleExpand
                        }
                        onSelect={
                          selectNode
                        }
                        answers={
                          answers
                        }
                      />

                      {section.id ===
                        '5' && (
                        <button
                          type="button"
                          onClick={() =>
                            void goToDocumentation()
                          }
                          className="mx-3 my-1.5 flex w-[calc(100%-1.5rem)] items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold"
                          style={{
                            background:
                              '#f8fafd',
                            color:
                              '#2563eb',
                            border:
                              '1px dashed #bfdbfe',
                          }}
                        >
                          Documentation
                        </button>
                      )}
                    </div>
                  )
                )}

                {/* =================================================
                    RUBRIQUE RAPPORT
                ================================================= */}

                <button
                  type="button"
                  onClick={async () => {
                    const saved =
                      await saveDirtyAnswers();

                    if (!saved) {
                      return;
                    }

                    setQuestionToFocus(
                      null
                    );


                    setShowReport(
                      true
                    );
                  }}
                  className="mx-3 my-2 flex w-[calc(100%-1.5rem)] items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-semibold"
                  style={{
                    background:
                      showReport
                        ? '#2563eb'
                        : '#f8fafd',
                    color:
                      showReport
                        ? 'white'
                        : '#2563eb',
                    border:
                      showReport
                        ? '1px solid #2563eb'
                        : '1px dashed #bfdbfe',
                  }}
                >
                  <span
                    className="text-base"
                    aria-hidden="true"
                  >
                    📊
                  </span>

                  <span>
                    Rapport
                  </span>
                </button>

              </div>
            </div>

            {/* =================================================
                CONTENU PRINCIPAL
            ================================================= */}

            <div className="flex-1 flex flex-col overflow-hidden">

              {/* =================================================
                  RAPPORT
              ================================================= */}

              {showReport ? (
                <>
                  <div
                    className="flex items-center justify-between px-6 py-4 shrink-0"
                    style={{
                      borderBottom:
                        '1px solid #eef2f7',
                      background:
                        'white',
                    }}
                  >
                    <div className="min-w-0">
                      <div
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{
                          color:
                            '#2563eb',
                        }}
                      >
                        Rapport de mission
                      </div>

                      <h3
                        className="text-xl font-bold mt-1"
                        style={{
                          color:
                            '#0f172a',
                        }}
                      >
                        {activeMission.name}
                      </h3>

                      <p
                        className="text-xs mt-1"
                        style={{
                          color:
                            '#64748b',
                        }}
                      >
                        Synthèse de l’état d’avancement de la mission.
                      </p>
                    </div>


                      <button
                        type="button"
                        onClick={() =>
                          void handleEditReport()
                        }
                        className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                        style={{
                          background:
                            'linear-gradient(135deg, #2563eb, #4f9cf9)',
                          color:
                            'white',
                        }}
                      >
                        <span aria-hidden="true">
                          ✎
                        </span>

                        <span>
                          Éditer le rapport
                        </span>
                      </button>
                    </div>

                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="max-w-5xl mx-auto">

                      {/* STATISTIQUES */}
                      <div className="grid grid-cols-4 gap-4 mb-6">

                        <div
                          className="rounded-xl p-4"
                          style={{
                            background:
                              'white',
                            border:
                              '1px solid #e2e8f0',
                          }}
                        >
                          <div
                            className="text-xs font-semibold uppercase"
                            style={{
                              color:
                                '#64748b',
                            }}
                          >
                            Éléments
                          </div>

                          <div
                            className="text-2xl font-bold mt-1"
                            style={{
                              color:
                                '#0f172a',
                            }}
                          >
                            {
                              reportStats.elements
                            }
                          </div>
                        </div>

                        <div
                          className="rounded-xl p-4"
                          style={{
                            background:
                              'white',
                            border:
                              '1px solid #e2e8f0',
                          }}
                        >
                          <div
                            className="text-xs font-semibold uppercase"
                            style={{
                              color:
                                '#64748b',
                            }}
                          >
                            Questions
                          </div>

                          <div
                            className="text-2xl font-bold mt-1"
                            style={{
                              color:
                                '#0f172a',
                            }}
                          >
                            {
                              reportStats.questions
                            }
                          </div>
                        </div>

                        <div
                          className="rounded-xl p-4"
                          style={{
                            background:
                              '#f0fdf4',
                            border:
                              '1px solid #bbf7d0',
                          }}
                        >
                          <div
                            className="text-xs font-semibold uppercase"
                            style={{
                              color:
                                '#15803d',
                            }}
                          >
                            Répondues
                          </div>

                          <div
                            className="text-2xl font-bold mt-1"
                            style={{
                              color:
                                '#16a34a',
                            }}
                          >
                            {
                              reportStats.answered
                            }
                          </div>
                        </div>

                        <div
                          className="rounded-xl p-4"
                          style={{
                            background:
                              '#f8fafc',
                            border:
                              '1px solid #e2e8f0',
                          }}
                        >
                          <div
                            className="text-xs font-semibold uppercase"
                            style={{
                              color:
                                '#64748b',
                            }}
                          >
                            À compléter
                          </div>

                          <div
                            className="text-2xl font-bold mt-1"
                            style={{
                              color:
                                '#64748b',
                            }}
                          >
                            {
                              reportUnanswered
                            }
                          </div>
                        </div>

                      </div>

                      {/* LÉGENDE */}
                      <div
                        className="rounded-xl px-4 py-3 mb-6 text-sm flex flex-wrap items-center gap-x-6 gap-y-2"
                        style={{
                          background:
                            '#f8fafc',
                          border:
                            '1px solid #e2e8f0',
                          color:
                            '#475569',
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                            style={{
                              background:
                                '#dcfce7',
                              color:
                                '#166534',
                            }}
                          >
                            ✓
                          </span>

                          Répondu
                        </span>

                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-full"
                            style={{
                              background:
                                '#f1f5f9',
                              color:
                                '#64748b',
                            }}
                          >
                            ○
                          </span>

                          Non répondu
                        </span>

                        {!false && (
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="font-bold"
                              style={{
                                color:
                                  '#2563eb',
                              }}
                            >
                              →
                            </span>

                            Modifier la question
                          </span>
                        )}

                        {false && (
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="font-bold"
                              style={{
                                color:
                                  '#2563eb',
                              }}
                            >
                              ✎
                            </span>

                            Modification directe du rapport
                          </span>
                        )}
                      </div>

                      {/* RAPPORT COMPLET */}
                      {renderReportNodes(
                        structure.sections
                      )}

                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* =================================================
                      QUESTION COURANTE
                  ================================================= */}

                  {current && (
                    <div
                      className="flex items-center justify-between px-6 py-3 shrink-0"
                      style={{
                        borderBottom:
                          '1px solid #eef2f7',
                        background:
                          'white',
                      }}
                    >
                      <div className="min-w-0">
                        <h3
                          className="text-base font-semibold truncate"
                          style={{
                            color:
                              '#0f172a',
                          }}
                        >
                          {current.node.id}.{' '}
                          {
                            current.node
                              .label
                          }
                        </h3>

                        <p
                          className="text-xs mt-0.5 truncate"
                          style={{
                            color:
                              '#94a3b8',
                          }}
                        >
                          {current.path
                            .slice(
                              0,
                              -1
                            )
                            .join(
                              ' › '
                            ) ||
                            'Questionnaire'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={
                            downloadStepForEditing
                          }
                          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                          style={{
                            border:
                              '1.5px solid #bfdbfe',
                            color:
                              '#2563eb',
                            background:
                              '#eff6ff',
                          }}
                        >
                          Éditer
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            prevNode &&
                            selectNode(
                              prevNode
                                .node.id
                            )
                          }
                          disabled={
                            !prevNode
                          }
                          className="px-4 py-2 rounded-xl text-sm font-medium"
                          style={{
                            border:
                              '1.5px solid #e2e8f0',
                            color:
                              prevNode
                                ? '#334155'
                                : '#d1d5db',
                            background:
                              'white',
                          }}
                        >
                          Précédent
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            nextNode &&
                            selectNode(
                              nextNode
                                .node.id
                            )
                          }
                          disabled={
                            !nextNode
                          }
                          className="px-4 py-2 rounded-xl text-sm font-semibold"
                          style={{
                            background:
                              nextNode
                                ? 'linear-gradient(135deg, #2563eb, #4f9cf9)'
                                : '#e2e8f0',
                            color:
                              nextNode
                                ? 'white'
                                : '#94a3b8',
                          }}
                        >
                          Suivant
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="max-w-3xl animate-fade-in">

                      {loading && (
                        <div
                          className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                          style={{
                            borderColor:
                              '#2563eb',
                            borderTopColor:
                              'transparent',
                          }}
                        />
                      )}

                      {!loading &&
                        current?.node
                          .summary ===
                          'conclusions' &&
                        (() => {
                          const root3 =
                            structure.sections.find(
                              (s) =>
                                s.id ===
                                '3'
                            );

                          const conclusions =
                            root3
                              ? collectConclusions(
                                  root3,
                                  []
                                )
                              : [];

                          return (
                            <div className="space-y-3">
                              <p
                                className="text-sm"
                                style={{
                                  color:
                                    '#64748b',
                                }}
                              >
                                Toutes les
                                conclusions et
                                observations de
                                l’étape 3 sont
                                regroupées ici.
                                Toute modification
                                sur la page
                                d’origine est
                                répercutée
                                automatiquement.
                              </p>

                              {conclusions.length ===
                                0 && (
                                <p
                                  className="text-sm py-6"
                                  style={{
                                    color:
                                      '#94a3b8',
                                  }}
                                >
                                  Aucune conclusion
                                  à afficher.
                                </p>
                              )}

                              {conclusions.map(
                                (item) => (
                                  <div
                                    key={`${item.node.id}-${item.question.id}`}
                                    id={`question-${item.question.id}`}
                                    className="rounded-xl p-4"
                                    style={{
                                      border:
                                        '1px solid #e2e8f0',
                                      background:
                                        'white',
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="min-w-0">
                                        <p
                                          className="text-sm font-semibold"
                                          style={{
                                            color:
                                              '#0f172a',
                                          }}
                                        >
                                          {
                                            item
                                              .node
                                              .id
                                          }.{' '}
                                          {
                                            item
                                              .node
                                              .label
                                          }
                                        </p>

                                        <p
                                          className="text-xs mt-1"
                                          style={{
                                            color:
                                              '#64748b',
                                          }}
                                        >
                                          {cleanLabel(
                                            item
                                              .question
                                              .label
                                          )}
                                        </p>
                                      </div>

                                      <button
                                        type="button"
                                        onClick={() =>
                                          void editQuestionFromReport(
                                            item
                                              .node
                                              .id,
                                            item
                                              .question
                                              .id
                                          )
                                        }
                                        className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg"
                                        title="Modifier cette question"
                                        style={{
                                          border:
                                            '1px solid #bfdbfe',
                                          color:
                                            '#2563eb',
                                          background:
                                            '#eff6ff',
                                        }}
                                      >
                                        →
                                      </button>
                                    </div>

                                    <div
                                      className="mt-3 rounded-lg p-3 text-sm whitespace-pre-wrap"
                                      style={{
                                        background:
                                          hasAnswerValue(
                                            answers[
                                              item
                                                .question
                                                .id
                                            ]
                                          )
                                            ? '#f0fdf4'
                                            : '#f8fafc',
                                        border:
                                          hasAnswerValue(
                                            answers[
                                              item
                                                .question
                                                .id
                                            ]
                                          )
                                            ? '1px solid #bbf7d0'
                                            : '1px solid #e2e8f0',
                                        color:
                                          hasAnswerValue(
                                            answers[
                                              item
                                                .question
                                                .id
                                            ]
                                          )
                                            ? '#166534'
                                            : '#64748b',
                                      }}
                                    >
                                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide">
                                        {hasAnswerValue(
                                          answers[
                                            item
                                              .question
                                              .id
                                          ]
                                        )
                                          ? 'Réponse'
                                          : 'Non répondu'}
                                      </div>

                                      {formatAnswer(
                                        answers[
                                          item
                                            .question
                                            .id
                                        ]
                                      )}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          );
                        })()}

                      {!loading &&
                        current &&
                        current.node
                          .summary !==
                          'conclusions' &&
                        visibleQuestions.length ===
                          0 && (
                          <p
                            className="text-sm py-6"
                            style={{
                              color:
                                '#94a3b8',
                            }}
                          >
                            Aucune question à
                            afficher pour cette
                            sous-étape
                            (conditions non
                            remplies).
                          </p>
                        )}

                      {!loading &&
                        current &&
                        current.node
                          .summary !==
                          'conclusions' &&
                        isStructuredStep &&
                        (() => {
                          return (
                            <div>
                              {visibleQuestions.map(
                                (q) => {
                                  const label =
                                    cleanLabel(
                                      q.label
                                    );

                                  const isHeader =
                                    q.type ===
                                      'label' &&
                                    /^(?:a\)|b\)|c\)|d\)|e\)|f\))/i.test(
                                      label
                                    );

                                  if (
                                    q.type ===
                                      'label' &&
                                    isHeader
                                  ) {
                                    return (
                                      <div
                                        key={
                                          q.id
                                        }
                                        className="py-2.5 border-b"
                                        style={{
                                          borderColor:
                                            '#f1f5f9',
                                        }}
                                      >
                                        <p
                                          className="text-sm font-bold"
                                          style={{
                                            color:
                                              '#0f172a',
                                          }}
                                        >
                                          {
                                            label
                                          }
                                        </p>

                                        {q.guide_files
                                          ?.length ? (
                                          <div className="flex flex-wrap gap-2 mt-2">
                                            {q.guide_files.map(
                                              (
                                                g
                                              ) => (
                                                <button
                                                  key={
                                                    g.id ||
                                                    g.url ||
                                                    g.label
                                                  }
                                                  type="button"
                                                  onClick={() =>
                                                    void handleGuideDownload(
                                                      g
                                                    )
                                                  }
                                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                                                  style={{
                                                    color:
                                                      '#2563eb',
                                                    background:
                                                      '#eff6ff',
                                                    border:
                                                      '1px solid #bfdbfe',
                                                  }}
                                                >
                                                  <span>
                                                    ↓
                                                  </span>

                                                  <span>
                                                    {
                                                      g.label
                                                    }{' '}
                                                    ·
                                                    Télécharger
                                                    le modèle
                                                  </span>
                                                </button>
                                              )
                                            )}
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  if (
                                    q.type ===
                                    'label'
                                  ) {
                                    return (
                                      <div
                                        key={
                                          q.id
                                        }
                                        className="py-2.5 border-b"
                                        style={{
                                          borderColor:
                                            '#f1f5f9',
                                        }}
                                      >
                                        <p
                                          className="text-sm font-normal leading-relaxed"
                                          style={{
                                            color:
                                              '#334155',
                                          }}
                                        >
                                          {
                                            label
                                          }
                                        </p>

                                        {q.guide_files
                                          ?.length ? (
                                          <div className="flex flex-wrap gap-2 mt-2">
                                            {q.guide_files.map(
                                              (
                                                g
                                              ) => (
                                                <button
                                                  key={
                                                    g.id ||
                                                    g.url ||
                                                    g.label
                                                  }
                                                  type="button"
                                                  onClick={() =>
                                                    void handleGuideDownload(
                                                      g
                                                    )
                                                  }
                                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                                                  style={{
                                                    color:
                                                      '#2563eb',
                                                    background:
                                                      '#eff6ff',
                                                    border:
                                                      '1px solid #bfdbfe',
                                                  }}
                                                >
                                                  <span>
                                                    ↓
                                                  </span>

                                                  <span>
                                                    {
                                                      g.label
                                                    }{' '}
                                                    ·
                                                    Télécharger
                                                    le modèle
                                                  </span>
                                                </button>
                                              )
                                            )}
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div
                                      key={
                                        q.id
                                      }
                                      id={`question-${q.id}`}
                                      className="py-2.5 border-b transition-all"
                                      style={{
                                        borderColor:
                                          '#f1f5f9',
                                      }}
                                    >
                                      <QuestionField
                                        question={
                                          q
                                        }
                                        index={
                                          0
                                        }
                                        value={
                                          answers[
                                            q.id
                                          ]
                                        }
                                        onChange={(
                                          v
                                        ) =>
                                          handleAnswerChange(
                                            q.id,
                                            v
                                          )
                                        }
                                        comment={
                                          comments[
                                            q.id
                                          ] ??
                                          ''
                                        }
                                        onCommentChange={(
                                          c
                                        ) =>
                                          handleCommentChange(
                                            q.id,
                                            c
                                          )
                                        }
                                        attachedDocs={(
                                          docsByQuestion[
                                            q.id
                                          ] ??
                                          []
                                        ).map(
                                          (
                                            d
                                          ) => ({
                                            id: d.id,
                                            filename:
                                              d.filename,
                                          })
                                        )}
                                        uploading={
                                          uploadingFor ===
                                          q.id
                                        }
                                        onAttach={(
                                          files
                                        ) =>
                                          handleAttach(
                                            q.id,
                                            current
                                              .node
                                              .id,
                                            files
                                          )
                                        }
                                        onRemoveAttachment={
                                          handleRemoveAttachment
                                        }
                                        hideHeader
                                      />
                                    </div>
                                  );
                                }
                              )}
                            </div>
                          );
                        })()}

                      {!loading &&
                        current &&
                        current.node
                          .summary !==
                          'conclusions' &&
                        !isStructuredStep &&
                        visibleQuestions.map(
                          (q) => (
                            <div
                              key={
                                q.id
                              }
                              id={`question-${q.id}`}
                              className="transition-all"
                            >
                              <QuestionField
                                question={
                                  q
                                }
                                index={
                                  questionDisplayNumber(
                                    structure.sections,
                                    current.node.id,
                                    q.id,
                                    visibleQuestions,
                                    answers
                                  ) ?? 0
                                }
                                value={
                                  answers[
                                    q.id
                                  ]
                                }
                                onChange={(
                                  v
                                ) =>
                                  handleAnswerChange(
                                    q.id,
                                    v
                                  )
                                }
                                comment={
                                  comments[
                                    q.id
                                  ] ?? ''
                                }
                                onCommentChange={(
                                  c
                                ) =>
                                  handleCommentChange(
                                    q.id,
                                    c
                                  )
                                }
                                attachedDocs={(
                                  docsByQuestion[
                                    q.id
                                  ] ??
                                  []
                                ).map(
                                  (d) => ({
                                    id: d.id,
                                    filename:
                                      d.filename,
                                  })
                                )}
                                uploading={
                                  uploadingFor ===
                                  q.id
                                }
                                onAttach={(
                                  files
                                ) =>
                                  handleAttach(
                                    q.id,
                                    current
                                      .node
                                      .id,
                                    files
                                  )
                                }
                                onRemoveAttachment={
                                  handleRemoveAttachment
                                }
                                capitalTarget={
                                  q.id ===
                                  'A-1-7'
                                    ? answers[
                                        'A-1-6'
                                      ]
                                    : undefined
                                }
                                readOnly={READ_ONLY_FROM_ENTITY.has(
                                  q.id
                                )}
                              />
                            </div>
                          )
                        )}
                    </div>
                  </div>

                  {/* FOOTER */}
                  <div
                    className="flex items-center justify-between px-6 py-3 shrink-0"
                    style={{
                      borderTop:
                        '1px solid #eef2f7',
                      background:
                        'white',
                    }}
                  >
                    <span
                      className="text-xs"
                      style={{
                        color:
                          '#94a3b8',
                      }}
                    >
                      {current
                        ? `Étape ${current.path
                            .slice(
                              0,
                              -1
                            )
                            .join(
                              ' › '
                            ) ||
                          current.node.id}`
                        : ''}
                    </span>

                    <div className="flex items-center gap-3">
                      {stepHasUnsaved &&
                        saveState !==
                          'saving' && (
                          <span
                            className="text-xs"
                            style={{
                              color:
                                '#f59e0b',
                            }}
                          >
                            Modifications non
                            enregistrées
                          </span>
                        )}

                      {saveState ===
                        'saving' && (
                        <span
                          className="text-xs"
                          style={{
                            color:
                              '#64748b',
                          }}
                        >
                          Enregistrement…
                        </span>
                      )}

                      {saveState ===
                        'saved' &&
                        !stepHasUnsaved && (
                          <span
                            className="text-xs"
                            style={{
                              color:
                                '#16a34a',
                            }}
                          >
                            Enregistré
                          </span>
                        )}

                      <button
                        type="button"
                        onClick={() =>
                          void saveDirtyAnswers()
                        }
                        disabled={
                          !stepHasUnsaved ||
                          saveState ===
                            'saving'
                        }
                        className="px-4 py-2 rounded-xl text-sm font-semibold"
                        style={{
                          background:
                            stepHasUnsaved &&
                            saveState !==
                              'saving'
                              ? 'linear-gradient(135deg, #2563eb, #4f9cf9)'
                              : '#e2e8f0',
                          color:
                            stepHasUnsaved &&
                            saveState !==
                              'saving'
                              ? 'white'
                              : '#94a3b8',
                        }}
                      >
                        Enregistrer
                      </button>
                    </div>
                  </div>
                </>
              )}

            </div>
          </>
        )}
    </div>
  );
}