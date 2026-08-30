import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Calendar, 
  Eye, 
  ArrowLeft, 
  Sparkles,
  Twitter,
  Linkedin,
  Send,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';
import { resolveImageUrl } from '../utils/imageResolver';

interface SnapshotData {
  id: string;
  title: string | null;
  content: string;
  model_name: string | null;
  created_at: string;
  views_count: number;
}

export const SharedSnapshotPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language, dir, theme, siteSettings } = useAppContext();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const isAr = language === 'ar';
  const siteName = isAr ? siteSettings?.siteNameAr : siteSettings?.siteName;

  useEffect(() => {
    if (!id) return;

    const fetchSnapshot = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/share-snapshot/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error(isAr ? 'لم يتم العثور على هذه اللقطة أو قد تكون حذفت' : 'Snapshot not found or has been deleted');
          }
          throw new Error(isAr ? 'فشل تحميل البيانات من الخادم' : 'Failed to retrieve snapshot data');
        }

        const data = await response.json();
        setSnapshot(data);
        
        // SEO Update for internal navigation
        if (data) {
          // Handled centrally in App.tsx
        }
      } catch (err: any) {
        console.error('[SharedSnapshotPage] error:', err);
        setError(err.message || (isAr ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred'));
      } finally {
        setLoading(false);
      }
    };

    fetchSnapshot();
  }, [id, isAr]);

  const shareUrl = window.location.href;
  const rawShareText = snapshot?.title 
    ? `"${snapshot.title}" - Perplexta AI Insight` 
    : `Elite Technical AI Insight - Perplexta`;
  const shareText = isAr ? `شاهد هذا التحليل التقني النخبوي المولد بواسطة ${siteName || 'منصة بيربليكستا للذكاء الاصطناعي'}!` : `${rawShareText}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(isAr ? 'تم نسخ الرابط لمشاركته بنجاح!' : 'Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error(isAr ? 'تعذر النسخ التلقائي' : 'Failed to copy link');
    }
  };

  const shareToSocial = (platform: 'twitter' | 'linkedin' | 'whatsapp' | 'telegram') => {
    let url = '';
    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`;
        break;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(isAr ? 'ar-EG' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen w-full bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans relative overflow-x-hidden flex flex-col transition-theme pb-20" dir={dir}>
      {/* Background Decorative Gradients */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-gray-500/10 via-transparent to-transparent pointer-events-none" />
      <div className="absolute top-1/4 -start-48 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 -end-48 w-96 h-96 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header/Branding Area */}
      <header className="w-full max-w-5xl mx-auto px-4 py-6 flex items-center justify-between border-b border-[var(--border)] relative z-10">
        <div 
          onClick={() => navigate('/')} 
          className="flex items-center gap-3 cursor-pointer group transition-theme"
        >
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-900 to-black border border-accent/20 flex items-center justify-center shadow-md shadow-none group-hover:border-accent group-hover:bg-accent/5 transition-theme">
            {siteSettings?.logoBase64 ? (
              <img src={resolveImageUrl(siteSettings.logoBase64, 'general')} alt="Logo" className="w-7 h-7 object-cover rounded-sm" />
            ) : (
              <Sparkles size={18} className="text-accent animate-pulse" />
            )}
          </div>
          <div>
            <h1 className="text-md font-black tracking-wider uppercase bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text text-transparent">
              {siteName || (isAr ? 'بيربليكستا' : 'PERPLEXTA')}
            </h1>
            <p className="text-[9px] font-mono text-accent uppercase tracking-widest leading-none mt-0.5">
              {isAr ? 'منصة التحليل النخبوي' : 'Elite Analysis Platform'}
            </p>
          </div>
        </div>

        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-[4px] bg-[var(--bg-overlay)] border border-[var(--border)] hover:border-accent/30 text-xs font-semibold flex items-center gap-2 text-[var(--text-muted)] hover:text-accent hover:bg-[var(--surface-subtle)] transition-theme"
        >
          <ArrowLeft size={14} className={isAr ? 'rotate-180' : ''} />
          {isAr ? 'الذهاب للمنصة' : 'Go to Platform'}
        </button>
      </header>

      {/* Main Content Space */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 mt-8 relative z-10 flex flex-col">
        {loading ? (
          /* Loading Skeleton */
          <div className="flex flex-col gap-6 animate-pulse">
            <div className="h-8 bg-[var(--bg-overlay)] border border-[var(--border)] rounded-md w-3/4" />
            <div className="flex items-center gap-4">
              <div className="h-4 bg-[var(--bg-overlay)] border border-[var(--border)] rounded-md w-1/4" />
              <div className="h-4 bg-[var(--bg-overlay)] border border-[var(--border)] rounded-md w-1/6" />
            </div>
            <div className="h-96 bg-[var(--bg-overlay)] border border-[var(--border)] rounded-lg w-full" />
          </div>
        ) : error ? (
          /* Error State */
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 shadow-lg shadow-red-500/5">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-bold mb-2">
              {isAr ? 'فشل تحميل لقطة التحليل' : 'Snapshot Retrieval Failed'}
            </h2>
            <p className="text-sm text-[var(--text-muted)] max-w-md mb-8">
              {error}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-[4px] bg-accent text-black font-extrabold text-sm uppercase tracking-wider hover:bg-accent transition-theme shadow-lg shadow-none"
            >
              {isAr ? 'العودة للرئيسية' : 'Return to Home'}
            </button>
          </div>
        ) : snapshot ? (
          /* Loaded Snapshot Screen */
          <div className="flex flex-col gap-6">
            {/* Snapshot Title/Prompt */}
            <div className="space-y-3">
              {snapshot.title ? (
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
                  {snapshot.title}
                </h2>
              ) : (
                <h2 className="text-xl sm:text-2xl font-black text-white leading-tight tracking-tight">
                  {isAr ? 'تحليل تقني استراتيجي' : 'Strategic Technical Analysis'}
                </h2>
              )}

              {/* Snapshot Meta Statistics */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-[var(--text-muted)] border-b border-[var(--border)] pb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-accent/80" />
                  <span>{formatDate(snapshot.created_at)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Eye size={14} className="text-accent/80" />
                  <span>
                    {snapshot.views_count.toLocaleString()} {isAr ? 'مشاهدة' : 'Views'}
                  </span>
                </div>
                {snapshot.model_name && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-[4px] bg-accent/5 border border-accent/15 text-accent text-[11px] font-semibold">
                    <Sparkles size={11} className="text-accent animate-pulse" />
                    <span>{snapshot.model_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Content Display Card */}
            <div className="bg-[var(--bg-overlay)] border border-[var(--border)] rounded-lg p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-gray-500/10 via-gray-500/10 to-gray-500/5" />
              
              {/* Markdown Render Body */}
              <article className="prose prose-invert max-w-none text-sm text-[var(--text-secondary)] leading-relaxed space-y-4 break-words select-text">
                <Markdown remarkPlugins={[remarkGfm]}>
                  {snapshot.content}
                </Markdown>
              </article>
            </div>

            {/* Sharing Toolbox & Widgets */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[var(--bg-overlay)]/40 border border-[var(--border)]/60 rounded-lg p-4 mt-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Share2 size={14} className="text-accent" />
                {isAr ? 'انشر هذا التحليل مع شبكتك' : 'Share this insight with your network'}
              </span>

              {/* Social Buttons list */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Copy Link button */}
                <button
                  onClick={handleCopyLink}
                  title={isAr ? 'نسخ الرابط' : 'Copy Link'}
                  className="w-10 h-10 rounded-[4px] bg-[var(--bg-overlay)] border border-[var(--border)] hover:border-accent/30 flex items-center justify-center text-[var(--text-muted)] hover:text-accent transition-theme"
                >
                  {copied ? <Check size={16} className="text-accent" /> : <Copy size={16} />}
                </button>

                {/* X / Twitter */}
                <button
                  onClick={() => shareToSocial('twitter')}
                  title={isAr ? 'انشر على إكس' : 'Share on X / Twitter'}
                  className="w-10 h-10 rounded-[4px] bg-[var(--bg-overlay)] border border-[var(--border)] hover:border-accent/30 flex items-center justify-center text-[var(--text-muted)] hover:text-accent transition-theme"
                >
                  <Twitter size={16} />
                </button>

                {/* LinkedIn */}
                <button
                  onClick={() => shareToSocial('linkedin')}
                  title={isAr ? 'انشر على لينكد إن' : 'Share on LinkedIn'}
                  className="w-10 h-10 rounded-[4px] bg-[var(--bg-overlay)] border border-[var(--border)] hover:border-accent/30 flex items-center justify-center text-[var(--text-muted)] hover:text-accent transition-theme"
                >
                  <Linkedin size={16} />
                </button>

                {/* Telegram */}
                <button
                  onClick={() => shareToSocial('telegram')}
                  title={isAr ? 'شارك على تيليجرام' : 'Share on Telegram'}
                  className="w-10 h-10 rounded-[4px] bg-[var(--bg-overlay)] border border-[var(--border)] hover:border-accent/30 flex items-center justify-center text-[var(--text-muted)] hover:text-accent transition-theme"
                >
                  <Send size={16} />
                </button>

                {/* WhatsApp */}
                <button
                  onClick={() => shareToSocial('whatsapp')}
                  title={isAr ? 'شارك على واتساب' : 'Share on WhatsApp'}
                  className="w-10 h-10 rounded-[4px] bg-[var(--bg-overlay)] border border-[var(--border)] hover:border-accent/30 flex items-center justify-center text-[var(--text-muted)] hover:text-accent transition-theme"
                >
                  <MessageSquare size={16} />
                </button>
              </div>
            </div>

            {/* Viral Visitor CTA Card */}
            <div className="relative mt-8 rounded-lg overflow-hidden border border-accent/20 bg-gradient-to-b from-gray-500/10[0.04] to-transparent p-6 text-center shadow-xl">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 w-64 h-64 bg-accent/10 rounded-full blur-[60px] pointer-events-none" />
              
              <Sparkles className="mx-auto text-accent mb-4 animate-pulse" size={28} />
              
              <h3 className="text-md font-bold text-white uppercase tracking-wider mb-2">
                {isAr ? 'ابدأ تحليلك التقني العالي الدقة مجاناً' : 'Analyze complex assets with Sovereign High-Precision AI'}
              </h3>
              
              <p className="text-xs text-[var(--text-muted)] max-w-xl mx-auto mb-6 leading-relaxed">
                {isAr 
                  ? 'انضم إلى نخبة المحللين واستخدم النماذج الرياضية والاستخباراتية المتقدمة لبيربليكستا لتفكيك الأكواد البرمجية، وتحليل البيانات العميقة والرسوم الفنية بجودة عسكرية متفوقة.'
                  : 'Leverage military-grade multi-model orchestration, vector context memory, and secure sandbox computing for extreme accuracy analysis.'}
              </p>

              <button
                onClick={() => navigate('/')}
                className="px-8 py-3 rounded-[4px] bg-gradient-to-r from-gray-500/10 to-gray-500/5 hover:from-gray-500/10 hover:to-gray-500/5 text-black font-extrabold text-xs uppercase tracking-widest transition-theme shadow-lg shadow-none hover:shadow-none border border-accent/20"
              >
                {isAr ? 'ابدأ التحليل الاستراتيجي الآن' : 'Start Free Technical Analysis'}
              </button>
            </div>
          </div>
        ) : null}
      </main>

      {/* Footer copyright */}
      <footer className="w-full text-center mt-auto pt-10 text-[10px] font-mono text-gray-500">
        © {new Date().getFullYear()} {siteName || 'PERPLEXTA'}. {isAr ? 'جميع الحقوق محفوظة.' : 'All Rights Reserved.'}
      </footer>
    </div>
  );
};
