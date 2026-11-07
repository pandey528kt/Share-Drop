import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';

interface ConfirmButtonProps {
  label: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
  className?: string;
}

export default function ConfirmButton({ label, confirmLabel, onConfirm, className = '' }: ConfirmButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
    } catch (confirmError) {
      setError(confirmError instanceof Error ? confirmError.message : 'That did not work. Please try again.');
      setBusy(false);
      setConfirming(false);
    }
  };

  if (!confirming) {
    return (
      <span className="inline-flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={`inline-flex items-center gap-2 rounded-xl border border-red-200 px-3.5 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 ${className}`}
        >
          <Trash2 className="h-4 w-4" />
          {label}
        </button>
        {error && <span role="alert" className="text-xs font-medium text-red-700">{error}</span>}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 animate-fade-in">
      <button
        type="button"
        onClick={handleConfirm}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
      >
        Cancel
      </button>
    </span>
  );
}
