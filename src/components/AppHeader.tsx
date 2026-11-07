import { Share2 } from 'lucide-react';

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <a href="/" className="group flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 text-white transition-transform duration-200 group-hover:-rotate-6">
            <Share2 className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-slate-900">FileShare</span>
        </a>
        <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-600 sm:inline-block">
          No sign-in needed
        </span>
      </div>
    </header>
  );
}
