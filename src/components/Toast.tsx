interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  if (!message) return null;
  return (
    <div className="toast-container" role="status" aria-live="polite" data-testid="toast-message">
      <div className="toast-pill">{message}</div>
    </div>
  );
}
