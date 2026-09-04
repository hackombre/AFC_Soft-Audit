'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  value: string; // 'YYYY-MM-DD'
  onChange: (value: string) => void;
  placeholder?: string;
}

const MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const DAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function parseISO(v: string): Date | null {
  if (!v) return null;
  const [y, m, d] = v.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export default function DatePicker({ value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const selected = parseISO(value);
  const [viewYear, setViewYear] = useState(selected ? selected.getFullYear() : new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(selected ? selected.getMonth() : new Date().getMonth());
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  function updatePosition() {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const panelWidth = 280;
    let left = r.left;
    if (left + panelWidth > window.innerWidth - 8) left = window.innerWidth - panelWidth - 8;
    setPos({ top: r.bottom + 6, left, width: r.width });
  }

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function onClickOutside(e: MouseEvent) {
      if (
        btnRef.current && !btnRef.current.contains(e.target as Node) &&
        panelRef.current && !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function onScrollOrResize() {
      updatePosition();
    }
    document.addEventListener('mousedown', onClickOutside);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shiftMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  }

  const displayLabel = selected
    ? selected.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm text-left transition-all"
        style={{ border: `1.5px solid ${open ? '#2563eb' : '#e2e8f0'}`, color: selected ? '#0f172a' : '#94a3b8' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: '#2563eb' }} className="shrink-0">
          <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2 6.5h12M5 2v2.5M11 2v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
        {displayLabel || placeholder || 'Sélectionner une date'}
      </button>

      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          className="fixed rounded-2xl overflow-hidden animate-fade-in"
          style={{
            top: pos.top,
            left: pos.left,
            width: '280px',
            zIndex: 200,
            background: 'white',
            border: '1px solid #e2e8f0',
            boxShadow: '0 16px 40px rgba(37,99,235,0.2)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <button type="button" onClick={() => shiftMonth(-1)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: '#64748b' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
            <p className="text-sm font-semibold" style={{ color: '#0f172a' }}>{MONTHS[viewMonth]} {viewYear}</p>
            <button type="button" onClick={() => shiftMonth(1)} className="w-7 h-7 flex items-center justify-center rounded-lg" style={{ color: '#64748b' }}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>

          <div className="px-3 pt-3 pb-1 grid grid-cols-7 gap-1">
            {DAYS.map((d, i) => (
              <div key={i} className="text-center text-[11px] font-semibold" style={{ color: '#94a3b8' }}>{d}</div>
            ))}
          </div>

          <div className="px-3 pb-3 grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day == null) return <div key={i} />;
              const iso = toISO(viewYear, viewMonth, day);
              const isSelected = value === iso;
              const isToday = iso === toISO(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    onChange(iso);
                    setOpen(false);
                  }}
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-sm transition-all mx-auto"
                  style={{
                    background: isSelected ? 'linear-gradient(135deg, #2563eb, #60a5fa)' : 'transparent',
                    color: isSelected ? 'white' : '#334155',
                    fontWeight: isSelected ? 700 : isToday ? 700 : 400,
                    border: !isSelected && isToday ? '1.5px solid #93c5fd' : '1.5px solid transparent',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              const now = new Date();
              onChange(toISO(now.getFullYear(), now.getMonth(), now.getDate()));
              setViewYear(now.getFullYear());
              setViewMonth(now.getMonth());
              setOpen(false);
            }}
            className="w-full text-xs font-medium px-3 py-2.5 text-center"
            style={{ color: '#2563eb', borderTop: '1px solid #f1f5f9' }}
          >
            Aujourd&rsquo;hui
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
