import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { setFolderPassword } from '@/lib/folders';
import { messageFromError } from '@/lib/errors';
import type { Folder } from '@/types/folder';

interface SetFolderPasswordModalProps {
  folder: Folder;
  onClose: () => void;
  onSaved: () => void;
}

export default function SetFolderPasswordModal({ folder, onClose, onSaved }: SetFolderPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (password.length > 0 && (password.length < 4 || password.length > 72)) {
      setError('Folder passwords must be between 4 and 72 characters.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setFolderPassword(folder.id, password.length > 0 ? password : null);
      onSaved();
      onClose();
    } catch (saveError) {
      setError(messageFromError(saveError as Error, 'The password could not be saved.'));
      setBusy(false);
    }
  };

  return (
    <Modal title={folder.is_protected ? 'Change folder password' : 'Set folder password'} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="new-folder-password" className="text-sm font-medium text-slate-700">New password</label>
          <input
            id="new-folder-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoFocus
            maxLength={72}
            placeholder="4 to 72 characters"
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
          />
          <p className="mt-1.5 text-xs text-slate-500">Leave this empty and save to remove the password from {folder.name}.</p>
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </form>
    </Modal>
  );
}
