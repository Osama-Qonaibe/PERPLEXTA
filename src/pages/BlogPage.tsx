import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { Clock, Eye, MessageSquare, Plus, ArrowLeft, Trash2, Send, Calendar, User, BookOpen, Star, Share2, Link, Check, Heart, MessageCircle, Search } from 'lucide-react';
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
  const { language, token, user, t } = useAppContext();
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

  // Search & Categories States
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Categories helper list for the blog interface
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

  return (
    <div className="w-full max-w-7xl mx-auto px-8 sm:px-4 md:px-6 pb-12 pt-0" dir={isRtl ? 'rtl' : 'ltr'}>
      <AnimatePresence mode="wait">
        {!selectedArticle ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.3 }}
          >
            {/* Sticky Header: Contains Title, Description, Search, and Category scroll */}
            <div className="sticky top-0 md:top-16 z-[39] bg-[var(--bg-base)]/95 backdrop-blur-md pt-2.5 md:pt-5 pb-1.5 md:pb-3 border-b border-gray-200/50 dark:border-gray-800/60 mb-3 md:mb-6 -mx-8 sm:-mx-4 md:-mx-6 px-8 sm:px-4 md:px-6 select-none transition-all duration-300">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 md:gap-3 mb-2 md:mb-3.5">
                {/* Title and Description */}
                <div>
                  <h1 className="text-[15px] md:text-2xl font-black font-sans tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 flex items-center gap-1.5 md:gap-2">
                    <BookOpen size={16} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0 md:size-[20px]" />
                    {isRtl ? 'المقالات والأخبار' : 'Articles & News'}
                  </h1>
                  <p className="text-[9px] md:text-[10px] sm:text-xs text-gray-450 mt-0.5 leading-relaxed font-sans font-medium">
                    {isRtl 
                      ? 'رؤى وتحليلات حصرية يقدمها كبار خبراء استخبارات السوق والبيانات المالية.' 
                      : 'Exclusive insights and analytics prepared by senior researchers and financial analysts.'}
                  </p>
                </div>

                {/* Search Bar & Counter */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 md:gap-2.5 w-full lg:w-auto">
                  {/* Search query input */}
                  <div className="relative w-full sm:w-64 md:w-72">
                    <span className={`absolute inset-y-0 ${isRtl ? 'left-3' : 'right-3'} flex items-center pointer-events-none text-gray-500`}>
                      <Search size={12} />
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={isRtl ? 'ابحث عن المقالات والأبحاث...' : 'Search articles & research...'}
                      className={`w-full h-8.5 bg-transparent border border-gray-200 dark:border-gray-800 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/15 rounded-[4px] text-[11px] font-sans font-medium text-gray-900 dark:text-white placeholder-gray-500 outline-none transition-all duration-300 ${isRtl ? 'pl-4 pr-9' : 'pr-4 pl-9'}`}
                    />
                  </div>
                  {/* Stats badge wrapper */}
                  <div className="flex items-center gap-1 text-[10px] font-mono text-gray-400 font-bold bg-emerald-500/5 border border-emerald-500/10 px-2.5 h-8.5 rounded-[4px] shrink-0 justify-center">
                    <span>{isRtl ? 'المطابقة:' : 'Matching:'}</span>
                    <span className="text-emerald-400">{filteredArticles.length}</span>
                  </div>
                </div>
              </div>

              {/* Category Filter Scroll Row */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 md:py-1.5 border-t border-gray-200/50 dark:border-gray-800/60">
                <span className="text-[9px] font-mono font-bold text-gray-550 dark:text-gray-500 uppercase tracking-widest shrink-0 ml-1">
                  {isRtl ? 'التصنيف:' : 'Category:'}
                </span>
                <div className="flex gap-1 overflow-x-auto scrollbar-none">
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`h-7 md:h-8 px-2.5 md:px-3 rounded-[4px] text-[10px] md:text-[11px] font-bold font-sans transition-all duration-300 pointer-events-auto border whitespace-nowrap cursor-pointer ${
                          isSelected
                            ? 'text-emerald-500 border-emerald-500/25 bg-emerald-500/10 hover:text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)] font-sans font-black'
                            : 'bg-transparent border-transparent text-gray-500 dark:text-gray-455 hover:bg-gray-100 dark:hover:bg-gray-800/40 hover:text-gray-900 dark:hover:text-white font-sans font-medium'
                        }`}
                      >
                        {isRtl ? cat.labelAr : cat.labelEn}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex flex-row sm:flex-col bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg p-3 sm:p-4 animate-pulse h-36 sm:h-96 justify-between items-stretch">
                    <div className="bg-gray-200/10 dark:bg-gray-800/10 rounded-sm h-full sm:h-48 w-[35%] sm:w-full shrink-0"></div>
                    <div className="flex-1 flex flex-col justify-between ms-3 sm:ms-0 mt-0 sm:mt-4">
                      <div>
                        <div className="h-4 sm:h-6 bg-gray-200/10 dark:bg-gray-800/10 rounded-sm w-3/4 mb-2 animate-pulse"></div>
                        <div className="h-3 sm:h-4 bg-gray-200/10 dark:bg-gray-800/10 rounded-sm w-full animate-pulse"></div>
                      </div>
                      <div className="flex justify-between items-center sm:mt-4">
                        <div className="h-6 w-6 rounded-full bg-gray-200/10 dark:bg-gray-800/10 animate-pulse"></div>
                        <div className="h-3 w-10 bg-gray-200/10 dark:bg-gray-800/10 rounded-sm animate-pulse"></div>
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
            ) : filteredArticles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {filteredArticles.map((article, index) => (
                  <motion.article
                    key={article.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex flex-row sm:flex-col bg-[var(--bg-secondary)] border border-[var(--border-main)] hover:border-emerald-500/30 rounded-lg overflow-hidden transition-all duration-300 group hover:shadow-[0_0_25px_rgba(0,0,0,0.15)] cursor-pointer"
                    onClick={() => handleSelectArticle(article)}
                  >
                    {/* Cover image wrap */}
                    <div className="w-[35%] sm:w-full aspect-[4/3] sm:aspect-square bg-[var(--bg-base)] overflow-hidden relative sm:border-b border-e sm:border-e-0 border-[var(--border-main)] transition-theme shrink-0">
                      {article.image_url ? (
                        <img
                          src={article.image_url}
                          alt={isRtl ? article.title_ar : article.title_en}
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-4">
                          <BookOpen size={30} className="text-emerald-500/30 mb-1 animate-pulse sm:size-[48px]" />
                          <span className="text-[8px] sm:text-[10px] text-center uppercase tracking-widest text-emerald-500 font-bold">{isRtl ? 'تحليلات' : 'Intelligence'}</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-black/70 backdrop-blur-[4px] border border-gray-100/10 text-white font-bold font-sans text-[8px] sm:text-[10px] px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-[4px] shadow-sm select-none">
                        {isRtl ? article.category_ar : article.category_en}
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono text-gray-500 dark:text-gray-400 mb-1 sm:mb-2">
                          <Calendar size={10} />
                          <span>{new Date(article.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</span>
                        </div>
                        <h2 className="text-xs sm:text-base font-black tracking-tight text-[var(--text-primary)] group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors duration-300 leading-snug line-clamp-2">
                          {isRtl ? article.title_ar : article.title_en}
                        </h2>
                        <p className="hidden sm:block text-[11px] sm:text-[11.5px] text-gray-550 dark:text-gray-400 mt-2 line-clamp-3 leading-relaxed font-sans font-medium text-right sm:text-justify select-text">
                          {isRtl ? article.content_ar.substring(0, 150) : article.content_en.substring(0, 150)}...
                        </p>
                        {/* On mobile, show a very short content crop or hide */}
                        <p className="sm:hidden text-[10px] text-gray-405 dark:text-gray-450 mt-1 line-clamp-2 leading-relaxed">
                          {isRtl ? article.content_ar.substring(0, 80) : article.content_en.substring(0, 80)}...
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2.5 sm:mt-5 sm:pt-4 border-t border-gray-100/5 dark:border-gray-800/25">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {article.author_avatar ? (
                            <img src={article.author_avatar} alt={article.author_name} className="w-4.5 h-4.5 sm:w-6 sm:h-6 rounded-full border border-[var(--border-main)] shrink-0" />
                          ) : (
                            <div className="w-4.5 h-4.5 sm:w-6 sm:h-6 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                              <User size={10} />
                            </div>
                          )}
                          <span className="text-[9px] sm:text-[11px] font-black tracking-tight text-gray-500 dark:text-gray-300 font-sans truncate max-w-[80px] sm:max-w-[120px]">{article.author_name}</span>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-3 text-[8.5px] sm:text-[10px] font-mono text-gray-550 dark:text-gray-455 select-none shrink-0">
                          <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                            <Star size={9} className="fill-[currentColor] sm:size-[11px]" />
                            <span>{article.avg_rating && Number(article.avg_rating) > 0 ? Number(article.avg_rating).toFixed(1) : '5.0'}</span>
                          </div>
                          <div className="flex items-center gap-0.5 pointer-events-none">
                            <Eye size={10} className="sm:size-[12px]" />
                            <span>{article.views}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center border border-dashed border-[var(--border-main)] rounded-lg max-w-xl mx-auto p-12 select-none">
                <BookOpen size={48} className="mx-auto text-gray-400 mb-3 grayscale opacity-40 animate-pulse" />
                <h3 className="font-bold text-sm tracking-tight mb-1 text-[var(--text-primary)]">
                  {isRtl ? 'لا توجد نتائج مطابقة لبحثك' : 'No matching articles found'}
                </h3>
                <p className="text-xs text-gray-450 leading-relaxed max-w-sm mx-auto">
                  {isRtl 
                    ? 'جرب استخدام كلمات مفتاحية أخرى أو غير تصفية الأقسام المحددة أعلاه.' 
                    : 'Try modifying your search keywords or switching to another category filter.'}
                </p>
                <button
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
          </motion.div>
        ) : (
          <motion.div
            key="article-detail"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className="max-w-4xl mx-auto"
          >
            {/* Back trigger */}
            <button
              onClick={handleBackToList}
              className="group flex items-center gap-1.5 text-xs font-black font-sans tracking-tight text-gray-500 hover:text-emerald-500 dark:hover:text-emerald-400 mb-6 transition-colors duration-300 cursor-pointer"
            >
              <ArrowLeft size={16} className={`group-hover:scale-110 transition-transform ${isRtl ? 'rotate-180' : ''}`} />
              {isRtl ? 'العودة إلى المقالات' : 'Back to Articles'}
            </button>

            {/* Main Article Details */}
            <article className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg overflow-hidden shadow-xl mb-8">
              {/* Cover picture */}
              {selectedArticle.image_url && (
                <div className="h-64 sm:h-96 w-full relative">
                  <img src={selectedArticle.image_url} alt={isRtl ? selectedArticle.title_ar : selectedArticle.title_en} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </div>
              )}

              <div className="p-6 md:p-8">
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-gray-100/5 dark:border-gray-800/25 pb-4 select-none">
                  <div className="flex items-center gap-2">
                    {selectedArticle.author_avatar ? (
                      <img src={selectedArticle.author_avatar} alt={selectedArticle.author_name} className="w-8 h-8 rounded-full border border-[var(--border-main)] shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center shrink-0">
                        <User size={15} />
                      </div>
                    )}
                    <div>
                      <div className="text-[12px] font-black text-gray-700 dark:text-gray-200">{selectedArticle.author_name}</div>
                      <div className="text-[8px] font-mono uppercase tracking-widest text-emerald-500 mt-0.5">{selectedArticle.author_role === 'admin' ? (isRtl ? 'إداري' : 'OFFICIAL REVIEW') : (isRtl ? 'كاتب' : 'ANALYST')}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] font-mono text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar size={12} />
                      <span>{new Date(selectedArticle.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye size={12} />
                      <span>{selectedArticle.views}</span>
                    </div>
                  </div>
                </div>

                {/* Categories badge */}
                <div className="mb-4 inline-block bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold tracking-wider font-mono uppercase px-3 py-1 rounded-[4px]">
                  {isRtl ? selectedArticle.category_ar : selectedArticle.category_en}
                </div>

                {/* Titles */}
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-[var(--text-primary)] leading-snug tracking-tight mb-8 select-text">
                  {isRtl ? selectedArticle.title_ar : selectedArticle.title_en}
                </h1>

                {/* Content */}
                <div className="text-sm sm:text-base text-gray-650 dark:text-gray-300 font-sans tracking-wide leading-relaxed space-y-6 select-text text-right sm:text-justify overflow-hidden">
                  {(isRtl ? selectedArticle.content_ar : selectedArticle.content_en).split('\n').map((paragraph, idx) => (
                    paragraph.trim() ? <p key={idx} className="whitespace-pre-wrap">{paragraph}</p> : <div key={idx} className="h-2" />
                  ))}
                </div>

                {/* Visual Interactivity Panel: Ratings & Sharing */}
                <div className="mt-10 pt-6 border-t border-gray-100/5 dark:border-gray-800/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  {/* Rating Display/Action */}
                  <div className="space-y-1.5 w-full sm:w-auto select-none">
                    <span className="block text-[10px] font-mono text-gray-500 uppercase tracking-widest">
                      {isRtl ? 'تقييم جودة المقال وتحليل المحتوى' : 'RATE ARTICLE QUALITY & METRIC ANALYTICS'}
                    </span>
                    <div className="flex items-center gap-3">
                      {/* Active hovering or static star panel */}
                      <div className="flex items-center gap-1">
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
                              className={`p-0.5 transition-all duration-300 ${!token ? 'opacity-50 cursor-not-allowed' : 'hover:scale-125 cursor-pointer'} ${isActive ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'text-gray-300/20 dark:text-gray-800'}`}
                            >
                              <Star size={18} className={isActive ? 'fill-[currentColor]' : ''} />
                            </button>
                          );
                        })}
                      </div>
                      <span className="text-xs font-black text-[var(--text-primary)]">
                        {selectedArticle.avg_rating && Number(selectedArticle.avg_rating) > 0 ? Number(selectedArticle.avg_rating).toFixed(1) : '5.0'} 
                        <span className="text-[10px] text-gray-550 font-sans font-medium ml-1">
                          ({selectedArticle.ratings_count || 1} {isRtl ? 'تقييم' : 'votes'})
                        </span>
                      </span>
                    </div>
                    {token && userRating > 0 && (
                      <p className="text-[9px] text-emerald-500 font-mono">
                        {isRtl ? `تم تسجيل تقييمك: ${userRating} من 5 نجوم` : `Your rating is registered: ${userRating} out of 5 Stars`}
                      </p>
                    )}
                    {!token && (
                      <p className="text-[9px] text-gray-500 font-mono">
                        {isRtl ? 'سجل الدخول للمشاركة في التقييم والتعليق' : 'Sign in to submit rating and comment'}
                      </p>
                    )}
                  </div>

                  {/* Share button Trigger */}
                  <div className="w-full sm:w-auto flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsShareOpen(true)}
                      className="w-full sm:w-auto h-10 px-5 flex items-center justify-center gap-2 border border-emerald-500/15 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-500 rounded-[4px] hover:drop-shadow-[0_0_12px_rgba(16,185,129,0.35)] transition-all duration-300 font-bold hover:text-emerald-450 text-xs shrink-0 cursor-pointer select-none"
                    >
                      <Share2 size={13} className="text-emerald-500" />
                      <span>{isRtl ? 'مشاركة ونشر المقال' : 'Share & Distribute Article'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>

            {/* Comments Area */}
            <section className="bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-lg p-6 md:p-8 shadow-lg">
              <h3 className="text-md sm:text-lg font-black tracking-tight text-[var(--text-primary)] mb-6 flex items-center gap-2">
                <MessageSquare size={18} className="text-emerald-400" />
                {isRtl ? 'المناقشات والتعليقات' : 'Article Debates & Comments'}
                <span className="text-xs text-gray-400 font-mono">({selectedArticle.comment_count || 0})</span>
              </h3>

              {/* Submit comment form for authenticated users */}
              {token ? (
                <form onSubmit={handleAddComment} className="mb-8 relative">
                  <textarea
                    rows={3}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={isRtl ? 'أضف تعليقك التحليلي هنا...' : 'Write your analytical comment here...'}
                    maxLength={1000}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-main)] text-[var(--text-primary)] hover:border-emerald-500/30 focus:border-emerald-500 rounded-sm p-4 text-xs sm:text-sm leading-relaxed tracking-wide placeholder-gray-500 outline-none resize-none transition-theme font-sans font-medium"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[9px] font-mono text-gray-405">{1000 - newComment.length} {isRtl ? 'رمز متبقي' : 'characters left'}</span>
                    <button
                      type="submit"
                      disabled={submittingComment || !newComment.trim()}
                      className="flex items-center gap-1.5 px-4 h-9 rounded-sm bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:hover:bg-emerald-500 font-bold text-white text-xs transition-theme shadow-md uppercase shrink-0 cursor-pointer"
                    >
                      {submittingComment ? (
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send size={12} className={isRtl ? 'rotate-180' : ''} />
                          <span>{isRtl ? 'إرسال التعليق' : 'Comment'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mb-8 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-sm text-center">
                  <p className="text-xs text-emerald-505 dark:text-emerald-400 leading-relaxed font-sans font-medium">
                    {isRtl 
                      ? 'يرجى تسجيل الدخول أو تفعيل الاشتراك للمشاركة بالتحليلات والتعليق على المقالات.' 
                      : 'Please login or check in to join the analytical discussions.'}
                  </p>
                </div>
              )}

              {/* Comments list */}
              {commentsLoading ? (
                <div className="space-y-4 animate-pulse">
                  {[1, 2].map(i => (
                    <div key={i} className="flex gap-4 p-4 border-b border-gray-100/5">
                      <div className="w-10 h-10 rounded-full bg-gray-250/20" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-250/20 rounded w-1/4" />
                        <div className="h-3 bg-gray-250/20 rounded w-3/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                  {comments.map((comment, index) => (
                    <motion.div
                      key={comment.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.04 }}
                      style={{ contentVisibility: 'auto' }}
                      className="group/item flex gap-3 p-4 bg-[var(--bg-primary)] border border-[var(--border-main)] rounded-sm hover:border-[var(--border-accent)] transition-all duration-300"
                    >
                      {comment.author_avatar ? (
                        <img src={comment.author_avatar} alt={comment.author_name} className="w-8 h-8 rounded-full border border-[var(--border-main)] shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-250/15 text-gray-400 flex items-center justify-center shrink-0">
                          <User size={14} />
                        </div>
                      )}

                      <div className="flex-1">
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-black text-[var(--text-primary)]">{comment.author_name}</span>
                            {comment.author_role === 'admin' && (
                              <span className="text-[8px] tracking-wide font-black uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/15 px-1.5 py-0.5 rounded-[3px] select-none">{isRtl ? 'إشراف' : 'Staff'}</span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2 select-none">
                            <span className="text-[9px] font-mono text-gray-500">{new Date(comment.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            {(user?.role === 'admin' || user?.id === comment.user_id) && (
                              <button
                                onClick={() => handleDeleteComment(comment.id)}
                                className="opacity-0 group-hover/item:opacity-100 transition-opacity p-1 text-gray-500 hover:text-rose-500 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] cursor-pointer"
                                title={isRtl ? 'حذف التعليق' : 'Delete Comment'}
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-[12px] text-gray-650 dark:text-gray-300 leading-relaxed font-sans font-medium text-justify select-text">
                          {comment.content}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="py-10 text-center text-gray-500 select-none">
                  <MessageSquare size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-sans font-medium">{isRtl ? 'لا توجد تعليقات بعد. شارك برأيك وكن أول المعلقين!' : 'No comments yet. Share your thoughts and start the debate!'}</p>
                </div>
              )}
            </section>
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
    </div>
  );
};
