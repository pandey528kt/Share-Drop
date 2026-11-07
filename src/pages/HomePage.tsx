import { useCallback, useState } from 'react';
import { FolderPlus } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import CreateFolderModal from '@/components/CreateFolderModal';
import FolderCard from '@/components/FolderCard';
import FileWorkspace from '@/components/FileWorkspace';
import { useFolders } from '@/hooks/useFolders';
import { fetchRootFiles } from '@/lib/fileStorage';

const ROOT_TARGET = { folderId: null, password: null };

export default function HomePage() {
  const { folders, status: folderStatus, loadError: folderError, reload: reloadFolders } = useFolders();
  const [creatingFolder, setCreatingFolder] = useState(false);
  const closeCreate = useCallback(() => setCreatingFolder(false), []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader />

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6 sm:py-14">
        <section className="max-w-2xl">
          <h1 className="text-3xl font-semibold leading-[1.2] tracking-tight text-slate-900 sm:text-4xl">
            Share files and folders in seconds
          </h1>
          <p className="mt-3 text-base leading-normal text-slate-600 sm:text-lg">
            Upload anything, get a link, and send it to anyone. No account, no setup.
          </p>
        </section>

        <section aria-labelledby="folders-heading" className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 id="folders-heading" className="text-base font-semibold text-slate-900">Folders</h2>
            <button
              type="button"
              onClick={() => setCreatingFolder(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-teal-300 hover:text-teal-800"
            >
              <FolderPlus className="h-4 w-4" />
              New folder
            </button>
          </div>

          {folderStatus === 'error' && (
            <p role="alert" className="text-sm font-medium text-red-700">
              {folderError}{' '}
              <button type="button" onClick={reloadFolders} className="underline underline-offset-2">Try again</button>
            </p>
          )}
          {folderStatus === 'ready' && folders.length === 0 && (
            <p className="text-sm text-slate-500">No folders yet. Create one to group files behind an optional password.</p>
          )}
          {folders.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {folders.map((folder) => (
                <FolderCard key={folder.id} folder={folder} />
              ))}
            </div>
          )}
        </section>

        <FileWorkspace
          title="Shared files"
          fetcher={fetchRootFiles}
          target={ROOT_TARGET}
          folderPassword={null}
        />
      </main>

      <footer className="flex flex-col items-center gap-2 pb-10 text-center text-sm text-slate-500">
        <p>FileShare. Anyone with a link can download its file.</p>
        <a href="/?admin" className="text-xs text-slate-400 transition-colors hover:text-slate-700">Admin</a>
      </footer>

      {creatingFolder && <CreateFolderModal onClose={closeCreate} onCreated={reloadFolders} />}
    </div>
  );
}
