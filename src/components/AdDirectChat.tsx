import { safeStorageGet, safeStorageSet, safeStorageRemove } from "@/utils/safeStorage";
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  Send, 
  Image as ImageIcon, 
  X, 
  Loader2, 
  Check, 
  CheckCheck, 
  ShieldCheck, 
  Sparkles,
  MessageSquare,
  ChevronDown,
  User,
  Paperclip
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { toast } from 'sonner';
import { getMediaUrl } from '../utils/mediaUtils';

export interface AdDirectMessage {
  id: number;
  ad_id: number;
  sender_id: number;
  recipient_id: number;
  sender_name: string;
  sender_avatar?: string;
  message: string;
  media_url?: string;
  is_encrypted: boolean;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
}

interface AdDirectChatProps {
  ad: {
    id: number;
    title: string;
    image_url?: string | null;
    author_name?: string | null;
    author_avatar?: string | null;
    user_id?: number | null;
    page_owner_id?: number | null;
    page_name?: string | null;
    quick_questions?: string[] | null;
  };
  onClose?: () => void;
  isCompact?: boolean;
}

export const AdDirectChat: React.FC<AdDirectChatProps> = ({ ad, onClose, isCompact = false }) => {
  const { user, token, socket, language } = useAppContext();
  const isRtl = language === 'ar';

  const [messages, setMessages] = useState<AdDirectMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [recipientTyping, setRecipientTyping] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [otherParticipant, setOtherParticipant] = useState<{ id: number; name: string; avatar?: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Quick preset questions (Advertiser custom or defaults)
  const customQuickQuestions = ad.quick_questions;
  const quickQuestions = (Array.isArray(customQuickQuestions) && customQuickQuestions.length > 0 && customQuickQuestions.some(Boolean))
    ? customQuickQuestions.filter(Boolean)
    : (isRtl
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
          ]);

  // Fetch initial messages
  useEffect(() => {
    if (!token || !ad.id) return;

    let isMounted = true;
    setLoading(true);

    fetch(`/api/bulletin/ads/${ad.id}/direct-messages`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success) {
          setMessages(data.messages || []);
          if (data.other_participant) {
            setOtherParticipant(data.other_participant);
          } else {
            setOtherParticipant({
              id: data.ad?.owner_id || ad.user_id || 0,
              name: data.ad?.page_name || data.ad?.author_name || ad.author_name || (isRtl ? 'صاحب الإعلان' : 'Advertiser'),
              avatar: data.ad?.page_avatar || data.ad?.author_avatar || ad.author_avatar
            });
          }
        }
      })
      .catch((err) => {
        console.error('Error fetching ad direct messages:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
        setTimeout(() => scrollToBottom(false), 200);
      });

    return () => {
      isMounted = false;
    };
  }, [ad.id, token, isRtl]);

  // Real-time Socket Event Subscribers
  useEffect(() => {
    if (!socket || !user?.id) return;

    // Listen for incoming direct messages for this ad
    const handleIncomingMessage = (newMsg: AdDirectMessage) => {
      if (newMsg.ad_id === ad.id) {
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        setTimeout(() => scrollToBottom(true), 100);
      }
    };

    // Listen for typing indicator
    const handleRecipientTyping = (data: { ad_id: number; sender_id: number; is_typing: boolean }) => {
      if (data.ad_id === ad.id && data.sender_id !== user.id) {
        setRecipientTyping(data.is_typing);
      }
    };

    socket.on('ad_direct_message', handleIncomingMessage);
    socket.on('ad_typing', handleRecipientTyping);

    return () => {
      socket.off('ad_direct_message', handleIncomingMessage);
      socket.off('ad_typing', handleRecipientTyping);
    };
  }, [socket, ad.id, user?.id]);

  // Scroll on message updates
  useEffect(() => {
    scrollToBottom(true);
  }, [messages, recipientTyping]);

  // Typing event trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputMessage(val);

    if (socket && otherParticipant?.id) {
      if (!isTyping) {
        setIsTyping(true);
        socket.emit('ad_typing', { ad_id: ad.id, recipient_id: otherParticipant.id, is_typing: true });
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket.emit('ad_typing', { ad_id: ad.id, recipient_id: otherParticipant.id, is_typing: false });
      }, 1500);
    }
  };

  // Image upload handling
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error(isRtl ? 'حجم الصورة كبير جداً (الأقصى 10 ميجابايت)' : 'Image size too large (max 10MB)');
      return;
    }

    const toastId = toast.loading(isRtl ? 'جاري رفع الصورة...' : 'Uploading image...');
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const authToken = token || safeStorageGet('app_token') || '';
      const res = await fetch('/api/files/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
        body: formDataUpload
      });

      if (res.ok) {
        const data = await res.json();
        const rawUrl = data.fileUrl || data.file?.url || data.file?.file_url || data.url;
        const fileUrl = getMediaUrl(rawUrl);
        if (fileUrl) {
          setAttachedImage(fileUrl);
          toast.dismiss(toastId);
          toast.success(isRtl ? 'تم رفع المرفق بنجاح' : 'Attachment uploaded successfully');
          return;
        }
      }
      throw new Error('Upload failed');
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(isRtl ? 'فشل رفع مرفق الصورة، يرجى إعادة المحاولة' : 'Failed to upload image attachment');
    }
  };

  // Send Message Handler
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputMessage).trim();
    if ((!content && !attachedImage) || sending || !token) return;

    setSending(true);
    const tempImage = attachedImage;
    setInputMessage('');
    setAttachedImage(null);

    // Stop typing indicator
    if (socket && otherParticipant?.id) {
      socket.emit('ad_typing', { ad_id: ad.id, recipient_id: otherParticipant.id, is_typing: false });
      setIsTyping(false);
    }

    try {
      const res = await fetch(`/api/bulletin/ads/${ad.id}/direct-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          message: content,
          media_url: tempImage,
          recipient_id: otherParticipant?.id,
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

  return (
    <div className={`flex flex-col bg-white dark:bg-[#151518] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden ${isCompact ? 'h-[440px]' : 'h-[520px]'} transition-theme`}>
      {/* Encryption & Participant Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-gray-50 via-gray-100 to-gray-50 dark:from-[#1a1a1e] dark:via-[#222228] dark:to-[#1a1a1e] border-b border-gray-200 dark:border-gray-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            {otherParticipant?.avatar ? (
              <img
                src={otherParticipant.avatar}
                alt={otherParticipant.name}
                className="w-9 h-9 rounded-full object-cover ring-2 ring-accent-500/30"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-accent/10 dark:bg-accent/20 text-accent flex items-center justify-center font-bold text-sm ring-2 ring-accent-500/30">
                <User size={18} />
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-accent rounded-full ring-2 ring-white dark:ring-[#1a1a1e] animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-gray-100 line-clamp-1">
                {otherParticipant?.name || (isRtl ? 'محادثة خاصة' : 'Private Inquiry')}
              </h4>
              <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-accent dark:text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20 shrink-0">
                <Lock size={10} />
                <span>E2EE</span>
              </span>
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 flex items-center gap-1">
              <ShieldCheck size={12} className="text-accent shrink-0" />
              <span>{isRtl ? 'مشفر بالكامل (AES-256)' : 'End-to-End Encrypted'}</span>
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200/80 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            title={isRtl ? 'إغلاق المحادثة' : 'Close chat'}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Security Banner */}
      <div className="bg-accent/10 border-b border-accent/20 px-3 py-1.5 flex items-center justify-center gap-1.5 text-[11px] font-bold text-accent dark:text-accent text-center shrink-0">
        <Lock size={12} className="shrink-0" />
        <span>
          {isRtl
            ? 'محادثة أمنة ومشفرة تماماً. لا يتم كشف بياناتك الشخصية.'
            : 'Secure & encrypted end-to-end. Your private info is protected.'}
        </span>
      </div>

      {/* Messages Stream Body */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-gray-50/50 dark:bg-[#121215]">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400">
            <Loader2 size={24} className="animate-spin text-accent" />
            <span className="text-xs font-semibold">
              {isRtl ? 'جاري فك التشفير وجلب الرسائل...' : 'Decrypting & loading messages...'}
            </span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-3 shadow-inner">
              <MessageSquare size={22} />
            </div>
            <h5 className="font-extrabold text-sm text-gray-800 dark:text-gray-200 mb-1">
              {isRtl ? 'ابدأ الاستفسار عن الإعلان الآن' : 'Start Your Direct Inquiry'}
            </h5>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs mb-4">
              {isRtl
                ? 'استفسر مباشرة عن الأسعار، التوصيل، وحجز السلعة بأمان وسرية.'
                : 'Ask directly about pricing, delivery, and availability with instant E2E privacy.'}
            </p>

            {/* Quick Questions Chips */}
            <div className="w-full max-w-sm space-y-1.5 text-start">
              <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">
                {isRtl ? 'أسئلة سريعة جاهزة:' : 'Quick Prompts:'}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(q)}
                    className="text-xs font-bold px-2.5 py-1.5 rounded-xl bg-white dark:bg-[#1c1c20] hover:bg-accent hover:text-white dark:hover:bg-accent text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 transition-theme text-start shadow-xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[78%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-xs relative group transition-theme ${
                    isMe
                      ? 'bg-accent text-white rounded-br-xs font-medium'
                      : 'bg-white dark:bg-[#1e1e22] text-gray-800 dark:text-gray-100 rounded-bl-xs border border-gray-200/80 dark:border-gray-800'
                  }`}
                >
                  {/* Media attachment if exists */}
                  {msg.media_url && (
                    <div className="mb-2 rounded-xl overflow-hidden max-h-48 border border-black/10">
                      <img
                        src={getMediaUrl(msg.media_url)}
                        alt="Attached media"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <p className="whitespace-pre-wrap break-words">{msg.message}</p>

                  <div
                    className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${
                      isMe ? 'text-accent-100' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    <span className="font-mono text-[9px]">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    {/* E2EE indicator */}
                    <Lock size={9} className="opacity-80" />

                    {/* Status ticks for user messages */}
                    {isMe && (
                      <span className="shrink-0">
                        {msg.status === 'read' ? (
                          <CheckCheck size={12} className="text-blue-200 font-bold" />
                        ) : (
                          <Check size={12} />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Recipient Typing Indicator */}
        {recipientTyping && (
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 italic bg-white dark:bg-[#1e1e22] px-3 py-1.5 rounded-full w-fit border border-gray-200 dark:border-gray-800">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" />
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce [animation-delay:0.4s]" />
            </span>
            <span>{isRtl ? 'المعلن يكتب الآن...' : 'Typing message...'}</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar (when messages exist) */}
      {messages.length > 0 && (
        <div className="px-3 py-1.5 bg-white dark:bg-[#18181c] border-t border-gray-100 dark:border-gray-800/60 overflow-x-auto no-scrollbar flex items-center gap-1.5 text-xs shrink-0">
          {quickQuestions.slice(0, 3).map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-accent/10 hover:text-accent dark:hover:bg-accent/20 text-gray-600 dark:text-gray-300 whitespace-nowrap transition-theme border border-gray-200/60 dark:border-gray-700/60"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Image Attachment Preview */}
      {attachedImage && (
        <div className="p-2 bg-gray-100 dark:bg-[#1c1c20] border-t border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <img src={getMediaUrl(attachedImage)} alt="Preview" className="w-10 h-10 object-cover rounded-lg" />
            <span className="text-xs text-gray-600 dark:text-gray-300 font-medium">
              {isRtl ? 'صورة مرفقة جاهزة للإرسال' : 'Image attached'}
            </span>
          </div>
          <button
            onClick={() => setAttachedImage(null)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-2.5 bg-white dark:bg-[#18181c] border-t border-gray-200 dark:border-gray-800 flex items-center gap-2 shrink-0">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageSelect}
          className="hidden"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2 rounded-xl text-gray-400 hover:text-accent hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
          placeholder={
            isRtl ? 'اكتب استفسارك المباشر هنا (مشفر بالكامل)...' : 'Type your encrypted inquiry...'
          }
          className="flex-1 bg-gray-100 dark:bg-[#202025] text-gray-900 dark:text-gray-100 text-xs px-3.5 py-2.5 rounded-xl border border-transparent focus:border-accent focus:bg-white dark:focus:bg-[#151518] focus:outline-none transition-theme"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={(!inputMessage.trim() && !attachedImage) || sending}
          className="p-2.5 rounded-xl bg-accent hover:bg-accent disabled:opacity-40 text-white font-bold transition-theme shadow-md shadow-none flex items-center justify-center shrink-0"
          title={isRtl ? 'إرسال الرسالة المشفرة' : 'Send message'}
        >
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>
    </div>
  );
};
