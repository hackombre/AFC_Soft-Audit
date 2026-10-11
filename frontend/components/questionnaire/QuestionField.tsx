'use client';

import { useEffect, useRef } from 'react';
import { api, ApiError } from '@/lib/api';
import type { QuestionDef } from '@/lib/types';

interface AttachedDoc {
  id: string;
  filename: string;
}

interface Props {
  question: QuestionDef;
  index: number;
  value: unknown;
  onChange: (value: unknown) => void;
  comment: string;
  onCommentChange: (comment: string) => void;
  attachedDocs: AttachedDoc[];
  uploading: boolean;
  onAttach: (files: FileList | null) => void;
  onRemoveAttachment: (documentId: string) => void;
  capitalTarget?: unknown;
  readOnly?: boolean;
  hideHeader?: boolean;
}

function cleanVisibleLabel(label: string): string {
  return label.replace(/\s+[A-Z]-[\w.-]+$/u, '').trim();
}

function AutoGrowTextarea({
  value,
  onChange,
  rows = 6,
  placeholder,
  className,
  style,
  minHeight,
  maxHeight,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  minHeight?: number;
  maxHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = () => {
    const el = ref.current;
    if (!el) return;

    el.style.height = 'auto';

    const minimum = minHeight ?? rows * 24;
    const maximum = maxHeight ?? 900;

    el.style.height = `${Math.min(
      Math.max(el.scrollHeight, minimum),
      maximum
    )}px`;

    el.style.overflowY =
      el.scrollHeight > maximum ? 'auto' : 'hidden';
  };

  useEffect(() => {
    resize();
  }, [value, rows, minHeight, maxHeight]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        requestAnimationFrame(resize);
      }}
      rows={rows}
      placeholder={placeholder}
      className={className}
      style={{
        ...style,
        minHeight: `${minHeight ?? rows * 24}px`,
        maxHeight: maxHeight
          ? `${maxHeight}px`
          : undefined,
      }}
    />
  );
}

const inputStyle: React.CSSProperties = {
  border: '1.5px solid #e2e8f0',
  color: '#0f172a',
};

function RadioPills({
  value,
  onChange,
  withNA,
}: {
  value: string;
  onChange: (v: string) => void;
  withNA?: boolean;
}) {
  const options = withNA
    ? ['oui', 'non', 'na']
    : ['oui', 'non'];

  const labels: Record<string, string> = {
    oui: 'Oui',
    non: 'Non',
    na: 'N/A',
  };

  const colors: Record<string, string> = {
    oui: '#16a34a',
    non: '#ef4444',
    na: '#64748b',
  };

  return (
    <div className="flex gap-2">
      {options.map((opt) => {
        const active = value === opt;

        return (
          <button
            key={opt}
            type="button"
            onClick={() =>
              onChange(active ? '' : opt)
            }
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
            style={{
              border: `1.5px solid ${
                active ? colors[opt] : '#e2e8f0'
              }`,
              background: active
                ? `${colors[opt]}14`
                : 'white',
              color: active
                ? colors[opt]
                : '#64748b',
            }}
          >
            {labels[opt]}
          </button>
        );
      })}
    </div>
  );
}

