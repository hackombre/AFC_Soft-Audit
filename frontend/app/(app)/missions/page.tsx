'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useMission } from '@/lib/mission-context';
import { useAuth } from '@/lib/auth-context';
import type { AnswerOut, DocumentItem, QuestionnaireNode, QuestionnaireStructure } from '@/lib/types';
import {
  flattenNavigable,
  isQuestionVisible,
  type AnswerMap,
} from '@/lib/questionnaire-utils';
import QuestionnaireTree from '@/components/questionnaire/QuestionnaireTree';
import QuestionField from '@/components/questionnaire/QuestionField';

function ancestorIds(nodes: QuestionnaireNode[], targetId: string, trail: string[] = []): string[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return trail;
    const found = ancestorIds(n.children, targetId, [...trail, n.id]);
    if (found) return found;
  }
  return null;
}


type SaveState = 'idle' | 'saving' | 'saved';
interface CommentState {
  [questionId: string]: string;
}

export default function MissionsWorkspacePage() {
  const { activeMission, entities, loading: missionLoading } = useMission();
  const { currentUser } = useAuth();
  const [structure, setStructure] = useState<QuestionnaireStructure | null>(null);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [comments, setComments] = useState<CommentState>({});
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);

  const answerTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    api.getStructure().then((s) => {
      const struct = s as QuestionnaireStructure;
      setStructure(struct);
      const flat = flattenNavigable(struct.sections);
      if (flat.length > 0) {
        setActiveId(flat[0].node.id);
        setExpanded(new Set(ancestorIds(struct.sections, flat[0].node.id) ?? []));
      }
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
    Promise.all([api.getAnswers(activeMission.id), api.listDocuments(activeMission.id)]).then(
      ([rows, docs]) => {
        const amap: AnswerMap = {};
        const cmap: CommentState = {};
        (rows as AnswerOut[]).forEach((r) => {
          amap[r.question_id] = r.value;
          if (r.comment) cmap[r.question_id] = r.comment;
        });

        // Auto-remplissage de la raison sociale / forme juridique depuis
        // l'entité, si ces questions n'ont encore jamais été renseignées.
        const entity = entities.find((e) => e.id === activeMission.entity_id);
        const toAutoSave: [string, string][] = [];
        if (entity?.raison_sociale && !amap['A-1-1']) {
          amap['A-1-1'] = entity.raison_sociale;
          toAutoSave.push(['A-1-1', entity.raison_sociale]);
        }
        if (entity?.forme_juridique && !amap['A-1-2']) {
          amap['A-1-2'] = entity.forme_juridique;
          toAutoSave.push(['A-1-2', entity.forme_juridique]);
        }
        if (entity?.rccm && !amap['A-1-8']) {
          amap['A-1-8'] = entity.rccm;
          toAutoSave.push(['A-1-8', entity.rccm]);
        }

        setAnswers(amap);
        setComments(cmap);
        setDocuments(docs as DocumentItem[]);
        setLoading(false);

        toAutoSave.forEach(([qid, value]) => {
          api.saveAnswer(activeMission.id, qid, value, cmap[qid] ?? null).catch(() => {});
        });
      }
    );
  }, [activeMission, entities]);

  useEffect(() => {
    loadMissionData();
  }, [loadMissionData]);

  const flat = useMemo(() => (structure ? flattenNavigable(structure.sections) : []), [structure]);
  const activeIndex = flat.findIndex((f) => f.node.id === activeId);
  const current = activeIndex >= 0 ? flat[activeIndex] : null;
  const prevNode = activeIndex > 0 ? flat[activeIndex - 1] : null;
  const nextNode = activeIndex >= 0 && activeIndex < flat.length - 1 ? flat[activeIndex + 1] : null;

  const docsByQuestion = useMemo(() => {
    const map: Record<string, DocumentItem[]> = {};
    documents.forEach((d) => {
      if (d.question_id) {
        map[d.question_id] = map[d.question_id] ?? [];
        map[d.question_id].push(d);
      }
    });
    return map;
  }, [documents]);

  const READ_ONLY_FROM_ENTITY = new Set(['A-1-1', 'A-1-2', 'A-1-8']);

  const saveAnswer = useCallback(
    (questionId: string, value: unknown, comment: string) => {
      if (!activeMission) return;
      if (answerTimers.current[questionId]) clearTimeout(answerTimers.current[questionId]);
      setSaveState('saving');
      answerTimers.current[questionId] = setTimeout(async () => {
        try {
          await api.saveAnswer(activeMission.id, questionId, value, comment || null);
          setSaveState('saved');
        } catch {
          setSaveState('idle');
        }
      }, 500);
    },
    [activeMission]
  );

  function handleAnswerChange(questionId: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    saveAnswer(questionId, value, comments[questionId] ?? '');
  }

  function handleCommentChange(questionId: string, comment: string) {
    setComments((prev) => ({ ...prev, [questionId]: comment }));
    saveAnswer(questionId, answers[questionId], comment);
  }

  async function handleAttach(questionId: string, nodeId: string, files: FileList | null) {
    if (!files || files.length === 0 || !activeMission) return;
    setUploadingFor(questionId);
    try {
      for (const file of Array.from(files)) {
        await api.uploadDocument(activeMission.id, nodeId, file, { category: 'recus', questionId });
      }
      const docs = await api.listDocuments(activeMission.id);
      setDocuments(docs as DocumentItem[]);
    } finally {
      setUploadingFor(null);
    }
  }

  async function handleRemoveAttachment(documentId: string) {
    if (!activeMission) return;
    await api.deleteDocument(documentId);
    const docs = await api.listDocuments(activeMission.id);
    setDocuments(docs as DocumentItem[]);
  }

  function selectNode(id: string) {
    setActiveId(id);
    if (structure) setExpanded((prev) => new Set([...prev, ...(ancestorIds(structure.sections, id) ?? [])]));
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const visibleQuestions = current ? current.node.questions.filter((q) => isQuestionVisible(q, answers)) : [];

  return (
    <div className="flex flex-1 overflow-hidden">
      {!activeMission && (
        <div className="flex-1 flex items-center justify-center" style={{ background: '#fafbfd' }}>
          <div className="text-center max-w-sm">
            <p className="text-sm font-medium mb-1" style={{ color: '#0f172a' }}>
              {missionLoading ? 'Chargement…' : 'Sélectionnez une mission'}
            </p>
            {!missionLoading && (
              <p className="text-sm" style={{ color: '#94a3b8' }}>
                Choisissez une mission dans la liste, ou créez-en une nouvelle pour accéder à son questionnaire.
              </p>
            )}
          </div>
        </div>
      )}

      {activeMission && !structure && (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }} />
        </div>
      )}

      {activeMission && structure && (
        <>
          {/* Tree */}
          <div className="flex flex-col shrink-0" style={{ width: '300px', background: 'white', borderRight: '1px solid #eef2f7' }}>
            <div className="px-4 py-3.5" style={{ borderBottom: '1px solid #eef2f7' }}>
              <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>
                Audit de {activeMission.name}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <QuestionnaireTree
                nodes={structure.sections}
                activeId={activeId}
                expanded={expanded}
                onToggleExpand={toggleExpand}
                onSelect={selectNode}
                answers={answers}
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {current && (
              <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ borderBottom: '1px solid #eef2f7', background: 'white' }}>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold truncate" style={{ color: '#0f172a' }}>
                    {current.node.id}. {current.node.label}
                  </h3>
                  <p className="text-xs mt-0.5 truncate" style={{ color: '#94a3b8' }}>
                    {current.path.slice(0, -1).join(' › ') || 'Questionnaire'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => prevNode && selectNode(prevNode.node.id)}
                    disabled={!prevNode}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
                    style={{ border: '1.5px solid #e2e8f0', color: prevNode ? '#334155' : '#d1d5db', background: 'white' }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    Précédent
                  </button>
                  <button
                    onClick={() => nextNode && selectNode(nextNode.node.id)}
                    disabled={!nextNode}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: nextNode ? 'linear-gradient(135deg, #2563eb, #4f9cf9)' : '#e2e8f0', color: nextNode ? 'white' : '#94a3b8' }}
                  >
                    Suivant
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loading && (
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }} />
              )}
              {!loading && current && (
                <div className="max-w-3xl animate-fade-in">
                  {visibleQuestions.length === 0 && (
                    <p className="text-sm py-6" style={{ color: '#94a3b8' }}>
                      Aucune question à afficher pour cette sous-étape (conditions non remplies).
                    </p>
                  )}
                  {visibleQuestions.map((q, i) => (
                    <QuestionField
                      key={q.id}
                      question={q}
                      index={i + 1}
                      value={answers[q.id]}
                      onChange={(v) => handleAnswerChange(q.id, v)}
                      comment={comments[q.id] ?? ''}
                      onCommentChange={(c) => handleCommentChange(q.id, c)}
                      attachedDocs={(docsByQuestion[q.id] ?? []).map((d) => ({ id: d.id, filename: d.filename }))}
                      uploading={uploadingFor === q.id}
                      onAttach={(files) => handleAttach(q.id, current.node.id, files)}
                      onRemoveAttachment={handleRemoveAttachment}
                      capitalTarget={q.id === 'A-1-7' ? answers['A-1-6'] : undefined}
                      readOnly={READ_ONLY_FROM_ENTITY.has(q.id)}
                    />
                  ))}
                </div>
              )}
              {!loading && !current && (
                <p className="text-sm" style={{ color: '#94a3b8' }}>Sélectionnez une sous-étape dans le plan.</p>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ borderTop: '1px solid #eef2f7', background: 'white' }}>
              <span className="text-xs" style={{ color: '#94a3b8' }}>
                {current ? `Étape ${current.path.slice(0, -1).join(' › ') || current.node.id}` : ''}
              </span>
              {saveState === 'saving' && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#2563eb' }}>
                  <div className="w-3 h-3 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }} />
                  Enregistrement…
                </div>
              )}
              {saveState === 'saved' && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: '#22c55e' }}>
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <circle cx="6.5" cy="6.5" r="5.5" fill="#dcfce7" />
                    <path d="M3.5 6.5l2.5 2.5 3.5-3.5" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Enregistré
                </div>
              )}
              {saveState === 'idle' && <span />}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
