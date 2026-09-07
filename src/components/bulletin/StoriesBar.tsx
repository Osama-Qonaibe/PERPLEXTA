import React from 'react';
import { Camera, Clapperboard, Plus, Video, CheckCircle2 } from 'lucide-react';
import { toast } from '../../context/NotificationContext';
import { BulletinAvatar } from '../BulletinAvatar';

export interface StoriesBarProps {
  isRtl: boolean;
  activeTab: string;
  setActiveTab: (tab: any) => void;
  token: string | null;
  user: any;
  setIsStoryModalOpen: (open: boolean) => void;
  representativeStories: any[];
  orderedStories: any[];
  previewingVideoStoryId: any;
  setPreviewingVideoStoryId: (id: any) => void;
  setSelectedStoryIndex: (index: number) => void;
  setIsStoryViewerOpen: (open: boolean) => void;
  storyPressTimerRef: React.MutableRefObject<any>;
  getMediaUrl: (url?: string) => string;
}

export const StoriesBar: React.FC<StoriesBarProps> = ({
  isRtl,
  activeTab,
  setActiveTab,
  token,
  user,
  setIsStoryModalOpen,
  representativeStories,
  orderedStories,
  previewingVideoStoryId,
  setPreviewingVideoStoryId,
  setSelectedStoryIndex,
  setIsStoryViewerOpen,
  storyPressTimerRef,
  getMediaUrl,
}) => {
  return (
    <div className="p-3.5 rounded-[var(--radius-lg)] bg-[var(--surface-card)] border border-[var(--border-main)] space-y-2.5 transition-theme">
      <div className="flex items-center gap-5 px-1 border-b border-[var(--border-subtle)] pb-2 transition-theme">
        <button
          onClick={() => setActiveTab('board')}
          className={`text-xs font-bold transition-theme flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'board' ? 'text-[var(--fg-accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Camera size={14} />
          <span>{isRtl ? 'قصص' : 'Stories'}</span>
        </button>
        <button
          onClick={() => setActiveTab('reels')}
          className={`text-xs font-bold transition-theme flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'reels' ? 'text-[var(--fg-accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
          }`}
        >
          <Clapperboard size={14} />
          <span>{isRtl ? 'ريلز' : 'Reels'}</span>
        </button>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none pb-1 pt-0.5 px-0.5">
        {/* Tile 1: Create Story */}
        <div
          onClick={() => {
            if (!token) {
              toast.error(isRtl ? 'يرجى تسجيل الدخول أولاً' : 'Please log in first');
              return;
            }
            setIsStoryModalOpen(true);
          }}
          className="relative w-28 h-44 sm:w-32 sm:h-52 rounded-[var(--radius-md)] overflow-hidden bg-[var(--surface-subtle)] border border-[var(--border-main)] shrink-0 cursor-pointer group hover:border-[var(--border-accent)] transition-theme flex flex-col"
        >
          <div className="relative w-full h-[65%] bg-[var(--surface-inset)] flex justify-center items-center overflow-hidden">
            {user?.avatar?.includes('dicebear') ? (
              <div className="absolute inset-0 bg-[var(--surface-inset)] flex justify-center items-center">
                <BulletinAvatar src={user?.avatar} alt={user?.name} size="lg" className="shadow-md scale-110" />
              </div>
            ) : (
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                alt={user?.name || 'User'}
                className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
              />
            )}
            <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors pointer-events-none z-10" />
          </div>

          <div className="relative w-full h-[35%] bg-[var(--surface-card)] flex flex-col items-center justify-end pb-2 sm:pb-2.5">
            <div className="absolute -top-3.5 sm:-top-4 z-20">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] border-2 border-[var(--surface-card)] flex items-center justify-center shadow-sm transition-transform group-hover:scale-110">
                <Plus size={16} className="stroke-[3]" />
              </div>
            </div>
            <span className="text-[11px] font-bold text-[var(--text-primary)] text-center px-1">
              {isRtl ? 'إنشاء قصة' : 'Create Story'}
            </span>
          </div>
        </div>

        {/* User & Merchant Stories */}
        {representativeStories.map((story: any, sIdx: number) => {
          const viewerStartIndex = orderedStories.findIndex((s: any) => s.id === story.id);

          return (
            <div
              key={`rep-story-${story.id || 'st'}-${sIdx}`}
              onClick={() => {
                if (previewingVideoStoryId === story.id) return;
                setSelectedStoryIndex(viewerStartIndex >= 0 ? viewerStartIndex : 0);
                setIsStoryViewerOpen(true);
              }}
              className="relative w-28 h-44 sm:w-32 sm:h-52 rounded-[var(--radius-md)] overflow-hidden bg-[var(--surface-subtle)] border border-[var(--border-main)] shrink-0 cursor-pointer group hover:border-[var(--border-accent)] transition-theme flex flex-col justify-center items-center"
            >
              <div className="relative w-full h-full overflow-hidden bg-[var(--surface-inset)] flex flex-col justify-center items-center">
                {/* Ambient Blurred Background */}
                <img
                  src={getMediaUrl(story.image_url)}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover blur-xl opacity-40 scale-125 saturate-150"
                />

                {/* Centered Proper Image */}
                <img
                  src={getMediaUrl(story.image_url)}
                  alt={story.title || ''}
                  className="absolute inset-0 w-full h-full object-contain transition-transform group-hover:scale-105 duration-300 opacity-85 group-hover:opacity-100 z-0"
                />

                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/5 transition-colors pointer-events-none z-10" />

                {/* Video icon if it's a video story */}
                {story.video_url && (
                  <div className="absolute top-2 end-2 bg-black/50 p-1 rounded-[var(--radius-xs)] backdrop-blur-md border border-white/10 shadow-xs pointer-events-auto z-20">
                    <Video size={11} className="text-white" />
                  </div>
                )}

                {/* Top-Corner Story Ring Avatar */}
                <div className="absolute top-2 start-2 z-20 pointer-events-auto">
                  <div
                    className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-[var(--fg-accent)] via-teal-400 to-blue-500 shadow-md transition-transform group-hover:scale-110"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      storyPressTimerRef.current = setTimeout(() => {
                        if ('vibrate' in navigator) navigator.vibrate([40]);
                        setPreviewingVideoStoryId(story.id);
                      }, 400);
                    }}
                    onPointerUp={(e) => {
                      if (storyPressTimerRef.current) clearTimeout(storyPressTimerRef.current);
                      if (previewingVideoStoryId === story.id) {
                        e.stopPropagation();
                        setPreviewingVideoStoryId(null);
                      }
                    }}
                    onPointerLeave={() => {
                      if (storyPressTimerRef.current) clearTimeout(storyPressTimerRef.current);
                      setPreviewingVideoStoryId(null);
                    }}
                  >
                    <img
                      src={getMediaUrl(story.author_avatar)}
                      alt={story.author_name || ''}
                      className="w-full h-full rounded-full object-cover border-[1.5px] border-[var(--surface-card)]"
                    />
                  </div>
                </div>

                {/* Name positioned at the very bottom center */}
                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/80 via-black/40 to-transparent z-20 pointer-events-none flex flex-col justify-end items-center">
                  <div className="flex items-center gap-1 justify-center w-full">
                    <span className="text-[10px] font-bold text-white truncate drop-shadow text-center max-w-[80px]">
                      {story.page_id ? story.page_name : story.author_name}
                    </span>
                    {story.page_id && <CheckCircle2 size={10} className="text-blue-400 fill-blue-400/20 shrink-0" />}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
