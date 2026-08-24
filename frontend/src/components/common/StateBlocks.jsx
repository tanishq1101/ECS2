/**
 * Loading / error / empty states.
 *
 * Every data-driven page uses these instead of rendering nothing, so a slow or
 * failed request is always explained rather than looking like a broken screen.
 */

export function LoadingState({ message = 'Loading…' }) {
  return (
    <div className="state-block" role="status" aria-live="polite">
      <div className="spinner" aria-hidden="true" />
      <p className="state-text">{message}</p>
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'Please try again.',
  onRetry,
}) {
  return (
    <div className="state-block" role="alert">
      <span className="state-icon" aria-hidden="true">⚠️</span>
      <p className="state-title">{title}</p>
      <p className="state-text">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onRetry()}>
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ icon = '🍽️', title, message, action }) {
  return (
    <div className="state-block">
      <span className="state-icon" aria-hidden="true">{icon}</span>
      {title && <p className="state-title">{title}</p>}
      {message && <p className="state-text">{message}</p>}
      {action}
    </div>
  );
}

/** Placeholder blocks used while meal cards load for the first time. */
export function CardSkeleton({ count = 3, height = 300 }) {
  return (
    <div className="meal-grid" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton" style={{ height }} />
      ))}
    </div>
  );
}
