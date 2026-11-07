import { useCallback, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import FileList from '@/components/FileList';
import Modal from '@/components/Modal';
import FilePreview from '@/components/FilePreview';
import UploadDropzone from '@/components/UploadDropzone';
import UploadQueue from '@/components/UploadQueue';
import { useFileList } from '@/hooks/useFileList';
import { useUploads } from '@/hooks/useUploads';
import type { UploadCandidate, UploadTarget } from '@/lib/fileStorage';
import type { SharedFile } from '@/types/sharedFile';

interface FileWorkspaceProps {
  title: string;
  fetcher: () => Promise<SharedFile[]>;
  target: UploadTarget;
  folderPassword: string | null;
}

export default function FileWorkspace({ title, fetcher, target, folderPassword }: FileWorkspaceProps) {
  const { files, status, loadError, reload, addFile, removeFile } = useFileList(fetcher);
  const [previewFile, setPreviewFile] = useState<SharedFile | null>(null);

  const { items: uploads, startUploads, clearFinished } = useUploads(addFile);
  const handleFiles = useCallback(
    (candidates: UploadCandidate[]) => startUploads(candidates, target),
    [startUploads, target],
  );

  return (
    <>
      <UploadDropzone onFiles={handleFiles} />

      {uploads.length > 0 && <UploadQueue items={uploads} onClearFinished={clearFinished} />}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="text-sm text-slate-500">
              {files.length} {files.length === 1 ? 'file' : 'files'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reload}
              disabled={status === 'loading'}
              aria-label="Refresh file list"
              title="Refresh"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <FileList
          files={files}
          status={status}
          loadError={loadError}
          onReload={reload}
          folderPassword={folderPassword}
          onPreview={setPreviewFile}
          onDelete={(file) => removeFile(file, folderPassword)}
        />
      </section>

      {previewFile && (
        <Modal title={previewFile.name} onClose={() => setPreviewFile(null)} size="lg">
          <FilePreview file={previewFile} folderPassword={folderPassword} />
        </Modal>
      )}
    </>
  );
}
