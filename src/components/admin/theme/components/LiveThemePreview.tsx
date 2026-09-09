import React, { useState } from 'react';
import { Sparkles, Check, AlertTriangle, XCircle, Info, Send, User, Bot, Search, ArrowUpRight } from 'lucide-react';
import { ThemeTokensMap } from '../types';

interface LiveThemePreviewProps {
  tokens: ThemeTokensMap;
  mode: 'light' | 'dark';
  language: string;
}

export const LiveThemePreview: React.FC<LiveThemePreviewProps> = ({ tokens, mode, language }) => {
  const isAr = language === 'ar';
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isHoveredButton, setIsHoveredButton] = useState(false);

  // Dynamic values extracted safely from current token set
  const surfacePage = tokens['--surface-page'] || (mode === 'dark' ? '#181715' : '#faf9f5');
  const surfaceCard = tokens['--surface-card'] || (mode === 'dark' ? '#1f1e1b' : '#efe9de');
  const surfaceSubtle = tokens['--surface-subtle'] || (mode === 'dark' ? '#252320' : '#f5f0e8');
  const fgPrimary = tokens['--fg-primary'] || (mode === 'dark' ? '#faf9f5' : '#141413');
  const fgSecondary = tokens['--fg-secondary'] || (mode === 'dark' ? '#a09d96' : '#3d3d3a');
  const fgMuted = tokens['--fg-muted'] || '#6c6a64';
  const accent = tokens['--accent'] || '#cc785c';
  const accentHover = tokens['--accent-hover'] || '#a9583e';
  const bgAccent = tokens['--bg-accent-emphasis'] || accent;
  const fgOnEmphasis = tokens['--fg-on-emphasis'] || '#ffffff';
  const borderDefault = tokens['--border-default'] || (mode === 'dark' ? 'rgba(250,249,245,0.1)' : '#e6dfd8');
  const borderFocus = tokens['--border-focus'] || accent;
  const borderOuterInput = tokens['--border-outer-input'] || borderDefault;
  const bgInput = tokens['--bg-input'] || surfaceSubtle;
  const chatBubbleUser = tokens['--chat-bubble-user'] || accent;
  const chatBubbleUserText = tokens['--chat-bubble-user-text'] || '#ffffff';
  const chatBubbleAssistant = tokens['--chat-bubble-assistant'] || surfaceCard;
  const chatBubbleAssistantText = tokens['--chat-bubble-assistant-text'] || fgPrimary;
  const fgSuccess = tokens['--fg-success'] || '#5db872';
  const fgWarning = tokens['--fg-warning'] || '#e8a55a';
  const fgDanger = tokens['--fg-danger'] || '#c64545';
  const fgInfo = tokens['--fg-info'] || '#5db8a6';
  const radiusMd = tokens['--radius-md'] || '12px';
  const radiusSm = tokens['--radius-sm'] || '8px';
  const adminNavBg = tokens['--admin-nav-bg'] || surfaceSubtle;
  const adminTableHeaderBg = tokens['--admin-table-header-bg'] || surfaceSubtle;

  return (
    <div
      className="p-6 rounded-[var(--radius-lg)] border shadow-md transition-colors duration-200"
      style={{
        backgroundColor: surfacePage,
        borderColor: borderDefault,
        color: fgPrimary,
      }}
    >
      <div className="flex items-center justify-between pb-4 mb-6 border-b" style={{ borderColor: borderDefault }}>
        <div className="flex items-center gap-2">
          <Sparkles size={18} style={{ color: accent }} />
          <span className="font-bold text-sm" style={{ color: fgPrimary }}>
            {isAr ? 'معاينة حية للمكونات (Live Sandbox Simulation)' : 'Live Interactive Component Simulation'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider"
            style={{
              backgroundColor: surfaceSubtle,
              color: accent,
              border: `1px solid ${borderDefault}`,
            }}
          >
            {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: UI Controls & Admin Strip */}
        <div className="space-y-4">
          {/* Admin Navigation Strip Mock */}
          <div
            className="p-3 border flex items-center justify-between"
            style={{
              backgroundColor: adminNavBg,
              borderColor: borderDefault,
              borderRadius: radiusMd,
            }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded flex items-center justify-center font-bold text-xs"
                style={{ backgroundColor: bgAccent, color: fgOnEmphasis }}
              >
                P
              </div>
              <span className="font-bold text-xs" style={{ color: fgPrimary }}>Perplexta Core</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className="text-xs px-2.5 py-1 rounded font-bold"
                style={{
                  backgroundColor: surfaceCard,
                  color: accent,
                  border: `1px solid ${borderDefault}`,
                }}
              >
                {isAr ? 'لوحة التحكم' : 'Dashboard'}
              </span>
              <span className="text-xs px-2 py-1 rounded" style={{ color: fgMuted }}>
                {isAr ? 'المستخدمين' : 'Users'}
              </span>
            </div>
          </div>

          {/* Interactive Buttons & Inputs */}
          <div
            className="p-4 border space-y-4"
            style={{
              backgroundColor: surfaceCard,
              borderColor: borderDefault,
              borderRadius: radiusMd,
            }}
          >
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: fgSecondary }}>
              {isAr ? 'أزرار الإجراءات وحقول الإدخال' : 'Buttons & Input Controls'}
            </span>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onMouseEnter={() => setIsHoveredButton(true)}
                onMouseLeave={() => setIsHoveredButton(false)}
                className="px-4 py-2 text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                style={{
                  backgroundColor: isHoveredButton ? accentHover : bgAccent,
                  color: fgOnEmphasis,
                  borderRadius: radiusSm,
                }}
              >
                <span>{isAr ? 'زر رئيسي (Hover me)' : 'Primary CTA (Hover)'}</span>
                <ArrowUpRight size={14} />
              </button>

              <button
                type="button"
                className="px-4 py-2 text-xs font-bold border transition-all"
                style={{
                  backgroundColor: surfaceSubtle,
                  borderColor: borderDefault,
                  color: fgPrimary,
                  borderRadius: radiusSm,
                }}
              >
                {isAr ? 'زر ثانوي' : 'Secondary Action'}
              </button>
            </div>

            {/* Input Field with Focus Simulator */}
            <div className="relative">
              <Search size={15} className="absolute top-3 start-3" style={{ color: fgMuted }} />
              <input
                type="text"
                placeholder={isAr ? 'جرب الكتابة لمعاينة حلقة التركيز...' : 'Type to preview active focus ring...'}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                className="w-full ps-9 pe-3 py-2 text-xs outline-none transition-all"
                style={{
                  backgroundColor: bgInput,
                  color: fgPrimary,
                  borderColor: isInputFocused ? borderFocus : borderOuterInput,
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderRadius: radiusSm,
                  boxShadow: isInputFocused ? `0 0 0 2px ${tokens['--bg-accent-muted'] || 'rgba(204,120,92,0.2)'}` : 'none',
                }}
              />
            </div>
          </div>

          {/* Status Badges Row */}
          <div
            className="p-4 border flex flex-wrap items-center justify-between gap-2"
            style={{
              backgroundColor: surfaceCard,
              borderColor: borderDefault,
              borderRadius: radiusMd,
            }}
          >
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: fgSuccess }}>
              <Check size={14} />
              <span>{isAr ? 'عملية مؤكدة' : 'Confirmed'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: fgWarning }}>
              <AlertTriangle size={14} />
              <span>{isAr ? 'تحذير سقف الاستهلاك' : '90% Quota'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: fgDanger }}>
              <XCircle size={14} />
              <span>{isAr ? 'فشل التوصيل' : 'Failed'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: fgInfo }}>
              <Info size={14} />
              <span>{isAr ? 'مزامنة نشطة' : 'Synced'}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Mini Data Table & Chat Simulation */}
        <div className="space-y-4">
          {/* Mini Data Table */}
          <div
            className="overflow-hidden border text-xs"
            style={{
              backgroundColor: surfaceCard,
              borderColor: borderDefault,
              borderRadius: radiusMd,
            }}
          >
            <div
              className="px-3 py-2 font-bold border-b flex justify-between"
              style={{
                backgroundColor: adminTableHeaderBg,
                borderColor: borderDefault,
                color: fgSecondary,
              }}
            >
              <span>{isAr ? 'المستخدم / المعرف' : 'User / Identifier'}</span>
              <span>{isAr ? 'الخطة' : 'Tier'}</span>
              <span>{isAr ? 'الحالة' : 'Status'}</span>
            </div>
            <div
              className="px-3 py-2.5 flex justify-between items-center border-b transition-colors"
              style={{
                borderColor: borderDefault,
                color: fgPrimary,
              }}
            >
              <span className="font-semibold">admin@perplexta.ai</span>
              <span className="px-1.5 py-0.5 rounded font-mono text-[10px]" style={{ backgroundColor: surfaceSubtle, color: accent }}>
                ENTERPRISE
              </span>
              <span className="font-bold text-[11px]" style={{ color: fgSuccess }}>
                {isAr ? 'نشط' : 'Active'}
              </span>
            </div>
            <div
              className="px-3 py-2.5 flex justify-between items-center"
              style={{ color: fgPrimary }}
            >
              <span className="font-semibold">engineer@perplexta.ai</span>
              <span className="px-1.5 py-0.5 rounded font-mono text-[10px]" style={{ backgroundColor: surfaceSubtle, color: fgSecondary }}>
                PRO
              </span>
              <span className="font-bold text-[11px]" style={{ color: fgInfo }}>
                {isAr ? 'متحقق' : 'Verified'}
              </span>
            </div>
          </div>

          {/* Chat Exchange Mock */}
          <div
            className="p-4 border space-y-3"
            style={{
              backgroundColor: surfaceCard,
              borderColor: borderDefault,
              borderRadius: radiusMd,
            }}
          >
            <span className="text-xs font-bold uppercase tracking-wider block" style={{ color: fgSecondary }}>
              {isAr ? 'واجهة الدردشة والمحادثة' : 'Chat & Message Flow'}
            </span>

            {/* User Bubble */}
            <div className="flex items-start justify-end gap-2">
              <div
                className="px-3.5 py-2 text-xs font-medium max-w-[80%]"
                style={{
                  backgroundColor: chatBubbleUser,
                  color: chatBubbleUserText,
                  borderRadius: radiusMd,
                }}
              >
                {isAr ? 'حلل الكود واعرض مقاييس الأداء.' : 'Analyze system latency and optimize tokens.'}
              </div>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: surfaceSubtle, color: fgSecondary }}
              >
                <User size={13} />
              </div>
            </div>

            {/* AI Assistant Bubble */}
            <div className="flex items-start justify-start gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: bgAccent, color: fgOnEmphasis }}
              >
                <Bot size={13} />
              </div>
              <div
                className="px-3.5 py-2 text-xs font-medium border max-w-[80%]"
                style={{
                  backgroundColor: chatBubbleAssistant,
                  borderColor: borderDefault,
                  color: chatBubbleAssistantText,
                  borderRadius: radiusMd,
                }}
              >
                {isAr ? 'تم تحسين سرعة المعالجة بنسبة 40% واستقرار الرموز 100%.' : 'Latency reduced by 40% with zero layout shifts.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
