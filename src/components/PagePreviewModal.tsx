import React from 'react';
import { X } from 'lucide-react';

interface PagePreviewModalProps {
  url: string;
  onClose: () => void;
}

export const PagePreviewModal: React.FC<PagePreviewModalProps> = ({ url, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#111111] w-full max-w-sm h-[80vh] rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
          <span className="text-xs font-mono font-bold uppercase text-gray-500 truncate">{url}</span>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 w-full bg-gray-50 dark:bg-black">
          <iframe 
            src={url} 
            className="w-full h-full border-0"
            title="Preview"
          />
        </div>
      </div>
    </div>
  );
};
