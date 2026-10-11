'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useMission } from '@/lib/mission-context';
import type { DocumentItem, QuestionnaireNode, QuestionnaireStructure } from '@/lib/types';
import FolderTree from '@/components/documents/FolderTree';

function findNode(nodes: QuestionnaireNode[], id: string): QuestionnaireNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = findNode(n.children, id);
    if (found) return found;
  }
  return null;
}

function ancestorIds(nodes: QuestionnaireNode[], targetId: string, trail: string[] = []): string[] | null {
  for (const n of nodes) {
    if (n.id === targetId) return trail;
    const found = ancestorIds(n.children, targetId, [...trail, n.id]);
    if (found) return found;
  }
  return null;
}

function pathLabels(nodes: QuestionnaireNode[], targetId: string, trail: string[] = []): string[] | null {
  for (const n of nodes) {
    const here = [...trail, n.label];
    if (n.id === targetId) return here;
    const found = pathLabels(n.children, targetId, here);
    if (found) return found;
  }
  return null;
}

function formatSize(bytes: number | null) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function fileIconColor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (['pdf'].includes(ext)) return '#ef4444';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return '#16a34a';
  if (['doc', 'docx'].includes(ext)) return '#2563eb';
  if (['png', 'jpg', 'jpeg', 'gif'].includes(ext)) return '#a855f7';
  return '#64748b';
}

function filterTree(nodes: QuestionnaireNode[], q: string): QuestionnaireNode[] {
  const out: QuestionnaireNode[] = [];
  for (const n of nodes) {
    const children = filterTree(n.children, q);
    const selfMatch = n.label.toLowerCase().includes(q) || n.id.toLowerCase().includes(q);
    if (selfMatch || children.length > 0) {
      out.push({ ...n, children });
    }
  }
  return out;
}

function inDateRange(iso: string | null, filter: string): boolean {
  if (filter === 'toutes') return true;
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  const days = (now.getTime() - d.getTime()) / 86400000;
  if (filter === '7j') return days <= 7;
  if (filter === '30j') return days <= 30;
  if (filter === 'mois') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  return true;
}

