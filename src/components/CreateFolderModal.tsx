import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/Modal';
import { createFolder } from '@/lib/folders';
import { messageFromError } from '@/lib/errors';

interface CreateFolderModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const inputClass =
  'mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20';

export default function CreateFolderModal({ onClose, onCreated }: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Give your folder a name.');
      return;
    }
    if (password.length > 0 && (password.length < 4 || password.length > 72)) {
      setError('Folder passwords must be between 4 and 72 characters, or left empty.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createFolder(trimmedName, password.length > 0 ? password : null);
      onCreated();
      onClose();
    } catch (createError) {
      setError(messageFromError(createError as Error, 'The folder could not be created. Please try again.'));
      setBusy(false);
    }
  };

  return (
    <Modal title="New folder" onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="folder-name" className="text-sm font-medium text-slate-700">Folder name</label>
          <input
            id="folder-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={80}
            autoFocus
            className={inputClass}
            placeholder="Project photos"
          />
        </div>
        <div>
          <label htmlFor="folder-password" className="text-sm font-medium text-slate-700">
            Password <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input
            id="folder-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            maxLength={72}
            autoComplete="new-password"
            className={inputClass}
            placeholder="4 to 72 characters"
          />
          <p className="mt-1.5 text-xs text-slate-500">Anyone opening the folder will need this password. Leave it empty for an open folder.</p>
        </div>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
        )}
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
            Create folder
          </button>
        </div>
      </form>
    </Modal>
  );
}
