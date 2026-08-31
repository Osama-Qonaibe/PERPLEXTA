import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Send,
  X,
  Loader2,
  Check,
  CheckCheck,
  ShieldCheck,
  MessageSquare,
  Search,
  ArrowRight,
  ArrowLeft,
  User,
  Paperclip
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { getMediaUrl } from '../utils/mediaUtils';
import { BulletinAvatar } from './BulletinAvatar';
import { toast } from '../context/NotificationContext';

export interface MessengerThread {
  id: number;
  ad_id: number;
  ad_title?: string;
  ad_image?: string;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  sender_phone?: string;
  message: string;
  created_at: string;
  type: 'direct' | 'legacy';
}

interface AdMessengerHubProps {
  inquiries: MessengerThread[];
  onRefresh: () => void;
  isRtl: boolean;
}

export const AdMessengerHub: React.FC<AdMessengerHubProps> = ({ inquiries, onRefresh, isRtl }) => {
  const { user, token, socket } = useAppContext();
  const [selectedThread, setSelectedThread] = useState<MessengerThread | null>(inquiries[0] || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  const quickPrompts = isRtl
    ? [
        'هل المنتج متوفر حالياً؟',
        'ما هو السعر النهائي وهل يوجد خصم؟',
        'هل يتوفر توصيل للمحافظات؟',
        'أود شراء وحجز هذا الإعلان فوراً!'
      ]
    : [
        'Is this item currently available?',
        'What is the final price?',
        'Do you offer shipping/delivery?',
        'I would like to buy this item now!'
      ];

  useEffect(() => {
    if (!token || !selectedThread) return;
    let isMounted = true;
    setLoadingMessages(true);

    const adId = selectedThread.ad_id;
    const participantId = selectedThread.sender_id === user?.id ? undefined : selectedThread.sender_id;

    const url = participantId
      ? `/api/bulletin/ads/${adId}/direct-messages?participant_id=${participantId}`
      : `/api/bulletin/ads/${adId}/direct-messages`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success) {
          setMessages(data.messages || []);
        }
      })
      .catch((err) => {
        console.error('Error fetching thread direct messages:', err);
      })
      .finally(() => {
        if (isMounted) setLoadingMessages(false);
        setTimeout(() => scrollToBottom(false), 150);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedThread, token, user?.id]);

  useEffect(() => {
    if (!socket || !user?.id || !selectedThread) return;

    const handleIncomingMessage = (newMsg: any) => {
      if (newMsg.ad_id === selectedThread.ad_id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => scrollToBottom(true), 100);
      }
    };

    const handleTyping = (data: { ad_id: number; sender_id: number; is_typing: boolean }) => {
      if (data.ad_id === selectedThread.ad_id && data.sender_id !== user.id) {
        setRecipientTyping(data.is_typing);
      }
    };

    socket.on('ad_direct_message', handleIncomingMessage);
    socket.on('ad_typing', handleTyping);

    return () => {
      socket.off('ad_direct_message', handleIncomingMessage);
      socket.off('ad_typing', handleTyping);
    };
  }, [socket, selectedThread, user?.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    if (socket && selectedThread) {
      const recipientId = selectedThread.sender_id === user?.id ? (selectedThread as any).recipient_id : selectedThread.sender_id;
      if (!isTyping) {
        setIsTyping(true);
        socket.emit('ad_typing', { ad_id: selectedThread.ad_id, recipient_id: recipientId, is_typing: true });
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit('ad_typing', { ad_id: selectedThread.ad_id, recipient_id: recipientId, is_typing: false });
      }, 1500);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.error(isRtl ? 'حجم الصورة كبير جداً (الأقصى 8 ميجابايت)' : 'Image size too large (max 8MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputMessage).trim();
    if ((!content && !attachedImage) || sending || !token || !selectedThread) return;
    setSending(true);
    const tempImage = attachedImage;
    setInputMessage('');
    setAttachedImage(null);

    try {
      const recipientId = selectedThread.sender_id === user?.id ? (selectedThread as any).recipient_id : selectedThread.sender_id;
      const res = await fetch(`/api/bulletin/ads/${selectedThread.ad_id}/direct-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: content,
          media_url: tempImage,
          recipient_id: recipientId,
          is_encrypted: true
        })
      });
      const data = await res.json();
      if (res.ok && data.success && data.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        setTimeout(() => scrollToBottom(true), 100);
      } else {
        toast.error(data.error || (isRtl ? 'فشل إرسال الرسالة' : 'Failed to send message'));
      }
    } catch (error) {
      console.error('Send message error:', error);
      toast.error(isRtl ? 'حدث خطأ أثناء إرسال الرسالة' : 'Error sending message');
    } finally {
      setSending(false);
    }
  };

  const filteredInquiries = inquiries.filter((inq) => {
    const term = searchTerm.toLowerCase();
    return (
      inq.sender_name?.toLowerCase().includes(term) ||
      inq.message?.toLowerCase().includes(term) ||
      inq.ad_title?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="bg-white dark:bg-[#151518] border border-gray-200 dark:border-gray-800 rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[640px]">
      {/* Left Sidebar: Conversations List (Messenger Inbox style) */}
      <div
        className={`lg:col-span-4 border-e border-gray-200 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-[#121215] ${
          selectedThread ? 'hidden lg:flex' : 'flex'
        }`}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MessageSquare size={18} className="text-accent" />
              <span>{isRtl ? 'رسائل المعلنين' : 'Advertiser Messenger'}</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-accent/10 text-accent dark:text-accent text-xs font-black border border-accent/20">
              {inquiries.length}
            </span>
          </div>
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isRtl ? 'بحث في المحادثات...' : 'Search messenger inbox...'}
              className={`w-full ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-2 bg-white dark:bg-[#1a1a1e] border border-gray-200 dark:border-gray-800 rounded-xl text-xs focus:ring-2 focus:ring-accent-500 outline-none transition-theme dark:text-white`}
            />
            <Search size={14} className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-gray-400`} />
          </div>
        </div>

        {/* Thread Items List */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/60">
          {filteredInquiries.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
              <MessageSquare size={28} className="mb-2 opacity-50" />
              <p className="text-xs font-bold">{isRtl ? 'لا توجد محادثات مطابقة' : 'No conversations found'}</p>
            </div>
          ) : (
            filteredInquiries.map((inq, inqIdx) => {
              const isSelected = selectedThread?.id === inq.id;
              return (
                <div
                  key={`inq-${inq.id || inqIdx}-${inqIdx}`}
                  onClick={() => setSelectedThread(inq)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition-theme relative ${
                    isSelected
                      ? 'bg-accent/10 dark:bg-accent/15 border-e-4 border-accent'
                      : 'hover:bg-gray-100/70 dark:hover:bg-[#1a1a1e]/60'
                  }`}
                >
                  <BulletinAvatar
                    src={inq.sender_avatar}
                    alt={inq.sender_name}
                    size="md"
                    isOnline={true}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-extrabold text-xs text-gray-900 dark:text-gray-100 truncate">{inq.sender_name}</h4>
                      <span className="text-[10px] text-gray-400 font-mono shrink-0">
                        {new Date(inq.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate mb-1.5 font-medium">{inq.message}</p>
                    {inq.ad_title && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-200/60 dark:bg-gray-800 text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate max-w-full">
                        📌 {inq.ad_title}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Active Facebook Messenger Window */}
      <div
        className={`lg:col-span-8 flex flex-col bg-white dark:bg-[#18181c] ${
          selectedThread ? 'flex' : 'hidden lg:flex'
        }`}
      >
        {selectedThread ? (
          <>
            {/* Messenger Chat Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-[#1a1a1e] dark:via-[#222228] dark:to-[#1a1a1e] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                {/* Mobile Back Button */}
                <button
                  onClick={() => setSelectedThread(null)}
                  className="lg:hidden p-2 rounded-xl bg-gray-200/80 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
                >
                  {isRtl ? <ArrowRight size={18} /> : <ArrowLeft size={18} />}
                </button>
                <BulletinAvatar
                  src={selectedThread.sender_avatar}
                  alt={selectedThread.sender_name}
                  size="md"
                  isOnline={true}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">{selectedThread.sender_name}</h4>
                    <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-accent dark:text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
                      <Lock size={10} />
                      <span>E2EE</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <ShieldCheck size={12} className="text-accent shrink-0" />
                    <span>{isRtl ? 'محادثة مشفرة بالكامل (AES-256)' : 'End-to-End Encrypted Messenger'}</span>
                  </p>
                </div>
              </div>

              {/* Ad Info Preview Banner */}
              {selectedThread.ad_title && (
                <div className="hidden sm:flex items-center gap-2.5 bg-white dark:bg-[#151518] px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800 max-w-xs truncate">
                  {selectedThread.ad_image && (
                    <img src={selectedThread.ad_image} alt="" className="w-7 h-7 rounded-lg object-cover shrink-0" />
                  )}
                  <div className="min-w-0 text-start">
                    <span className="text-[10px] text-gray-400 block">{isRtl ? 'إعلان مرتبط:' : 'Regarding ad:'}</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate block">{selectedThread.ad_title}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Messages Stream View */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-gray-50/50 dark:bg-[#121215]">
              {loadingMessages ? (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400">
                  <Loader2 size={24} className="animate-spin text-accent" />
                  <span className="text-xs font-semibold">{isRtl ? 'جاري فك التشفير وجلب الرسائل...' : 'Loading secure messages...'}</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6">
                  <MessageSquare size={32} className="text-accent/40 mb-3" />
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-300">
                    {isRtl ? 'ابدأ إرسال الرسائل المشفرة الآن' : 'Start your secure conversation'}
                  </p>
                </div>
              ) : (
                messages.map((msg, mIdx) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={`hub-msg-${msg.id || mIdx}-${mIdx}`} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}>
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-xs relative ${
                          isMe
                            ? 'bg-accent text-white rounded-br-xs font-medium'
                            : 'bg-white dark:bg-[#202025] text-gray-900 dark:text-gray-100 rounded-bl-xs border border-gray-200/80 dark:border-gray-800'
                        }`}
                      >
                        {msg.media_url && (
                          <div className="mb-2 rounded-xl overflow-hidden max-h-56 border border-black/10">
                            <img src={msg.media_url} alt="Media" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        <div
                          className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                            isMe ? 'text-accent' : 'text-gray-400 dark:text-gray-500'
                          }`}
                        >
                          <span className="font-mono text-[9px]">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <Lock size={9} className="opacity-75" />
                          {isMe && (
                            <span>
                              {msg.status === 'read' ? <CheckCheck size={12} className="text-blue-200" /> : <Check size={12} />}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Typing indicator */}
              {recipientTyping && (
                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 italic bg-white dark:bg-[#202025] px-3 py-1.5 rounded-full w-fit border border-gray-200 dark:border-gray-800">
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.4s]" />
                  </span>
                  <span>{isRtl ? 'المعلن يكتب الآن...' : 'Typing...'}</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Bar */}
            <div className="px-3 py-2 bg-white dark:bg-[#18181c] border-t border-gray-100 dark:border-gray-800/60 overflow-x-auto no-scrollbar flex items-center gap-1.5 shrink-0">
              {quickPrompts.map((q, idx) => (
                <button
                  key={`messenger-quick-prompt-${idx}-${q}`}
                  onClick={() => handleSendMessage(q)}
                  className="text-[11px] font-bold px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-accent hover:text-white dark:hover:bg-accent text-gray-700 dark:text-gray-300 whitespace-nowrap transition-theme border border-gray-200 dark:border-gray-700"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Attached Image Preview */}
            {attachedImage && (
              <div className="p-2 bg-gray-100 dark:bg-[#202025] border-t border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <img src={attachedImage} alt="Preview" className="w-10 h-10 object-cover rounded-lg" />
                  <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">{isRtl ? 'صورة جاهزة للإرسال' : 'Image ready'}</span>
                </div>
                <button onClick={() => setAttachedImage(null)} className="p-1 text-gray-400 hover:text-red-500">
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Input Toolbar */}
            <div className="p-3 bg-white dark:bg-[#18181c] border-t border-gray-200 dark:border-gray-800 flex items-center gap-2 shrink-0">
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 rounded-xl text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title={isRtl ? 'إرفاق صورة' : 'Attach image'}
              >
                <Paperclip size={18} />
              </button>
              <input
                type="text"
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={isRtl ? 'اكتب رسالتك المشفرة هنا...' : 'Type encrypted message...'}
                className="flex-1 bg-gray-100 dark:bg-[#202025] text-gray-900 dark:text-gray-100 text-xs px-4 py-3 rounded-xl border border-transparent focus:border-accent focus:bg-white dark:focus:bg-[#151518] focus:outline-none transition-theme"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={(!inputMessage.trim() && !attachedImage) || sending}
                className="p-3 rounded-xl bg-accent hover:bg-accent disabled:opacity-40 text-white font-bold transition-theme shadow-md shadow-none flex items-center justify-center shrink-0"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4">
              <MessageSquare size={28} />
            </div>
            <h4 className="font-extrabold text-base text-gray-800 dark:text-gray-200 mb-1">
              {isRtl ? 'اختر محادثة لبدء المراسلة' : 'Select a conversation'}
            </h4>
            <p className="text-xs text-gray-500 max-w-xs">
              {isRtl
                ? 'اختر محادثة من القائمة الجانبية للتواصل الآمن والمباشر مع المعلنين.'
                : 'Choose a conversation from the sidebar for secure direct messaging.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
