import React from 'react';
import { Bookmark, Compass, ArrowRight, ArrowLeft } from 'lucide-react';
import { PostFeed } from '../PostFeed';
import { BulletinAd } from '../../../server/db/types';

export interface SavedPostsTabProps {
  savedAds: BulletinAd[];
  loadingSaved: boolean;
  isRtl: boolean;
  token: string | null;
  user: any;
  setActiveTab: (tab: any) => void;
  handleReportAd: (ad: BulletinAd) => void;
  handleToggleLike: (adId: number, reaction?: string) => void;
  toggleComments: (adId: number) => void;
  handleToggleCommentLike?: (adId: number, commentId: number, reaction?: string) => void;
  expandedAdId: number | null;
  commentsMap: Record<number, any[]>;
  loadingCommentsAdId: number | null;
  newCommentText: string;
  setNewCommentText: (text: string) => void;
  handleAddComment: (adId: number, parentIdOrText?: number | string, optParentId?: number) => void;
  replyToCommentId: number | null;
  setReplyToCommentId: (id: number | null) => void;
  handleMessageAdvertiser: (ad: BulletinAd, customMessage?: string) => void;
  messagingAdId: number | null;
  setInquireAd: (ad: BulletinAd | null) => void;
  handleWhatsAppClick: (ad: BulletinAd, e: React.MouseEvent) => void;
  handleShareAd: (ad: BulletinAd) => void;
  handleOpenPageDetail: (pageId: number) => void;
  handleOpenLightbox: (...args: any[]) => void;
  openPostUploadModal: () => void;
  handleOpenBoostModal: (ad: BulletinAd) => void;
  handleEditAd: (ad: BulletinAd) => void;
  handleDeleteAd: (ad: BulletinAd) => void;
  handleToggleSave: (adOrId: BulletinAd | number) => void;
  setAds: React.Dispatch<React.SetStateAction<BulletinAd[]>>;
  setSavedAds: React.Dispatch<React.SetStateAction<BulletinAd[]>>;
}

export const SavedPostsTab: React.FC<SavedPostsTabProps> = ({
  savedAds,
  loadingSaved,
  isRtl,
  token,
  user,
  setActiveTab,
  handleReportAd,
  handleToggleLike,
  toggleComments,
  handleToggleCommentLike,
  expandedAdId,
  commentsMap,
  loadingCommentsAdId,
  newCommentText,
  setNewCommentText,
  handleAddComment,
  replyToCommentId,
  setReplyToCommentId,
  handleMessageAdvertiser,
  messagingAdId,
  setInquireAd,
  handleWhatsAppClick,
  handleShareAd,
  handleOpenPageDetail,
  handleOpenLightbox,
  openPostUploadModal,
  handleOpenBoostModal,
  handleEditAd,
  handleDeleteAd,
  handleToggleSave,
  setAds,
  setSavedAds,
}) => {
  return (
    <div className="space-y-4">
      {/* Header card with Sovereign design tokens */}
      <div className="bg-[var(--surface-card)] p-4 rounded-2xl border border-[var(--border-main)] flex items-center justify-between transition-theme shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--surface-subtle)] text-accent flex items-center justify-center border border-[var(--border-main)] shadow-xs">
            <Bookmark size={20} />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-[var(--text-primary)]">
              {isRtl ? 'المنشورات المحفوظة' : 'Saved Posts'}
            </h2>
            <p className="text-[10px] text-[var(--text-muted)] font-bold">
              {isRtl ? `لديك ${savedAds.length} منشورات محفوظة` : `You have ${savedAds.length} saved posts`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setActiveTab('board')}
          className="text-xs font-bold text-accent hover:opacity-80 transition-theme flex items-center gap-1 cursor-pointer"
        >
          <span>{isRtl ? 'استعراض المزيد' : 'Browse More'}</span>
          {isRtl ? <ArrowLeft size={13} /> : <ArrowRight size={13} />}
        </button>
      </div>

      {/* Empty State */}
      {!loadingSaved && savedAds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 bg-[var(--surface-card)] rounded-2xl border border-[var(--border-main)] space-y-4 text-center transition-theme">
          <div className="w-16 h-16 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)] shadow-xs">
            <Bookmark size={28} />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-base font-extrabold text-[var(--text-primary)]">
              {isRtl ? 'لا توجد منشورات محفوظة' : 'No Saved Posts Yet'}
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {isRtl
                ? 'احفظ المنشورات والإعلانات التي تهمك للوصول إليها لاحقاً بكل سهولة وسرعة.'
                : 'Save posts and ads that interest you to easily access them later anytime.'}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('board')}
            className="mt-2 px-5 py-2.5 rounded-xl bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] font-bold text-xs hover:opacity-90 transition-theme flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Compass size={14} />
            <span>{isRtl ? 'استعراض الإعلانات' : 'Explore Ads'}</span>
          </button>
        </div>
      ) : (
        <PostFeed
          ads={savedAds}
          loading={loadingSaved}
          hasMore={false}
          loadingMore={false}
          onLoadMore={() => {}}
          isRtl={isRtl}
          token={token}
          user={user}
          searchQuery={''}
          onReportAd={handleReportAd}
          onToggleLike={handleToggleLike}
          onToggleComments={toggleComments}
          onToggleCommentLike={handleToggleCommentLike}
          expandedAdId={expandedAdId}
          commentsMap={commentsMap}
          loadingCommentsAdId={loadingCommentsAdId}
          newCommentText={newCommentText}
          setNewCommentText={setNewCommentText}
          onAddComment={handleAddComment}
          replyToCommentId={replyToCommentId}
          setReplyToCommentId={setReplyToCommentId}
          onMessageAdvertiser={handleMessageAdvertiser}
          messagingAdId={messagingAdId}
          onInquire={setInquireAd}
          onWhatsApp={handleWhatsAppClick}
          onShare={handleShareAd}
          onOpenPageDetail={handleOpenPageDetail}
          onOpenLightbox={handleOpenLightbox}
          onCreateAdClick={openPostUploadModal}
          onBoostAd={handleOpenBoostModal}
          onEditAd={handleEditAd}
          onDeleteAd={handleDeleteAd}
          onToggleSave={handleToggleSave}
          onArchiveAd={(archivedAd) => {
            setAds(prev => prev.filter(a => a.id !== archivedAd.id));
            setSavedAds(prev => prev.filter(a => a.id !== archivedAd.id));
          }}
          onTrashAd={(trashedAd) => {
            setAds(prev => prev.filter(a => a.id !== trashedAd.id));
            setSavedAds(prev => prev.filter(a => a.id !== trashedAd.id));
          }}
          onUpdateAd={(updatedAd) => {
            setAds(prev => prev.map(a => a.id === updatedAd.id ? { ...a, ...updatedAd } : a));
            setSavedAds(prev => prev.map(a => a.id === updatedAd.id ? { ...a, ...updatedAd } : a));
          }}
        />
      )}
    </div>
  );
};
