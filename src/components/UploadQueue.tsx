import { AlertCircle, CheckCircle2 } from 'lucide-react';
import FileIcon from '@/components/FileIcon';
import { formatBytes, getFolderPath } from '@/lib/format';
import type { UploadItem } from '@/hooks/useUploads';

interface UploadQueueProps {
  items: UploadItem[];
  onClearFinished: () => void;
}

export default function UploadQueue({ items, onClearFinished }: UploadQueueProps) {
  const hasFinished = items.some((item) => item.status !== 'uploading');
  const activeCount = items.filter((item) => item.status === 'uploading').length;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-base font-semibold text-slate-900">
          {activeCount > 0 ? `Uploading ${activeCount} of ${items.length}` : `Uploads (${items.length})`}
        </h2>
        {hasFinished && (
          <button
            type="button"
            onClick={onClearFinished}
            className="text-sm font-medium text-teal-700 transition-colors hover:text-teal-900"
          >
            Clear finished
          </button>
        )}
      </div>

      <ul className="mt-4 space-y-4">
        {items.map((item) => {
          const folder = getFolderPath(item.relativePath);
          return (
            <li key={item.id} className="flex items-start gap-3 animate-fade-in">
              <FileIcon name={item.name} mimeType="" className="h-9 w-9" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium text-slate-900">{item.name}</p>
                  <span className="shrink-0 text-xs text-slate-500">{formatBytes(item.size)}</span>
                </div>
                {folder && <p className="truncate text-xs text-slate-500">{folder}</p>}

                {item.status === 'uploading' && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-teal-600 transition-[width] duration-200 ease-out"
                        style={{ width: `${Math.round(item.progress * 100)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-medium tabular-nums text-slate-600">
                      {Math.round(item.progress * 100)}%
                    </span>
                  </div>
                )}

                {item.status === 'done' && (
                  <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Uploaded and ready to share
                  </p>
                )}

                {item.status === 'error' && (
                  <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-medium text-red-700">
                    <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
                    <span>{item.error}</span>
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