export default function DocumentationPage() {
  const { activeMission, loading: missionLoading } = useMission();
  const router = useRouter();
  const [structure, setStructure] = useState<QuestionnaireStructure | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeId, setActiveId] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState<'recus' | 'travaux'>('recus');
  const [dateFilter, setDateFilter] = useState('toutes');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getStructure().then((s) => {
      const struct = s as QuestionnaireStructure;
      setStructure(struct);
      const first = struct.sections[0];
      if (first) {
        setActiveId(first.id);
        setExpanded(new Set([first.id]));
      }
    });
  }, []);

  const loadDocuments = useCallback(() => {
    if (!activeMission) {
      setDocuments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.listDocuments(activeMission.id).then((rows) => {
      setDocuments(rows as DocumentItem[]);
      setLoading(false);
    });
  }, [activeMission]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const countByNode = useMemo(() => {
    const map: Record<string, number> = {};
    documents
      .filter((d) => d.category === category && inDateRange(d.uploaded_at, dateFilter))
      .forEach((d) => {
        map[d.node_id] = (map[d.node_id] ?? 0) + 1;
      });
    return map;
  }, [documents, category, dateFilter]);

  const currentNode = structure ? findNode(structure.sections, activeId) : null;
  const currentDocs = documents.filter(
    (d) => d.node_id === activeId && d.category === category && inDateRange(d.uploaded_at, dateFilter)
  );
  const breadcrumb = structure ? pathLabels(structure.sections, activeId) ?? [] : [];

  function selectNode(id: string) {
    setActiveId(id);
    setMobileMenuOpen(false);
    if (structure) {
      setExpanded((prev) => new Set([...prev, ...(ancestorIds(structure.sections, id) ?? [])]));
    }
  }

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !activeMission || !activeId) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        await api.uploadDocument(activeMission.id, activeId, file, { category });
      }
      loadDocuments();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(doc: DocumentItem) {
    if (!confirm(`Supprimer « ${doc.filename} » ?`)) return;
    await api.deleteDocument(doc.id);
    loadDocuments();
  }

  async function handleDownload(doc: DocumentItem) {
    const res = await fetch(api.documentDownloadUrl(doc.id), {
      credentials: 'same-origin',
    });
    if (!res.ok) {
      window.alert('Impossible de télécharger le document.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (missionLoading || !structure) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!activeMission) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm">
          <p className="text-sm font-medium mb-1" style={{ color: '#0f172a' }}>Aucune mission sélectionnée</p>
          <p className="text-sm mb-5" style={{ color: '#94a3b8' }}>
            Sélectionnez ou créez une mission pour classer ses documents.
          </p>
          <Link
            href="/missions"
            className="inline-block text-sm font-semibold px-4 py-2.5 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #2563eb, #4f9cf9)', color: 'white' }}
          >
            Voir les missions
          </Link>
        </div>
      </div>
    );
  }

  const nodesForTree = filter.trim()
    ? filterTree(structure.sections, filter.trim().toLowerCase())
    : structure.sections;

  return (
    <div className="afc-documentation-layout relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:flex-row" style={{ background: '#fafbfd' }}>
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Fermer le menu de documentation"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/40 md:hidden"
        />
      )}
      {/* Navigation des dossiers : tiroir sur mobile, barre latérale sur ordinateur */}
      <div
        className={`afc-documentation-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(88vw,320px)] min-h-0 shrink-0 flex-col overflow-hidden transition-transform duration-200 md:relative md:inset-auto md:z-auto md:w-[300px] md:translate-x-0 md:border-b-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ background: 'white', borderRight: '1px solid #eef2f7' }}
      >
        <div className="px-4 pt-3.5 pb-3" style={{ borderBottom: '1px solid #eef2f7' }}>
          <div className="flex items-center gap-2 mb-1">
            <button
              type="button"
              onClick={() => router.push('/missions')}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all hover:bg-slate-100"
              style={{ color: '#2563eb', border: '1px solid #dbeafe', background: '#eff6ff' }}
              aria-label="Retourner au questionnaire de la mission"
              title="Retourner au questionnaire de la mission"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M10.5 3.5L6 8l4.5 4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>Documentation</p>
          </div>
          <p className="text-xs mb-3" style={{ color: '#94a3b8' }}>{documents.length} fichier{documents.length > 1 ? 's' : ''} au total</p>

          <div className="flex rounded-xl p-1 mb-2.5" style={{ background: '#f1f5f9' }}>
            <button
              onClick={() => setCategory('recus')}
              className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all"
              style={{ background: category === 'recus' ? 'white' : 'transparent', color: category === 'recus' ? '#2563eb' : '#64748b', boxShadow: category === 'recus' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}
            >
              Documents reçus
            </button>
            <button
              onClick={() => setCategory('travaux')}
              className="flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all"
              style={{ background: category === 'travaux' ? 'white' : 'transparent', color: category === 'travaux' ? '#2563eb' : '#64748b', boxShadow: category === 'travaux' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none' }}
            >
              Travaux effectués
            </button>
          </div>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full mb-2.5 px-3 py-1.5 rounded-lg text-xs bg-white"
            style={{ border: '1.5px solid #e2e8f0', color: '#334155' }}
          >
            <option value="toutes">Toutes les dates</option>
            <option value="7j">7 derniers jours</option>
            <option value="30j">30 derniers jours</option>
            <option value="mois">Ce mois-ci</option>
          </select>

          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Rechercher un dossier…"
            className="w-full px-3 py-1.5 rounded-lg text-xs"
            style={{ border: '1.5px solid #e2e8f0', color: '#0f172a' }}
          />
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <FolderTree
            nodes={nodesForTree}
            activeId={activeId}
            expanded={expanded}
            onToggleExpand={toggleExpand}
            onSelect={selectNode}
            countByNode={countByNode}
          />
        </div>
      </div>

      {/* Contenu */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-3 border-b border-slate-100 bg-white px-3 py-2 md:hidden">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm"
            aria-label="Ouvrir le menu de documentation"
            aria-expanded={mobileMenuOpen}
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">Documentation</p>
            <p className="truncate text-xs text-slate-500">{currentNode ? `${currentNode.id}. ${currentNode.label}` : 'Choisir un dossier'}</p>
          </div>
        </div>
        {currentNode && (
          <div className="shrink-0 bg-white px-3 py-3 sm:px-6 sm:py-4" style={{ borderBottom: '1px solid #eef2f7' }}>
            <p className="mb-1 truncate text-xs" style={{ color: '#94a3b8' }}>
              {breadcrumb.slice(0, -1).join(' › ') || 'Questionnaire'}
            </p>
            <h3 className="text-base font-semibold truncate" style={{ color: '#0f172a' }}>
              {currentNode.id}. {currentNode.label}
            </h3>
          </div>
        )}

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFiles(e.dataTransfer.files);
            }}
            className="mb-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl px-3 py-7 text-center transition-all sm:mb-6 sm:py-8"
            style={{
              border: `1.5px dashed ${dragOver ? '#2563eb' : '#dbeafe'}`,
              background: dragOver ? '#eff6ff' : '#f8fafd',
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: '#eff6ff' }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ color: '#2563eb' }}>
                <path d="M10 13V4m0 0L6.5 7.5M10 4l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 13v2a1 1 0 001 1h10a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm font-medium" style={{ color: '#0f172a' }}>
              {uploading ? 'Import en cours…' : 'Glissez vos fichiers ici, ou cliquez pour importer'}
            </p>
            <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
              Seront classés dans « {currentNode?.label} » — {category === 'recus' ? 'Documents reçus' : 'Travaux effectués'}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {loading && (
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }} />
          )}

          {!loading && currentDocs.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: '#94a3b8' }}>
              Aucun document classé dans cette étape pour le moment.
            </p>
          )}

          {!loading && currentDocs.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #eef2f7' }}>
              {currentDocs.map((doc, i) => (
                <div
                  key={doc.id}
                  className="flex min-w-0 flex-wrap items-center gap-2 bg-white px-3 py-3 sm:flex-nowrap sm:gap-3 sm:px-4"
                  style={{ borderTop: i === 0 ? 'none' : '1px solid #f1f5f9' }}
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#f8fafd' }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: fileIconColor(doc.filename) }}>
                      <path d="M4 2h6l4 4v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1zm6 0v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" style={{ color: '#0f172a' }}>{doc.filename}</p>
                    <p className="text-xs" style={{ color: '#94a3b8' }}>
                      {formatSize(doc.size)}
                      {doc.uploaded_at && ` · ${new Date(doc.uploaded_at).toLocaleDateString('fr-FR')}`}
                    </p>
                  </div>
                  {doc.drive_web_url && (
                    <a
                      href={doc.drive_web_url}
                      target="_blank"
                      rel="noreferrer"
                      className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0"
                      style={{ border: '1.5px solid #bfdbfe', color: '#2563eb' }}
                      aria-label="Ouvrir dans Google Drive"
                      title="Ouvrir dans Google Drive"
                    >
                      ↗
                    </a>
                  )}
                  <button
                    onClick={() => handleDownload(doc)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition-all"
                    style={{ border: '1.5px solid #e2e8f0', color: '#2563eb' }}
                    aria-label="Télécharger"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 1.5v7m0 0L4 5.5M7 8.5L10 5.5M2 10.5v1.5a1 1 0 001 1h8a1 1 0 001-1v-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition-all"
                    style={{ border: '1.5px solid #fecaca', color: '#ef4444' }}
                    aria-label="Supprimer"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 3.5h9M5.5 3.5V2h3v1.5M5.5 6.5v4M8.5 6.5v4M3.5 3.5l.5 8.5h6l.5-8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
