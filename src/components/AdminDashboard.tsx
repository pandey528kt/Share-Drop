import { useState } from 'react';
import { LogOut } from 'lucide-react';
import AdminActivityPanel from '@/components/AdminActivityPanel';
import AdminFoldersPanel from '@/components/AdminFoldersPanel';
import FileList from '@/components/FileList';
import FilePreview from '@/components/FilePreview';
import Modal from '@/components/Modal';
import { useFileList } from '@/hooks/useFileList';
import { fetchAllFiles } from '@/lib/fileStorage';
import { supabase } from '@/lib/supabase';
import type { SharedFile } from '@/types/sharedFile';

interface AdminDashboardProps {
  email: string;
}

export default function AdminDashboard({ email }: AdminDashboardProps) {
  const { files, status, loadError, reload, removeFile } = useFileList(fetchAllFiles);
  const [previewFile, setPreviewFile] = useState<SharedFile | null>(null);

  const signOut = () => {
    void supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Admin panel</p>
            <p className="truncate text-xs text-slate-500">Signed in as {email}</p>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">Public site</a>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6">
        <AdminFoldersPanel />

        <AdminActivityPanel />

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-4 sm:px-6">
            <h2 className="text-base font-semibold text-slate-900">All files</h2>
            <p className="text-sm text-slate-500">{files.length} {files.length === 1 ? 'file' : 'files'}, including those in folders</p>
          </div>
          <FileList
            files={files}
            status={status}
            loadError={loadError}
            onReload={reload}
            folderPassword={null}
            onPreview={setPreviewFile}
            onDelete={(file) => removeFile(file, null)}
          />
        </section>
      </main>

      {previewFile && (
        <Modal title={previewFile.name} onClose={() => setPreviewFile(null)} size="lg">
          <FilePreview file={previewFile} folderPassword={null} />
        </Modal>
      )}
    </div>
  );
}
