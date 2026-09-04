'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({ open, onClose, title, subtitle, children, maxWidth = '520px' }: Props) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 animate-fade-in"
      style={{ background: 'rgba(15,23,42,0.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-2xl overflow-hidden animate-fade-in"
        style={{ maxWidth, background: 'white', boxShadow: '0 24px 70px -20px rgba(15,23,42,0.35)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 pt-5 pb-4" style={{ borderBottom: '1px solid #eef2f7' }}>
          <div>
            <h2 className="text-lg font-semibold" style={{ color: '#0f172a' }}>{title}</h2>
            {subtitle && <p className="text-sm mt-0.5" style={{ color: '#94a3b8' }}>{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg shrink-0 transition-all"
            style={{ color: '#94a3b8' }}
            aria-label="Fermer"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
