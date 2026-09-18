'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useMission } from '@/lib/mission-context';
import type { UserOut } from '@/lib/types';
import { ROLE_LABELS } from '@/lib/types';
import DatePicker from './DatePicker';
import Modal from './Modal';

export default function MissionModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { activeEntity, refreshMissions, setActiveMissionId } = useMission();
  const [name, setName] = useState('');
  const [closingDate, setClosingDate] = useState('');
  const [users, setUsers] = useState<UserOut[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) api.listUsers().then((list) => setUsers(list as UserOut[])).catch(() => {});
  }, [open]);

  function reset() {
    setName('');
    setClosingDate('');
    setSelectedMembers(new Set());
    setError(null);
  }

  function toggleMember(id: string) {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!activeEntity) {
      setError("Sélectionnez d'abord une entité.");
      return;
    }
    if (!closingDate) {
      setError('Merci de choisir une date de clôture.');
      return;
    }
    setSubmitting(true);
    try {
      const mission = (await api.createMission({
        entity_id: activeEntity.id,
        name,
        closing_date: closingDate,
        member_ids: Array.from(selectedMembers),
      })) as import('@/lib/types').Mission;

      // La mission est créée dans tous les cas à ce stade — un
      // échec ici ne concerne que la synchronisation Google
      // Drive, pas la création elle-même. On ferme le
      // formulaire normalement et on avertit séparément, plutôt
      // que de laisser croire à un échec (qui pousserait à
      // recliquer sur « Créer » et dupliquer la mission).
      await refreshMissions();
      setActiveMissionId(mission.id);
      reset();
      onClose();

      if (mission.drive_sync_warning) {
        window.alert(
          `Mission créée. ${mission.drive_sync_warning}`
        );
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Impossible de créer la mission.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = { border: '1.5px solid #e2e8f0', color: '#0f172a' } as React.CSSProperties;

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose(); }}
      title="Créer une mission"
      subtitle={activeEntity ? `Pour l'entité ${activeEntity.name}` : undefined}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>
            Nom de la mission <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="AUDIT 2025"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>
            Date de clôture <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <DatePicker value={closingDate} onChange={setClosingDate} placeholder="Choisir une date" />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: '#334155' }}>
            Équipe de mission
          </label>
          <div className="rounded-xl divide-y max-h-48 overflow-y-auto" style={{ border: '1.5px solid #e2e8f0' }}>
            {users.length === 0 && (
              <p className="px-3.5 py-3 text-sm" style={{ color: '#94a3b8' }}>Aucun utilisateur pour le moment.</p>
            )}
            {users.map((u) => (
              <label key={u.id} className="flex items-center gap-3 px-3.5 py-2.5 text-sm" style={{ color: '#0f172a', opacity: u.role === 'associe' ? 0.65 : 1 }}>
                <input
                  type="checkbox"
                  disabled={u.role === 'associe'}
                  checked={u.role === 'associe' || selectedMembers.has(u.id)}
                  onChange={() => toggleMember(u.id)}
                  className="accent-blue-600"
                />
                <span className="flex-1 min-w-0"><b>{u.first_name} {u.last_name}</b><span className="block text-xs truncate" style={{ color: '#64748b' }}>{u.email}</span></span>
                <span className="text-xs shrink-0" style={{ color: '#94a3b8' }}>{u.role === 'associe' ? 'Accès obligatoire' : ROLE_LABELS[u.role]}</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-3.5 py-2.5 rounded-xl text-sm" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{ background: submitting ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #4f9cf9)', color: 'white' }}
          >
            {submitting ? 'Création…' : 'Créer la mission'}
          </button>
          <button
            type="button"
            onClick={() => { reset(); onClose(); }}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ border: '1.5px solid #e2e8f0', color: '#334155' }}
          >
            Annuler
          </button>
        </div>
      </form>
    </Modal>
  );
}