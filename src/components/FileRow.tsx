import { useState } from 'react';
import { Check, Download, Eye, Link2, Loader2, Trash2 } from 'lucide-react';
import FileIcon from '@/components/FileIcon';
import { downloadSharedFile } from '@/lib/fileAccess';
import { getShareUrl } from '@/lib/fileStorage';
import { formatBytes, formatDate, getFolderPath, getPreviewKind, getTypeLabel } from '@/lib/format';
import type { SharedFile } from '@/types/sharedFile';

interface FileRowProps {
  file: SharedFile;
  folderPassword: string | null;
  onPreview: (file: SharedFile) => void;
  onDelete: (file: SharedFile) => Promise<void>;
}

const iconButtonClass =
  'flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:cursor-not-allowed disabled:opacity-50';

export default function FileRow({ file, folderPassword, onPreview, onDelete }: FileRowProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const folder = getFolderPath(file.relative_path);
  const canPreview = getPreviewKind(file.mime_type) !== null;

  const handleDownload = async () => {
    setError(null);
    setIsDownloading(true);
    try {
      await downloadSharedFile(file, folderPassword);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    setError(null);
    try {
      await navigator.clipboard.writeText(getShareUrl(file.share_token));
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setError('Your browser blocked copying. Try again from a secure page.');
    }
  };

  const handleDelete = async () => {
    setError(null);
    setIsDeleting(true);
    try {
      await onDelete(file);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'This file could not be deleted.');
      setIsDeleting(false);
      setConfirmingDelete(false);
    }
  };

  return (
    <li className="group animate-fade-in px-4 py-4 transition-colors hover:bg-slate-50/70 sm:px-6">
      <div className="flex items-center gap-4">
        <FileIcon name={file.name} mimeType={file.mime_type} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-slate-900" title={file.name}>
            {file.name}
          </p>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {folder && <span className="text-slate-600">{folder} · </span>}
            {formatBytes(file.size_bytes)} · {getTypeLabel(file.name, file.mime_type)} · {formatDate(file.created_at)}
          </p>
          {error && (
            <p role="alert" className="mt-1 text-xs font-medium text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          {canPreview && (
            <button type="button" onClick={() => onPreview(file)} className={iconButtonClass} aria-label={`Preview ${file.name}`} title="Preview">
              <Eye className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading || isDeleting}
            className={iconButtonClass}
            aria-label={`Download ${file.name}`}
            title="Download"
          >
            {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            disabled={isDeleting}
            className={`${iconButtonClass} ${linkCopied ? 'text-emerald-600 hover:text-emerald-700' : ''}`}
            aria-label={`Copy share link for ${file.name}`}
            title={linkCopied ? 'Link copied' : 'Copy share link'}
          >
            {linkCopied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          </button>

          {confirmingDelete ? (
            <div className="ml-1 flex items-center gap-1 animate-fade-in">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-60"
              >
                {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={isDeleting}
                className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              disabled={isDeleting}
              className={`${iconButtonClass} hover:bg-red-50 hover:text-red-600`}
              aria-label={`Delete ${file.name}`}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
