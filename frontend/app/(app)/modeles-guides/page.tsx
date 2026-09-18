'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type {
  GuideTemplate,
  QuestionnaireNode,
  QuestionnaireStructure,
} from '@/lib/types';

function hasGuideArea(node: QuestionnaireNode) {
  return node.questions.some(
    (q) => q.type === 'label' && /guide/i.test(q.label)
  );
}

function collectGuideNodes(
  node: QuestionnaireNode,
  out: QuestionnaireNode[] = []
) {
  node.children.forEach((child) => {
    if (hasGuideArea(child)) out.push(child);
    collectGuideNodes(child, out);
  });

  return out;
}

function sizeText(size: number | null) {
  if (!size) return '';
  if (size < 1024) return `${size} o`;
  if (size < 1048576) return `${Math.round(size / 1024)} Ko`;
  return `${(size / 1048576).toFixed(1)} Mo`;
}

export default function GuideTemplatesPage() {
  const { currentUser } = useAuth();

  const [structure, setStructure] =
    useState<QuestionnaireStructure | null>(null);
  const [templates, setTemplates] = useState<GuideTemplate[]>([]);
  const [sectionId, setSectionId] = useState('');
  const [nodeId, setNodeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const guideNodes = useMemo(() => {
    const s = structure?.sections.find((x) => x.id === sectionId);
    return s ? collectGuideNodes(s) : [];
  }, [structure, sectionId]);

  const selectedNode =
    guideNodes.find((x) => x.id === nodeId) ?? null;

  const selectedTemplates = templates.filter(
    (x) => String(x.node_id) === String(nodeId)
  );

  useEffect(() => {
    if (currentUser?.role !== 'associe') {
      setLoading(false);
      return;
    }

    Promise.all([
      api.getStructure(),
      api.listGuideTemplates(),
    ])
      .then(([s, t]) => {
        const st = s as QuestionnaireStructure;

        setStructure(st);
        setTemplates(t as GuideTemplate[]);

        if (st.sections[0]) {
          setSectionId(st.sections[0].id);
        }
      })
      .catch((e) => {
        setError(
          e instanceof ApiError
            ? e.message
            : 'Impossible de charger les modèles.'
        );
      })
      .finally(() => setLoading(false));
  }, [currentUser]);

  useEffect(() => {
    if (
      guideNodes.length &&
      !guideNodes.some((x) => x.id === nodeId)
    ) {
      setNodeId(guideNodes[0].id);
    }

    if (!guideNodes.length) {
      setNodeId('');
    }
  }, [guideNodes, nodeId]);

  async function addFiles(files: File[]) {
    if (files.length === 0 || !nodeId) return;

    setError('');
    setSuccess('');
    setUploading(true);

    const fileCount = files.length;
    let uploadedCount = 0;
    let failedCount = 0;

    try {
      for (const file of files) {
        try {
          await api.uploadGuideTemplate(nodeId, file);
          uploadedCount += 1;
        } catch (e) {
          failedCount += 1;

          if (e instanceof ApiError) {
            setError(e.message);
          } else {
            setError(
              `Impossible d'ajouter le fichier « ${file.name} ».`
            );
          }
        }
      }

      const updated =
        (await api.listGuideTemplates()) as GuideTemplate[];

      setTemplates(updated);

      if (uploadedCount === fileCount) {
        setSuccess(
          `${uploadedCount} modèle${
            uploadedCount > 1 ? 's' : ''
          } ajouté${uploadedCount > 1 ? 's' : ''}.`
        );
      } else if (uploadedCount > 0) {
        setSuccess(
          `${uploadedCount} modèle${
            uploadedCount > 1 ? 's' : ''
          } ajouté${uploadedCount > 1 ? 's' : ''} sur ${fileCount}.`
        );
      } else if (failedCount > 0) {
        setError(`Aucun modèle n'a pu être ajouté.`);
      }
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Impossible de charger les modèles.'
      );
    } finally {
      setUploading(false);
    }
  }

  async function remove(t: GuideTemplate) {
    if (
      !window.confirm(
        `Supprimer le modèle « ${t.filename} » ?`
      )
    ) {
      return;
    }

    setError('');

    try {
      await api.deleteGuideTemplate(t.id);

      setTemplates((v) =>
        v.filter((x) => x.id !== t.id)
      );

      setSuccess('Modèle supprimé.');
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : 'Impossible de supprimer le modèle.'
      );
    }
  }

  if (currentUser?.role !== 'associe') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="font-semibold">
            Accès réservé aux associés
          </p>

          <Link
            href="/missions"
            className="text-sm font-semibold"
            style={{ color: '#2563eb' }}
          >
            ← Retour au questionnaire
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto"
      style={{ background: '#fafbfd' }}
    >
      <div className="max-w-5xl mx-auto px-8 py-7">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/missions"
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: 'white',
              border: '1px solid #e2e8f0',
              color: '#2563eb',
            }}
            title="Retour au questionnaire"
            aria-label="Retour au questionnaire"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
            >
              <path
                d="M10.8 3.5L5.5 9l5.3 5.5"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>

          <div>
            <p
              className="text-xs font-semibold uppercase tracking-widest"
              style={{ color: '#94a3b8' }}
            >
              Administration
            </p>

            <h1
              className="text-2xl font-bold"
              style={{ color: '#0f172a' }}
            >
              Modèles de guides
            </h1>
          </div>
        </div>

        <div
          className="rounded-2xl bg-white p-5 mb-5"
          style={{ border: '1px solid #eef2f7' }}
        >
          <p
            className="text-sm"
            style={{ color: '#64748b' }}
          >
            Les modèles sont gérés exclusivement dans ce module et
            stockés dans la base de données, pas dans le Drive ni dans
            le code source. Ils apparaissent automatiquement dans les
            zones « Guide » du questionnaire.
          </p>
        </div>

        {error && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="mb-4 px-4 py-3 rounded-xl text-sm"
            style={{
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
            }}
          >
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[290px_1fr] gap-5">
          <div
            className="rounded-2xl bg-white p-5 h-fit"
            style={{ border: '1px solid #eef2f7' }}
          >
            <label
              className="block text-xs font-bold uppercase tracking-wide mb-2"
              style={{ color: '#64748b' }}
            >
              1. Choisir l'étape
            </label>

            <select
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setNodeId('');
              }}
              className="w-full px-3 py-2.5 rounded-xl text-sm bg-white"
              style={{
                border: '1.5px solid #dbe4ef',
              }}
            >
              {structure?.sections.map((s) => (
                <option
                  key={s.id}
                  value={s.id}
                >
                  {s.id}. {s.label}
                </option>
              ))}
            </select>

            <label
              className="block text-xs font-bold uppercase tracking-wide mt-6 mb-2"
              style={{ color: '#64748b' }}
            >
              2. Sous-étapes avec guide
            </label>

            <div className="space-y-2">
              {loading && (
                <p
                  className="text-sm"
                  style={{ color: '#94a3b8' }}
                >
                  Chargement…
                </p>
              )}

              {!loading && !guideNodes.length && (
                <p
                  className="text-sm"
                  style={{ color: '#94a3b8' }}
                >
                  Aucune zone « Guide » dans cette étape.
                </p>
              )}

              {guideNodes.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => setNodeId(n.id)}
                  className="w-full text-left px-3 py-2.5 rounded-xl"
                  style={{
                    background:
                      nodeId === n.id
                        ? '#eff6ff'
                        : 'white',
                    border:
                      nodeId === n.id
                        ? '1.5px solid #93c5fd'
                        : '1px solid #eef2f7',
                  }}
                >
                  <b>{n.id}</b>

                  <span className="ml-2 text-sm">
                    {n.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div
            className="rounded-2xl bg-white p-6"
            style={{ border: '1px solid #eef2f7' }}
          >
            {!selectedNode ? (
              <div
                className="py-12 text-center text-sm"
                style={{ color: '#94a3b8' }}
              >
                Sélectionnez une zone « Guide ».
              </div>
            ) : (
              <>
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: '#94a3b8' }}
                >
                  Zone sélectionnée
                </p>

                <h2
                  className="text-xl font-bold mt-1 mb-5"
                  style={{ color: '#0f172a' }}
                >
                  {selectedNode.id}. {selectedNode.label}
                </h2>

                <label
                  className="flex items-center justify-center gap-3 min-h-[105px] rounded-2xl cursor-pointer"
                  style={{
                    border: '1.5px dashed #93c5fd',
                    background: '#f8fbff',
                    color: '#2563eb',
                  }}
                >
                  <input
                    type="file"
                    accept=".doc,.docx,.odt,.rtf,.xls,.xlsx,.ods,.ppt,.pptx,.odp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(
                        e.target.files ?? []
                      );

                      e.currentTarget.value = '';

                      void addFiles(files);
                    }}
                    disabled={uploading}
                  />

                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: '#eff6ff' }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 20 20"
                      fill="none"
                    >
                      <path
                        d="M10 13V3M6.5 6.5L10 3l3.5 3.5M4 11.5v3A2.5 2.5 0 006.5 17h7a2.5 2.5 0 002.5-2.5v-3"
                        stroke="currentColor"
                        strokeWidth="1.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>

                  <span className="text-sm font-semibold">
                    {uploading
                      ? 'Ajout des modèles…'
                      : 'Ajouter un ou plusieurs modèles éditables'}
                  </span>
                </label>

                <div className="mt-6">
                  <div className="flex justify-between mb-3">
                    <h3 className="text-sm font-bold">
                      Modèles attachés
                    </h3>

                    <span
                      className="text-xs"
                      style={{ color: '#94a3b8' }}
                    >
                      {selectedTemplates.length} fichier
                      {selectedTemplates.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  {!selectedTemplates.length && (
                    <div
                      className="rounded-xl px-4 py-4 text-sm"
                      style={{
                        background: '#f8fafd',
                        color: '#94a3b8',
                      }}
                    >
                      Aucun modèle attaché à cette zone.
                    </div>
                  )}

                  <div className="space-y-2">
                    {selectedTemplates.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl"
                        style={{
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">
                            {t.filename}
                          </p>

                          <p
                            className="text-xs"
                            style={{ color: '#94a3b8' }}
                          >
                            {sizeText(t.size)}
                            {t.size ? ' · ' : ''}
                            Disponible dans le questionnaire
                          </p>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <a
                            href={
                              t.download_url ||
                              `/api/guide-templates/${t.id}/download`
                            }
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{
                              background: '#eff6ff',
                              color: '#2563eb',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            Télécharger le modèle
                          </a>

                          <button
                            type="button"
                            onClick={() => void remove(t)}
                            className="w-8 h-8 rounded-lg"
                            style={{
                              color: '#ef4444',
                              background: '#fef2f2',
                            }}
                            title="Supprimer"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

