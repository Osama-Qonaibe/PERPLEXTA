import React from 'react';
import { MapPin, ChevronDown, Compass, RefreshCw, Loader2 } from 'lucide-react';
import { StoriesBar, StoriesBarProps } from './StoriesBar';
import { AdComposer, AdComposerProps } from './AdComposer';
import { PostFeed } from '../PostFeed';
import { BulletinAd } from '../../../server/db/types';

export interface BoardFeedProps {
  // Filters
  isRtl: boolean;
  selectedCity: string;
  selectedRadius: string;
  setIsLocationFlyoutOpen: (open: boolean) => void;
  handleDetectGpsLocation: () => void;
  isDetectingGps: boolean;
  triggerFeedRefresh: () => void;
  isRefreshing: boolean;

  // Stories
  storiesProps: StoriesBarProps;

  // Composer
  composerProps: AdComposerProps;

  // PostFeed
  ads: BulletinAd[];
  loading: boolean;
  hasMoreAds: boolean;
  loadingMoreAds: boolean;
  handleLoadMoreAds: () => void;
  setActiveReelModalId: (id: number | null) => void;
  setActiveTab: (tab: any) => void;
  searchQuery: string;
  token: string | null;
  user: any;
  handleReportAd: (ad: BulletinAd) => void;
  handleToggleLike: (adId: number) => void;
  toggleComments: (adId: number) => void;
  handleToggleCommentLike: (commentId: number) => void;
  expandedAdId: number | null;
  commentsMap: Record<number, any[]>;
  loadingCommentsAdId: number | null;
  newCommentText: string;
  setNewCommentText: (text: string) => void;
  handleAddComment: (adId: number) => void;
  replyToCommentId: number | null;
  setReplyToCommentId: (id: number | null) => void;
  handleMessageAdvertiser: (ad: BulletinAd) => void;
  messagingAdId: number | null;
  setInquireAd: (ad: BulletinAd | null) => void;
  handleWhatsAppClick: (ad: BulletinAd, e?: React.MouseEvent) => void;
  handleShareAd: (ad: BulletinAd) => void;
  handleOpenPageDetail: (pageId: number) => void;
  handleOpenLightbox: (...args: any[]) => void;
  openPostUploadModal: () => void;
  handleOpenBoostModal: (ad: BulletinAd) => void;
  handleEditAd: (ad: BulletinAd) => void;
  handleDeleteAd: (adId: number) => void;
  handleToggleSave: (ad: BulletinAd) => void;
  setAds: React.Dispatch<React.SetStateAction<BulletinAd[]>>;
  setSavedAds: React.Dispatch<React.SetStateAction<BulletinAd[]>>;
}

export const BoardFeed: React.FC<BoardFeedProps> = ({
  isRtl,
  selectedCity,
  selectedRadius,
  setIsLocationFlyoutOpen,
  handleDetectGpsLocation,
  isDetectingGps,
  triggerFeedRefresh,
  isRefreshing,
  storiesProps,
  composerProps,
  ads,
  loading,
  hasMoreAds,
  loadingMoreAds,
  handleLoadMoreAds,
  setActiveReelModalId,
  setActiveTab,
  searchQuery,
  token,
  user,
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
    <div className="space-y-4 sm:space-y-6">
      {/* Mobile Smart Quick-Filter Bar (Location Pill + GPS Button) */}
      <div className="lg:hidden flex items-center justify-between gap-2 py-1 px-1">
        <div className="flex items-center gap-1.5 w-full justify-between">
          <button
            type="button"
            onClick={() => setIsLocationFlyoutOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-xs)] bg-[var(--surface-card)] hover:bg-[var(--bg-accent-muted)] text-[var(--text-primary)] hover:text-[var(--fg-accent)] text-[11px] font-extrabold border border-[var(--border-main)] transition-theme shadow-2xs truncate"
          >
            <MapPin size={12} className="text-[var(--fg-accent)] shrink-0" />
            <span className="truncate">
              {selectedCity === 'all'
                ? isRtl
                  ? '📍 كافة المدن والمحافظات'
                  : '📍 All Cities'
                : `${selectedCity}${selectedRadius !== 'all' ? ` (+${selectedRadius}كم)` : ''}`}
            </span>
            <ChevronDown size={11} className="text-[var(--text-muted)] shrink-0" />
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleDetectGpsLocation}
              disabled={isDetectingGps}
              className="px-2.5 py-1.5 rounded-[var(--radius-xs)] bg-[var(--bg-accent-muted)] text-[var(--fg-accent)] hover:bg-[var(--bg-accent-emphasis)] hover:text-[var(--fg-on-emphasis)] text-[11px] font-bold flex items-center gap-1 border border-[var(--border-accent)]/30 transition-theme disabled:opacity-50 shrink-0"
              title={isRtl ? 'استخدام موقعي الحالي (GPS)' : 'GPS Location'}
            >
              {isDetectingGps ? <Loader2 size={12} className="animate-spin text-[var(--fg-accent)]" /> : <Compass size={12} />}
              <span className="text-[10px] font-extrabold">{isRtl ? 'موقعي' : 'GPS'}</span>
            </button>

            <button
              type="button"
              onClick={triggerFeedRefresh}
              disabled={isRefreshing}
              className="px-2.5 py-1.5 rounded-[var(--radius-xs)] bg-[var(--surface-card)] hover:bg-[var(--surface-subtle)] text-[var(--text-primary)] hover:text-[var(--fg-accent)] text-[11px] font-bold flex items-center gap-1 border border-[var(--border-main)] transition-theme disabled:opacity-50 shrink-0 shadow-2xs"
              title={isRtl ? 'تحديث خلاصة الإعلانات' : 'Refresh Feed'}
            >
              <RefreshCw size={12} className={isRefreshing ? 'animate-spin text-[var(--fg-accent)]' : ''} />
              <span className="text-[10px] font-extrabold">{isRtl ? 'تحديث' : 'Refresh'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stories / Reels Highlights Carousel Bar */}
      <StoriesBar {...storiesProps} />

      {/* Facebook Post Creation Bar (Composer Box) */}
      <AdComposer {...composerProps} />

      {/* Ads Feed Grid */}
      <PostFeed
        ads={ads}
        loading={loading}
        hasMore={hasMoreAds}
        loadingMore={loadingMoreAds}
        onLoadMore={handleLoadMoreAds}
        onOpenReelFeed={(adId) => {
          if (adId) {
            setActiveReelModalId(adId);
          } else {
            setActiveTab('reels');
          }
        }}
        isRtl={isRtl}
        token={token}
        user={user}
        searchQuery={searchQuery}
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
          setAds((prev) => prev.filter((a) => a.id !== archivedAd.id));
          setSavedAds((prev) => prev.filter((a) => a.id !== archivedAd.id));
        }}
        onTrashAd={(trashedAd) => {
          setAds((prev) => prev.filter((a) => a.id !== trashedAd.id));
          setSavedAds((prev) => prev.filter((a) => a.id !== trashedAd.id));
        }}
        onUpdateAd={(updatedAd) => {
          setAds((prev) => prev.map((a) => (a.id === updatedAd.id ? { ...a, ...updatedAd } : a)));
          setSavedAds((prev) => prev.map((a) => (a.id === updatedAd.id ? { ...a, ...updatedAd } : a)));
        }}
      />
    </div>
  );
};