function TableField({
  columns,
  value,
  onChange,
  capitalTarget,
}: {
  columns: string[];
  value: Record<string, string>[];
  onChange: (v: Record<string, string>[]) => void;
  capitalTarget?: unknown;
}) {
  const rows =
    value && value.length > 0 ? value : [];

  // Auto-calcul du capital :
  // Nombre de titres × Nominal = Capital (FCFA)
  const titresCol = columns.find((c) =>
    c.toLowerCase().includes('nombre de titres')
  );

  const nominalCol = columns.find(
    (c) => c.toLowerCase() === 'nominal'
  );

  const capitalCol = columns.find((c) =>
    c.toLowerCase().includes('capital')
  );

  const hasAutoCalc = Boolean(
    titresCol && nominalCol && capitalCol
  );

  function computeRowCapital(
    row: Record<string, string>
  ): number | null {
    if (!titresCol || !nominalCol) return null;

    const t = parseFloat(
      (row[titresCol] ?? '')
        .replace(/\s/g, '')
        .replace(',', '.')
    );

    const n = parseFloat(
      (row[nominalCol] ?? '')
        .replace(/\s/g, '')
        .replace(',', '.')
    );

    if (Number.isNaN(t) || Number.isNaN(n)) {
      return null;
    }

    return t * n;
  }

  const targetNum = (() => {
    if (capitalTarget == null) return null;

    const n = parseFloat(
      String(capitalTarget)
        .replace(/\s/g, '')
        .replace(',', '.')
    );

    return Number.isNaN(n) ? null : n;
  })();

  const rowsWithComputed = hasAutoCalc
    ? rows.map((r) => {
        const computed = computeRowCapital(r);

        return computed == null
          ? r
          : {
              ...r,
              [capitalCol as string]: String(computed),
            };
      })
    : rows;

  const sumComputed = hasAutoCalc
    ? rowsWithComputed.reduce(
        (s, r) =>
          s +
          (parseFloat(
            r[capitalCol as string] || '0'
          ) || 0),
        0
      )
    : null;

  const totalMismatch =
    hasAutoCalc &&
    targetNum != null &&
    sumComputed != null &&
    Math.round(sumComputed) !==
      Math.round(targetNum);

  function emptyRow(): Record<string, string> {
    return Object.fromEntries(
      columns.map((c) => [c, ''])
    );
  }

  function updateCell(
    rowIdx: number,
    col: string,
    val: string
  ) {
    const next = rows.map((r, i) =>
      i === rowIdx
        ? { ...r, [col]: val }
        : r
    );

    onChange(next);
  }

  function addRow() {
    onChange([...rows, emptyRow()]);
  }

  function removeRow(idx: number) {
    onChange(
      rows.filter((_, i) => i !== idx)
    );
  }

  return (
    <div>
      <div
        className="overflow-x-auto rounded-lg"
        style={{
          border: '1.5px solid #e2e8f0',
        }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: '#f8fafd' }}>
              {columns.map((c) => (
                <th
                  key={c}
                  className="text-left px-3 py-2 font-semibold"
                  style={{
                    color: '#374151',
                    borderBottom:
                      '1px solid #e2e8f0',
                  }}
                >
                  {c}
                </th>
              ))}

              <th
                style={{
                  width: 36,
                  borderBottom:
                    '1px solid #e2e8f0',
                }}
              />
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="px-3 py-3 text-center"
                  style={{
                    color: '#94a3b8',
                  }}
                >
                  Aucune ligne. Cliquez sur
                  « + Ajouter une ligne ».
                </td>
              </tr>
            )}

            {rowsWithComputed.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => {
                  const isAutoCol =
                    hasAutoCalc &&
                    c === capitalCol;

                  return (
                    <td
                      key={c}
                      className="px-2 py-1.5"
                      style={{
                        borderTop:
                          '1px solid #f1f5f9',
                      }}
                    >
                      <input
                        value={row[c] ?? ''}
                        readOnly={isAutoCol}
                        onChange={(e) =>
                          updateCell(
                            i,
                            c,
                            e.target.value
                          )
                        }
                        className="w-full px-2 py-1.5 rounded text-sm"
                        style={{
                          border:
                            '1px solid transparent',
                          background: isAutoCol
                            ? '#f8fafd'
                            : 'transparent',
                          color: isAutoCol
                            ? '#2563eb'
                            : undefined,
                          fontWeight: isAutoCol
                            ? 600
                            : 400,
                        }}
                        onFocus={(e) => {
                          if (!isAutoCol) {
                            e.currentTarget.style.border =
                              '1px solid #bfdbfe';
                          }
                        }}
                        onBlur={(e) => {
                          if (!isAutoCol) {
                            e.currentTarget.style.border =
                              '1px solid transparent';
                          }
                        }}
                      />
                    </td>
                  );
                })}

                <td
                  className="px-2 py-1.5 text-center"
                  style={{
                    borderTop:
                      '1px solid #f1f5f9',
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      removeRow(i)
                    }
                    className="text-xs"
                    style={{
                      color: '#ef4444',
                    }}
                    aria-label="Supprimer la ligne"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          type="button"
          onClick={addRow}
          className="w-full text-xs font-medium px-3 py-2 text-left"
          style={{
            color: '#3b82f6',
            borderTop:
              '1px solid #e2e8f0',
          }}
        >
          + Ajouter une ligne
        </button>
      </div>

      {hasAutoCalc && (
        <div className="mt-2 text-xs">
          <p style={{ color: '#64748b' }}>
            Capital calculé (Nombre de titres ×
            Nominal) :{' '}
            <strong
              style={{ color: '#0f172a' }}
            >
              {sumComputed?.toLocaleString(
                'fr-FR'
              )}{' '}
              FCFA
            </strong>

            {targetNum != null && (
              <>
                {' '}
                — capital saisi :{' '}
                <strong
                  style={{ color: '#0f172a' }}
                >
                  {targetNum.toLocaleString(
                    'fr-FR'
                  )}{' '}
                  FCFA
                </strong>
              </>
            )}
          </p>

          {totalMismatch && (
            <div
              className="mt-1.5 px-3 py-2 rounded-lg"
              style={{
                background: '#fef2f2',
                border:
                  '1px solid #fecaca',
                color: '#b91c1c',
              }}
            >
              Les éléments du tableau ne
              correspondent pas au capital
              saisi (écart de{' '}
              {Math.abs(
                Math.round(
                  (sumComputed ?? 0) -
                    (targetNum ?? 0)
                )
              ).toLocaleString('fr-FR')}{' '}
              FCFA).
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckboxList({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const selected = new Set(value || []);

  function toggle(opt: string) {
    const next = new Set(selected);

    if (next.has(opt)) {
      next.delete(opt);
    } else {
      next.add(opt);
    }

    onChange(Array.from(next));
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <label
          key={opt}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer"
          style={{
            border: `1.5px solid ${
              selected.has(opt)
                ? '#bfdbfe'
                : '#e2e8f0'
            }`,
            background: selected.has(opt)
              ? '#eff6ff'
              : 'white',
            color: '#0f172a',
          }}
        >
          <input
            type="checkbox"
            checked={selected.has(opt)}
            onChange={() => toggle(opt)}
            className="accent-blue-500"
          />
          {opt}
        </label>
      ))}
    </div>
  );
}

function CollecteField({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const v = value || {};

  function setAll(val: string) {
    onChange(
      Object.fromEntries(
        options.map((o) => [o, val])
      )
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-2.5">
        <button
          type="button"
          onClick={() => setAll('oui')}
          className="text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{
            border:
              '1.5px solid #bbf7d0',
            color: '#16a34a',
          }}
        >
          Répondre à tout : Oui
        </button>

        <button
          type="button"
          onClick={() => setAll('non')}
          className="text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{
            border:
              '1.5px solid #fecaca',
            color: '#ef4444',
          }}
        >
          Répondre à tout : Non
        </button>

        <button
          type="button"
          onClick={() => onChange({})}
          className="text-xs font-medium px-3 py-1.5 rounded-lg"
          style={{
            border:
              '1.5px solid #e2e8f0',
            color: '#64748b',
          }}
        >
          Tout effacer
        </button>
      </div>

      <div
        className="divide-y rounded-lg"
        style={{
          border:
            '1.5px solid #e2e8f0',
        }}
      >
        {options.map((opt) => (
          <div
            key={opt}
            className="flex items-center justify-between px-3 py-2 text-sm"
            style={{ color: '#0f172a' }}
          >
            <span>{opt}</span>

            <RadioPills
              value={v[opt] ?? ''}
              onChange={(nv) =>
                onChange({
                  ...v,
                  [opt]: nv,
                })
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function QuestionField({
  question,
  index,
  value,
  onChange,
  comment,
  onCommentChange,
  attachedDocs,
  uploading,
  onAttach,
  onRemoveAttachment,
  capitalTarget,
  readOnly,
  hideHeader = false,
}: Props) {
  const q = question;
  const fileInputId = `attach-${q.id}`;

  /**
   * Téléchargement des modèles de guide.
   *
   * IMPORTANT :
   * - On ne fait PAS window.open().
   * - On ne met PAS directement l'URL dans href.
   * - On récupère le fichier avec l'API authentifiée.
   * - On crée ensuite une URL Blob temporaire.
   * - L'attribut download force le téléchargement.
   */
  async function handleGuideDownload(
    guide: {
      id?: string;
      label: string;
      url: string;
      download_url?: string;
    }
  ) {
    try {
      let templateId = guide.id?.trim();

      /**
       * Sécurité supplémentaire :
       * si le backend n'a pas fourni guide.id,
       * on récupère l'ID depuis :
       *
       * /api/guide-templates/{ID}/download
       */
      if (!templateId) {
        const downloadUrl =
          guide.download_url ||
          guide.url ||
          '';

        try {
          const parsedUrl = new URL(
            downloadUrl,
            window.location.origin
          );

          const parts =
            parsedUrl.pathname
              .split('/')
              .filter(Boolean);

          const templateIndex =
            parts.findIndex(
              (part, i) =>
                part ===
                  'guide-templates' &&
                parts[i + 2] ===
                  'download'
            );

          if (
            templateIndex >= 0 &&
            parts[templateIndex + 1]
          ) {
            templateId =
              parts[
                templateIndex + 1
              ];
          }
        } catch {
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
      }

      if (!templateId) {
        throw new Error(
          'Identifiant du modèle introuvable.'
        );
      }

      console.log(
        '[AFCsoft] Téléchargement du modèle :',
        {
          templateId,
          filename: guide.label,
        }
      );

      /**
       * Appel API authentifié.
       * api.downloadGuideTemplate() retourne un Blob.
       */
      const blob =
        await api.downloadGuideTemplate(
          templateId
        );

      if (!(blob instanceof Blob)) {
        throw new Error(
          'Le serveur n’a pas retourné un fichier valide.'
        );
      }

      /**
       * Création d'une URL locale temporaire
       * pour le Blob reçu.
       */
      const objectUrl =
        window.URL.createObjectURL(
          blob
        );

      /**
       * Création d'un lien invisible.
       *
       * L'attribut download indique au navigateur
       * de télécharger le fichier plutôt que
       * de naviguer vers son contenu.
       */
      const link =
        document.createElement('a');

      link.href = objectUrl;
      link.download =
        guide.label ||
        'modele-guide';
      link.style.display = 'none';
      link.rel = 'noopener';

      document.body.appendChild(link);

      /**
       * Déclenchement du téléchargement.
       */
      link.click();

      /**
       * Suppression du lien DOM.
       */
      document.body.removeChild(link);

      /**
       * Libération de l'URL Blob après
       * le déclenchement du téléchargement.
       */
      window.setTimeout(() => {
        window.URL.revokeObjectURL(
          objectUrl
        );
      }, 1000);
    } catch (error) {
      console.error(
        '[AFCsoft] Erreur téléchargement modèle :',
        error
      );

      if (error instanceof ApiError) {
        window.alert(
          `Impossible de télécharger le modèle.\n\n${error.message}`
        );
        return;
      }

      if (error instanceof Error) {
        window.alert(
          `Impossible de télécharger le modèle.\n\n${error.message}`
        );
        return;
      }

      window.alert(
        'Impossible de télécharger le modèle.'
      );
    }
  }

  return (
    <div
      className="py-4"
      style={{
        borderBottom:
          '1px solid #f1f5f9',
      }}
    >
      {q.type !== 'label' &&
        !hideHeader && (
          <div className="mb-2.5">
            <p
              className="text-sm font-medium"
              style={{ color: '#334155' }}
            >
              {index > 0 && (
                <span
                  style={{
                    color: '#2563eb',
                    fontWeight: 700,
                  }}
                >
                  {index}-{' '}
                </span>
              )}

              {cleanVisibleLabel(q.label)}
            </p>
          </div>
        )}

      {q.type === 'label' && (
        <div
          className="px-3.5 py-2.5 rounded-lg text-sm leading-relaxed"
          style={{
            background: '#f8fafd',
            color: '#475569',
            whiteSpace: 'pre-line',
            fontWeight: q.bold
              ? 700
              : 400,
          }}
        >
          {cleanVisibleLabel(q.label)}
        </div>
      )}

      {q.guide_files &&
        q.guide_files.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2 mb-3">
            {q.guide_files.map((guide) => (
              <button
                key={
                  guide.id ||
                  guide.url
                }
                type="button"
                onClick={() =>
                  void handleGuideDownload(
                    guide
                  )
                }
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                style={{
                  color: '#2563eb',
                  background: '#eff6ff',
                  border:
                    '1px solid #bfdbfe',
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M3 2.5h5l3 3v6a1 1 0 01-1 1H3a1 1 0 01-1-1v-9a1 1 0 011-1zM8 2.5v3h3"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M7 7v3M5.5 8.5L7 10l1.5-1.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>

                {guide.label} · Télécharger le modèle
              </button>
            ))}
          </div>
        )}

      <div className="pl-0">
        {readOnly && (
          <p
            className="text-xs mb-1.5 flex items-center gap-1.5"
            style={{
              color: '#94a3b8',
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden="true"
            >
              <rect
                x="2.5"
                y="5"
                width="7"
                height="5"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              <path
                d="M4 5V3.5a2 2 0 014 0V5"
                stroke="currentColor"
                strokeWidth="1.2"
              />
            </svg>
            Rempli automatiquement depuis
            l&rsquo;entité
          </p>
        )}

        {(q.type === 'text' ||
          q.type === 'number') && (
          <input
            type={
              q.type === 'number'
                ? 'number'
                : 'text'
            }
            value={
              (value as string) ?? ''
            }
            onChange={(e) =>
              onChange(e.target.value)
            }
            readOnly={readOnly}
            className="w-full max-w-md px-3.5 py-2 rounded-lg text-sm"
            style={{
              ...inputStyle,
              background: readOnly
                ? '#f8fafd'
                : 'white',
              color: readOnly
                ? '#64748b'
                : inputStyle.color,
            }}
            placeholder="Votre réponse"
          />
        )}

        {q.type === 'date' && (
          <input
            type="date"
            value={
              (value as string) ?? ''
            }
            onChange={(e) =>
              onChange(e.target.value)
            }
            className="px-3.5 py-2 rounded-lg text-sm"
            style={inputStyle}
          />
        )}

        {q.type === 'textarea' && (
          <AutoGrowTextarea
            value={
              (value as string) ?? ''
            }
            onChange={
              onChange as (
                value: string
              ) => void
            }
            rows={Math.max(
              q.rows ?? 8,
              8
            )}
            minHeight={200}
            maxHeight={520}
            className="w-full px-3.5 py-2.5 rounded-lg text-sm"
            style={inputStyle}
            placeholder="Votre réponse"
          />
        )}

        {(q.type === 'radio' ||
          q.type === 'radio_na') && (
          <RadioPills
            value={
              (value as string) ?? ''
            }
            onChange={onChange}
            withNA={
              q.type === 'radio_na' ||
              q.withNA
            }
          />
        )}

        {q.type === 'select' && (
          <select
            value={
              (value as string) ?? ''
            }
            onChange={(e) =>
              onChange(e.target.value)
            }
            disabled={readOnly}
            className="w-full max-w-md px-3.5 py-2 rounded-lg text-sm bg-white"
            style={{
              ...inputStyle,
              background: readOnly
                ? '#f8fafd'
                : 'white',
              color: readOnly
                ? '#64748b'
                : inputStyle.color,
            }}
          >
            <option value="">
              Sélectionner…
            </option>

            {(q.options ?? []).map(
              (opt) => (
                <option
                  key={opt}
                  value={opt}
                >
                  {opt}
                </option>
              )
            )}
          </select>
        )}

        {q.type ===
          'checkbox_list' && (
          <CheckboxList
            options={
              q.options ?? []
            }
            value={
              (value as string[]) ??
              []
            }
            onChange={onChange}
          />
        )}

        {q.type === 'table' && (
          <TableField
            columns={
              q.columns ?? [
                'Élément',
                'Observation',
              ]
            }
            value={
              (value as Record<
                string,
                string
              >[]) ?? []
            }
            onChange={onChange}
            capitalTarget={
              q.id === 'A-1-7'
                ? capitalTarget
                : undefined
            }
          />
        )}

        {q.type === 'collecte' && (
          <CollecteField
            options={
              q.options ?? []
            }
            value={
              (value as Record<
                string,
                string
              >) ?? {}
            }
            onChange={onChange}
          />
        )}
      </div>

      {/* Commentaire + pièce jointe */}
      {q.type !== 'label' && (
        <>
          <div className="mt-3.5 flex flex-col sm:flex-row gap-2.5">
            <AutoGrowTextarea
              value={comment}
              onChange={onCommentChange}
              rows={2}
              minHeight={58}
              maxHeight={150}
              placeholder="Commentaire de l'auditeur (optionnel)…"
              className="flex-1 px-3.5 py-2 rounded-lg text-sm"
              style={{
                ...inputStyle,
                background: '#fafbfd',
              }}
            />

            <label
              htmlFor={fileInputId}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-all whitespace-nowrap"
              style={{
                border: `1.5px solid ${
                  attachedDocs.length > 0
                    ? '#bfdbfe'
                    : '#e2e8f0'
                }`,
                color:
                  attachedDocs.length > 0
                    ? '#2563eb'
                    : '#64748b',
                background:
                  attachedDocs.length > 0
                    ? '#eff6ff'
                    : 'white',
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M9.5 3.5L4.8 8.2a2 2 0 00.0 2.8l4.9-4.9a3.2 3.2 0 00-4.5-4.5L3.1 6.5a4.3 4.3 0 006 6L13.5 8"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {uploading
                ? 'Import…'
                : attachedDocs.length > 0
                ? `${attachedDocs.length} pièce${
                    attachedDocs.length >
                    1
                      ? 's'
                      : ''
                  } jointe${
                    attachedDocs.length >
                    1
                      ? 's'
                      : ''
                  }`
                : q.document_category ===
                  'travaux'
                ? 'Joindre les documents'
                : 'Joindre un document'}

              <input
                id={fileInputId}
                type="file"
                multiple
                className="hidden"
                onChange={(e) =>
                  onAttach(
                    e.target.files
                  )
                }
              />
            </label>
          </div>

          {attachedDocs.length > 0 && (
            <div className="mt-2 space-y-1">
              {attachedDocs.map(
                (doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs"
                    style={{
                      background:
                        '#f8fafd',
                      border:
                        '1px solid #eef2f7',
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      style={{
                        color: '#2563eb',
                      }}
                      className="shrink-0"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 1.5h4.5L9.5 3.5V10a1 1 0 01-1 1H3a1 1 0 01-1-1V2.5a1 1 0 011-1zm4.5 0v2h2"
                        stroke="currentColor"
                        strokeWidth="1.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    <span
                      className="flex-1 truncate"
                      style={{
                        color: '#334155',
                      }}
                    >
                      {doc.filename}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        onRemoveAttachment(
                          doc.id
                        )
                      }
                      className="shrink-0"
                      style={{
                        color: '#ef4444',
                      }}
                      aria-label="Supprimer la pièce jointe"
                    >
                      <svg
                        width="12"
                        height="12"
                        viewBox="0 0 12 12"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 3l6 6M9 3l-6 6"
                          stroke="currentColor"
                          strokeWidth="1.4"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
