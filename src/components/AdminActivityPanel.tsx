import { useCallback, useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { fetchActivityLogs } from '@/lib/activity';
import { formatDate } from '@/lib/format';
import type { ActivityAction, ActivityLog } from '@/types/activity';

const ACTION_LABELS: Record<ActivityAction, { label: string; tone: string }> = {
  file_uploaded: { label: 'Uploaded file', tone: 'bg-teal-50 text-teal-800' },
  file_opened: { label: 'Opened or downloaded file', tone: 'bg-slate-100 text-slate-700' },
  file_deleted: { label: 'Deleted file', tone: 'bg-red-50 text-red-700' },
  folder_created: { label: 'Created folder', tone: 'bg-teal-50 text-teal-800' },
  folder_deleted: { label: 'Deleted folder', tone: 'bg-red-50 text-red-700' },
  folder_password_set: { label: 'Set folder password', tone: 'bg-amber-50 text-amber-800' },
  folder_password_removed: { label: 'Removed folder password', tone: 'bg-amber-50 text-amber-800' },
  folder_unlock_failed: { label: 'Wrong folder password', tone: 'bg-red-50 text-red-700' },
};

export default function AdminActivityPanel() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      setLogs(await fetchActivityLogs());
      setLoadError(null);
      setStatus('ready');
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'The activity log could not be loaded.');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Activity log</h2>
          <p className="text-sm text-slate-500">The latest 200 events, newest first</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={status === 'loading'}
          aria-label="Refresh activity log"
          title="Refresh"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {status === 'error' && <p role="alert" className="px-6 py-10 text-center text-sm font-medium text-red-700">{loadError}</p>}
      {status === 'ready' && logs.length === 0 && <p className="px-6 py-10 text-center text-sm text-slate-500">No activity yet.</p>}

      {logs.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium sm:px-6">When</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Item</th>
                <th className="px-4 py-3 font-medium">By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => {
                const meta = ACTION_LABELS[log.action];
                return (
                  <tr key={log.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600 sm:px-6">{formatDate(log.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.tone}`}>{meta.label}</span>
                    </td>
                    <td className="max-w-[240px] px-4 py-3 text-slate-900">
                      <span className="block truncate" title={log.subject_name ?? ''}>{log.subject_name ?? '-'}</span>
                      {log.folder_name && log.folder_name !== log.subject_name && (
                        <span className="block truncate text-xs text-slate-500">in {log.folder_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{log.actor_email}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
