'use client';

import { useState } from 'react';
import Modal from './Modal';

export default function SecurityCodeRevealModal({
  code,
  onClose,
}: {
  code: string;
  onClose: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard?.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <Modal
      open
      onClose={() => {}}
      title="Votre code de sécurité"
      subtitle="Généré automatiquement — à conserver précieusement"
      maxWidth="440px"
    >
      <p className="text-sm mb-4" style={{ color: '#334155' }}>
        Ce code supplémentaire vous sera demandé pour accéder aux entités et
        aux missions. Il ne sera <strong>affiché qu&rsquo;une seule fois</strong> —
        notez-le maintenant dans un endroit sûr.
      </p>

      <div
        className="flex items-center justify-between gap-3 px-4 py-4 rounded-xl mb-4"
        style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe' }}
      >
        <span
          className="text-2xl font-bold tracking-[0.25em]"
          style={{ color: '#1d4ed8', fontFamily: 'monospace' }}
        >
          {code}
        </span>
        <button
          onClick={copy}
          className="text-xs font-semibold px-3 py-2 rounded-lg shrink-0 transition-all"
          style={{ background: 'white', color: '#2563eb', border: '1px solid #bfdbfe' }}
        >
          {copied ? 'Copié !' : 'Copier'}
        </button>
      </div>

      <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5 accent-blue-600"
        />
        <span className="text-sm" style={{ color: '#334155' }}>
          J&rsquo;ai noté ce code en lieu sûr. Je comprends qu&rsquo;il ne sera plus jamais affiché.
        </span>
      </label>

      <button
        onClick={onClose}
        disabled={!confirmed}
        className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
        style={{
          background: confirmed ? 'linear-gradient(135deg, #2563eb, #4f9cf9)' : '#e2e8f0',
          color: confirmed ? 'white' : '#94a3b8',
        }}
      >
        Continuer
      </button>
    </Modal>
  );
}
