import { useState, type FormEvent } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { verifyFolderPassword } from '@/lib/folders';
import { messageFromError } from '@/lib/errors';
import type { Folder } from '@/types/folder';

interface FolderPasswordGateProps {
  folder: Folder;
  onUnlock: (password: string) => void;
}

export default function FolderPasswordGate({ folder, onUnlock }: FolderPasswordGateProps) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!password) {
      setError('Enter the folder password.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const valid = await verifyFolderPassword(folder.id, password);
      if (!valid) {
        setError('The folder password is incorrect.');
        setBusy(false);
        return;
      }
      onUnlock(password);
    } catch (verifyError) {
      setError(messageFromError(verifyError as Error));
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-10 max-w-md animate-scale-in rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
        <Lock className="h-6 w-6" />
      </span>
      <h1 className="mt-5 text-xl font-semibold leading-[1.2] text-slate-900">{folder.name}</h1>
      <p className="mt-1 text-sm leading-normal text-slate-600">This folder is password protected. Enter its password to view the files.</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoFocus
          autoComplete="current-password"
          aria-label="Folder password"
          placeholder="Folder password"
          className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
        />
        {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 disabled:opacity-60"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Unlock folder
        </button>
      </form>
    </div>
  );
}
