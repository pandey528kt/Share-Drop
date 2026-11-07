import { Archive, File, FileAudio, FileCode, FileImage, FileText, FileVideo, type LucideIcon } from 'lucide-react';
import { getExtension } from '@/lib/format';

interface FileIconProps {
  name: string;
  mimeType: string;
  className?: string;
}

function pickIcon(name: string, mimeType: string): LucideIcon {
  const ext = getExtension(name);
  if (mimeType.startsWith('image/')) return FileImage;
  if (mimeType.startsWith('video/')) return FileVideo;
  if (mimeType.startsWith('audio/')) return FileAudio;
  if (mimeType === 'application/pdf' || mimeType.startsWith('text/plain')) return FileText;
  if (['ZIP', 'RAR', '7Z', 'TAR', 'GZ'].includes(ext)) return Archive;
  if (['JS', 'TS', 'JSON', 'HTML', 'CSS', 'PY', 'MD'].includes(ext)) return FileCode;
  return File;
}

export default function FileIcon({ name, mimeType, className = '' }: FileIconProps) {
  const Icon = pickIcon(name, mimeType);
  return (
    <span
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ${className}`}
      aria-hidden="true"
    >
      <Icon className="h-5 w-5" />
    </span>
  );
}
