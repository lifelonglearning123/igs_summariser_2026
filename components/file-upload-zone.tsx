import React, { useEffect, useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  onFileError?: (message: string) => void;
}

const UNSUPPORTED_MESSAGE = 'Please upload a .txt or .docx file.';
const NO_FILE_MESSAGE =
  "That drop didn't include a file. If you're dragging from Outlook, Teams or the browser's downloads bar, save the file to your computer first, then drag it from there or click to browse.";

const isSupportedFile = (file: File) => {
  const fileName = file.name.toLowerCase();
  return fileName.endsWith('.txt') || fileName.endsWith('.docx');
};

const hasFiles = (event: { dataTransfer: DataTransfer | null }) =>
  Array.from(event.dataTransfer?.types ?? []).includes('Files');

/** The dropped file, from `files` or, where a source only fills `items`, from there. */
function droppedFile(dataTransfer: DataTransfer): File | null {
  if (dataTransfer.files.length) return dataTransfer.files[0];
  for (const item of Array.from(dataTransfer.items ?? [])) {
    const file = item.kind === 'file' ? item.getAsFile() : null;
    if (file) return file;
  }
  return null;
}

export default function FileUploadZone({ onFileSelect, onFileError }: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  // A file dropped just outside the zone would otherwise be opened by the
  // browser, taking the coach away from the page.
  useEffect(() => {
    const preventFileOpen = (event: DragEvent) => {
      if (hasFiles(event)) event.preventDefault();
    };
    window.addEventListener('dragover', preventFileOpen);
    window.addEventListener('drop', preventFileOpen);
    return () => {
      window.removeEventListener('dragover', preventFileOpen);
      window.removeEventListener('drop', preventFileOpen);
    };
  }, []);

  const acceptFile = (file: File | null) => {
    if (!file) {
      onFileError?.(NO_FILE_MESSAGE);
    } else if (isSupportedFile(file)) {
      onFileSelect(file);
    } else {
      onFileError?.(UNSUPPORTED_MESSAGE);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Moving over the icon or text inside the zone also fires dragleave.
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    acceptFile(droppedFile(e.dataTransfer));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear the input so choosing the same file again still fires a change.
    e.target.value = '';
    if (file) acceptFile(file);
  };

  return (
    <div
      onDragEnter={handleDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
        isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        onChange={handleFileChange}
        className="hidden"
      />
      <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2 pointer-events-none" />
      <p className="text-sm font-medium text-gray-700 pointer-events-none">
        {isDragging ? 'Drop your file here' : 'Drag and drop your file or click to browse'}
      </p>
      <p className="text-xs text-gray-500 mt-1 pointer-events-none">Supported formats: .txt, .docx</p>
    </div>
  );
}
