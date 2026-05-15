import { toast as sonnerToast } from 'sonner';
import React from 'react';
import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.custom((t) => (
      <div className="flex items-start gap-3 bg-[#1a1a1c] border border-emerald-500/30 p-4 rounded-lg shadow-2xl min-w-[320px]">
        <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <p className="text-sm font-bold text-white tracking-tight">{message}</p>
          {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
        </div>
      </div>
    ), { duration: 4000 });
  },
  error: (message: string, description?: string) => {
    sonnerToast.custom((t) => (
      <div className="flex items-start gap-3 bg-[#1a1a1c] border border-rose-500/30 p-4 rounded-lg shadow-2xl min-w-[320px]">
        <XCircle className="text-rose-500 shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <p className="text-sm font-bold text-white tracking-tight">{message}</p>
          {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
        </div>
      </div>
    ), { duration: 5000 });
  },
  info: (message: string, description?: string) => {
    sonnerToast.custom((t) => (
      <div className="flex items-start gap-3 bg-[#1a1a1c] border border-blue-500/30 p-4 rounded-lg shadow-2xl min-w-[320px]">
        <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <p className="text-sm font-bold text-white tracking-tight">{message}</p>
          {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
        </div>
      </div>
    ));
  },
  warning: (message: string, description?: string) => {
    sonnerToast.custom((t) => (
      <div className="flex items-start gap-3 bg-[#1a1a1c] border border-amber-500/30 p-4 rounded-lg shadow-2xl min-w-[320px]">
        <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <p className="text-sm font-bold text-white tracking-tight">{message}</p>
          {description && <p className="text-xs text-gray-400 mt-1">{description}</p>}
        </div>
      </div>
    ));
  }
};
