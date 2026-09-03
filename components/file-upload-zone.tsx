import React, { useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  onFileError?: (message: string) => void;
}

export default function FileUploadZone({ onFileSelect, onFileError }: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && isSupportedFile(file)) {
      onFileSelect(file);
    } else if (file) {
      onFileError?.('Please upload a .txt or .docx file.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && isSupportedFile(e.target.files[0])) {
      onFileSelect(e.target.files[0]);
    } else if (e.target.files?.[0]) {
      onFileError?.('Please upload a .txt or .docx file.');
    }
  };

  const isSupportedFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    return fileName.endsWith('.txt') || fileName.endsWith('.docx');
  };

  return (
    <div
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
      <Upload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
      <p className="text-sm font-medium text-gray-700">
        {isDragging ? 'Drop your file here' : 'Drag and drop your file or click to browse'}
      </p>
      <p className="text-xs text-gray-500 mt-1">Supported formats: .txt, .docx</p>
    </div>
  );
}
