import { useRef, useState, type DragEvent, type ChangeEvent } from 'react';
import { CloudUpload, FolderUp, Upload } from 'lucide-react';
import { collectDroppedFiles } from '@/lib/collectDroppedFiles';
import { MAX_FILE_SIZE_BYTES, type UploadCandidate } from '@/lib/fileStorage';
import { formatBytes } from '@/lib/format';

interface UploadDropzoneProps {
  onFiles: (candidates: UploadCandidate[]) => void;
}

function candidatesFromInput(files: FileList | null): UploadCandidate[] {
  return Array.from(files ?? []).map((file) => ({
    file,
    relativePath: file.webkitRelativePath || file.name,
  }));
}

export default function UploadDropzone({ onFiles }: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    void collectDroppedFiles(event.dataTransfer).then((candidates) => {
      if (candidates.length > 0) onFiles(candidates);
    });
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const candidates = candidatesFromInput(event.target.files);
    event.target.value = '';
    if (candidates.length > 0) onFiles(candidates);
  };

  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative overflow-hidden rounded-3xl border-2 border-dashed bg-white p-8 text-center transition-all duration-300 sm:p-12 ${
        isDragging
          ? 'scale-[1.01] border-teal-600 bg-teal-50/60 shadow-lg shadow-teal-900/5'
          : 'border-slate-300 hover:border-teal-400'
      }`}
    >
      <div className="mx-auto flex max-w-md flex-col items-center">
        <span
          className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-all duration-300 ${
            isDragging ? '-translate-y-1 bg-teal-700 text-white' : 'bg-teal-50 text-teal-700'
          }`}
        >
          <CloudUpload className="h-8 w-8" />
        </span>
        <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
          {isDragging ? 'Release to upload' : 'Drop files or folders here'}
        </h2>
        <p className="mt-2 text-base leading-normal text-slate-600">
          Up to {formatBytes(MAX_FILE_SIZE_BYTES)} per file. Every upload gets its own link anyone can use.
        </p>

        <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <Upload className="h-4 w-4" />
            Browse files
          </button>
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <FolderUp className="h-4 w-4" />
            Choose folder
          </button>
        </div>

        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleInputChange} />
        <input
          ref={folderInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleInputChange}
          {...{ webkitdirectory: '' }}
        />
      </div>
    </section>
  );
}
