import React from 'react';
import { MessageSquare, ArrowRight, ArrowLeft, Search, Loader2 } from 'lucide-react';
import { AdMessengerHub } from '../AdMessengerHub';
import { BulletinAd } from '../../../server/db/types';

export interface InquiriesTabProps {
  isRtl: boolean;
  setActiveTab: (tab: any) => void;
  selectedInboxAd: BulletinAd | null;
  setSelectedInboxAd: (ad: BulletinAd | null) => void;
  inquiriesSearchTerm: string;
  setInquiriesSearchTerm: (term: string) => void;
  inquiriesLoading: boolean;
  inquiriesList: any[];
  filteredInquiriesList: any[];
  fetchInquiries: () => void;
}

export const InquiriesTab: React.FC<InquiriesTabProps> = ({
  isRtl,
  setActiveTab,
  selectedInboxAd,
  setSelectedInboxAd,
  inquiriesSearchTerm,
  setInquiriesSearchTerm,
  inquiriesLoading,
  inquiriesList,
  filteredInquiriesList,
  fetchInquiries,
}) => {
  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="bg-[var(--surface-card)] p-3 rounded-[0px] border border-[var(--border-main)] transition-theme">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('board')}
              className="w-8 h-8 shrink-0 rounded-[0px] bg-[var(--surface-subtle)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-secondary)] hover:text-accent hover:border-accent transition-theme cursor-pointer"
              title={isRtl ? 'العودة للصفحة الرئيسية' : 'Back to Home'}
            >
              {isRtl ? <ArrowRight size={16} /> : <ArrowLeft size={16} />}
            </button>
            <h2 className="text-base font-extrabold flex items-center gap-2 truncate text-[var(--text-primary)]">
              <MessageSquare size={18} className="text-accent shrink-0" />
              <span className="truncate">{isRtl ? 'صندوق الرسائل والمحادثات' : 'Messenger & Inquiries'}</span>
            </h2>
          </div>

          {!selectedInboxAd && (
            <div className="relative w-full sm:w-64 shrink-0">
              <input
                type="text"
                value={inquiriesSearchTerm}
                onChange={e => setInquiriesSearchTerm(e.target.value)}
                placeholder={isRtl ? 'ابحث عن محادثة أو مرسل...' : 'Search messages, senders...'}
                className={`w-full ${isRtl ? 'pr-9 pl-3' : 'pl-9 pr-3'} py-1.5 bg-[var(--surface-subtle)] border border-[var(--border-main)] rounded-[0px] text-xs focus:ring-1 focus:ring-accent focus:border-accent outline-none transition-theme text-[var(--text-primary)] placeholder:text-[var(--text-muted)]`}
              />
              <Search size={14} className={`absolute ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 text-[var(--text-muted)]`} />
            </div>
          )}

          {selectedInboxAd && (
            <button
              onClick={() => setSelectedInboxAd(null)}
              className="px-3 py-1.5 shrink-0 rounded-[0px] bg-[var(--surface-subtle)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--surface-card)] transition-theme flex items-center gap-1.5 w-full sm:w-auto justify-center cursor-pointer"
            >
              {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
              <span>{isRtl ? 'رجوع للقائمة' : 'Back to List'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Content Section */}
      {inquiriesLoading ? (
        <div className="text-center py-16 bg-[var(--surface-card)] rounded-[0px] border border-[var(--border-main)] flex items-center justify-center gap-3 transition-theme">
          <Loader2 size={20} className="animate-spin text-accent" />
          <span className="text-sm font-bold text-[var(--text-muted)]">
            {isRtl ? 'جاري تحميل صندوق الرسائل...' : 'Loading messenger...'}
          </span>
        </div>
      ) : inquiriesList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 bg-[var(--surface-card)] rounded-[0px] border border-[var(--border-main)] space-y-4 text-center transition-theme">
          <div className="w-14 h-14 rounded-[0px] bg-[var(--surface-subtle)] border border-[var(--border-main)] flex items-center justify-center text-[var(--text-muted)]">
            <MessageSquare size={24} />
          </div>
          <div className="space-y-1 max-w-sm">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              {isRtl ? 'لا توجد رسائل حالياً' : 'No Messages Yet'}
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              {isRtl
                ? 'عندما تتلقى استفسارات أو رسائل حول إعلاناتك، ستظهر هنا في صندوق المحادثات المشفرة لضمان خصوصية تواصلك.'
                : 'When you receive inquiries or messages about your ads, they will appear here in your encrypted inbox.'}
            </p>
          </div>
          <button
            onClick={() => setActiveTab('board')}
            className="mt-2 px-4 py-2 rounded-[0px] bg-[var(--bg-accent-emphasis)] text-[var(--fg-on-emphasis)] font-bold text-xs hover:opacity-90 transition-theme flex items-center gap-2 cursor-pointer"
          >
            {isRtl ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
            <span>{isRtl ? 'العودة للخلاصة' : 'Back to Feed'}</span>
          </button>
        </div>
      ) : (
        <AdMessengerHub
          inquiries={filteredInquiriesList}
          onRefresh={fetchInquiries}
          isRtl={isRtl}
        />
      )}
    </div>
  );
};
