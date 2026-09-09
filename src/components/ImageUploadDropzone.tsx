import React, { useRef, useState } from 'react';
import { Upload, Image as ImageIcon, Crop, Trash2, Edit3, CheckCircle2 } from 'lucide-react';
import { ImageCropModal } from './ImageCropModal';

interface ImageUploadDropzoneProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  aspectRatio: number; // e.g. 1 for Avatar (1:1), 3 for Cover (3:1)
  targetWidth: number;
  targetHeight: number;
  placeholderText?: string;
  isRtl?: boolean;
}

export const ImageUploadDropzone: React.FC<ImageUploadDropzoneProps> = ({
  label,
  value,
  onChange,
  aspectRatio,
  targetWidth,
  targetHeight,
  placeholderText,
  isRtl = true
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileForCrop, setSelectedFileForCrop] = useState<File | string | null>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    setSelectedFileForCrop(file);
    setIsCropModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-[var(--text-primary)]">{label}</label>

      {/* Dropzone Container */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (!value && fileInputRef.current) {
            fileInputRef.current.click();
          }
        }}
        className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
          isDragging
            ? 'border-accent bg-accent/10'
            : value
            ? 'border-emerald-500/40 bg-[var(--surface-subtle)]'
            : 'border-[var(--border-main)] hover:border-accent/60 bg-[var(--surface-subtle)] hover:bg-[var(--surface-card)]'
        }`}
        style={{
          minHeight: aspectRatio === 1 ? '100px' : '90px'
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
        />

        {value ? (
          /* Thumbnail & Action Controls */
          <div className="relative group w-full h-full p-2 flex items-center justify-between gap-3 min-h-[85px]">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="overflow-hidden rounded-xl border border-[var(--border-main)] bg-black/10 shrink-0"
                style={{
                  width: aspectRatio === 1 ? '60px' : '90px',
                  height: '60px'
                }}
              >
                <img src={value} alt={label} className="w-full h-full object-cover" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs mb-0.5">
                  <CheckCircle2 size={14} />
                  <span>{isRtl ? 'تم رفع الصورة' : 'Image Ready'}</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)] truncate max-w-[180px]">
                  {value.startsWith('data:') ? (isRtl ? 'صورة معالجة ومقصوصة' : 'Cropped Canvas Image') : value}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFileForCrop(value);
                  setIsCropModalOpen(true);
                }}
                className="p-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--surface-card)] hover:bg-accent/10 hover:text-accent hover:border-accent/40 text-[var(--text-primary)] transition-all shadow-2xs"
                title={isRtl ? 'قص وتعديل' : 'Crop & Edit'}
              >
                <Crop size={14} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (fileInputRef.current) fileInputRef.current.click();
                }}
                className="p-1.5 rounded-lg border border-[var(--border-main)] bg-[var(--surface-card)] hover:bg-accent/10 hover:text-accent hover:border-accent/40 text-[var(--text-primary)] transition-all shadow-2xs"
                title={isRtl ? 'تغيير الصورة' : 'Change Image'}
              >
                <Edit3 size={14} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange('');
                }}
                className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all shadow-2xs"
                title={isRtl ? 'حذف الصورة' : 'Remove'}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ) : (
          /* Empty Dropzone Placeholder */
          <div className="p-4 flex flex-col items-center justify-center text-center gap-1.5">
            <div className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center">
              <Upload size={18} />
            </div>
            <div className="text-xs font-bold text-[var(--text-primary)]">
              {placeholderText || (isRtl ? 'انقر أو اسحب صورة من جهازك هنا' : 'Click or drop image file here')}
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              {isRtl
                ? `سيتم القص التلقائي وفق أبعاد (${targetWidth}×${targetHeight})`
                : `Auto crop to (${targetWidth}x${targetHeight})`}
            </p>
          </div>
        )}
      </div>

      {/* Crop Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        onClose={() => setIsCropModalOpen(false)}
        imageFile={selectedFileForCrop}
        aspectRatio={aspectRatio}
        targetWidth={targetWidth}
        targetHeight={targetHeight}
        title={`${isRtl ? 'قص وتكييف' : 'Crop & Scale'} ${label}`}
        isRtl={isRtl}
        onCropComplete={(croppedUrl) => {
          onChange(croppedUrl);
        }}
      />
    </div>
  );
};
