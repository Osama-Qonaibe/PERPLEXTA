import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Clock, Eye, MessageSquare, Plus, ArrowLeft, Trash2, Send, Calendar, User, BookOpen, Star, Share2, Link, Check, Heart, MessageCircle, Search, Grid, Newspaper, Cpu, RefreshCw, Code, Brain, TrendingUp, SlidersHorizontal, ArrowRight, ChevronDown, Wrench, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const { language, token, user, t, theme } = useAppContext();
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
    All: '#10b981',
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

  // Fetch article detailed (increment views too on server)
  const handleSelectArticle = async (article: Article) => {
    setSelectedArticle(article);
    setCommentsLoading(true);
    setUserRating(0); // Reset
    try {
      const res = await fetch(`/api/blog/articles/${article.slug}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedArticle(data.article);
        setComments(data.comments);
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
  };

  const isRtl = language === 'ar';
  const isThemeDark = theme === 'dark';

  return (
    <div
      className={`h-[calc(100vh-72px)] w-full flex flex-col overflow-hidden relative transition-colors duration-300 select-none ${
        isThemeDark ? 'bg-[#050505] text-white' : 'bg-[var(--bg-base)] text-gray-900'
      }`}
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
          ? 'bg-[#080808]/95 shadow-black/80'
          : 'bg-white shadow-gray-200/50'
      }`}>
        <AnimatePresence mode="wait">
          {!selectedArticle ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <header className={`p-6 md:px-8 md:py-6 border-b relative select-none flex-shrink-0 ${
                isThemeDark ? 'border-white/5 bg-[#080808]' : 'border-gray-200/80 bg-white'
              }`}>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-1">
                    <h1 className="text-xl md:text-2xl font-black font-sans tracking-tight">
                      {isRtl ? (
                        <>
                          <span className="text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)] font-sans">نبض بيربليكستا </span>
                          <span className={isThemeDark ? 'text-white' : 'text-gray-900'}>للمقالات والتحليلات</span>
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)]">Perplexta Insights </span>
                          <span className={isThemeDark ? 'text-white' : 'text-gray-900'}>& Research Portal</span>
                        </>
                      )}
                    </h1>
                    <p className={`text-[10px] md:text-xs font-semibold leading-relaxed ${
                      isThemeDark ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      {isRtl 
                        ? 'رؤى وتحليلات حصرية يقدمها كبار خبراء استخبارات السوق والبيانات المالية.' 
                        : 'Exclusive insights and analytics prepared by senior researchers and financial analysts.'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsMobileSidebarOpen(true)}
                      className={`lg:hidden w-10 h-10 rounded-[4px] border flex items-center justify-center transition-colors ${
                        isThemeDark ? 'border-white/5 bg-white/5 text-gray-300 hover:text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <SlidersHorizontal size={16} />
                    </button>
                  </div>
                </div>

                {/* Sub-header Filter and Search bar - Unified with Marketplace */}
                <div className={`mt-6 p-2 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border ${
                  isThemeDark ? 'bg-[#07080a] border-white/5' : 'bg-[#fafafa] border-gray-200/80'
                }`}>
                  
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none px-1 py-0.5 flex-1 min-w-0">
                    {categories.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      const iconCol = categoryColors[cat.id] || '#10b981';
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.2)] dark:drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] font-black'
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

                  <div className={`flex items-center border rounded-lg px-3 py-1.5 w-full sm:w-72 md:w-80 lg:w-96 flex-shrink-0 transition-all ${
                    isThemeDark ? 'bg-black/40 border-white/10 focus-within:border-emerald-500/35' : 'bg-white border-gray-200 focus-within:border-emerald-500/35'
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
                    <div className="text-[9px] font-mono text-emerald-500 font-bold bg-emerald-500/5 px-2 py-0.5 rounded shrink-0 border border-emerald-500/10">
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
                    {categories.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      const iconCol = categoryColors[cat.id] || '#10b981';
                      return (
                        <div
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`flex items-center justify-between rounded px-2.5 py-1.5 text-[10px] font-black cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500'
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
                      ].map((item) => (
                        <label
                          key={item.val}
                          className={`flex items-center gap-2 text-[10px] font-bold cursor-pointer transition-colors ${
                            sortBy === item.val
                              ? 'text-emerald-500'
                              : (isThemeDark ? 'text-gray-400 hover:text-white' : 'text-slate-600 hover:text-slate-900')
                          }`}
                        >
                          <input
                            type="radio"
                            name="blogSortOrderRadio"
                            value={item.val}
                            checked={sortBy === item.val}
                            onChange={() => setSortBy(item.val as any)}
                            className="accent-emerald-500 w-3 h-3 cursor-pointer"
                          />
                          <span>{isRtl ? item.labelAr : item.labelEn}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>

              <main className="flex-1 p-6 md:p-8 overflow-y-auto scrollbar-none">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                      <div key={i} className={`rounded-xl border animate-pulse flex flex-col h-[390px] ${
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                      {sortedArticles.map((article) => {
                        return (
                          <motion.article
                            key={article.id}
                            layout
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            whileHover={{ y: -6, transition: { duration: 0.25, ease: 'easeOut' } }}
                            className={`rounded-xl border overflow-hidden transition-all duration-300 flex flex-col h-[390px] cursor-pointer relative group ${
                              isThemeDark
                                ? 'bg-[#090a0c] border-white/5 hover:border-emerald-500/20 hover:shadow-[0_15px_30px_rgba(0,0,0,0.8)]'
                                : 'bg-white border-gray-150 hover:border-emerald-500/30 hover:shadow-[0_15px_30px_rgba(0,0,0,0.05)]'
                            }`}
                            onClick={() => handleSelectArticle(article)}
                          >
                            <div className="h-40 relative overflow-hidden bg-black/45 shrink-0 select-none">
                              {article.image_url ? (
                                <img
                                  src={article.image_url}
                                  alt={isRtl ? article.title_ar : article.title_en}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-2">
                                  <BookOpen size={24} className="text-emerald-500/30 mb-1 shrink-0" />
                                  <span className="text-[7px] text-center uppercase tracking-widest text-emerald-500 font-bold">{isRtl ? 'تحليلات' : 'Intelligence'}</span>
                                </div>
                              )}
                              <div className="absolute top-2 right-2 flex items-center gap-1.5 select-none z-10">
                                <span className="text-[8px] font-black px-2 py-0.5 rounded bg-black/70 backdrop-blur-md border border-white/10 text-white flex items-center gap-1">
                                  {getCategoryIcon(article.category_en, 'w-2.5 h-2.5 text-emerald-400')}
                                  <span>{isRtl ? article.category_ar : article.category_en}</span>
                                </span>
                              </div>
                            </div>

                            <div className="p-4 flex-1 flex flex-col justify-between min-w-0">
                              <div>
                                <div className="flex items-center gap-2 text-[9px] font-mono text-gray-500 dark:text-gray-400 mb-1.5 select-none">
                                  <Calendar size={10} />
                                  <span>{new Date(article.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</span>
                                  <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-800" />
                                  <div className="flex items-center gap-0.5">
                                    <Eye size={10} />
                                    <span>{article.views} {isRtl ? 'مشاهدة' : 'views'}</span>
                                  </div>
                                </div>
                                <h3 className="text-xs sm:text-[13px] font-black tracking-tight text-[var(--text-primary)] group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors duration-300 leading-snug line-clamp-2 font-sans">
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
                                      <div className="w-5 h-5 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
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
                                  className={`w-full py-1.5 rounded-[4px] text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${
                                    isThemeDark
                                      ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15 hover:border-emerald-500/35 hover:shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                      : 'bg-emerald-500/5 border-emerald-500/15 text-emerald-700 hover:bg-emerald-500/10 hover:border-emerald-500/25 hover:shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                                  }`}
                                >
                                  <span>{isRtl ? 'قراءة تقرير الجودة' : 'Read Analytical Insight'}</span>
                                  {isRtl ? <ArrowLeft size={10} strokeWidth={3} className="text-emerald-500" /> : <ArrowRight size={10} strokeWidth={3} className="text-emerald-500" />}
                                </button>
                              </div>
                            </div>
                          </motion.article>
                        );
                      })}
                    </AnimatePresence>
                  </div>
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
                      className="mt-5 px-5 h-10 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-[4px] text-xs font-bold hover:bg-emerald-500/15 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all duration-300 cursor-pointer text-center"
                    >
                      {isRtl ? 'إعادة ضبط التصفية والبحث' : 'Reset Filters & Search'}
                    </button>
                  </div>
                )}
              </main>

            </div>
          </motion.div>
        ) : (
          <motion.div
            key="article-detail"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="max-w-6xl mx-auto w-full flex-1 flex flex-col overflow-hidden h-full pb-4"
          >
            {/* Elegant control header / navigation */}
            <div className={`p-4 px-6 border rounded-xl flex items-center justify-between mt-1 mb-4 relative select-none shrink-0 ${
              isThemeDark ? 'bg-zinc-950/80 border-white/5 shadow-2xl' : 'bg-white border-gray-150/80 shadow-sm'
            }`}>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              
              <button
                onClick={handleBackToList}
                className="group flex items-center gap-1.5 text-xs font-black font-sans tracking-tight text-gray-500 hover:text-emerald-500 dark:hover:text-emerald-400 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] transition-all duration-300 cursor-pointer"
              >
                <ArrowLeft size={16} className={`group-hover:scale-110 transition-transform text-emerald-500 ${isRtl ? 'rotate-180' : ''}`} />
                <span>{isRtl ? 'العودة إلى المقالات' : 'Back to Articles'}</span>
              </button>
              
              <div className="text-[9px] font-mono tracking-widest text-slate-500 dark:text-zinc-500 font-bold uppercase select-none flex items-center gap-1.5 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
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
                      src={selectedArticle.image_url} 
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
                      <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center font-bold text-sm shrink-0">
                        {selectedArticle.author_name[0]}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-[13px] font-black text-slate-900 dark:text-white leading-tight truncate">{selectedArticle.author_name}</div>
                      <div className="text-[8.5px] font-mono uppercase tracking-widest text-emerald-500 mt-1 leading-none">
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
                      <span className="font-bold text-[10.5px] text-emerald-500 flex items-center gap-1 mt-0.5">
                        <Eye size={12} className="text-emerald-500" />
                        {selectedArticle.views}
                      </span>
                    </div>
                  </div>

                  {/* Compact Rating block with active interactivity & Emerald Glow stars */}
                  <div className="pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1 select-none">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const isActive = starVal <= (ratingHover || userRating);
                        return (
                          <button
                            key={starVal}
                            type="button"
                            disabled={!token || isRatingSubmitting}
                            onMouseEnter={() => token && setRatingHover(starVal)}
                            onMouseLeave={() => token && setRatingHover(0)}
                            onClick={() => handleRateArticle(starVal)}
                            className={`p-0.5 transition-all duration-300 ${!token ? 'opacity-50 cursor-not-allowed' : 'hover:scale-125 cursor-pointer'} ${isActive ? 'text-amber-500 drop-shadow-[0_0_6px_rgba(245,158,11,0.5)]' : 'text-slate-300 dark:text-zinc-800'}`}
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
                      className="w-full h-9 px-3 flex items-center justify-center gap-1.5 border border-emerald-500/15 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-500 rounded-[4px] hover:shadow-[0_0_8px_rgba(16,185,129,0.25)] transition-all duration-300 font-bold text-[10px] cursor-pointer select-none"
                    >
                      <Share2 size={11} className="text-emerald-500" />
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
                        {finalRelated.map(item => (
                          <div
                            key={item.id}
                            onClick={() => handleSelectArticle(item)}
                            className="flex items-center gap-2 cursor-pointer group/related p-1 rounded hover:bg-emerald-500/5 transition-all duration-300"
                          >
                            <div className="w-8 h-8 rounded overflow-hidden shrink-0 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-white/5">
                              {item.image_url ? (
                                <img src={item.image_url} className="w-full h-full object-cover group-hover/related:scale-105 transition-transform duration-500 animate-fade-in" alt="" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-emerald-500/10 text-emerald-500">
                                  <BookOpen size={10} />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[7.5px] font-bold text-emerald-500 uppercase tracking-widest leading-none">{isRtl ? item.category_ar : item.category_en}</div>
                              <div className="text-[10px] font-bold text-slate-900 dark:text-white truncate transition-colors group-hover/related:text-emerald-500 dark:group-hover/related:text-emerald-400 mt-0.5 font-sans leading-none">
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
                    <span className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[8.5px] font-black tracking-wider uppercase px-2 py-0.5 rounded">
                      {isRtl ? selectedArticle.category_ar : selectedArticle.category_en}
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest">
                      {isRtl ? 'تحليلات مستقلة عالية الدقة' : 'PERPLEXTA INDEPENDENT INTEL'}
                    </span>
                  </div>
                  
                  <h1 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-slate-900 dark:text-white font-sans leading-tight select-text">
                    {isRtl ? selectedArticle.title_ar : selectedArticle.title_en}
                  </h1>
                </div>

                {/* Scrollable Container for paragraphs Content & Discussions */}
                <div className="flex-1 overflow-y-auto scrollbar-none pr-1 pb-12 space-y-4">
                  {/* Content Panel */}
                  <div className={`p-6 rounded-xl border ${isThemeDark ? 'bg-zinc-950/40 border-white/5' : 'bg-white border-gray-150/80'} shadow-md`}>
                    {/* Body Text */}
                    <div className="text-slate-800 dark:text-zinc-200 font-sans tracking-wide leading-relaxed space-y-4 select-text text-justify overflow-hidden font-medium text-xs sm:text-sm">
                      {(isRtl ? selectedArticle.content_ar : selectedArticle.content_en).split('\n').map((paragraph, idx) => (
                        paragraph.trim() ? (
                          <p key={idx} className="whitespace-pre-wrap leading-7 text-[13px] sm:text-[14px]">
                            {paragraph}
                          </p>
                        ) : (
                          <div key={idx} className="h-3" />
                        )
                      ))}
                    </div>
                  </div>

                  {/* Discussions Hub */}
                  <section className={`p-6 rounded-xl border ${isThemeDark ? 'bg-zinc-950/40 border-white/5' : 'bg-white border-gray-150/80'} shadow-md`}>
                    <h3 className="text-xs sm:text-sm font-black tracking-tight text-slate-900 dark:text-white mb-5 flex items-center gap-2 select-none border-b border-slate-100 dark:border-white/5 pb-2.5">
                      <MessageSquare size={16} className="text-emerald-400 font-sans" />
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
                          className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-emerald-500/35 focus:border-emerald-500 rounded-lg p-3 text-xs leading-relaxed tracking-wide placeholder-slate-400 dark:placeholder-zinc-600 outline-none resize-none transition-theme font-sans font-medium"
                        />
                        <div className="flex justify-between items-center mt-1.5">
                          <span className="text-[8.5px] font-mono text-slate-400 dark:text-zinc-500">{1000 - newComment.length} {isRtl ? 'رمز متبقي' : 'characters left'}</span>
                          <button
                            type="submit"
                            disabled={submittingComment || !newComment.trim()}
                            className="flex items-center gap-1 px-3 h-8 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 font-bold text-white text-xs transition-theme shadow-sm uppercase shrink-0 cursor-pointer"
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
                      <div className="mb-5 p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-center select-none">
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed font-sans font-medium">
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
                          <div key={i} className="flex gap-3 p-3 border-b border-slate-100 dark:border-white/5">
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
                            key={comment.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            style={{ contentVisibility: 'auto' }}
                            className="group/item flex gap-2.5 p-3.5 bg-slate-50/50 dark:bg-zinc-950/30 border border-slate-100 dark:border-white/5 rounded-xl hover:border-emerald-500/10 transition-all duration-300"
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
                                    <span className="text-[7.5px] tracking-wide font-black uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/15 px-1 py-0.5 rounded-[2px] select-none">{isRtl ? 'إشراف' : 'Staff'}</span>
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
          </motion.div>
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
                  className="flex items-center justify-center gap-2 h-11 bg-[#0f1419] text-white hover:opacity-90 rounded-[4px] text-xs font-black transition-all duration-300 cursor-pointer text-center"
                >
                  <span>X / Twitter</span>
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-11 bg-[#0077b5] text-white hover:opacity-90 rounded-[4px] text-xs font-black transition-all duration-300 cursor-pointer text-center"
                >
                  <span>LinkedIn</span>
                </a>
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent((isRtl ? selectedArticle.title_ar : selectedArticle.title_en) + ' ' + window.location.href)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-11 bg-[#25d366] text-white hover:opacity-90 rounded-[4px] text-xs font-black transition-all duration-300 cursor-pointer text-center"
                >
                  <span>WhatsApp</span>
                </a>
                <a
                  href={`https://telegram.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(isRtl ? selectedArticle.title_ar : selectedArticle.title_en)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 h-11 bg-[#0088cc] text-white hover:opacity-90 rounded-[4px] text-xs font-black transition-all duration-300 cursor-pointer text-center"
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
                    className="px-3 bg-emerald-500 text-white font-bold text-xs flex items-center justify-center cursor-pointer font-sans"
                  >
                    {copiedSlug === selectedArticle.slug ? <Check size={14} /> : <Link size={14} />}
                  </button>
                </div>
                {copiedSlug === selectedArticle.slug && (
                  <p className="text-[10px] font-mono text-emerald-500">{isRtl ? 'تم نسخ الرابط المباشر بنجاح!' : 'Report link copied successfully!'}</p>
                )}
              </div>

              <button
                onClick={() => setIsShareOpen(false)}
                className="mt-4 w-full h-10 bg-[var(--bg-base)] hover:bg-[var(--bg-secondary)] border border-[var(--border-main)] text-xs text-[var(--text-primary)] font-black rounded-[4px] transition-all duration-300 cursor-pointer font-sans"
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
              <div className="flex items-center justify-between pb-4 border-b border-gray-150/10 dark:border-white/5 mb-6">
                <span className="text-xs font-black tracking-wider uppercase">
                  {isRtl ? 'خيارات التصفية والترتيب' : 'Filters & Sorting'}
                </span>
                <button
                  onClick={() => setIsMobileSidebarOpen(false)}
                  className={`w-8 h-8 rounded-[4px] flex items-center justify-center border transition-all ${
                    isThemeDark ? 'bg-white/5 border-white/10 text-gray-400' : 'bg-gray-50 border-gray-250 text-gray-700'
                  }`}
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
                    {categories.map((cat) => {
                      const isSelected = selectedCategory === cat.id;
                      const iconCol = categoryColors[cat.id] || '#10b981';
                      return (
                        <div
                          key={cat.id}
                          onClick={() => {
                            setSelectedCategory(cat.id);
                            setIsMobileSidebarOpen(false);
                          }}
                          className={`flex items-center justify-between rounded px-3 py-2 text-[11px] font-black cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-emerald-500/10 text-emerald-400 border-r-2 border-emerald-500'
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
                    ].map((item) => (
                      <label
                        key={item.val}
                        className={`flex items-center gap-2.5 text-[11px] font-bold cursor-pointer transition-colors ${
                          sortBy === item.val
                            ? 'text-emerald-500'
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
                          className="accent-emerald-500 w-3.5 h-3.5 cursor-pointer"
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
      <footer className={`p-4 border-t text-[10px] select-none flex-shrink-0 ${
        isThemeDark ? 'bg-[#080808] border-white/5 text-gray-500' : 'bg-gray-50 border-gray-150 text-gray-600'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-right">
          <span className="font-sans font-black tracking-widest text-[9px] uppercase">
            PERPLEXTA PLATFORM INSIGHTS SYSTEM
          </span>
          <span>
            {language === 'ar' ? 'الموقع محفوظ لـ PERPLEXTA 2026 ©' : 'All Sovereignties Reserved PERPLEXTA 2026 ©'}
          </span>
        </div>
      </footer>
      </div>
    </div>
  );
};
