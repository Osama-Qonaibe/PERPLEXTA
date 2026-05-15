import { toast } from 'sonner';
import { useAppContext } from '../context/AppContext';

export const useToast = () => {
  const { dir } = useAppContext();
  return {
    success: (msgAr: string, msgEn?: string) => toast.success(dir === 'rtl' ? msgAr : (msgEn || msgAr)),
    error: (msgAr: string, msgEn?: string) => toast.error(dir === 'rtl' ? msgAr : (msgEn || msgAr)),
    info: (msgAr: string, msgEn?: string) => toast.info(dir === 'rtl' ? msgAr : (msgEn || msgAr)),
  };
};
