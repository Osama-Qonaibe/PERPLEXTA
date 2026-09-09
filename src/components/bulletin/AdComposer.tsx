import React from 'react';
import { Radio, Video, Clapperboard } from 'lucide-react';
import { toast } from '../../context/NotificationContext';
import { BulletinAvatar } from '../BulletinAvatar';

export interface AdComposerProps {
  user: any;
  token: string | null;
  isRtl: boolean;
  setIsAdModalOpen: (open: boolean) => void;
  setIsStreamSetupOpen: (open: boolean) => void;
  openPostUploadModal: () => void;
  openReelUploadModal: () => void;
}

export const AdComposer: React.FC<AdComposerProps> = ({
  user,
  token,
  isRtl,
  setIsAdModalOpen,
  setIsStreamSetupOpen,
  openPostUploadModal,
  openReelUploadModal,
}) => {
  return (
    <div className="p-3 rounded-[0px] bg-[var(--surface-card)] border border-[var(--border-main)] space-y-2.5 transition-theme">
      <div className="flex items-center gap-2.5">
        <BulletinAvatar
          src={user?.avatar}
          alt={user?.name || 'User'}
          size="md"
        />
        <button
          onClick={() => {
            if (!token) {
              toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
              return;
            }
            setIsAdModalOpen(true);
          }}
          className="flex-1 text-start px-3.5 py-2 rounded-[0px] bg-[var(--surface-subtle)] hover:bg-[var(--surface-inset)] text-xs text-[var(--text-muted)] font-medium transition-theme border border-[var(--border-main)] cursor-pointer"
        >
          {isRtl ? 'بم تفكر اليوم؟' : "What's on your mind?"}
        </button>
      </div>

      <div className="flex items-center justify-between border-t border-[var(--border-main)] pt-2 text-[11px] sm:text-xs text-[var(--text-muted)] transition-theme">
        <button
          type="button"
          onClick={() => {
            if (!token) {
              toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
              return;
            }
            setIsStreamSetupOpen(true);
          }}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-[0px] hover:bg-red-500/10 font-bold transition-theme text-red-500 whitespace-nowrap cursor-pointer"
        >
          <Radio size={14} className="text-red-500 shrink-0" />
          <span>{isRtl ? 'بث مباشر' : 'Live Stream'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!token) {
              toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
              return;
            }
            openPostUploadModal();
          }}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-[0px] hover:bg-blue-500/10 font-bold transition-theme text-blue-500 whitespace-nowrap cursor-pointer"
        >
          <Video size={14} className="text-blue-500 shrink-0" />
          <span>{isRtl ? 'فيديو أو صورة' : 'Photo/Video'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!token) {
              toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
              return;
            }
            openReelUploadModal();
          }}
          className="flex items-center gap-1 sm:gap-1.5 px-2.5 py-1.5 rounded-[0px] hover:bg-purple-500/10 font-bold transition-theme text-purple-500 whitespace-nowrap cursor-pointer"
        >
          <Clapperboard size={14} className="text-purple-500 shrink-0" />
          <span>{isRtl ? 'ريلز' : 'Reels'}</span>
        </button>
      </div>
    </div>
  );
};
