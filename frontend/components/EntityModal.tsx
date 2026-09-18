'use client';

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useMission } from '@/lib/mission-context';
import Modal from './Modal';

const FORMES_JURIDIQUES = [
  'Société anonyme (SA)',
  'Société à responsabilité limité (SARL)',
  'Société par actions simplifiée (SAS)',
  'Société par actions simplifiée unipersonnelle (SASU)',
  'Association',
];

export default function EntityModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { refreshEntities, setActiveEntityId } = useMission();
  const [raisonSociale, setRaisonSociale] = useState('');
  const [sigle, setSigle] = useState('');
  const [formeJuridique, setFormeJuridique] = useState('');
  const [rccm, setRccm] = useState('');
  const [niu, setNiu] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setRaisonSociale('');
    setSigle('');
    setFormeJuridique('');
    setRccm('');
    setNiu('');
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const entity = await api.createEntity({
        name: raisonSociale,
        sigle: sigle.trim().toUpperCase(),
        raison_sociale: raisonSociale,
        forme_juridique: formeJuridique || null,
        rccm: rccm || null,
        niu: niu || null,
      });
      await refreshEntities();
      setActiveEntityId((entity as { id: string }).id);
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible de créer l'entité.");
    } finally {
      setSubmitting(false);
    }
  }

  const inputStyle = { border: '1.5px solid #e2e8f0', color: '#0f172a' } as React.CSSProperties;

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Créer une entité" subtitle="La société ou le client audité">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>
            Raison sociale <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            required
            autoFocus
            value={raisonSociale}
            onChange={(e) => setRaisonSociale(e.target.value)}
            placeholder="AUDITEX Société à responsabilité limitée"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>
            Sigle <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            required
            value={sigle}
            onChange={(e) => setSigle(e.target.value)}
            placeholder="ABC"
            className="w-full px-3.5 py-2.5 rounded-xl text-sm"
            style={inputStyle}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>
            Forme juridique
          </label>
          <select
            value={formeJuridique}
            onChange={(e) => setFormeJuridique(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-white"
            style={inputStyle}
          >
            <option value="">Sélectionner…</option>
            {FORMES_JURIDIQUES.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>
              Numéro RCCM
            </label>
            <input
              value={rccm}
              onChange={(e) => setRccm(e.target.value)}
              placeholder="RC/DLA/2020/B/1234"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: '#334155' }}>
              NIU
            </label>
            <input
              value={niu}
              onChange={(e) => setNiu(e.target.value)}
              placeholder="M012345678901A"
              className="w-full px-3.5 py-2.5 rounded-xl text-sm"
              style={inputStyle}
            />
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
            {submitting ? 'Création…' : "Créer l'entité"}
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
