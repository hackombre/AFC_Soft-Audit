'use client';

import { useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useMission } from '@/lib/mission-context';
import { api, ApiError } from '@/lib/api';
import type { Mission } from '@/lib/types';
import EntityModal from './EntityModal';
import MissionModal from './MissionModal';

type DateFilter = 'toutes' | 'proche' | 'depassee' | 'annee';

function daysUntil(d: string) {
  const target = new Date(d);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86400000);
}

function statusOf(m: Mission): { label: string; color: string; bg: string } {
  const days = daysUntil(m.closing_date);
  if (m.progress >= 100) return { label: 'Terminée', color: '#16a34a', bg: '#dcfce7' };
  if (days < 0) return { label: 'Clôture dépassée', color: '#ef4444', bg: '#fef2f2' };
  if (days <= 14) return { label: 'Clôture proche', color: '#f59e0b', bg: '#fef3c7' };
  return { label: 'En cours', color: '#2563eb', bg: '#eff6ff' };
}

export default function MissionsPanel() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const {
    entities,
    activeEntity,
    setActiveEntityId,
    missions,
    missionsForActiveEntity,
    activeMission,
    setActiveMissionId,
    loading,
    refreshEntities,
    refreshMissions,
  } = useMission();
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState<DateFilter>('toutes');
  const [entityModalOpen, setEntityModalOpen] = useState(false);
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canManage = currentUser?.role === 'associe' || currentUser?.role === 'directeur_mission';
  const onQuestionnairePage = pathname === '/missions';

  const missionCountByEntity = useMemo(() => {
    const map: Record<string, number> = {};
    missions.forEach((m) => {
      map[m.entity_id] = (map[m.entity_id] ?? 0) + 1;
    });
    return map;
  }, [missions]);

  const filteredEntities = useMemo(() => {
    if (!search.trim()) return entities;
    const q = search.trim().toLowerCase();
    return entities.filter(
      (e) => e.name.toLowerCase().includes(q) || (e.raison_sociale ?? '').toLowerCase().includes(q)
    );
  }, [entities, search]);

  const filteredMissions = useMemo(() => {
    let list = missionsForActiveEntity;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }
    if (dateFilter === 'proche') {
      list = list.filter((m) => {
        const d = daysUntil(m.closing_date);
        return d >= 0 && d <= 30;
      });
    } else if (dateFilter === 'depassee') {
      list = list.filter((m) => daysUntil(m.closing_date) < 0);
    } else if (dateFilter === 'annee') {
      const year = new Date().getFullYear();
      list = list.filter((m) => new Date(m.closing_date).getFullYear() === year);
    }
    return [...list].sort((a, b) => a.closing_date.localeCompare(b.closing_date));
  }, [missionsForActiveEntity, search, dateFilter]);

  function goToQuestionnaire(missionId: string) {
    setActiveMissionId(missionId);
    router.push('/missions');
  }

  async function handleDeleteEntity(e: React.MouseEvent, entityId: string) {
    e.stopPropagation();
    setDeleteError(null);
    if (!confirm('Supprimer cette entité ? Cela suppose qu’elle n’a plus aucune mission.')) return;
    try {
      await api.deleteEntity(entityId);
      await refreshEntities();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Impossible de supprimer l'entité.");
    }
  }

  async function handleDeleteMission(e: React.MouseEvent, missionId: string) {
    e.stopPropagation();
    setDeleteError(null);
    if (!confirm('Supprimer cette mission ? Cette action est irréversible (réponses et documents inclus).')) return;
    try {
      await api.deleteMission(missionId);
      await refreshMissions();
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : 'Impossible de supprimer la mission.');
    }
  }

  // ---- Entity-level view ----
  if (!activeEntity) {
    return (
      <div className="flex flex-col h-full shrink-0" style={{ width: '300px', background: 'white', borderRight: '1px solid #eef2f7' }}>
        <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #eef2f7' }}>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#94a3b8' }}>
            Entités
          </p>

          {canManage && (
            <button
              onClick={() => setEntityModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-base font-semibold transition-all mb-3"
              style={{ background: 'linear-gradient(135deg, #2563eb, #4f9cf9)', color: 'white', boxShadow: '0 8px 20px -6px rgba(37,99,235,0.4)' }}
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2.5v10M2.5 7.5h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
              Créer une entité
            </button>
          )}

          <div className="relative">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }}>
              <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une entité…"
              className="w-full pl-8 pr-3 py-2 rounded-lg text-sm"
              style={{ border: '1.5px solid #e2e8f0', color: '#0f172a' }}
            />
          </div>
          {deleteError && <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{deleteError}</p>}
        </div>

        <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-2">
          {loading && <p className="px-2 py-3 text-sm" style={{ color: '#94a3b8' }}>Chargement…</p>}
          {!loading && filteredEntities.length === 0 && (
            <p className="px-2 py-3 text-sm" style={{ color: '#94a3b8' }}>Aucune entité pour le moment.</p>
          )}
          {filteredEntities.map((e) => (
            <div
              key={e.id}
              onClick={() => setActiveEntityId(e.id)}
              className="w-full text-left rounded-xl px-4 py-3.5 transition-all cursor-pointer group relative"
              style={{ background: 'white', border: '1px solid #eef2f7' }}
            >
              <p className="text-base font-semibold truncate mb-0.5 pr-6" style={{ color: '#0f172a' }}>{e.name}</p>
              {e.raison_sociale && (
                <p className="text-sm truncate mb-1" style={{ color: '#64748b' }}>{e.raison_sociale}</p>
              )}
              <span className="text-xs" style={{ color: '#94a3b8' }}>
                {missionCountByEntity[e.id] ?? 0} mission{(missionCountByEntity[e.id] ?? 0) > 1 ? 's' : ''}
              </span>
              {canManage && (
                <button
                  onClick={(ev) => handleDeleteEntity(ev, e.id)}
                  className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: '#ef4444' }}
                  aria-label="Supprimer l'entité"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2.5 3.5h8M5.5 3.5V2h2v1.5M5 3.5l.5 8h2l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="px-4 py-3 text-xs" style={{ borderTop: '1px solid #eef2f7', color: '#94a3b8' }}>
          Total : {entities.length} entité{entities.length > 1 ? 's' : ''}
        </div>
        <EntityModal open={entityModalOpen} onClose={() => setEntityModalOpen(false)} />
      </div>
    );
  }

  // ---- Mission-level view (entity selected) ----
  return (
    <div className="flex flex-col h-full shrink-0" style={{ width: '300px', background: 'white', borderRight: '1px solid #eef2f7' }}>
      <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid #eef2f7' }}>
        <button
          onClick={() => setActiveEntityId(null)}
          className="flex items-center gap-1.5 text-xs font-semibold mb-2.5"
          style={{ color: '#2563eb' }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M7.5 2.5L3 6l4.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Toutes les entités
        </button>
        <p className="text-base font-bold truncate mb-3" style={{ color: '#0f172a' }}>{activeEntity.name}</p>

        {canManage && (
          <button
            onClick={() => setMissionModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-base font-semibold transition-all mb-3"
            style={{ background: 'linear-gradient(135deg, #2563eb, #4f9cf9)', color: 'white', boxShadow: '0 8px 20px -6px rgba(37,99,235,0.4)' }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 2.5v10M2.5 7.5h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
            Créer une mission
          </button>
        )}

        <div className="relative mb-2.5">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#94a3b8' }}>
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une mission…"
            className="w-full pl-8 pr-3 py-2 rounded-lg text-sm"
            style={{ border: '1.5px solid #e2e8f0', color: '#0f172a' }}
          />
        </div>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
          className="w-full px-3 py-2 rounded-lg text-sm bg-white"
          style={{ border: '1.5px solid #e2e8f0', color: '#334155' }}
        >
          <option value="toutes">Toutes les dates de clôture</option>
          <option value="proche">Clôture dans les 30 jours</option>
          <option value="depassee">Clôture dépassée</option>
          <option value="annee">Clôture cette année</option>
        </select>
        {deleteError && <p className="text-xs mt-2" style={{ color: '#ef4444' }}>{deleteError}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-2.5 py-2.5 space-y-2">
        {!loading && filteredMissions.length === 0 && (
          <p className="px-2 py-3 text-sm" style={{ color: '#94a3b8' }}>Aucune mission pour cette entité.</p>
        )}
        {filteredMissions.map((m) => {
          const isActive = m.id === activeMission?.id;
          const status = statusOf(m);
          return (
            <div
              key={m.id}
              onClick={() => setActiveMissionId(m.id)}
              className="w-full text-left rounded-xl px-4 py-3.5 transition-all cursor-pointer group relative"
              style={{
                background: isActive ? '#eff6ff' : 'white',
                border: isActive ? '1.5px solid #93c5fd' : '1px solid #eef2f7',
              }}
            >
              <div className="flex items-start justify-between gap-1.5">
                <p className="text-base font-semibold truncate mb-1.5 pr-1" style={{ color: '#0f172a' }}>{m.name}</p>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={(ev) => { ev.stopPropagation(); goToQuestionnaire(m.id); }}
                    className="w-6 h-6 flex items-center justify-center rounded-lg transition-all"
                    style={{
                      color: isActive && onQuestionnairePage ? '#cbd5e1' : '#2563eb',
                      background: isActive ? '#dbeafe' : 'transparent',
                    }}
                    aria-label="Ouvrir le questionnaire de cette mission"
                    title="Ouvrir le questionnaire"
                  >
                    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                      <path d="M4.5 2.5L9 6.5l-4.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  {canManage && (
                    <button
                      onClick={(ev) => handleDeleteMission(ev, m.id)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ color: '#ef4444' }}
                      aria-label="Supprimer la mission"
                    >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                        <path d="M2.5 3.5h8M5.5 3.5V2h2v1.5M5 3.5l.5 8h2l.5-8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: status.bg, color: status.color }}>
                  {status.label}
                </span>
                <span className="text-sm" style={{ color: '#94a3b8' }}>{Math.round(m.progress)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 text-xs" style={{ borderTop: '1px solid #eef2f7', color: '#94a3b8' }}>
        Total : {missionsForActiveEntity.length} mission{missionsForActiveEntity.length > 1 ? 's' : ''}
      </div>
      <EntityModal open={entityModalOpen} onClose={() => setEntityModalOpen(false)} />
      <MissionModal open={missionModalOpen} onClose={() => setMissionModalOpen(false)} />
    </div>
  );
}
