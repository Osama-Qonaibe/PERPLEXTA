import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, RotateCw, Check, Upload, Image as ImageIcon, Crop, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from '../context/NotificationContext';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | string | null;
  aspectRatio: number; // e.g., 1 for 1:1 (Avatar), 3 for 3:1 (Cover)
  targetWidth: number; // e.g., 400 or 1200
  targetHeight: number; // e.g., 400 or 400
  title: string;
  isRtl?: boolean;
  onCropComplete: (croppedUrl: string) => void;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  imageFile,
  aspectRatio,
  targetWidth,
  targetHeight,
  title,
  isRtl = true,
  onCropComplete
}) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Load image when file or URL changes
  useEffect(() => {
    if (!imageFile) {
      setImageSrc(null);
      return;
    }

    if (typeof imageFile === 'string') {
      setImageSrc(imageFile);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
        setZoom(1);
        setOffset({ x: 0, y: 0 });
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  // Handle Drag / Pan start
  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setDragStart({ x: clientX - offset.x, y: clientY - offset.y });
  };

  // Handle Drag / Pan move
  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setOffset({
      x: clientX - dragStart.x,
      y: clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  // Handle Drag / Pan end
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleMouseMove);
      window.addEventListener('touchend', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Smart Crop & Upload logic
  const handleConfirmCrop = async () => {
    if (!imageRef.current || !containerRef.current || !imageSrc) return;

    setIsProcessing(true);
    try {
      const img = imageRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas context unavailable');
      }

      // Fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Compute relative image rendering on canvas
      const containerRect = containerRef.current.getBoundingClientRect();
      const frameWidth = containerRect.width;
      const frameHeight = containerRect.height;

      // Natural image dimensions
      const naturalWidth = img.naturalWidth || 800;
      const naturalHeight = img.naturalHeight || 600;

      // Scale ratio between display frame and output target canvas
      const scaleToCanvasX = targetWidth / frameWidth;
      const scaleToCanvasY = targetHeight / frameHeight;

      // Draw image onto target canvas considering zoom and offsets
      // Calculate how the image is positioned inside the frame container
      const renderWidth = frameWidth * zoom;
      const renderHeight = (naturalHeight / naturalWidth) * renderWidth;

      // Center offset
      const drawX = (frameWidth - renderWidth) / 2 + offset.x;
      const drawY = (frameHeight - renderHeight) / 2 + offset.y;

      ctx.drawImage(
        img,
        drawX * scaleToCanvasX,
        drawY * scaleToCanvasY,
        renderWidth * scaleToCanvasX,
        renderHeight * scaleToCanvasY
      );

      // Convert cropped canvas to Blob/DataURL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);

      // Attempt to upload to server `/api/files/upload`
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append('file', blob, `cropped_page_img_${Date.now()}.jpg`);

        const uploadRes = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          const serverUrl = uploadData.url || uploadData.file_url || uploadData.file?.url;
          if (serverUrl) {
            onCropComplete(serverUrl);
            toast.success(isRtl ? 'تم قص وتمكين الصورة بنجاح' : 'Image cropped & uploaded successfully');
            onClose();
            setIsProcessing(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Server upload failed, falling back to compressed Data URL:', err);
      }

      // Fallback: use dataUrl directly
      onCropComplete(dataUrl);
      toast.success(isRtl ? 'تم قص واختيار الصورة بنجاح' : 'Image cropped successfully');
      onClose();
    } catch (err) {
      console.error('Error during image crop:', err);
      toast.error(isRtl ? 'حدث خطأ أثناء قص الصورة' : 'Error cropping image');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          className="relative w-full max-w-lg rounded-2xl bg-[var(--surface-card)] border border-[var(--border-main)] shadow-2xl overflow-hidden flex flex-col text-[var(--text-primary)]"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-main)] bg-[var(--surface-subtle)]">
            <div className="flex items-center gap-2">
              <Crop size={18} className="text-accent" />
              <h3 className="text-sm font-extrabold">{title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-[var(--surface-subtle)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body: Crop Canvas Area */}
          <div className="p-5 flex flex-col items-center gap-4">
            <p className="text-xs text-[var(--text-muted)] text-center">
              {isRtl
                ? 'قم بسحب الصورة وتحريكها أو تكبيرها لتتناسب مع أبعاد العرض الاحترافية'
                : 'Drag, reposition, or zoom the image to fit the display area'}
            </p>

            {/* Crop Container Frame */}
            <div
              ref={containerRef}
              onMouseDown={handleMouseDown}
              onTouchStart={handleMouseDown}
              className={`relative overflow-hidden border-2 border-dashed border-accent/60 bg-black/90 cursor-grab active:cursor-grabbing rounded-2xl shadow-inner flex items-center justify-center select-none w-full`}
              style={{
                aspectRatio: `${aspectRatio}`,
                maxHeight: '280px'
              }}
            >
              {imageSrc ? (
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop Preview"
                  draggable={false}
                  className="max-w-none transition-transform duration-75 ease-out pointer-events-none"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    transformOrigin: 'center center'
                  }}
                />
              ) : (
                <div className="flex flex-col items-center text-gray-400 p-6 text-center gap-2">
                  <ImageIcon size={36} className="opacity-40" />
                  <span className="text-xs font-bold">{isRtl ? 'لم يتم اختار صورة بعد' : 'No image selected'}</span>
                </div>
              )}

              {/* Crop Grid Overlay */}
              <div className="absolute inset-0 border border-white/30 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-40">
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-r border-b border-white/20" />
                <div className="border-b border-white/20" />
                <div className="border-r border-white/20" />
                <div className="border-r border-white/20" />
                <div />
              </div>
            </div>

            {/* Controls: Zoom & Reset */}
            <div className="w-full flex items-center justify-between gap-3 px-2 py-1 bg-[var(--surface-subtle)] rounded-xl border border-[var(--border-main)]">
              <div className="flex items-center gap-2 flex-1">
                <ZoomOut size={15} className="text-[var(--text-muted)] shrink-0" />
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <ZoomIn size={15} className="text-[var(--text-muted)] shrink-0" />
              </div>

              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setOffset({ x: 0, y: 0 });
                }}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-[var(--border-main)] bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] flex items-center gap-1 shrink-0"
                title={isRtl ? 'إعادة ضبط' : 'Reset'}
              >
                <RefreshCw size={12} />
                <span>{isRtl ? 'تصفير' : 'Reset'}</span>
              </button>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 px-5 py-3 border-t border-[var(--border-main)] bg-[var(--surface-subtle)]">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-xs font-bold rounded-xl border border-[var(--border-main)] hover:bg-[var(--surface-subtle)] transition-colors"
            >
              {isRtl ? 'إلغاء' : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={handleConfirmCrop}
              disabled={!imageSrc || isProcessing}
              className="px-5 py-2 text-xs font-bold rounded-xl bg-accent hover:bg-accent/90 text-white flex items-center gap-1.5 shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{isRtl ? 'جاري المعالجة...' : 'Processing...'}</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>{isRtl ? 'تأكيد وحفظ الصورة' : 'Confirm & Apply'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
