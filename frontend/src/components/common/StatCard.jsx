/** Compact metric tile used on the student dashboard, history and profile. */

export default function StatCard({ label, value, hint, icon, accent, meter }) {
  return (
    <div className={`stat-card${accent ? ` stat-accent-${accent}` : ''}`}>
      <p className="stat-label">
        {icon && <span aria-hidden="true">{icon}</span>}
        {label}
      </p>
      <p className="stat-value">{value}</p>
      {hint && <p className="stat-hint">{hint}</p>}
      {typeof meter === 'number' && (
        <div className="meter" role="presentation">
          <div className="meter-fill" style={{ width: `${Math.min(Math.max(meter, 0), 100)}%` }} />
        </div>
      )}
    </div>
  );
}
