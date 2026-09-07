import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Radio,
  Eye,
  Volume2,
  VolumeX,
  Wallet,
  Camera,
  Heart,
  MessageCircle,
  Send,
  Gift,
  Share2,
  X,
  ArrowRight,
} from 'lucide-react';
import { setGlobalMuteState } from '../../utils/mediaCoordinator';

export interface LiveStreamFeedItem {
  id: string;
  type: string;
  host: string;
  hostId: number;
  title: string;
  viewers: number;
}

export interface LiveStreamModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRtl: boolean;
  user: any;
  walletBalance: number;
  streamTitleInput: string;
  streamFeed: LiveStreamFeedItem[];
  currentFeedIndex: number;
  setCurrentFeedIndex: React.Dispatch<React.SetStateAction<number>>;
  streamRef: React.MutableRefObject<MediaStream | null>;
  videoRef: React.MutableRefObject<HTMLVideoElement | null>;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  liveViewers: number;
  liveLikes: number;
  handleLiveLike: () => void;
  showLikeAnimation: boolean;
  liveComments: { id: string; user: string; text: string }[];
  newLiveComment: string;
  setNewLiveComment: (val: string) => void;
  handleSendLiveComment: (e: React.FormEvent) => void;
  isGiftModalOpen: boolean;
  setIsGiftModalOpen: (open: boolean) => void;
  giftsCatalog: any[];
  handleSendGift: (gift: any) => void;
}

