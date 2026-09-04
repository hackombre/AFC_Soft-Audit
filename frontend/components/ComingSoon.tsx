export default function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#eff6ff' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" style={{ color: '#3b82f6' }}>
            <path d="M14 6v8m0 4v.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="14" cy="14" r="11" stroke="currentColor" strokeWidth="1.8" />
          </svg>
        </div>
        <h3 className="text-base font-semibold mb-1" style={{ color: '#0f172a' }}>{title}</h3>
        <p className="text-sm" style={{ color: '#94a3b8' }}>Cette fonctionnalité sera disponible prochainement.</p>
      </div>
    </div>
  );
}
