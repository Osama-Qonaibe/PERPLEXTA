import { toast } from 'sonner';

export const stripProtocolMarkers = (text: string): string => {
  if (!text) return text;
  return text
    .replace(/\[FOLLOW_UPS\][\s\S]*$/, '')
    .replace(/\[FOLLOW_UPS_START\][\s\S]*$/, '')
    .replace(/\[أسئلة_متابعة\][\s\S]*$/, '')
    .trim();
};

export const showSuccessToast = (dir: 'rtl' | 'ltr', msgAr: string, msgEn: string) => {
  toast.success(dir === 'rtl' ? msgAr : msgEn);
};

export const showErrorToast = (dir: 'rtl' | 'ltr', msgAr: string, msgEn: string) => {
  toast.error(dir === 'rtl' ? msgAr : msgEn);
};

export const showInfoToast = (dir: 'rtl' | 'ltr', msgAr: string, msgEn: string) => {
  toast.info(dir === 'rtl' ? msgAr : msgEn);
};