export const LiveStreamModal: React.FC<LiveStreamModalProps> = ({
  isOpen,
  onClose,
  isRtl,
  user,
  walletBalance,
  streamTitleInput,
  streamFeed,
  currentFeedIndex,
  setCurrentFeedIndex,
  streamRef,
  videoRef,
  isMuted,
  setIsMuted,
  liveViewers,
  liveLikes,
  handleLiveLike,
  showLikeAnimation,
  liveComments,
  newLiveComment,
  setNewLiveComment,
  handleSendLiveComment,
  isGiftModalOpen,
  setIsGiftModalOpen,
  giftsCatalog,
  handleSendGift,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 100 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onPanEnd={(e, info) => {
              if (info.offset.y < -50 && currentFeedIndex < streamFeed.length - 1) {
                setCurrentFeedIndex(i => i + 1);
              } else if (info.offset.y > 50 && currentFeedIndex > 0) {
                setCurrentFeedIndex(i => i - 1);
              }
            }}
            className="relative w-full h-full sm:h-[85vh] sm:max-w-4xl sm:rounded-2xl overflow-hidden bg-black shadow-2xl flex flex-col touch-none border border-white/10"
          >
            {/* Header */}
            <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-6 pt-12 sm:px-8 sm:pt-8 bg-gradient-to-b from-black/95 via-black/40 to-transparent">
              <div className="flex items-center gap-3 overflow-hidden">
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600/10 hover:bg-red-600/20 backdrop-blur-md border border-red-500/20 text-white transition-theme group shadow-lg shrink-0 cursor-pointer"
                  title={isRtl ? 'خروج من البث' : 'Exit Stream'}
                >
                  <ArrowRight size={16} className={isRtl ? '' : 'rotate-180'} />
                  <span className="text-[10px] font-black tracking-tight">{isRtl ? 'خروج' : 'EXIT'}</span>
                </button>

                <div className="flex flex-col overflow-hidden">
                  <h3 className="text-xs font-black text-white truncate max-w-[120px] sm:max-w-[250px] drop-shadow-md">
                    {streamTitleInput || streamFeed[currentFeedIndex]?.title || (isRtl ? 'بث مباشر غير معنون' : 'Untitled Live Stream')}
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-accent text-white text-[8px] font-black rounded-xs animate-pulse">
                      <Radio size={8} />
                      {isRtl ? 'مباشر' : 'LIVE'}
                    </span>
                    <span className="text-[9px] font-bold text-gray-300 truncate">
                      @{user?.name || streamFeed[currentFeedIndex]?.host || (isRtl ? 'مستخدم' : 'User')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <div className="flex items-center gap-1.5 text-white text-xs font-bold drop-shadow-md">
                  <Eye size={14} className="text-accent" />
                  <span className="tabular-nums font-black">{liveViewers + (streamFeed[currentFeedIndex]?.viewers || 0)}</span>
                </div>

                <button
                  onClick={() => {
                    const nextMuted = !isMuted;
                    setIsMuted(nextMuted);
                    setGlobalMuteState(nextMuted);
                  }}
                  className="w-9 h-9 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-md flex items-center justify-center text-white transition-theme border border-white/10 shadow-xl cursor-pointer"
                  title={isMuted ? (isRtl ? 'تفعيل الصوت' : 'Unmute') : (isRtl ? 'كتم الصوت' : 'Mute')}
                >
                  {isMuted ? <VolumeX size={18} className="text-red-400" /> : <Volume2 size={18} className="text-accent" />}
                </button>

                <div className="hidden sm:flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 shadow-xl">
                  <Wallet size={12} className="text-yellow-400" />
                  <span className="text-[11px] font-black text-white">{walletBalance}</span>
                </div>
              </div>
            </div>

            {/* Camera Stream Container */}
            <div className="absolute inset-0 w-full h-full bg-gray-950 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentFeedIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="w-full h-full"
                >
                  {!streamRef.current && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 rounded-xl bg-gray-900 flex items-center justify-center mx-auto border-2 border-dashed border-gray-700 animate-spin-slow">
                          <Camera size={24} className="text-gray-600" />
                        </div>
                        <p className="text-[10px] font-black text-gray-500 tracking-widest uppercase">
                          {isRtl ? 'جاري تهيئة البث...' : 'Initializing Stream...'}
                        </p>
                      </div>
                    </div>
                  )}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isMuted}
                    className="w-full h-full object-cover transition-theme"
                  />
                </motion.div>
              </AnimatePresence>

              {/* Visual Enhancer Overlay */}
              <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/40 via-transparent to-black/60 z-10" />
            </div>

            {/* Overlay Content */}
            <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-end">
              <AnimatePresence mode="wait">
                {showLikeAnimation && (
                  <motion.div
                    key="like-anim"
                    initial={{ opacity: 0, scale: 0, y: 0 }}
                    animate={{ opacity: 1, scale: 1.5, y: -200 }}
                    exit={{ opacity: 0 }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-red-500 z-50 pointer-events-none"
                  >
                    <Heart size={80} fill="currentColor" />
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex items-end justify-between px-6 pb-12 sm:px-8 sm:pb-8 bg-gradient-to-t from-black/95 via-black/40 to-transparent pt-32 w-full pointer-events-auto">
                {/* Left Side: Comments Stream & Host Info */}
                <div className="w-[75%] sm:w-[80%] space-y-4">
                  {/* Host & Title Info */}
                  <div className="space-y-1.5 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="px-2 py-0.5 bg-accent/10 border border-accent/20 rounded-md">
                        <span className="text-[9px] font-black text-accent uppercase tracking-widest">
                          {streamFeed[currentFeedIndex]?.type === 'live' ? (isRtl ? 'بث مباشر' : 'LIVE') : (isRtl ? 'ريلز' : 'REEL')}
                        </span>
                      </div>
                      <h3 className="text-white font-black text-base drop-shadow-2xl tracking-tight">
                        {streamTitleInput ? (user?.name || (isRtl ? 'أنت' : 'You')) : streamFeed[currentFeedIndex]?.host}
                      </h3>
                    </div>
                    <p className="text-white/90 text-xs font-bold line-clamp-1 drop-shadow-xl pr-4">
                      {streamTitleInput || streamFeed[currentFeedIndex]?.title}
                    </p>
                  </div>

                  <div className="max-h-[30vh] overflow-y-auto pr-3 space-y-3 scrollbar-hide flex flex-col justify-end [mask-image:linear-gradient(to_bottom,transparent,black_20%)]">
                    {liveComments.map((comment, idx) => (
                      <motion.div
                        key={`live-comment-${comment.id || idx}-${idx}`}
                        initial={{ opacity: 0, x: -30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-black/60 backdrop-blur-md rounded-lg p-2.5 inline-block max-w-fit border border-white/10 shadow-2xl"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-accent/20 flex items-center justify-center border border-accent/30">
                            <span className="text-[9px] font-black text-accent">{comment.user.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-accent font-black text-[10px] uppercase tracking-tighter">{comment.user}</span>
                        </div>
                        <p className="text-white text-[12px] mt-1 leading-relaxed drop-shadow-sm font-bold">{comment.text}</p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Comment Input Area */}
                  <form onSubmit={handleSendLiveComment} className="flex items-center gap-2 mt-6">
                    <div className="flex-1 relative group">
                      <input
                        type="text"
                        value={newLiveComment}
                        onChange={e => setNewLiveComment(e.target.value)}
                        placeholder={isRtl ? 'قل شيئاً جميلاً...' : 'Say something nice...'}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-10 py-3 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-accent backdrop-blur-xl transition-theme group-hover:bg-black/60 shadow-inner"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">
                        <MessageCircle size={16} />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!newLiveComment.trim()}
                      className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white hover:opacity-90 disabled:opacity-20 disabled:bg-gray-800 transition-theme shrink-0 shadow-lg cursor-pointer"
                    >
                      <Send size={16} className={isRtl ? 'rotate-180 -ml-0.5' : 'ml-0.5'} />
                    </button>
                  </form>
                </div>

                {/* Right Side: Interaction Buttons */}
                <div className="flex flex-col items-center gap-4 mb-1 pr-1">
                  <button onClick={() => setIsGiftModalOpen(true)} className="group flex flex-col items-center gap-1 transition-theme cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-yellow-400/10 backdrop-blur-md border border-yellow-400/30 flex items-center justify-center text-yellow-400 group-hover:bg-yellow-400 group-hover:text-black transition-theme shadow-xl">
                      <Gift size={20} />
                    </div>
                    <span className="text-[9px] text-white font-black uppercase tracking-widest drop-shadow-2xl">{isRtl ? 'هدايا' : 'Gifts'}</span>
                  </button>

                  <button onClick={handleLiveLike} className="group flex flex-col items-center gap-1 transition-theme cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 backdrop-blur-md border border-red-500/30 flex items-center justify-center text-white group-hover:bg-red-500 transition-theme shadow-xl">
                      <Heart size={20} className={liveLikes > 0 ? 'fill-current text-red-500 group-hover:text-white' : ''} />
                    </div>
                    <span className="text-[9px] text-white font-black drop-shadow-2xl">{liveLikes > 1000 ? (liveLikes / 1000).toFixed(1) + 'K' : liveLikes}</span>
                  </button>

                  <button className="group flex flex-col items-center gap-1 transition-theme cursor-pointer">
                    <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-accent hover:text-white transition-theme shadow-xl group-hover:border-accent/50">
                      <Share2 size={20} />
                    </div>
                    <span className="text-[9px] text-white font-black uppercase tracking-widest drop-shadow-2xl">{isRtl ? 'مشاركة' : 'Share'}</span>
                  </button>

                  <div className="w-9 h-9 rounded-xl border-2 border-accent p-0.5 animate-pulse shadow-[0_0_15px_rgba(156,163,175,0.5)] bg-black/20 overflow-hidden">
                    <img
                      src={user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=80'}
                      alt="host"
                      className="w-full h-full rounded-lg object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Gift Modal Overlay */}
            <AnimatePresence>
              {isGiftModalOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 100 }}
                  className="absolute bottom-0 inset-x-0 bg-gray-900 rounded-t-3xl p-6 z-50 border-t border-gray-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pointer-events-auto"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-extrabold text-lg flex items-center gap-2">
                      <Gift className="text-yellow-400" size={20} />
                      {isRtl ? 'إرسال هدية للمنشئ' : 'Send Gift to Creator'}
                    </h3>
                    <button onClick={() => setIsGiftModalOpen(false)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-lg cursor-pointer">
                      <X size={20} />
                    </button>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mb-6">
                    {giftsCatalog.length > 0 ? (
                      giftsCatalog.map((gift, gIdx) => (
                        <button
                          key={`gift-opt-${gift.id}-${gIdx}`}
                          onClick={() => handleSendGift(gift)}
                          className="flex flex-col items-center justify-center p-3 bg-gray-800 rounded-2xl border border-gray-700 hover:border-accent hover:bg-gray-700 transition-theme group cursor-pointer"
                        >
                          <span className="text-3xl mb-2 transition-theme">{gift.icon}</span>
                          <span className="text-[10px] text-white font-bold mb-1 truncate w-full text-center">
                            {isRtl ? gift.name_ar : gift.name_en}
                          </span>
                          <span className="text-[10px] text-yellow-400 flex items-center gap-1 font-black">
                            {gift.points} <Wallet size={10} />
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="col-span-4 py-8 text-center text-gray-500 text-xs">
                        {isRtl ? 'جاري تحميل الهدايا...' : 'Loading gifts...'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Wallet size={18} className="text-accent" />
                      <span className="text-sm">{isRtl ? 'رصيدك الحالي:' : 'Your Balance:'}</span>
                    </div>
                    <span className="text-accent font-extrabold text-lg">{walletBalance}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Instructions Hint for Mobile */}
            <div className="absolute left-1/2 bottom-4 -translate-x-1/2 pointer-events-none z-30 flex flex-col items-center opacity-40">
              <div className="w-1 h-8 rounded-full bg-white/20 relative overflow-hidden">
                <motion.div
                  animate={{ y: [-32, 32] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-full h-1/2 bg-accent"
                />
              </div>
              <span className="text-[8px] text-white font-black mt-1 tracking-tighter uppercase">{isRtl ? 'اسحب للأعلى للتمرير' : 'SWIPE UP'}</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
