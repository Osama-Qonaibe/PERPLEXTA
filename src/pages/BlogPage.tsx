import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, Eye, MessageSquare, Plus, ArrowLeft, Trash2, Send, Calendar, User, BookOpen, Star, Share2, Link, Check, Heart, MessageCircle, Search, Grid, Newspaper, Cpu, RefreshCw, Code, Brain, TrendingUp, SlidersHorizontal, ArrowRight, ChevronDown, Wrench, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ContentContainer } from '../components/ContentContainer';
import { toast } from '../context/NotificationContext';
import { useRenderMetrics } from '../hooks/useRenderMetrics';
import { getMediaUrl } from '../utils/mediaUtils';

interface Article {
  id: number;
  author_id: number;
  author_name: string;
  author_avatar: string;
  author_role?: string;
  slug: string;
  title_en: string;
  title_ar: string;
  content_en: string;
  content_ar: string;
  category_en: string;
  category_ar: string;
  image_url: string;
  views: number;
  comment_count: number;
  created_at: string;
  avg_rating?: number;
  ratings_count?: number;
}

interface ArticleComment {
  id: number;
  article_id: number;
  user_id: number;
  author_name: string;
  author_avatar: string;
  author_role: string;
  content: string;
  created_at: string;
}

export const BlogPage: React.FC = () => {
  useRenderMetrics({ componentName: 'BlogPage' });
  const { language, token, user, t, theme } = useAppContext();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug?: string }>();
  const [articles, setArticles] = useState<Article[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [comments, setComments] = useState<ArticleComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // Ratings & Sharing states
  const [userRating, setUserRating] = useState<number>(0);
  const [ratingHover, setRatingHover] = useState<number>(0);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'latest' | 'popular' | 'highest-rated'>('latest');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCommentsOpenOnMobile, setIsCommentsOpenOnMobile] = useState(false);
  const [mobileCategoryPage, setMobileCategoryPage] = useState(0);
  const [showAdPopup, setShowAdPopup] = useState(false);
  const [readingProgress, setReadingProgress] = useState<number>(0);

  const handleScrollProgress = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const scrollTotal = target.scrollHeight - target.clientHeight;
    if (scrollTotal > 0) {
      const progress = (target.scrollTop / scrollTotal) * 100;
      setReadingProgress(Math.min(100, Math.max(0, progress)));
    } else {
      setReadingProgress(0);
    }
  };

  useEffect(() => {
    const isAdDismissed = localStorage.getItem('hide_blog_ad');
    if (!isAdDismissed) {
      const timer = setTimeout(() => {
        setShowAdPopup(true);
      }, 7000); // Trigger 7 seconds after load
      return () => clearTimeout(timer);
    }
  }, []);

  const categories = [
    { id: 'All', labelEn: 'All Sectors', labelAr: 'كل الاقسام' },
    { id: 'News', labelEn: 'News', labelAr: 'الاخبار' },
    { id: 'Tech', labelEn: 'Technology', labelAr: 'التكنولوجيا' },
    { id: 'Updates', labelEn: 'Updates', labelAr: 'التحديثات' },
    { id: 'Developers', labelEn: 'Developers', labelAr: 'المطورين' },
    { id: 'Tools', labelEn: 'Tools', labelAr: 'الادوات' },
    { id: 'AI', labelEn: 'AI', labelAr: 'الذكاء الاصطناعي' },
    { id: 'Strategies', labelEn: 'Execution Strategies', labelAr: 'استراتيجيات التنفيذ' },
  ];

  const categoryColors: Record<string, string> = {
    All: '#334155',
    News: '#3b82f6',
    Tech: '#a855f7',
    Updates: '#f97316',
    Developers: '#ec4899',
    Tools: '#6366f1',
    AI: '#14b8a6',
    Strategies: '#eab308'
  };

  const getCategoryIcon = (id: string, className?: string) => {
    switch (id) {
      case 'All':
        return <Grid className={className} />;
      case 'News':
        return <Newspaper className={className} />;
      case 'Tech':
        return <Cpu className={className} />;
      case 'Updates':
        return <RefreshCw className={className} />;
      case 'Developers':
        return <Code className={className} />;
      case 'Tools':
        return <Wrench className={className} />;
      case 'AI':
        return <Brain className={className} />;
      case 'Strategies':
        return <TrendingUp className={className} />;
      default:
        return <Grid className={className} />;
    }
  };

  // Filtered articles logic
  const filteredArticles = articles.filter(article => {
    // 1. Filter by category
    if (selectedCategory !== 'All') {
      const catEn = (article.category_en || '').toLowerCase();
      const catAr = (article.category_ar || '');
      
      if (selectedCategory === 'News') {
        const match = catEn.includes('news') || catEn.includes('macro') || catAr.includes('أخبار') || catAr.includes('خبر');
        if (!match) return false;
      } else if (selectedCategory === 'Tech') {
        const match = catEn.includes('tech') || catEn.includes('technology') || catAr.includes('تكنولوجيا') || catAr.includes('تكنو');
        if (!match) return false;
      } else if (selectedCategory === 'Updates') {
        const match = catEn.includes('update') || catEn.includes('system') || catAr.includes('تحديث');
        if (!match) return false;
      } else if (selectedCategory === 'Developers') {
        const match = catEn.includes('developer') || catEn.includes('quant') || catEn.includes('code') || catEn.includes('programming') || catAr.includes('مطور') || catAr.includes('مطورين') || catAr.includes('كمي') || catAr.includes('تطوير');
        if (!match) return false;
      } else if (selectedCategory === 'Tools') {
        const match = catEn.includes('tool') || catAr.includes('أداة') || catAr.includes('أدوات');
        if (!match) return false;
      } else if (selectedCategory === 'AI') {
        const match = catEn.includes('ai') || catEn.includes('artificial') || catEn.includes('intelligence') || catEn.includes('gpt') || catEn.includes('gemini') || catAr.includes('ذكاء') || catAr.includes('اصطناعي');
        if (!match) return false;
      } else if (selectedCategory === 'Strategies') {
        const match = catEn.includes('strategy') || catEn.includes('strategies') || catEn.includes('macro') || catEn.includes('execution') || catAr.includes('استراتيج') || catAr.includes('تنافي') || catAr.includes('تنفيذ');
        if (!match) return false;
      } else {
        if (catEn !== selectedCategory.toLowerCase() && !catAr.includes(selectedCategory)) {
          return false;
        }
      }
    }

    // 2. Filter by search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const titleEn = (article.title_en || '').toLowerCase();
      const titleAr = (article.title_ar || '');
      const contentEn = (article.content_en || '').toLowerCase();
      const contentAr = (article.content_ar || '');
      const catEn = (article.category_en || '').toLowerCase();
      const catAr = (article.category_ar || '');

      const match = titleEn.includes(q) || 
                    titleAr.includes(q) || 
                    contentEn.includes(q) || 
                    contentAr.includes(q) || 
                    catEn.includes(q) || 
                    catAr.includes(q);
      if (!match) return false;
    }

    return true;
  });

  const sortedArticles = [...filteredArticles].sort((a, b) => {
    if (sortBy === 'popular') {
      return (b.views || 0) - (a.views || 0);
    }
    if (sortBy === 'highest-rated') {
      const rateA = a.avg_rating ? Number(a.avg_rating) : 5.0;
      const rateB = b.avg_rating ? Number(b.avg_rating) : 5.0;
      return rateB - rateA;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Fetch all articles
  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/blog/articles');
      if (res.ok) {
        const data = await res.json();
        setArticles(data);
      }
    } catch (err) {
      console.error('Failed to fetch blog articles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    if (slug) {
      setCommentsLoading(true);
      setUserRating(0);
      setReadingProgress(0);
      fetch(`/api/blog/articles/${slug}`)
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('Failed to load deep-linked article');
        })
        .then(data => {
          setSelectedArticle(data.article);
          setComments(data.comments);
          
          // SEO Update for internal navigation
          if (data.article) {
            // Handled centrally in App.tsx
          }
          // Sync back to list views and ratings counts
          setArticles(prev => prev.map(a => a.id === data.article.id ? { 
            ...a, 
            views: data.article.views, 
            avg_rating: data.article.avg_rating, 
            ratings_count: data.article.ratings_count 
          } : a));

          if (token && data.article) {
            fetch(`/api/blog/articles/${data.article.id}/user-rating`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
              .then(ratingRes => {
                if (ratingRes.ok) return ratingRes.json();
              })
              .then(rData => {
                if (rData) setUserRating(rData.rating || 0);
              })
              .catch(err => console.error(err));
          }
        })
        .catch(err => console.error(err))
        .finally(() => setCommentsLoading(false));
    } else {
      setSelectedArticle(null);
    }
  }, [slug, token]);

  // Fetch article detailed (increment views too on server)
  const handleSelectArticle = async (article: Article) => {
    setSelectedArticle(article);
    setCommentsLoading(true);
    setUserRating(0); // Reset
    setReadingProgress(0);
    try {
      const res = await fetch(`/api/blog/articles/${article.slug}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedArticle(data.article);
        setComments(data.comments);

        // SEO Update for internal navigation
        if (data.article) {
          // Handled centrally in App.tsx
        }
        // Sync back to list views and ratings counts
        setArticles(prev => prev.map(a => a.id === data.article.id ? { 
          ...a, 
          views: data.article.views, 
          avg_rating: data.article.avg_rating, 
          ratings_count: data.article.ratings_count 
        } : a));

        // Fetch user specific rating if user token is loaded
        if (token) {
          const ratingRes = await fetch(`/api/blog/articles/${data.article.id}/user-rating`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (ratingRes.ok) {
            const rData = await ratingRes.json();
            setUserRating(rData.rating || 0);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch article details:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  // Submit Rating
  const handleRateArticle = async (ratingVal: number) => {
    if (!token || !selectedArticle) return;
    setIsRatingSubmitting(true);
    try {
      const res = await fetch(`/api/blog/articles/${selectedArticle.id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating: ratingVal })
      });
      if (res.ok) {
        const data = await res.json();
        setUserRating(ratingVal);
        setSelectedArticle(prev => prev ? {
          ...prev,
          avg_rating: data.avg_rating,
          ratings_count: data.ratings_count
        } : null);
        setArticles(prev => prev.map(a => a.id === selectedArticle.id ? {
          ...a,
          avg_rating: data.avg_rating,
          ratings_count: data.ratings_count
        } : a));
      }
    } catch (err) {
      console.error('Failed to submit rating:', err);
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  // Add Comment
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedArticle || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/blog/articles/${selectedArticle.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment.trim() })
      });
      if (res.ok) {
        const freshComment = await res.json();
        setComments(prev => [freshComment, ...prev]);
        setNewComment('');
        // Update stats
        setSelectedArticle(prev => prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : null);
        setArticles(prev => prev.map(a => a.id === selectedArticle.id ? { ...a, comment_count: (a.comment_count || 0) + 1 } : a));
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Delete Comment (Owner or Admin)
  const handleDeleteComment = async (commentId: number) => {
    if (!token) return;
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا التعليق؟' : 'Are you sure you want to delete this comment?')) return;
    try {
      const res = await fetch(`/api/blog/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        setSelectedArticle(prev => prev ? { ...prev, comment_count: Math.max(0, (prev.comment_count || 0) - 1) } : null);
        setArticles(prev => prev.map(a => a.id === (selectedArticle?.id || 0) ? { ...a, comment_count: Math.max(0, (a.comment_count || 0) - 1) } : a));
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  const handleBackToList = () => {
    setSelectedArticle(null);
    setComments([]);
    setReadingProgress(0);
    navigate('/blog');
  };

  const isRtl = language === 'ar';
  const isThemeDark = theme === 'dark';

  return (
    <div
      className="h-full w-full flex flex-col overflow-hidden relative transition-colors duration-300 select-none bg-[var(--surface-page)] text-[var(--text-primary)]"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className={`absolute inset-0 pointer-events-none opacity-[0.25] ${
        isThemeDark
          ? 'bg-[radial-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)]'
          : 'bg-[radial-gradient(rgba(0,0,0,0.015)_1px,transparent_1px)]'
        } bg-[size:28px_28px]`}
      />

      {/* Main Content Card Wrapper - Integrated full screen with no outer margins */}
      <div className={`w-full h-full flex flex-col overflow-hidden relative z-10 ${
        isThemeDark
          ? 'bg-[#131315]/95 shadow-black/80'
          : 'bg-white shadow-gray-200/50'
      }`}>
        <AnimatePresence mode="wait">
          {!selectedArticle ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <header className={`px-8 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 border-b relative select-none flex-shrink-0 ${
                isThemeDark ? 'border-gray-800/60 bg-[#131315]' : 'border-gray-200/80 bg-white'
              }`}>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-500/10 to-transparent" />
                
                <div className="flex flex-row items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h1 className="text-base sm:text-lg md:text-2xl font-black font-sans tracking-tight">
                      {isRtl ? (
                        <>
                          <span className="text-accent  font-sans">نبض بيربليكستا </span>
                          <span className={isThemeDark ? 'text-white' : 'text-gray-900'}>للمقالات والتحليلات</span>
                        </>
                      ) : (
                        <>
                          <span className="text-accent ">Perplexta Insights </span>
                          <span className={isThemeDark ? 'text-white' : 'text-gray-900'}>& Research Portal</span>
                        </>
                      )}
                    </h1>
                    <p className={`text-[9px] md:text-xs font-semibold leading-relaxed ${
                      isThemeDark ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      {isRtl 
                        ? 'رؤى وتحليلات حصرية يقدمها كبار خبراء استخبارات السوق والبيانات المالية.' 
                        : 'Exclusive insights and analytics prepared by senior researchers and financial analysts.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 lg:hidden shrink-0 mt-0.5">
                    {selectedCategory !== 'All' && (
                      <button
                        type="button"
                        onClick={() => setSelectedCategory('All')}
                        className={`px-3 h-9 rounded-[4px] border flex items-center gap-1.5 transition-theme text-xs font-black ${
                          isThemeDark
                            ? 'border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 active:scale-95 shadow-[0_0_8px_rgba(156,163,175,0.15)]'
                            : 'border-accent/20 bg-accent/5 text-accent hover:bg-accent/10 active:scale-95'
                        }`}
                        title={isRtl ? 'الرجوع للمقالات الرئيسية' : 'Back to main articles'}
                      >
                        {isRtl ? <ArrowRight size={13} className="text-accent" /> : <ArrowLeft size={13} className="text-accent" />}
                        <span>{isRtl ? 'الرئيسية' : 'Main'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsMobileSidebarOpen(true)}
                      className={`w-9 h-9 rounded-[4px] border flex items-center justify-center transition-theme ${
                        isThemeDark
                          ? 'border-gray-800/80 bg-transparent text-gray-400 hover:bg-gray-800 hover:text-accent hover:border-accent/35 active:scale-95'
                          : 'border-gray-200 bg-transparent text-slate-700 hover:bg-[#fafafa] active:scale-95'
                      }`}
                      title={isRtl ? 'عرض الأقسام' : 'Show Categories'}
                    >
                      <SlidersHorizontal size={14} />
                    </button>
                  </div>
                </div>

                {/* Sub-header Filter and Search bar - Unified with Marketplace */}
                <div className={`mt-4 sm:mt-6 p-2 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 md:gap-4 border ${
                  isThemeDark ? 'bg-[#1a1a1c] border-gray-800/60' : 'bg-[#fafafa] border-gray-200/80'
                }`}>
                  
                  {/* Desktop Categories List */}
                  <div className="hidden sm:flex items-center gap-1 overflow-x-auto scrollbar-none px-1 py-0.5 flex-1 min-w-0">
                    {categories.map((cat, catIdx) => {
                      const isSelected = selectedCategory === cat.id;
                      const iconCol = categoryColors[cat.id] || '#334155';
                      return (
                        <button
                          key={`blog-cat-desk-${cat.id}-${catIdx}`}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-theme ${
                            isSelected
                              ? 'bg-accent/10 border border-accent/30 text-accent dark:text-accent  dark: font-black'
                              : (isThemeDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-650 hover:text-gray-800')
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <span style={{ color: iconCol }}>{getCategoryIcon(cat.id, "w-3 h-3")}</span>
                            <span>{isRtl ? cat.labelAr : cat.labelEn}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Mobile 2-Category Carousel/Scroller */}
                  <div className="flex sm:hidden flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5 w-full">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileCategoryPage(prev => (prev > 0 ? prev - 1 : 3));
                        }}
                        className={`w-8 h-8 rounded-[4px] border border-transparent flex items-center justify-center transition-theme shrink-0 ${
                          isThemeDark
                            ? 'text-gray-400 hover:text-accent hover:bg-gray-800'
                            : 'text-slate-500 hover:text-accent hover:bg-gray-100'
                        }`}
                        title={isRtl ? 'السابق' : 'Previous'}
                      >
                        {isRtl ? <ChevronRight size={14} className="hover:" /> : <ChevronLeft size={14} className="hover:" />}
                      </button>

                      <div className="grid grid-cols-2 gap-1.5 flex-1 min-w-0">
                        {categories.slice(mobileCategoryPage * 2, mobileCategoryPage * 2 + 2).map((cat, catIdx) => {
                          const isSelected = selectedCategory === cat.id;
                          const iconCol = categoryColors[cat.id] || '#334155';
                          return (
                            <button
                              key={`blog-cat-mob-${cat.id}-${catIdx}`}
                              type="button"
                              onClick={() => setSelectedCategory(cat.id)}
                              className={`px-1.5 py-1 rounded-[4px] text-[10px] font-black whitespace-nowrap truncate cursor-pointer transition-theme border text-center flex items-center justify-center gap-1 min-w-0 ${
                                isSelected
                                  ? 'bg-accent/10 border-accent/30 text-accent dark:text-accent  dark:'
                                  : (isThemeDark 
                                      ? 'bg-[#131315]/80 border-gray-800/60 text-gray-400 hover:text-gray-200 hover:border-gray-700' 
                                      : 'bg-white border-gray-200 text-slate-650 hover:text-slate-800 hover:border-gray-300')
                              }`}
                            >
                              <span style={{ color: iconCol }} className="shrink-0">{getCategoryIcon(cat.id, "w-3.5 h-3.5")}</span>
                              <span className="truncate">{isRtl ? cat.labelAr : cat.labelEn}</span>
                            </button>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setMobileCategoryPage(prev => (prev < 3 ? prev + 1 : 0));
                        }}
                        className={`w-8 h-8 rounded-[4px] border border-transparent flex items-center justify-center transition-theme shrink-0 ${
                          isThemeDark
                            ? 'text-gray-400 hover:text-accent hover:bg-gray-800'
                            : 'text-slate-500 hover:text-accent hover:bg-gray-100'
                        }`}
                        title={isRtl ? 'التالي' : 'Next'}
                      >
                        {isRtl ? <ChevronLeft size={14} className="hover:" /> : <ChevronRight size={14} className="hover:" />}
                      </button>
                    </div>

                    {/* Micro indicator dots */}
                    <div className="flex items-center justify-center gap-1">
                      {[0, 1, 2, 3].map((page, pIdx) => (
                        <div
                          key={`blog-dot-${page}-${pIdx}`}
                          className={`h-1 rounded-full transition-theme ${
                            mobileCategoryPage === page
                              ? 'w-3.5 bg-accent shadow-[0_0_8px_rgba(156,163,175,0.65)]'
                              : 'w-1 bg-gray-305 dark:bg-gray-800/80'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className={`flex items-center border rounded-lg px-3 py-1.5 w-full sm:w-72 md:w-80 lg:w-96 flex-shrink-0 transition-theme ${
                    isThemeDark ? 'bg-black/40 border-white/10 focus-within:border-accent/35' : 'bg-white border-gray-200 focus-within:border-accent/35'
                  }`}>
                    <Search size={14} className="text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={isRtl ? 'ابحث عن المقالات والأبحاث...' : 'Search articles & research...'}
                      className={`flex-1 bg-transparent text-xs placeholder-gray-500 outline-none px-2 ${
                        isThemeDark ? 'text-white' : 'text-gray-800'
                      }`}
                    />
                    <div className="text-[9px] font-mono text-accent font-bold bg-accent/5 px-2 py-0.5 rounded shrink-0 border border-accent/10">
                      {sortedArticles.length}
                    </div>
                  </div>

                </div>
              </header>

              <div className="flex flex-1 overflow-hidden">
              
              <aside className={`hidden lg:flex flex-col w-56 shrink-0 p-4 space-y-4 border-r select-none overflow-hidden ${
                isThemeDark ? 'bg-[#0a0a0c]/40 border-white/5' : 'bg-gray-50/50 border-gray-150'
              }`}>
                <div className="flex-1 overflow-y-auto scrollbar-none space-y-4 pr-0.5 pb-2">
                  <div className="text-[9px] font-black uppercase tracking-wider text-gray-500 px-1">
                    {isRtl ? 'الأقسام والقطاعات' : 'MAIN DIVISIONS'}
                  </div>
                  
                  <div className="space-y-0.5">
                    {categories.map((cat, catIdx) => {
                      const isSelected = selectedCategory === cat.id;
                      const iconCol = categoryColors[cat.id] || '#334155';
                      return (
                        <div
                          key={`blog-aside-cat-${cat.id}-${catIdx}`}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`flex items-center justify-between rounded px-2.5 py-1.5 text-[10px] font-black cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-accent/10 text-accent border-r-2 border-accent'
                              : (isThemeDark ? 'hover:bg-white/5 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-slate-600 hover:text-slate-900')
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span style={{ color: iconCol }}>{getCategoryIcon(cat.id, "w-3.5 h-3.5 shrink-0")}</span>
                            <span className="truncate">{isRtl ? cat.labelAr : cat.labelEn}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-3 border-t border-gray-150/10 dark:border-white/5 space-y-2.5">
                    <div className="text-[9px] font-black uppercase tracking-wider text-gray-500 px-1">
                      {isRtl ? 'ترتيب المقالات' : 'SORT RESEARCH'}
                    </div>

                    <div className="space-y-1.5">
                      {[
                        { labelAr: 'الأحدث أولاً', labelEn: 'Latest Reports', val: 'latest' },
                        { labelAr: 'الأكثر قراءة', labelEn: 'Most Popular', val: 'popular' },
                        { labelAr: 'الأعلى تقييماً', labelEn: 'Highly Rated', val: 'highest-rated' }
                      ].map((item, itemIdx) => (
                        <label
                          key={`blog-aside-sort-${item.val}-${itemIdx}`}
                          className={`flex items-center gap-2 text-[10px] font-bold cursor-pointer transition-colors ${
                            sortBy === item.val
                              ? 'text-accent'
                              : (isThemeDark ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                          }`}
                        >
                          <input
                            type="radio"
                            name="blogSortOrderRadio"
                            value={item.val}
                            checked={sortBy === item.val}
                            onChange={() => setSortBy(item.val as any)}
                            className="accent-accent w-3 h-3 cursor-pointer"
                          />
                          <span>{isRtl ? item.labelAr : item.labelEn}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>

              <main className="flex-1 overflow-y-auto scrollbar-none">
                <ContentContainer className="py-4 pb-24 space-y-6 md:space-y-10">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                      <div key={`blog-skel-${i}`} className={`rounded-xl border animate-pulse flex flex-col h-[390px] ${
                        isThemeDark ? 'bg-[#090a0c] border-white/5' : 'bg-white border-gray-150'
                      }`}>
                        <div className="h-40 bg-gray-200/10 dark:bg-gray-800/10" />
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="h-3 bg-gray-200/10 dark:bg-gray-800/10 rounded-sm w-1/3" />
                            <div className="h-5 bg-gray-200/10 dark:bg-gray-800/10 rounded-sm w-3/4" />
                            <div className="h-4 bg-gray-200/10 dark:bg-gray-800/10 rounded-sm w-full" />
                            <div className="h-3 bg-gray-200/10 dark:bg-gray-800/10 rounded-sm w-5/6" />
                          </div>
                          <div className="space-y-2 pt-2 border-t border-gray-100/5 dark:border-gray-800/15">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-gray-200/10 dark:bg-gray-800/10" />
                                <div className="h-3 bg-gray-200/10 dark:bg-gray-800/10 rounded-sm w-16" />
                              </div>
                              <div className="w-8 h-3 bg-gray-200/10 dark:bg-gray-800/10 rounded-sm" />
                            </div>
                            <div className="h-8 bg-gray-200/10 dark:bg-gray-800/10 rounded-[4px] w-full" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : articles.length === 0 ? (
                  <div className="py-20 text-center border border-dashed border-[var(--border-main)] rounded-lg max-w-xl mx-auto p-8 select-none">
                    <BookOpen size={48} className="mx-auto text-gray-400 mb-3" />
                    <h3 className="font-bold text-sm tracking-tight mb-1 text-[var(--text-primary)]">{isRtl ? 'لا توجد مقالات منشورة بعد' : 'No articles published yet'}</h3>
                    <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">{isRtl ? 'يرجى مراجعة المدونة لاحقاً لقراءة أحدث تقارير استخبارات وتحليل السوق.' : 'Be sure to check back soon for our newest economic research and analysis reports.'}</p>
                  </div>
                ) : sortedArticles.length > 0 ? (
                  <>
                    {/* Desktop Premium Grid View */}
                    <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      <AnimatePresence mode="wait">
                        {sortedArticles.map((article, artIdx) => {
                          return (
                            <motion.article
                              key={`blog-art-desk-${article.id || artIdx}-${artIdx}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.15 }}
                              className={`rounded-xl border overflow-hidden transition-theme flex flex-col h-[390px] cursor-pointer relative group ${
                                isThemeDark
                                  ? 'bg-[#090a0c] border-white/5 hover:border-accent/20 hover:shadow-[0_15px_30px_rgba(0,0,0,0.8)]'
                                  : 'bg-white border-gray-150 hover:border-accent/30 hover:shadow-[0_15px_30px_rgba(0,0,0,0.05)]'
                              }`}
                              onClick={() => navigate(`/blog/${article.slug}`)}
                            >
                              <div className="h-40 relative overflow-hidden bg-black/45 shrink-0 select-none">
                                {article.image_url ? (
                                  <img
                                    src={getMediaUrl(article.image_url)}
                                    alt={isRtl ? article.title_ar : article.title_en}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-500/10 to-teal-500/10 p-2">
                                    <BookOpen size={24} className="text-accent/30 mb-1 shrink-0" />
                                    <span className="text-[7px] text-center uppercase tracking-widest text-accent font-bold">{isRtl ? 'تحليلات' : 'Intelligence'}</span>
                                  </div>
                                )}
                                <div className="absolute top-2 right-2 flex items-center gap-1.5 select-none z-10">
                                  <span className="text-[8px] font-black px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 text-white flex items-center gap-1">
                                    {getCategoryIcon(article.category_en, 'w-2.5 h-2.5 text-accent')}
                                    <span>{isRtl ? article.category_ar : article.category_en}</span>
                                  </span>
                                </div>
                              </div>

                              <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                                <div>
                                  <div className="flex items-center gap-2 text-[9px] font-mono text-gray-500 dark:text-gray-400 mb-1.5 select-none">
                                    <Calendar size={10} />
                                    <span>{new Date(article.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-800" />
                                    <div className="flex items-center gap-0.5">
                                      <Eye size={10} />
                                      <span>{article.views} {isRtl ? 'مشاهدة' : 'views'}</span>
                                    </div>
                                  </div>
                                  <h3 className="text-xs sm:text-[13px] font-black tracking-tight text-[var(--text-primary)] group-hover:text-accent dark:group-hover:text-accent transition-colors duration-300 leading-snug line-clamp-2 font-sans">
                                    {isRtl ? article.title_ar : article.title_en}
                                  </h3>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed font-sans font-medium text-right sm:text-justify select-text">
                                    {isRtl ? article.content_ar : article.content_en}
                                  </p>
                                </div>

                                <div className="pt-2 border-t border-gray-100/5 dark:border-gray-800/15 flex flex-col gap-2">
                                  <div className="flex items-center justify-between select-none">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      {article.author_avatar ? (
                                        <img src={article.author_avatar} alt={article.author_name} className="w-5 h-5 rounded-full border border-[var(--border-main)] shrink-0" />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
                                          <User size={10} />
                                        </div>
                                      )}
                                      <span className="text-[9px] font-black tracking-tight text-gray-500 dark:text-gray-300 font-sans truncate max-w-[80px] sm:max-w-[120px]">{article.author_name}</span>
                                    </div>

                                    <div className="flex items-center gap-0.5 text-[9px] font-mono text-amber-500 font-bold">
                                      <Star size={9} className="fill-[currentColor]" />
                                      <span>{article.avg_rating && Number(article.avg_rating) > 0 ? Number(article.avg_rating).toFixed(1) : '5.0'}</span>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    className={`w-full py-1.5 rounded-[4px] text-[10px] font-bold flex items-center justify-center gap-1 border transition-theme ${
                                      isThemeDark
                                        ? 'bg-accent/5 border-accent/15 text-accent hover:bg-accent/15 hover:border-accent/35 hover:shadow-[0_0_8px_rgba(156,163,175,0.4)]'
                                        : 'bg-accent/5 border-accent/15 text-accent hover:bg-accent/10 hover:border-accent/25 hover:shadow-[0_0_8px_rgba(156,163,175,0.15)]'
                                    }`}
                                  >
                                    <span>{isRtl ? 'قراءة تقرير الجودة' : 'Read Analytical Insight'}</span>
                                    {isRtl ? <ArrowLeft size={10} strokeWidth={3} className="text-accent" /> : <ArrowRight size={10} strokeWidth={3} className="text-accent" />}
                                  </button>
                                </div>
                              </div>
                            </motion.article>
                          );
                        })}
                      </AnimatePresence>
                    </div>

                    {/* Mobile-Only Premium Editorial Feed Layout */}
                    <div className="md:hidden flex flex-col gap-4 pb-12 select-none">
                      <AnimatePresence mode="popLayout">
                        {sortedArticles.map((article, index) => {
                          const isFeatured = index === 0;
                          
                          if (isFeatured) {
                            return (
                              <motion.div
                                key={`mob-featured-${article.id || index}-${index}`}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className={`rounded-xl overflow-hidden border flex flex-col cursor-pointer active:scale-[0.98] transition-theme ${
                                  isThemeDark ? 'bg-[#1a1a1c] border-gray-800/60' : 'bg-white border-gray-150'
                                }`}
                                onClick={() => navigate(`/blog/${article.slug}`)}
                              >
                                <div className="h-36 sm:h-44 relative bg-black/40 shrink-0 select-none">
                                  {article.image_url ? (
                                    <img src={getMediaUrl(article.image_url)} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-500/10 to-teal-905 p-3">
                                      <BookOpen size={24} className="text-accent/20" />
                                    </div>
                                  )}
                                  <div className="absolute top-2.5 right-2.5">
                                    <span className="text-[8.5px] font-black px-2.5 py-1 rounded bg-accent text-white shadow-sm font-sans tracking-wide">
                                      {isRtl ? article.category_ar : article.category_en}
                                    </span>
                                  </div>
                                </div>
                                <div className="p-4 flex-1">
                                  <h3 className="text-[13px] font-black tracking-tight leading-snug text-slate-900 dark:text-white font-sans">
                                    {isRtl ? article.title_ar : article.title_en}
                                  </h3>
                                  <div className="flex items-center justify-between text-[10px] text-gray-500 mt-3 font-sans font-bold">
                                    <span>{new Date(article.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</span>
                                    <div className="flex items-center gap-1 text-amber-500">
                                      <Star size={10} className="fill-current" />
                                      <span>{article.avg_rating && Number(article.avg_rating) > 0 ? Number(article.avg_rating).toFixed(1) : '5.0'}</span>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            );
                          }

                          return (
                            <motion.div
                              key={`mob-list-row-${article.id || index}-${index}`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className={`p-3.5 rounded-xl border flex gap-3.5 cursor-pointer active:scale-[0.98] transition-theme ${
                                isThemeDark ? 'bg-[#1a1a1c] border-gray-800/60' : 'bg-white border-gray-150'
                              }`}
                              onClick={() => navigate(`/blog/${article.slug}`)}
                            >
                              <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-slate-900 border border-white/5 relative">
                                {article.image_url ? (
                                  <img src={getMediaUrl(article.image_url)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-accent/10 text-accent">
                                    <BookOpen size={16} />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                                <div>
                                  <span className="text-[8px] font-black uppercase text-accent tracking-wider">
                                    {isRtl ? article.category_ar : article.category_en}
                                  </span>
                                  <h3 className="text-xs font-bold leading-snug text-slate-900 dark:text-white line-clamp-2 mt-1 font-sans">
                                    {isRtl ? article.title_ar : article.title_en}
                                  </h3>
                                </div>
                                <div className="flex items-center justify-between text-[9px] text-gray-500 font-mono">
                                  <span>{new Date(article.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</span>
                                  <div className="flex items-center gap-0.5 text-amber-550">
                                    <Star size={10} className="fill-current" />
                                    <span>{article.avg_rating && Number(article.avg_rating) > 0 ? Number(article.avg_rating).toFixed(1) : '5.0'}</span>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </>
                ) : (
                  <div className="py-16 text-center border border-dashed border-[var(--border-main)] rounded-lg max-w-xl mx-auto p-12 select-none">
                    <BookOpen size={48} className="mx-auto text-gray-400 mb-3 grayscale opacity-40 animate-pulse" />
                    <h3 className="font-bold text-sm tracking-tight mb-1 text-[var(--text-primary)]">
                      {isRtl ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching articles found'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed max-w-sm mx-auto">
                      {isRtl 
                        ? 'جرب استخدام كلمات مفتاحية أخرى أو غير تصفية الأقسام المحددة أعلاه.' 
                        : 'Try modifying your search keywords or switching to another category filter.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                      }}
                      className="mt-5 px-5 h-10 bg-accent/10 text-accent border border-accent/20 rounded-[4px] text-xs font-bold hover:bg-accent/15 hover: transition-theme cursor-pointer text-center"
                    >
                      {isRtl ? 'إعادة ضبط التصفية والبحث' : 'Reset Filters & Search'}
                    </button>
                  </div>
                )}

                {/* Mobile Footer in Scroll Flow */}
                <div className="md:hidden border-t border-gray-150/10 dark:border-gray-800/40 pt-4 mt-8 text-center text-gray-500 text-[9px] select-none">
                  <div className="mb-1 font-sans font-black tracking-widest text-[8px] uppercase text-gray-400">
                    PERPLEXTA PLATFORM INSIGHTS SYSTEM
                  </div>
                  <div className="flex items-center justify-center gap-2.5 mb-1.5 text-accent font-bold">
                    <span onClick={() => navigate('/about')} className="cursor-pointer hover:underline">{isRtl ? 'من نحن' : 'About Us'}</span>
                    <span className="text-gray-500/20">•</span>
                    <span onClick={() => navigate('/terms')} className="cursor-pointer hover:underline">{isRtl ? 'الشروط والأحكام' : 'Terms & Conditions'}</span>
                    <span className="text-gray-500/20">•</span>
                    <span onClick={() => navigate('/privacy')} className="cursor-pointer hover:underline">{isRtl ? 'الخصوصية' : 'Privacy'}</span>
                  </div>
                  <div className="text-gray-400 font-sans font-semibold">
                    {isRtl ? 'الموقع محفوظ لـ ViralLinkUp 2026 ©' : 'All Sovereignties Reserved ViralLinkUp 2026 ©'}
                  </div>
                </div>
              </ContentContainer>
            </main>

            </div>
          </motion.div>
        ) : (
          <ContentContainer
            key="article-detail"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="w-full flex-1 flex flex-col overflow-hidden h-full pb-4"
          >
            {/* Desktop Immersive Reader Layout */}
            <div className="hidden md:flex flex-col h-full overflow-hidden w-full animate-fade-in">
              {/* Elegant control header / navigation */}
              <div className={`p-4 px-6 border rounded-xl flex items-center justify-between mt-1 mb-4 relative select-none shrink-0 ${
                isThemeDark ? 'bg-zinc-950/80 border-white/5 shadow-2xl' : 'bg-white border-gray-150/80 shadow-sm'
              }`}>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-500/10 to-transparent" />
              
              <button
                onClick={handleBackToList}
                className="group flex items-center gap-1.5 text-xs font-black font-sans tracking-tight text-gray-500 hover:text-accent dark:hover:text-accent hover: transition-theme cursor-pointer"
              >
                <ArrowLeft size={16} className={`group-hover:scale-110 transition-transform text-accent ${isRtl ? 'rotate-180' : ''}`} />
                <span>{isRtl ? 'العودة إلى المقالات' : 'Back to Articles'}</span>
              </button>
              
              <div className="text-[9px] font-mono tracking-widest text-slate-500 dark:text-zinc-500 font-bold uppercase select-none flex items-center gap-1.5 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                <span>{isRtl ? 'منظور التقرير البحثي المحمي' : 'SECURE INTEL RESEARCH SPECIFICATION'}</span>
              </div>
            </div>

            {/* High fidelity layout grid with independent scrolling and sticky/frozen sidebar */}
            <div className="lg:grid lg:grid-cols-12 lg:gap-8 items-stretch flex-1 overflow-hidden pb-4" dir={isRtl ? 'rtl' : 'ltr'}>
              
              {/* Sidebar Block (to the Left, frozen list of items - الصورة والمحتوى الى اليسار قلل الحجم والارتفاع وثبتهم ليكون شريط جانبي احترافي) */}
              <div className="lg:col-span-4 flex flex-col h-full overflow-y-auto scrollbar-none justify-start space-y-3.5 shrink-0">
                
                {/* Compact Image Cover */}
                {selectedArticle.image_url ? (
                  <div className="h-44 md:h-48 w-full rounded-xl overflow-hidden border border-slate-100 dark:border-white/10 shadow-sm bg-[var(--bg-secondary)] group relative shrink-0">
                    <img 
                      src={getMediaUrl(selectedArticle.image_url)} 
                      alt={isRtl ? selectedArticle.title_ar : selectedArticle.title_en} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    />
                    <div className="absolute top-2.5 right-2.5 bg-black/75 backdrop-blur-[4px] text-white text-[8px] uppercase tracking-widest font-black px-1.5 py-0.5 rounded border border-white/5">
                      {isRtl ? selectedArticle.category_ar : selectedArticle.category_en}
                    </div>
                  </div>
                ) : null}

                {/* Author Card & Metrics */}
                <div className={`p-5 md:p-6 rounded-xl border shrink-0 ${isThemeDark ? 'bg-zinc-950/80 border-white/5' : 'bg-white border-gray-150'} shadow-sm space-y-4`}>
                  <div className="flex items-center gap-3">
                    {selectedArticle.author_avatar ? (
                      <img src={selectedArticle.author_avatar} alt={selectedArticle.author_name} className="w-10 h-10 rounded-full border border-slate-100 dark:border-white/5 object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent/15 text-accent flex items-center justify-center font-bold text-sm shrink-0">
                        {selectedArticle.author_name[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-[13px] font-black text-slate-900 dark:text-white leading-tight truncate">{selectedArticle.author_name}</div>
                      <div className="text-[8.5px] font-mono uppercase tracking-widest text-accent mt-1 leading-none">
                        {selectedArticle.author_role === 'admin' ? (isRtl ? 'إشراف سيادي' : 'PLATFORM ADMIN') : (isRtl ? 'محلل تقني' : 'FIELD ANALYST')}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 grid grid-cols-2 gap-3 text-[10px] font-mono">
                    <div>
                      <span className="block text-[8.5px] text-slate-400 dark:text-zinc-500 uppercase">{isRtl ? 'تاريخ النشر' : 'PUBLISHED'}</span>
                      <span className="font-bold text-[10.5px] text-slate-700 dark:text-zinc-300">{new Date(selectedArticle.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</span>
                    </div>
                    <div>
                      <span className="block text-[8.5px] text-slate-400 dark:text-zinc-500 uppercase">{isRtl ? 'المشاهدات' : 'VIEWS'}</span>
                      <span className="font-bold text-[10.5px] text-accent flex items-center gap-1 mt-0.5">
                        <Eye size={12} className="text-accent" />
                        {selectedArticle.views}
                      </span>
                    </div>
                  </div>

                  {/* Compact Rating block with active interactivity & Emerald Glow stars */}
                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1 select-none">
                      {[1, 2, 3, 4, 5].map((starVal, sIdx) => {
                        const isActive = starVal <= (ratingHover || userRating);
                        return (
                          <button
                            key={`blog-desk-star-${starVal}-${sIdx}`}
                            type="button"
                            disabled={!token || isRatingSubmitting}
                            onMouseEnter={() => token && setRatingHover(starVal)}
                            onMouseLeave={() => token && setRatingHover(0)}
                            onClick={() => handleRateArticle(starVal)}
                            className={`p-0.5 transition-theme ${!token ? 'opacity-50 cursor-not-allowed' : 'hover:scale-125 cursor-pointer'} ${isActive ? 'text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]' : 'text-slate-300 dark:text-zinc-800'}`}
                          >
                            <Star size={15} className={isActive ? 'fill-[currentColor]' : ''} />
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="text-[11px] font-bold text-slate-900 dark:text-white font-mono shrink-0 select-none">
                      {selectedArticle.avg_rating && Number(selectedArticle.avg_rating) > 0 ? Number(selectedArticle.avg_rating).toFixed(1) : '5.0'} / 5.0
                    </div>
                  </div>

                  {/* Sharing button */}
                  <div className="pt-3 border-t border-slate-100 dark:border-white/5">
                    <button
                      type="button"
                      onClick={() => setIsShareOpen(true)}
                      className="w-full h-9 px-3 flex items-center justify-center gap-1.5 border border-accent/15 bg-accent/10 hover:bg-accent/15 text-accent rounded-[4px] hover:shadow-[0_0_8px_rgba(156,163,175,0.25)] transition-theme font-bold text-[10px] cursor-pointer select-none"
                    >
                      <Share2 size={11} className="text-accent" />
                      <span>{isRtl ? 'مشاركة وتعميم المقال' : 'Share & Distribute'}</span>
                    </button>
                  </div>
                </div>

                {/* Compact Related Articles block */}
                <div className={`p-4 rounded-xl border shrink-0 ${isThemeDark ? 'bg-zinc-950/80 border-white/5' : 'bg-white border-gray-150'} shadow-sm`}>
                  <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-2.5 pb-1 border-b border-slate-100 dark:border-white/5">
                    {isRtl ? 'مواد وتقارير ذات صلة' : 'Related analytical reports'}
                  </h4>
                  {(() => {
                    const related = articles
                      .filter(a => a.id !== selectedArticle.id && (a.category_en === selectedArticle.category_en || a.category_ar === selectedArticle.category_ar))
                      .slice(0, 5);
                    const finalRelated = related.length >= 5 ? related : [...related, ...articles.filter(a => a.id !== selectedArticle.id && !related.find(r => r.id === a.id))].slice(0, 5);
                    
                    if (finalRelated.length === 0) {
                      return <p className="text-[9px] text-slate-400 dark:text-zinc-500 text-center py-1 select-none">{isRtl ? 'لا توجد مقالات ذات صلة' : 'No related articles found'}</p>;
                    }
                    
                    return (
                      <div className="space-y-2 max-h-[190px] overflow-y-auto scrollbar-none select-none font-sans">
                        {finalRelated.map((item, relIdx) => (
                          <div
                            key={`blog-rel-item-${item.id || relIdx}-${relIdx}`}
                            onClick={() => navigate(`/blog/${item.slug}`)}
                            className="flex items-center gap-2 cursor-pointer group/related p-1 rounded hover:bg-accent/5 transition-theme"
                          >
                            <div className="w-8 h-8 rounded overflow-hidden shrink-0 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-white/5">
                              {item.image_url ? (
                                <img src={getMediaUrl(item.image_url)} className="w-full h-full object-cover group-hover/related:scale-105 transition-transform duration-500 animate-fade-in" alt="" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-accent/10 text-accent">
                                  <BookOpen size={10} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[7.5px] font-bold text-accent uppercase tracking-widest leading-none">{isRtl ? item.category_ar : item.category_en}</div>
                              <div className="text-[10px] font-bold text-slate-900 dark:text-white truncate transition-colors group-hover/related:text-accent dark:group-hover/related:text-accent mt-0.5 font-sans leading-none">
                                {isRtl ? item.title_ar : item.title_en}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Left Reading Block (Main column): Fixed/Sticky Title + scrolling body and comments */}
              <div className="lg:col-span-8 flex flex-col h-full overflow-hidden space-y-4">
                
                {/* Sticky/Fixed Article Title Header Card */}
                <div className={`p-5 rounded-xl border shrink-0 ${
                  isThemeDark 
                    ? 'bg-zinc-950/65 border-white/5 shadow-xl' 
                    : 'bg-white border-gray-150/80 shadow-sm'
                }`}>
                  <div className="flex items-center gap-2 mb-2 select-none">
                    <span className="bg-accent/10 border border-accent/20 text-accent text-[8.5px] font-black tracking-wider uppercase px-2 py-0.5 rounded">
                      {isRtl ? selectedArticle.category_ar : selectedArticle.category_en}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
                      {isRtl ? 'تحليلات مستقلة عالية الدقة' : 'PERPLEXTA INDEPENDENT INTEL'}
                    </span>
                  </div>
                  
                  <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white font-sans leading-tight select-text">
                    {isRtl ? selectedArticle.title_ar : selectedArticle.title_en}
                  </h1>
                </div>

                {/* Scrollable Container for paragraphs Content & Discussions */}
                <div 
                  onScroll={handleScrollProgress}
                  className="flex-1 overflow-y-auto scrollbar-none pr-1 pb-12 space-y-4"
                >
                  {/* Visual Reading Progress Indicator */}
                  <div className={`p-4 rounded-xl border select-none ${isThemeDark ? 'bg-zinc-950/40 border-white/5' : 'bg-white border-gray-150/80'} shadow-sm`}>
                    <div className="flex items-center justify-between text-[9px] font-mono text-accent dark:text-accent font-bold mb-2">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <span>{isRtl ? 'مؤشر تقدم القراءة التحليلية' : 'Reading Progress Indicator'}</span>
                      </span>
                      <span className="bg-accent/10 px-2 py-0.5 rounded text-accent font-bold">
                        {Math.round(readingProgress)}% {isRtl ? 'مكتمل' : 'Completed'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden relative">
                      <div 
                        className="h-full bg-accent shadow-[0_0_10px_rgba(156,163,175,0.85)] transition-theme rounded-full"
                        style={{ width: `${readingProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Content Panel */}
                  <div className={`p-6 rounded-xl border ${isThemeDark ? 'bg-zinc-950/40 border-white/5' : 'bg-white border-gray-150/80'} shadow-md`}>
                    {/* Body Text */}
                    <div className="text-slate-800 dark:text-zinc-200 font-sans tracking-wide leading-relaxed space-y-4 select-text text-justify overflow-hidden font-medium text-xs sm:text-sm">
                      {(isRtl ? selectedArticle.content_ar : selectedArticle.content_en).split('\n').map((paragraph, idx) => (
                        paragraph.trim() ? (
                          <p key={`blog-p-${idx}-${paragraph.slice(0, 10)}`} className="whitespace-pre-wrap leading-7 text-[13px] sm:text-[14px]">
                            {paragraph}
                          </p>
                        ) : (
                          <div key={`blog-p-gap-${idx}`} className="h-3" />
                        )
                      ))}
                    </div>
                  </div>

                  {/* Discussions Hub */}
                  <section className={`p-6 rounded-xl border ${isThemeDark ? 'bg-zinc-950/40 border-white/5' : 'bg-white border-gray-150/80'} shadow-md`}>
                    <h3 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-white mb-5 flex items-center gap-2 select-none border-b border-slate-100 dark:border-white/5 pb-2.5">
                      <MessageSquare size={16} className="text-accent font-sans" />
                      <span>{isRtl ? 'المناقشات والتعليقات' : 'Article Debates & Public Forums'}</span>
                      <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">({selectedArticle.comment_count || 0})</span>
                    </h3>

                    {/* Submit comment form for authenticated users */}
                    {token ? (
                      <form onSubmit={handleAddComment} className="mb-5 relative">
                        <textarea
                          rows={3}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder={isRtl ? 'أضف تعليقك التحليلي هنا...' : 'Write your analytical comment here...'}
                          maxLength={1000}
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-accent/35 focus:border-accent rounded-lg p-3 text-xs leading-relaxed tracking-wide placeholder-slate-400 dark:placeholder-zinc-600 outline-none resize-none transition-theme font-sans font-medium"
                        />
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-[8.5px] font-mono text-slate-400 dark:text-zinc-500">{1000 - newComment.length} {isRtl ? 'رمز متبقي' : 'characters left'}</span>
                          <button
                            type="submit"
                            disabled={submittingComment || !newComment.trim()}
                            className="flex items-center gap-1 px-3 h-8 rounded-[4px] bg-accent hover:bg-accent disabled:opacity-40 disabled:hover:bg-accent font-bold text-white text-xs transition-theme shadow-sm uppercase shrink-0 cursor-pointer"
                          >
                            {submittingComment ? (
                              <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            ) : (
                              <>
                                <Send size={11} className={isRtl ? 'rotate-180' : ''} />
                                <span className="text-[11px]">{isRtl ? 'إرسال' : 'Comment'}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="mb-5 p-3.5 bg-accent/5 border border-accent/10 rounded-lg text-center select-none">
                        <p className="text-xs text-accent dark:text-accent leading-relaxed font-sans font-medium">
                          {isRtl 
                            ? 'يرجى تسجيل الدخول للمشاركة بالتحليلات والتعليق على المقالات.' 
                            : 'Please login to join the analytical discussions.'}
                        </p>
                      </div>
                    )}

                    {/* Comments list */}
                    {commentsLoading ? (
                      <div className="space-y-3.5 animate-pulse">
                        {[1, 2].map(i => (
                          <div key={`blog-comment-skel-${i}`} className="flex gap-3 p-3 border-b border-slate-100 dark:border-white/5">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-zinc-800" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3.5 bg-slate-200 dark:bg-zinc-800 rounded w-1/4" />
                              <div className="h-3 bg-slate-200 dark:bg-zinc-800 rounded w-3/4" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : comments.length > 0 ? (
                      <div className="space-y-3.5 max-h-[350px] overflow-y-auto custom-scrollbar pr-1.5">
                        {comments.map((comment, index) => (
                          <motion.div
                            key={`blog-comment-${comment.id || index}-${index}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="group/item flex gap-2.5 p-3.5 bg-slate-50/50 dark:bg-zinc-950/30 border border-slate-100 dark:border-white/5 rounded-xl hover:border-accent/10 transition-theme"
                          >
                            {comment.author_avatar ? (
                              <img src={comment.author_avatar} alt={comment.author_name} className="w-7 h-7 rounded-full border border-slate-100 dark:border-white/5 shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-zinc-900 text-slate-400 dark:text-zinc-500 flex items-center justify-center shrink-0">
                                <User size={12} />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1.5 mb-1">
                                <div className="flex items-center gap-1">
                                  <span className="text-[11px] font-black text-slate-900 dark:text-white truncate">{comment.author_name}</span>
                                  {comment.author_role === 'admin' && (
                                    <span className="text-[7.5px] tracking-wide font-black uppercase text-accent bg-accent/10 border border-accent/15 px-1 py-0.5 rounded-[2px] select-none">{isRtl ? 'إشراف' : 'Staff'}</span>
                                  )}
                                </div>
                                
                                <div className="flex items-center gap-2 select-none shrink-0">
                                  <span className="text-[8.5px] font-mono text-slate-400 dark:text-zinc-500">{new Date(comment.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                  {(user?.role === 'admin' || user?.id === comment.user_id) && (
                                    <button
                                      onClick={() => handleDeleteComment(comment.id)}
                                      className="opacity-0 group-hover/item:opacity-100 transition-opacity p-0.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                                      title={isRtl ? 'حذف التعليق' : 'Delete Comment'}
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  )}
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed font-sans font-medium text-justify select-text">
                                {comment.content}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-slate-400 dark:text-zinc-500 select-none">
                        <MessageSquare size={28} className="mx-auto text-slate-300 dark:text-zinc-800 mb-2" />
                        <p className="text-[11px] font-sans font-medium">{isRtl ? 'لا توجد تعليقات بعد. شارك برأيك وكن أول المعلقين!' : 'No comments yet. Share your thoughts and start the debate!'}</p>
                      </div>
                    )}
                  </section>
                </div>
              </div>
            </div>

          </div> {/* Close Desktop Immersive Reader Layout */}

            {/* Mobile-Only Immersive Reading View */}
            <div 
              onScroll={handleScrollProgress}
              className="md:hidden flex flex-col flex-1 overflow-y-auto pb-16 scrollbar-none" 
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              {/* Back button & Action Bar */}
              <div className={`p-4 flex items-center justify-between border-b ${
                isThemeDark ? 'bg-zinc-950/80 border-white/5' : 'bg-white border-gray-150'
              }`}>
                <button
                  onClick={handleBackToList}
                  className="flex items-center gap-1 text-xs font-black text-gray-500 active:text-accent cursor-pointer"
                >
                  <ArrowLeft size={16} className={isRtl ? 'rotate-180 text-accent' : 'text-accent'} />
                  <span>{isRtl ? 'المقالات' : 'Articles'}</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsShareOpen(true)}
                    className="p-1.5 focus:bg-accent/10 text-gray-400 hover:text-accent cursor-pointer"
                  >
                    <Share2 size={15} />
                  </button>
                </div>
              </div>

              {/* Cover Image & Primary Info Banner */}
              <div className="relative w-full h-52 shrink-0 bg-slate-900 select-none">
                {selectedArticle.image_url ? (
                  <img src={getMediaUrl(selectedArticle.image_url)} alt="" className="w-full h-full object-cover animate-fade-in animate-duration-500" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-gray-500/10 to-teal-900 flex flex-col items-center justify-center p-4">
                    <BookOpen size={36} className="text-accent/30 mb-1" />
                    <span className="text-[8px] tracking-widest font-bold uppercase text-accent">{isRtl ? 'تحليلات مستقلة' : 'Sovereign Intelligence'}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                
                {/* Float Category Badge */}
                <div className="absolute top-3 right-3 select-none">
                  <span className="text-[8px] bg-accent text-white font-black px-2.5 py-1 rounded-full uppercase shadow-lg">
                    {isRtl ? selectedArticle.category_ar : selectedArticle.category_en}
                  </span>
                </div>

                <div className="absolute bottom-3 left-3 right-3">
                  <h1 className="text-sm font-black text-white leading-snug font-sans drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                    {isRtl ? selectedArticle.title_ar : selectedArticle.title_en}
                  </h1>
                </div>
              </div>

              {/* Compact Author & Stat Rails */}
              <div className={`p-4 border-b flex items-center justify-between select-none ${
                isThemeDark ? 'bg-zinc-950/40 border-white/5' : 'bg-gray-50 border-gray-150'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  {selectedArticle.author_avatar ? (
                    <img src={selectedArticle.author_avatar} alt="" className="w-6 h-6 rounded-full border border-white/10" />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[10px] font-black">{selectedArticle.author_name[0]}</div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[10px] font-black text-slate-900 dark:text-white truncate leading-none font-sans">{selectedArticle.author_name}</div>
                    <span className="text-[7.5px] font-mono text-accent uppercase tracking-wider block mt-0.5">{isRtl ? 'محلل معتمد' : 'Field Analyst'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[9px] font-mono text-gray-500">
                  <span>{new Date(selectedArticle.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</span>
                  <div className="flex items-center gap-0.5 font-bold">
                    <Eye size={10} className="text-gray-400" />
                    <span>{selectedArticle.views}</span>
                  </div>
                  <div className="flex items-center gap-0.5 font-bold text-amber-500">
                    <Star size={10} className="fill-[currentColor]" />
                    <span>{selectedArticle.avg_rating && Number(selectedArticle.avg_rating) > 0 ? Number(selectedArticle.avg_rating).toFixed(1) : '5.0'}</span>
                  </div>
                </div>
              </div>

              {/* Mobile Visual Reading Progress Indicator */}
              <div className={`mx-4 mt-4 p-3.5 rounded-xl border select-none ${isThemeDark ? 'bg-zinc-950/40 border-white/5' : 'bg-white border-gray-150'} shadow-sm`}>
                <div className="flex items-center justify-between text-[9px] font-mono text-accent dark:text-accent font-bold mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <span>{isRtl ? 'مؤشر تقدم القراءة' : 'Reading Progress'}</span>
                  </span>
                  <span className="bg-accent/10 px-2 py-0.5 rounded text-accent font-bold">
                    {Math.round(readingProgress)}% {isRtl ? 'مكتمل' : 'Completed'}
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-accent shadow-[0_0_10px_rgba(156,163,175,0.85)] transition-theme rounded-full"
                    style={{ width: `${readingProgress}%` }}
                  />
                </div>
              </div>

              {/* Immersive Text Body Component */}
              <div className="p-5 font-sans leading-relaxed space-y-4 select-text">
                <article className="text-[14px] leading-8 font-normal text-justify text-[var(--text-primary)]">
                  {(isRtl ? selectedArticle.content_ar : selectedArticle.content_en).split('\n').map((paragraph, index) => {
                    if (!paragraph.trim()) return <div key={`blog-mob-p-gap-${index}`} className="h-3" />;
                    return (
                      <p key={`blog-mob-p-${index}-${paragraph.slice(0, 10)}`} className="mb-4">
                        {paragraph}
                      </p>
                    );
                  })}
                </article>
              </div>

              {/* Ratings Interactivity */}
              <div className={`mx-4 p-4 rounded-xl border ${
                isThemeDark ? 'bg-zinc-950/30 border-white/5' : 'bg-white border-gray-150'
              }`}>
                <h4 className="text-[10.5px] font-black font-sans uppercase text-gray-400 tracking-wider mb-2">{isRtl ? 'ما هو تقييمك لهذا التقرير؟' : 'Your Rating Indicator'}</h4>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((starVal, sIdx) => {
                    const isActive = starVal <= (ratingHover || userRating);
                    return (
                      <button
                        key={`blog-mob-star-${starVal}-${sIdx}`}
                        type="button"
                        disabled={!token || isRatingSubmitting}
                        onMouseEnter={() => token && setRatingHover(starVal)}
                        onMouseLeave={() => token && setRatingHover(0)}
                        onClick={() => handleRateArticle(starVal)}
                        className={`p-1 transition-theme active:scale-125 cursor-pointer ${!token ? 'opacity-55 cursor-not-allowed' : 'cursor-pointer'} ${isActive ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'text-slate-300 dark:text-zinc-800'}`}
                      >
                        <Star size={20} className={isActive ? 'fill-current' : ''} />
                      </button>
                    );
                  })}
                </div>
                {!token && (
                  <p className="text-[9px] text-slate-500/80 font-sans mt-2">
                    {isRtl ? 'سجل الدخول لتقديم تقييمك للتقرير.' : 'Sign in to rate this premium specification.'}
                  </p>
                )}
              </div>

              {/* Collapsible Mobile Discussions Accordion */}
              <div className="mx-4 my-6">
                <button
                  type="button"
                  onClick={() => setIsCommentsOpenOnMobile(!isCommentsOpenOnMobile)}
                  className={`w-full p-4 rounded-xl border flex items-center justify-between text-xs font-black font-sans transition-theme active:scale-[0.99] cursor-pointer ${
                    isThemeDark ? 'bg-zinc-950/40 border-white/5 text-white active:bg-zinc-900/60' : 'bg-white border-gray-150 text-gray-900'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <MessageSquare size={14} className="text-accent" />
                    <span>{isRtl ? 'المناقشات والتعليقات' : 'Article Debates & Discussions'}</span>
                    <span className="text-[10px] text-slate-400">({selectedArticle.comment_count || 0})</span>
                  </span>
                  <span className="text-accent text-xs font-bold font-mono">
                    {isCommentsOpenOnMobile ? (isRtl ? 'إخفاء [-]' : 'Hide [-]') : (isRtl ? 'عرض [+]' : 'Show [+]')}
                  </span>
                </button>

                {isCommentsOpenOnMobile && (
                  <div className={`mt-2 p-4 rounded-xl border space-y-4 animate-fade-in ${
                    isThemeDark ? 'bg-[#090a0d] border-white/5' : 'bg-white border-gray-150'
                  }`}>
                    {token ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleAddComment(e); }} className="relative text-right">
                        <textarea
                          rows={2}
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder={isRtl ? 'أضف تعليقك التحليلي هنا...' : 'Write your comment...'}
                          maxLength={1000}
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-accent/35 focus:border-accent rounded-lg p-2.5 text-xs placeholder-slate-500 dark:placeholder-zinc-600 outline-none resize-none font-sans animate-duration-500"
                        />
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-[8px] font-mono text-gray-400">{1000 - newComment.length} {isRtl ? 'رمز متبقي' : 'left'}</span>
                          <button
                            type="submit"
                            disabled={submittingComment || !newComment.trim()}
                            className="flex items-center justify-center h-8 px-4 bg-accent text-white rounded font-bold text-[10px] cursor-pointer animate-duration-500"
                          >
                            {submittingComment ? '...' : (isRtl ? 'تعليق' : 'Comment')}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <p className="text-[10px] text-accent/85 text-center py-2 font-sans">
                        {isRtl ? 'يرجى تسجيل الدخول للمشاركة بالتعليقات.' : 'Please sign in to participate in debates.'}
                      </p>
                    )}

                    {commentsLoading ? (
                      <div className="text-center text-[10px] text-gray-500 py-4 font-mono">Loading discussions...</div>
                    ) : comments.length > 0 ? (
                      <div className="space-y-3.5 max-h-[250px] overflow-y-auto pr-1">
                        {comments.map((comment, cIdx) => (
                          <div key={`blog-mob-comment-${comment.id || cIdx}-${cIdx}`} className="p-3 bg-slate-500/5 rounded-lg border border-slate-100/5 relative text-[11px] leading-relaxed">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-black text-slate-900 dark:text-white text-[10px] branch-sans leading-none">{comment.author_name}</span>
                              <span className="text-[8px] text-gray-500">{new Date(comment.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</span>
                            </div>
                            <p className="text-slate-600 dark:text-gray-300 font-sans text-[11px] text-justify leading-relaxed">{comment.content}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-[9px] text-gray-500 font-sans py-4">{isRtl ? 'لا توجد تعليقات بعد.' : 'No debators here yet.'}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Tactile Back Panel */}
              <div className="px-4 pb-6">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="w-full h-11 border border-accent/20 bg-accent/5 font-black text-xs text-accent rounded-xl transition-theme active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft size={14} className={isRtl ? 'rotate-180 text-accent' : 'text-accent'} />
                  <span>{isRtl ? 'العودة للمقالات والأبحاث' : 'Back to Insight Portal'}</span>
                </button>
              </div>

              {/* Mobile Detail Footer in scroll flow */}
              <div className="border-t border-gray-150/10 dark:border-gray-800/40 pt-4 pb-8 px-4 text-center text-gray-500 text-[9px] select-none">
                <div className="mb-1 font-sans font-black tracking-widest text-[8px] uppercase text-gray-400">
                  PERPLEXTA PLATFORM INSIGHTS SYSTEM
                </div>
                <div className="flex items-center justify-center gap-2.5 mb-1.5 text-accent font-bold">
                  <span onClick={() => navigate('/about')} className="cursor-pointer hover:underline">{language === 'ar' ? 'من نحن' : 'About Us'}</span>
                  <span className="text-gray-500/20">•</span>
                  <span onClick={() => navigate('/terms')} className="cursor-pointer hover:underline">{language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}</span>
                  <span className="text-gray-500/20">•</span>
                  <span onClick={() => navigate('/privacy')} className="cursor-pointer hover:underline">{language === 'ar' ? 'الخصوصية' : 'Privacy'}</span>
                </div>
                <div className="text-gray-400 font-sans font-semibold">
                  {language === 'ar' ? 'الموقع محفوظ لـ ViralLinkUp 2026 ©' : 'All Sovereignties Reserved ViralLinkUp 2026 ©'}
                </div>
              </div>
            </div>
          </ContentContainer>
        )}
      </AnimatePresence>

      {/* Share Modal / Dialog */}
      <AnimatePresence>
        {isShareOpen && selectedArticle && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg p-6 max-w-sm w-full relative shadow-2xl"
            >
              <h3 className="text-sm font-black font-sans text-[var(--text-primary)] mb-4 pb-2 border-b border-[var(--border-main)]">
                {isRtl ? 'مشاركة هذا التقرير البحثي' : 'Share research report'}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(isRtl ? selectedArticle.title_ar : selectedArticle.title_en)}&url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-11 bg-[#0f1419] text-white hover:opacity-90 rounded-[4px] text-xs font-black transition-theme cursor-pointer text-center"
                >
                  <span>X / Twitter</span>
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-11 bg-[#0077b5] text-white hover:opacity-90 rounded-[4px] text-xs font-black transition-theme cursor-pointer text-center"
                >
                  <span>LinkedIn</span>
                </a>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent((isRtl ? selectedArticle.title_ar : selectedArticle.title_en) + ' ' + window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-11 bg-[#25d366] text-white hover:opacity-90 rounded-[4px] text-xs font-black transition-theme cursor-pointer text-center"
                >
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`https://telegram.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(isRtl ? selectedArticle.title_ar : selectedArticle.title_en)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-11 bg-[#0088cc] text-white hover:opacity-90 rounded-[4px] text-xs font-black transition-theme cursor-pointer text-center"
                >
                  <span>Telegram</span>
                </a>
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border-main)] space-y-2">
                <span className="block text-[10px] font-mono uppercase text-gray-550">{isRtl ? 'رابط المشاركة المباشر:' : 'Direct Shareable link:'}</span>
                <div className="flex h-10 rounded-sm overflow-hidden bg-[var(--bg-base)] border border-[var(--border-main)]">
                  <input 
                    type="text" 
                    readOnly 
                    value={window.location.href} 
                    className="flex-1 min-w-0 bg-transparent text-[10px] font-mono px-3 text-gray-400 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopiedSlug(selectedArticle.slug);
                      setTimeout(() => setCopiedSlug(null), 2000);
                    }}
                    className="px-3 bg-accent text-white font-bold text-xs flex items-center justify-center cursor-pointer font-sans"
                  >
                    {copiedSlug === selectedArticle.slug ? <Check size={14} /> : <Link size={14} />}
                  </button>
                </div>
                {copiedSlug === selectedArticle.slug && (
                  <p className="text-[10px] font-mono text-accent">{isRtl ? 'تم نسخ الرابط المباشر بنجاح!' : 'Report link copied successfully!'}</p>
                )}
              </div>

              <button
                onClick={() => setIsShareOpen(false)}
                className="mt-4 w-full h-10 bg-[var(--bg-base)] hover:bg-[var(--bg-secondary)] border border-[var(--border-main)] text-xs text-[var(--text-primary)] font-black rounded-[4px] transition-theme cursor-pointer font-sans"
              >
                {isRtl ? 'إغلاق النافذة' : 'Close window'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar/Drawer Menu */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileSidebarOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={isRtl ? { x: '100%' } : { x: '-100%' }}
              animate={{ x: 0 }}
              exit={isRtl ? { x: '100%' } : { x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`relative w-80 max-w-[85vw] h-full flex flex-col p-6 shadow-2xl overflow-y-auto select-none ${
                isThemeDark ? 'bg-[#0a0a0c] text-white border-l border-white/5' : 'bg-white text-gray-900 border-l border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-150/10 dark:border-white/5 mb-6 select-none">
                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`px-3 py-1.5 rounded-[4px] border flex items-center gap-1.5 transition-theme text-[11px] font-black cursor-pointer ${
                    isThemeDark
                      ? 'border-accent/30 bg-accent/5 text-accent hover:bg-accent/10 hover:border-accent/50 hover:text-accent '
                      : 'border-accent/20 bg-accent/5 text-accent hover:bg-accent/10 hover:border-accent/40 hover:text-accent'
                  }`}
                  title={isRtl ? 'الرجوع للمقالات' : 'Back to insights'}
                >
                  {isRtl ? <ChevronRight size={14} className="text-accent" /> : <ChevronLeft size={14} className="text-accent" />}
                  <span>{isRtl ? 'الرجوع' : 'Back'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`w-8 h-8 rounded-[4px] flex items-center justify-center border transition-theme ${
                    isThemeDark
                      ? 'bg-white/5 border-white/10 text-gray-400 hover:text-accent hover:border-accent/45'
                      : 'bg-gray-50 border-gray-250 text-gray-750 hover:text-accent hover:border-accent/20'
                  }`}
                  title={isRtl ? 'إغلاق' : 'Close'}
                >
                  <X size={14} />
                </button>
              </div>

              <div className="flex-1 space-y-6">
                <div className="space-y-2">
                  <div className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                    {isRtl ? 'الأقسام والقطاعات' : 'MAIN DIVISIONS'}
                  </div>
                  <div className="space-y-1">
                    {/* Return to main page / reset button */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory('All');
                        setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between rounded px-3 py-2.5 text-[11px] font-black cursor-pointer transition-theme border mb-2 select-none ${
                        selectedCategory === 'All'
                          ? 'bg-accent/10 text-accent border-accent/35 border-r-2'
                          : (isThemeDark 
                              ? 'bg-[#131315]/40 border-gray-800/60 text-gray-400 hover:text-accent hover:border-accent/30' 
                              : 'bg-white border-gray-200 text-slate-650 hover:text-accent hover:border-accent/20')
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {isRtl ? <ArrowRight size={13} className="text-accent" /> : <ArrowLeft size={13} className="text-accent" />}
                        <span className="text-accent font-sans tracking-wide">
                          {isRtl ? 'المقالات الرئيسية (كل الأقسام)' : 'Main Articles (All divisions)'}
                        </span>
                      </span>
                    </button>

                    {categories.map((cat, catIdx) => {
                      const isSelected = selectedCategory === cat.id;
                      const iconCol = categoryColors[cat.id] || '#334155';
                      return (
                        <div
                          key={`blog-drawer-cat-${cat.id}-${catIdx}`}
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setIsMobileSidebarOpen(false);
                          }}
                          className={`flex items-center justify-between rounded px-3 py-2 text-[11px] font-black cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-accent/10 text-accent border-r-2 border-accent'
                              : (isThemeDark ? 'hover:bg-white/5 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-100 text-gray-650 hover:text-gray-900')
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <span style={{ color: iconCol }}>{getCategoryIcon(cat.id, "w-4 h-4 shrink-0")}</span>
                            <span>{isRtl ? cat.labelAr : cat.labelEn}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-150/10 dark:border-white/5">
                  <div className="text-[9px] font-black uppercase tracking-wider text-gray-500">
                    {isRtl ? 'ترتيب المقالات' : 'SORT RESEARCH'}
                  </div>
                  <div className="space-y-2">
                    {[
                      { labelAr: 'الأحدث أولاً', labelEn: 'Latest Reports', val: 'latest' },
                      { labelAr: 'الأكثر قراءة', labelEn: 'Most Popular', val: 'popular' },
                      { labelAr: 'الأعلى تقييماً', labelEn: 'Highly Rated', val: 'highest-rated' }
                    ].map((item, itIdx) => (
                      <label
                        key={`blog-drawer-sort-${item.val}-${itIdx}`}
                        className={`flex items-center gap-2.5 text-[11px] font-bold cursor-pointer transition-colors ${
                          sortBy === item.val
                            ? 'text-accent'
                            : (isThemeDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-605 hover:text-gray-850')
                        }`}
                      >
                        <input
                          type="radio"
                          name="blogMobileSortOrderRadio"
                          value={item.val}
                          checked={sortBy === item.val}
                          onChange={() => {
                            setSortBy(item.val as any);
                            setIsMobileSidebarOpen(false);
                          }}
                          className="accent-accent w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>{isRtl ? item.labelAr : item.labelEn}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer Block - Unified with Marketplace */}
      <footer className={`hidden md:block p-4 border-t text-[10px] select-none flex-shrink-0 ${
        isThemeDark ? 'bg-[#131315] border-gray-800/60 text-gray-500' : 'bg-gray-50 border-gray-150 text-gray-600'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-right">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <span className="font-sans font-black tracking-widest text-[9px] uppercase">
              PERPLEXTA PLATFORM INSIGHTS SYSTEM
            </span>
            <div className="flex items-center justify-center gap-2.5 text-[9px] text-accent font-bold">
              <span onClick={() => navigate('/about')} className="cursor-pointer hover:underline">{language === 'ar' ? 'من نحن' : 'About Us'}</span>
              <span className="text-gray-500/20">•</span>
              <span onClick={() => navigate('/terms')} className="cursor-pointer hover:underline">{language === 'ar' ? 'الشروط والأحكام' : 'Terms & Conditions'}</span>
              <span className="text-gray-500/20">•</span>
              <span onClick={() => navigate('/privacy')} className="cursor-pointer hover:underline">{language === 'ar' ? 'سياسة الخصوصية' : 'Privacy Policy'}</span>
            </div>
          </div>
          <span>
            {language === 'ar' ? 'الموقع محفوظ لـ ViralLinkUp 2026 ©' : 'All Sovereignties Reserved ViralLinkUp 2026 ©'}
          </span>
        </div>
      </footer>

      {/* Dynamic Pop-up Ad */}
      <AnimatePresence>
        {showAdPopup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-lg w-full max-w-md p-6 shadow-2xl relative"
            >
              <button
                onClick={() => {
                  setShowAdPopup(false);
                  localStorage.setItem('hide_blog_ad', 'true');
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-accent hover:bg-[var(--bg-overlay)] p-1.5 rounded-[4px] transition-theme"
              >
                <X size={16} />
              </button>

              <div className="flex flex-col gap-4">
                {/* Promo Badge */}
                <div className="flex items-center gap-2">
                  <span className="bg-accent/10 text-accent text-[10px] font-black px-2 py-0.5 rounded tracking-widest uppercase">
                    {language === 'ar' ? 'نشرة النخبة الفنية' : 'Elite Insight Club'}
                  </span>
                  <div className="h-px flex-1 bg-[var(--border-main)]/50" />
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 text-accent shadow-[0_0_15px_rgba(156,163,175,0.2)]">
                    <BookOpen size={24} />
                  </div>
                  <div className={`flex flex-col gap-1 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                    <h3 className="text-sm font-black text-[var(--text-primary)]">
                      {language === 'ar' ? 'كن أول من يحصل على تحليلات الخبراء الاستراتيجية' : 'Join Elite Technical Newsletter'}
                    </h3>
                    <p className="text-xs text-gray-500 leading-relaxed font-sans">
                      {language === 'ar'
                        ? 'اشترك للحصول على توصيات تداول مؤتمتة وتقارير الماكرو العميقة أسبوعياً مباشرة إلى بريدك الإلكتروني.'
                        : 'Receive automated trading indicator setups and deep macro research articles weekly direct to your inbox.'}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3 mt-2">
                  <button
                    onClick={() => {
                      setShowAdPopup(false);
                      localStorage.setItem('hide_blog_ad', 'true');
                    }}
                    className="flex-1 py-2 rounded-[4px] text-xs font-bold uppercase text-[var(--text-secondary)] bg-[var(--bg-overlay)] hover:bg-[var(--bg-surface)] transition-theme border border-[var(--border)]"
                  >
                    {language === 'ar' ? 'ليس الآن' : 'Later'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAdPopup(false);
                      localStorage.setItem('hide_blog_ad', 'true');
                      toast.success(language === 'ar' ? 'تم تسجيل بريدك بنجاح لتلقي نشرة النخبة!' : 'Successfully subscribed to Elite Insights!');
                    }}
                    className="flex-1 py-2 rounded-[4px] text-xs font-black uppercase bg-accent text-black hover:bg-accent transition-theme shadow-[0_5px_15px_rgba(156,163,175,0.3)] flex items-center justify-center gap-1.5"
                  >
                    <span>{language === 'ar' ? 'انضمام فوري' : 'Subscribe Now'}</span>
                    <ArrowRight size={14} className={language === 'ar' ? 'rotate-180' : ''} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
};
