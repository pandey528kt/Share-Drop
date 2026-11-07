import { FolderOpen, Lock } from 'lucide-react';
import type { Folder } from '@/types/folder';
import { formatDate } from '@/lib/format';

interface FolderCardProps {
  folder: Folder;
}

export default function FolderCard({ folder }: FolderCardProps) {
  return (
    <a
      href={`/?folder=${encodeURIComponent(folder.id)}`}
      className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
        <FolderOpen className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-900">{folder.name}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
          {folder.is_protected && (
            <>
              <Lock className="h-3 w-3" />
              Password protected ·
            </>
          )}
          {formatDate(folder.created_at)}
        </span>
      </span>
    </a>
  );
}
