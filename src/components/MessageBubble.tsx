import React from 'react';
import { motion } from 'motion/react';
import { Pin, PinOff, Pencil } from 'lucide-react';

declare const ToolStatusIndicator: any;

interface MessageBubbleProps {
  msg: any;
  idx: number;
  dir: string;
  isGenerating: boolean;
  messages: any[];
  editingMessageIndex: number | null;
  setEditingMessageIndex: (index: number | null) => void;
  editValue: string;
  setEditValue: (value: string) => void;
  handleEditSubmit: (index: number) => void;
  handlePinMessage: (id: string, isPinned: boolean) => void;
  getFileIcon: (type: string) => React.ReactNode;
  stripProtocolMarkers: (content: string) => string;
  formatExactTimestamp: (timestamp: string, dir: string) => string;
  t: (key: string) => string;
}

const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  msg,
  idx,
  dir,
  isGenerating,
  messages,
  editingMessageIndex,
  setEditingMessageIndex,
  editValue,
  setEditValue,
  handleEditSubmit,
  handlePinMessage,
  getFileIcon,
  stripProtocolMarkers,
  formatExactTimestamp,
  t,
}) => {
  return (
    <motion.div 
      key={msg.client_id || msg.id || idx} 
      id={`message-${idx}`}
      className={`w-full ${msg.role === 'user' ? 'user-message-anchor' : ''}`}
    >
      <div className={`w-full min-h-[44px] ${msg.role === 'user' ? 'bg-transparent' : 'bg-transparent'} px-0`}>
        {msg.role === 'user' ? (
          <div className={`flex flex-col gap-2 w-full ${dir === 'rtl' ? 'items-end' : 'items-start'}`}>
            {msg.file && (
              <div className={`mb-1 p-2 rounded-[var(--radius)] border flex items-center gap-3 w-fit ${
                dir === 'rtl' ? 'self-end' : 'self-start'
                } bg-[var(--bg-secondary)] border-[var(--border)]`}>
                {msg.file.type.startsWith('image/') ? (
                  <img 
                    src={msg.file.preview} 
                    alt={msg.file.name} 
                    className="w-10 h-10 object-cover rounded-[var(--radius)]" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-[var(--radius)] bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                    {getFileIcon(msg.file.type)}
                  </div>
                )}
                <div className="flex flex-col min-w-0 pe-2">
                  <span className="text-[11px] font-bold truncate max-w-[150px] text-[var(--text-primary)]">{msg.file.name}</span>
                  <span className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-tighter">
                    {msg.file.type.split('/')[1] || 'FILE'}
                  </span>
                </div>
              </div>
            )}
            {editingMessageIndex === idx ? (
              <div className="flex flex-col gap-2 w-full max-w-2xl bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-gray-200 dark:border-zinc-850/80">
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                  className="w-full bg-transparent border-none focus:ring-0 text-[15px] md:text-sm resize-none outline-none text-zinc-900 dark:text-zinc-100"
                  rows={Math.max(1, editValue.split('\n').length)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleEditSubmit(idx);
                    }
                    if (e.key === 'Escape') {
                      setEditingMessageIndex(null);
                    }
                  }}
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button 
                    onClick={() => setEditingMessageIndex(null)}
                    className="px-3 py-1 text-[10px] uppercase font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    {dir === 'rtl' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button 
                    onClick={() => handleEditSubmit(idx)}
                    className="px-4 py-1.5 text-[10px] uppercase font-bold bg-emerald-500 text-white rounded-[var(--radius)] hover:bg-emerald-600 transition-theme"
                  >
                    {dir === 'rtl' ? 'حفظ وإرسال' : 'Save & Send'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="group relative flex items-center gap-3 w-full">
                <div 
                  className={`text-[14px] md:text-[15px] font-semibold leading-relaxed whitespace-pre-wrap text-zinc-950 dark:text-zinc-50 tracking-wide font-sans flex-1 ${
                    dir === 'rtl' ? 'text-right' : 'text-left'
                  }`}
                  dir={dir === 'rtl' ? 'rtl' : 'ltr'}
                >
                  {stripProtocolMarkers(msg.content) || msg.content || (dir === 'rtl' ? 'محتوى فارغ' : 'Empty Content')}
                </div>

                {msg.is_pinned && (
                  <div className="flex items-center gap-1 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)] shrink-0 scale-90">
                    <Pin size={8} className="text-emerald-500" />
                    <span className="text-[7px] font-black uppercase text-emerald-500/80 tracking-tighter">Pinned</span>
                  </div>
                )}

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                  <button 
                    onClick={() => handlePinMessage(msg.id!, !msg.is_pinned)}
                    className={`p-1.5 rounded-md hover:bg-[var(--bg-overlay)] transition-colors duration-200 shrink-0 ${
                      msg.is_pinned ? 'text-emerald-500 hover:text-emerald-600' : 'text-gray-400 hover:text-emerald-500'
                    }`}
                    title={msg.is_pinned ? (dir === 'rtl' ? 'إلغاء التثبيت' : 'Unpin') : (dir === 'rtl' ? 'تثبيت' : 'Pin')}
                  >
                    {msg.is_pinned ? <PinOff size={13} /> : <Pin size={13} />}
                  </button>
                  <button 
                    onClick={() => {
                      setEditingMessageIndex(idx);
                      setEditValue(msg.content);
                    }}
                    className="p-1.5 rounded-md hover:bg-[var(--bg-overlay)] text-gray-400 hover:text-emerald-500 transition-colors duration-200 shrink-0"
                    title={dir === 'rtl' ? 'تعديل' : 'Edit'}
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
            )}

            <div className={`text-[10px] font-mono text-gray-400 dark:text-gray-500/80 mt-1 select-none ${dir === 'rtl' ? 'text-right' : 'text-left'}`}>
              {formatExactTimestamp(msg.created_at, dir)}
            </div>
          </div>
        ) : (
          <motion.div 
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="markdown-body prose dark:prose-invert max-w-none relative text-[13px] md:text-base leading-relaxed tracking-tight"
          >
            {/* AI message rendering logic... I need these props! */}
            {!msg.is_quota_error && !msg.is_system_inactive && msg.tool !== 'video' && (
              <ToolStatusIndicator 
                tool={msg.tool} 
                isGenerating={isGenerating && idx === messages.length - 1} 
                dir={dir} 
                t={t} 
              />
            )}
            {/* ... rest of logic ... */}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

export default MessageBubble;
