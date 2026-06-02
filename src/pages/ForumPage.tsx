import React, { useState, useEffect } from 'react';
import { useAppContext } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, Pin, Lock, Eye, Trash2, Send, ArrowLeft, Plus, MessageCircle, 
  Calendar, User, UserCheck, ShieldCheck, Flag, ShieldAlert, BookOpen, AlertCircle,
  Cpu, TrendingUp, RefreshCw, Terminal, Globe, Activity, Code, Shield, Zap, Search, Layers, Filter, SlidersHorizontal,
  Laptop, Server, Briefcase, HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Category {
  id: number;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  icon: string;
  color: string;
  post_count: number;
  comment_count: number;
}

interface Post {
  id: number;
  category_id: number;
  user_id: number;
  author_name: string;
  author_avatar: string;
  author_role: string;
  title: string;
  content: string;
  is_pinned: boolean;
  is_locked: boolean;
  views: number;
  comment_count: number;
  created_at: string;
}

interface Comment {
  id: number;
  post_id: number;
  user_id: number;
  author_name: string;
  author_avatar: string;
  author_role: string;
  content: string;
  created_at: string;
}

export const ForumPage: React.FC = () => {
  const { language, token, user, theme } = useAppContext();
  const navigate = useNavigate();
  const isThemeDark = theme === 'dark';
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  
  // Input fields
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newComment, setNewComment] = useState('');

  // States
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postDetailLoading, setPostDetailLoading] = useState(false);
  const [submittingThread, setSubmittingThread] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  // Premium Custom states
  const [searchQuery, setSearchQuery] = useState('');
  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const [commentEditorTab, setCommentEditorTab] = useState<'write' | 'preview'>('write');
  const [reportedPosts, setReportedPosts] = useState<number[]>([]);
  const [reportedComments, setReportedComments] = useState<number[]>([]);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'info' | 'error'; textAr: string; textEn: string } | null>(null);

  // Trigger professional toast notifications
  const triggerToast = (textAr: string, textEn: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ type, textAr, textEn });
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // self-reporting flagging
  const handleReportPost = (postId: number) => {
    if (reportedPosts.includes(postId)) {
      triggerToast(
        'تم تسجيل بلاغك مسبقاً لهذا المنشور وهي قيد المراجعة الأمنية.',
        'This publication has already been reported and is under security review.'
      );
      return;
    }
    setReportedPosts(prev => [...prev, postId]);
    triggerToast(
      'نظام الحماية: تم تسجيل البلاغ بنجاح. سيقوم الذكاء الاصطناعي لفريق الرقابة بفحص المنشور والتحقق من سريّة خوارزميات السيرفر.',
      'Security Shield: Publication reported. AI automated sentinel will check this post for server code alignment and secrets.'
    );
  };

  const handleReportComment = (commentId: number) => {
    if (reportedComments.includes(commentId)) {
      triggerToast(
        'تم تسجيل بلاغك مسبقاً لهذا الرد.',
        'This reply has already been reported.'
      );
      return;
    }
    setReportedComments(prev => [...prev, commentId]);
    triggerToast(
      'نظام الحماية: تم تسجيل بلاغ الرد. سيتم تلقائياً فحص تلميحات الهندسة العكسية وحظر المستخدم المخالف.',
      'Security Shield: Reply reported. Server hints of reverse-engineering or hacking queries will trigger automated bans.'
    );
  };

  const getColorClasses = (colorName: string, active: boolean) => {
    const colorMap: Record<string, { text: string; bg: string; border: string; glow: string; textHover: string; bgHover: string; borderHover: string; activeText: string }> = {
      indigo: { 
        text: 'text-indigo-400', 
        bg: 'bg-indigo-500/10', 
        border: 'border-indigo-500/20', 
        glow: 'drop-shadow-[0_0_8px_rgba(99,102,241,0.6)]',
        textHover: 'text-indigo-400',
        bgHover: 'bg-indigo-500/5',
        borderHover: 'border-indigo-500/30',
        activeText: 'text-indigo-400'
      },
      emerald: { 
        text: 'text-emerald-400', 
        bg: 'bg-emerald-500/10', 
        border: 'border-emerald-500/20', 
        glow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]',
        textHover: 'text-emerald-400',
        bgHover: 'bg-emerald-500/5',
        borderHover: 'border-emerald-500/30',
        activeText: 'text-emerald-400'
      },
      rose: { 
        text: 'text-rose-400', 
        bg: 'bg-rose-500/10', 
        border: 'border-rose-500/20', 
        glow: 'drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]',
        textHover: 'text-rose-400',
        bgHover: 'bg-rose-500/5',
        borderHover: 'border-rose-500/30',
        activeText: 'text-rose-400'
      },
      amber: { 
        text: 'text-amber-400', 
        bg: 'bg-amber-500/10', 
        border: 'border-amber-500/20', 
        glow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]',
        textHover: 'text-amber-400',
        bgHover: 'bg-amber-500/5',
        borderHover: 'border-amber-500/30',
        activeText: 'text-amber-400'
      },
      violet: { 
        text: 'text-violet-400', 
        bg: 'bg-violet-500/10', 
        border: 'border-violet-500/20', 
        glow: 'drop-shadow-[0_0_8px_rgba(139,92,246,0.6)]',
        textHover: 'text-violet-400',
        bgHover: 'bg-violet-500/5',
        borderHover: 'border-violet-500/30',
        activeText: 'text-violet-400'
      },
      cyan: { 
        text: 'text-cyan-400', 
        bg: 'bg-cyan-500/10', 
        border: 'border-cyan-500/20', 
        glow: 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]',
        textHover: 'text-cyan-400',
        bgHover: 'bg-cyan-500/5',
        borderHover: 'border-cyan-500/30',
        activeText: 'text-cyan-400'
      },
    };

    return colorMap[colorName] || colorMap.indigo;
  };

  const renderCategoryIcon = (slug: string, active: boolean, size = 15, colorName = 'indigo') => {
    const config = getColorClasses(colorName, active);
    const baseClass = active 
      ? `${config.activeText} ${config.glow} transition-all duration-300`
      : `text-gray-400 group-hover:${config.textHover} group-hover:${config.glow} transition-all duration-300`;

    switch (slug) {
      case 'pioneers-devs-designers':
        return <Laptop size={size} className={baseClass} />;
      case 'prompt-engineering':
        return <Terminal size={size} className={baseClass} />;
      case 'troubleshooting':
        return <HelpCircle size={size} className={baseClass} />;
      case 'expertise-sharing':
        return <BookOpen size={size} className={baseClass} />;
      case 'our-works':
        return <Briefcase size={size} className={baseClass} />;
      case 'web-hosting':
        return <Server size={size} className={baseClass} />;
      default:
        return <MessageSquare size={size} className={baseClass} />;
    }
  };

  const isRtl = language === 'ar';

  // Category specific abstract patterns helper
  const getCategoryTheme = (slug: string, id: number) => {
    const term = slug?.toLowerCase() || '';
    if (term.includes('pioneer') || term.includes('dev') || term.includes('design') || id === 1) {
      return {
        icon: <Laptop size={20} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />,
        accentColor: 'text-emerald-500',
        glowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.12)]',
        bgAccent: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/15',
        online: 18,
        tags: ['Pioneers', 'React', 'Tailwind', 'Vector Art', 'Creative UI']
      };
    }
    if (term.includes('prompt') || term.includes('command') || term.includes('exec') || id === 2) {
      return {
        icon: <Terminal size={20} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />,
        accentColor: 'text-emerald-500',
        glowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.12)]',
        bgAccent: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/15',
        online: 26,
        tags: ['Prompt Engineering', 'AI commands', 'System Prompts', 'Automation']
      };
    }
    if (term.includes('trouble') || term.includes('error') || term.includes('bug') || id === 3) {
      return {
        icon: <HelpCircle size={20} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />,
        accentColor: 'text-emerald-500',
        glowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.12)]',
        bgAccent: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/15',
        online: 15,
        tags: ['Server Down', 'Debugging', 'Error logs', 'Bug fixes']
      };
    }
    if (term.includes('expert') || term.includes('share') || term.includes('know') || id === 4) {
      return {
        icon: <BookOpen size={20} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />,
        accentColor: 'text-emerald-500',
        glowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.12)]',
        bgAccent: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/15',
        online: 22,
        tags: ['Case Studies', 'Tech strategies', 'SEO Hacks', 'Data Science']
      };
    }
    if (term.includes('work') || term.includes('portfolio') || term.includes('show') || id === 5) {
      return {
        icon: <Briefcase size={20} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />,
        accentColor: 'text-emerald-500',
        glowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.12)]',
        bgAccent: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/15',
        online: 19,
        tags: ['Portfolio', 'UI Showcase', 'Code Snippets', 'Live Demos']
      };
    }
    if (term.includes('host') || term.includes('deploy') || term.includes('server') || id === 6) {
      return {
        icon: <Server size={20} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />,
        accentColor: 'text-emerald-500',
        glowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.12)]',
        bgAccent: 'bg-emerald-500/10',
        borderColor: 'border-emerald-500/15',
        online: 12,
        tags: ['Cloud VPS', 'DNS Routing', 'SSL Protection', 'Static Deploy']
      };
    }
    // Fallback default
    return {
      icon: <Activity size={20} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />,
      accentColor: 'text-emerald-500',
      glowColor: 'shadow-[0_0_20px_rgba(16,185,129,0.12)]',
      bgAccent: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/15',
      online: 11,
      tags: ['Strategy', 'Quantitative', 'Risk Management', 'Backtesting', 'Security']
    };
  };

  // Smart post-tag generator
  const getPostTags = (title: string, content: string, catSlug: string, catId: number) => {
    const combined = (title + ' ' + content).toLowerCase();
    const list: string[] = [];
    
    if (combined.includes('react') || combined.includes('next.js') || combined.includes('nextjs')) list.push('React');
    if (combined.includes('node') || combined.includes('express')) list.push('Node.js');
    if (combined.includes('python') || combined.includes('pandas') || combined.includes('numpy')) list.push('Python');
    if (combined.includes('postgres') || combined.includes('sql') || combined.includes('db')) list.push('Database');
    if (combined.includes('prompt') || combined.includes('system') || combined.includes('context')) list.push('Prompting');
    if (combined.includes('security') || combined.includes('hack') || combined.includes('protect') || combined.includes('key')) list.push('Security');
    if (combined.includes('api') || combined.includes('endpoint')) list.push('REST API');
    if (combined.includes('market') || combined.includes('strategy') || combined.includes('trading')) list.push('Strategy');
    if (combined.includes('traffic') || combined.includes('seo') || combined.includes('conversion')) list.push('Growth');
    
    if (list.length === 0) {
      const theme = getCategoryTheme(catSlug, catId);
      list.push(theme.tags[0]);
      list.push(theme.tags[1]);
    }
    
    return list.slice(0, 3);
  };

  // Live Markdown Preview parser
  const renderMarkdownPreview = (text: string) => {
    if (!text) {
      return (
        <p className="text-gray-500 italic text-xs py-4 text-center">
          {isRtl ? 'المعاينة الحية فارغة... ابدأ بكتابة موضوعك لرؤية التنسيق التلقائي.' : 'Live preview is empty... start writing your discussion to see dynamic formatting.'}
        </p>
      );
    }
    
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return (
      <div className="space-y-3 text-xs sm:text-sm text-gray-300 font-sans leading-relaxed text-right sm:text-justify max-h-[350px] overflow-y-auto pr-1">
        {parts.map((part, index) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            const rawCode = part.slice(3, -3).trim();
            const lines = rawCode.split('\n');
            let lang = '';
            let codeLines = rawCode;
            if (lines.length > 1 && /^[a-zA-Z0-9+#-]+$/.test(lines[0])) {
              lang = lines[0];
              codeLines = lines.slice(1).join('\n');
            }
            return (
              <div key={index} className="my-3 border border-emerald-500/10 rounded-sm overflow-hidden font-mono text-[11px] bg-[#0b0b0d]">
                <div className="bg-[#121215] border-b border-gray-800/60 px-3 py-1 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                  <span>{lang ? lang.toUpperCase() : 'SOURCE CODE'}</span>
                  <span className="text-emerald-500 drop-shadow-[0_0_6px_rgba(16,185,129,0.3)]">🛡️ SAFE SHIELD</span>
                </div>
                <pre className="p-3 overflow-x-auto text-emerald-400 leading-relaxed max-w-full text-left" dir="ltr">
                  <code>{codeLines}</code>
                </pre>
              </div>
            );
          }
          
          const lines = part.split('\n');
          return (
            <div key={index} className="space-y-2">
              {lines.map((line, lIdx) => {
                const trimmed = line.trim();
                if (trimmed.startsWith('# ')) {
                  return <h1 key={lIdx} className="text-base sm:text-lg font-black text-white border-b border-gray-800/15 pb-1 mt-3 mb-1">{trimmed.replace('# ', '')}</h1>;
                }
                if (trimmed.startsWith('## ')) {
                  return <h2 key={lIdx} className="text-sm sm:text-base font-black text-white mt-2 mb-1">{trimmed.replace('## ', '')}</h2>;
                }
                if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                  return (
                    <ul key={lIdx} className="list-disc list-inside text-gray-300 font-sans leading-relaxed space-y-1 my-1">
                      <li>{trimmed.substring(2)}</li>
                    </ul>
                  );
                }
                if (trimmed === '') {
                  return <div key={lIdx} className="h-2" />;
                }
                
                let renderText: React.ReactNode = trimmed;
                if (trimmed.includes('**')) {
                  const segs = trimmed.split('**');
                  renderText = segs.map((seg, sI) => sI % 2 === 1 ? <strong key={sI} className="font-extrabold text-[#10b981]">{seg}</strong> : seg);
                }
                
                return <p key={lIdx} className="leading-relaxed text-gray-300 font-sans">{renderText}</p>;
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // Fetch initial categories
  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/forum/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    handleSelectCategory(null);
  }, []);

  // Fetch posts under selected category
  const handleSelectCategory = async (cat: Category | null) => {
    setSelectedCategory(cat);
    setSelectedPost(null);
    setIsCreatingThread(false);
    setPostsLoading(true);
    try {
      const url = cat ? `/api/forum/categories/${cat.id}/posts` : '/api/forum/posts';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setPostsLoading(false);
    }
  };

  // Fetch specific post detailed
  const handleSelectPost = async (post: Post) => {
    setPostDetailLoading(true);
    try {
      const res = await fetch(`/api/forum/posts/${post.id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedPost(data.post);
        setComments(data.comments);
        // Refresh views count locally
        setPosts(prev => prev.map(p => p.id === data.post.id ? { ...p, views: data.post.views } : p));
      }
    } catch (err) {
      console.error('Failed to fetch post details:', err);
    } finally {
      setPostDetailLoading(false);
    }
  };

  // Submit new post thread to current category
  const handleSubmitThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedCategory || !newTitle.trim() || !newContent.trim()) return;
    setSubmittingThread(true);
    try {
      const res = await fetch('/api/forum/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          category_id: selectedCategory.id,
          title: newTitle.trim(),
          content: newContent.trim()
        })
      });
      if (res.ok) {
        const freshThread = await res.json();
        setPosts(prev => [freshThread, ...prev]);
        setNewTitle('');
        setNewContent('');
        setIsCreatingThread(false);
        // Refetch stats
        fetchCategories();
      }
    } catch (err) {
      console.error('Failed to submit post thread:', err);
    } finally {
      setSubmittingThread(false);
    }
  };

  // Submit comment reply on selected thread
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedPost || !newComment.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await fetch(`/api/forum/posts/${selectedPost.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newComment.trim() })
      });
      if (res.ok) {
        const freshComment = await res.json();
        setComments(prev => [...prev, freshComment]);
        setNewComment('');
        // Sync stats counts
        setSelectedPost(prev => prev ? { ...prev, comment_count: (prev.comment_count || 0) + 1 } : null);
        setPosts(prev => prev.map(p => p.id === selectedPost.id ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
        fetchCategories();
      }
    } catch (err) {
      console.error('Failed to add post comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  // Delete thread
  const handleDeletePost = async (postId: number) => {
    if (!token) return;
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من رغبتك بحذف هذا الموضوع نهائياً؟' : 'Are you sure you want to permanently delete this thread?')) return;
    try {
      const res = await fetch(`/api/forum/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setPosts(prev => prev.filter(p => p.id !== postId));
        setSelectedPost(null);
        fetchCategories();
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  // Delete comment
  const handleDeleteComment = async (commentId: number) => {
    if (!token) return;
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه التعليق؟' : 'Are you sure you want to delete this reply?')) return;
    try {
      const res = await fetch(`/api/forum/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        setSelectedPost(prev => prev ? { ...prev, comment_count: Math.max(0, (prev.comment_count || 0) - 1) } : null);
        setPosts(prev => prev.map(p => p.id === (selectedPost?.id || 0) ? { ...p, comment_count: Math.max(0, (p.comment_count || 0) - 1) } : p));
        fetchCategories();
      }
    } catch (err) {
      console.error('Failed to delete comment:', err);
    }
  };

  // Toggle Pinned
  const handleTogglePin = async (currPost: Post) => {
    if (!token || user?.role !== 'admin') return;
    try {
      const res = await fetch(`/api/forum/posts/${currPost.id}/pin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_pinned: !currPost.is_pinned })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedPost(prev => prev ? { ...prev, is_pinned: updated.is_pinned } : null);
        setPosts(prev => prev.map(p => p.id === currPost.id ? { ...p, is_pinned: updated.is_pinned } : p));
      }
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    }
  };

  // Toggle Locked
  const handleToggleLock = async (currPost: Post) => {
    if (!token || user?.role !== 'admin') return;
    try {
      const res = await fetch(`/api/forum/posts/${currPost.id}/lock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_locked: !currPost.is_locked })
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedPost(prev => prev ? { ...prev, is_locked: updated.is_locked } : null);
        setPosts(prev => prev.map(p => p.id === currPost.id ? { ...p, is_locked: updated.is_locked } : p));
      }
    } catch (err) {
      console.error('Failed to toggle lock:', err);
    }
  };

  return (
    <div
      className={`h-[calc(100vh-72px)] w-full flex flex-col overflow-hidden relative transition-colors duration-300 select-none pb-0 ${
        isThemeDark ? 'bg-[#0f0f11] text-white' : 'bg-[var(--bg-base)] text-gray-900'
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
          ? 'bg-[#131315]/95 shadow-black/80'
          : 'bg-white shadow-gray-200/50'
      }`}>
        {/* Toast Notification for self-reporting warnings */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[90%] bg-[#121215]/95 backdrop-blur border border-emerald-500/35 rounded-lg p-4 shadow-[0_0_30px_rgba(16,185,129,0.18)]"
            >
              <div className="flex gap-3 items-start">
                <ShieldCheck size={18} className="text-emerald-500 shrink-0 mt-0.5 drop-shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                <div>
                  <span className="block text-[10px] font-mono font-bold text-emerald-500 tracking-wider mb-0.5">
                    {isRtl ? 'حماية النظام الذكية' : 'PERPLEXTA SECURE SHIELD'}
                  </span>
                  <p className="text-xs text-gray-200 font-sans leading-relaxed font-semibold">
                    {isRtl ? toastMessage.textAr : toastMessage.textEn}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {!selectedPost && !isCreatingThread && (
            <motion.div
              key="forum-unified-hub"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              {/* Page Header */}
              <header className={`px-8 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 border-b relative select-none flex-shrink-0 ${
                isThemeDark ? 'border-gray-800/60 bg-[#131315]' : 'border-gray-200/80 bg-white'
              }`}>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                <div className="flex flex-row items-center justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h1 className="text-base sm:text-lg md:text-2xl font-black font-sans tracking-tight">
                      {isRtl ? (
                        <>
                          <span className="text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)] font-sans">مجتمع بيربليكستا </span>
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-500 drop-shadow-[0_0_12px_rgba(16,185,129,0.35)] font-sans">Perplexta Community </span>
                        </>
                      )}
                    </h1>
                    <p className={`text-[9px] md:text-xs font-semibold leading-relaxed ${
                      isThemeDark ? 'text-gray-400' : 'text-slate-600'
                    }`}>
                      {isRtl 
                        ? 'ملتقى تقني لمشاركة التجارب، مناقشة الأكواد وحلول البيانات، وبناء مجتمع معرفي متكامل' 
                        : 'A technical forum to share experiences, discuss code, address data solutions, and build an integrated system of knowledge.'}
                    </p>
                  </div>

                  {token && user && (
                    <button
                      type="button"
                      onClick={() => {
                        const defaultCat = categories[0] || null;
                        if (defaultCat) {
                          setSelectedCategory(defaultCat);
                          setIsCreatingThread(true);
                        } else {
                          triggerToast('لا يوجد قسم متوفر مضاف حالياً', 'No active category available');
                        }
                      }}
                      className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/18 text-emerald-400 border border-emerald-500/20 px-5 h-9 font-bold text-xs rounded-[4px] shadow-sm cursor-pointer hover:drop-shadow-[0_0_10px_rgba(16,185,129,0.3)] transition-all duration-300 font-sans shrink-0 hover:scale-[1.02]"
                    >
                      <Plus size={14} className="text-emerald-500" />
                      {isRtl ? 'إنشاء موضوع جديد' : 'New Discussion'}
                    </button>
                  )}
                </div>
              </header>

              {/* Sub-header Filter and Search bar - Unified with BlogPage/Marketplace */}
              <div className="px-8 sm:px-4 md:px-6 lg:px-8 py-3 flex-shrink-0">
                <div className={`p-2 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border ${
                  isThemeDark ? 'bg-[#1a1a1c] border-gray-800/60' : 'bg-[#fafafa] border-gray-200/80'
                }`}>
                  <div className="flex items-center gap-1 overflow-x-auto scrollbar-none px-1 py-0.5 flex-1 min-w-0">
                    <button
                      onClick={() => handleSelectCategory(null)}
                      className={`group px-3 py-1.5 rounded-[4px] text-xs font-bold whitespace-nowrap cursor-pointer transition-all duration-300 shrink-0 ${
                        selectedCategory === null
                          ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.25)] font-black'
                          : (isThemeDark ? 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/5' : 'text-gray-650 hover:text-emerald-500 hover:bg-emerald-500/5')
                      }`}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Layers size={13} className={`shrink-0 ${selectedCategory === null ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]'} transition-all duration-300`} />
                        <span>{isRtl ? 'جميع الأقسام' : 'All Categories'}</span>
                      </span>
                    </button>

                    {categories.map((cat) => {
                      const isSelected = selectedCategory?.id === cat.id;
                      const config = getColorClasses(cat.color, isSelected);
                      return (
                        <button
                          key={cat.id}
                          onClick={() => handleSelectCategory(cat)}
                          className={`group px-3 py-1.5 rounded-[4px] text-xs font-bold whitespace-nowrap cursor-pointer transition-all duration-300 shrink-0 ${
                            isSelected
                              ? `${config.bg} border ${config.border} ${config.text} ${config.glow} font-black`
                              : (isThemeDark ? 'text-gray-500 hover:text-emerald-400 hover:bg-emerald-500/5' : 'text-gray-650 hover:text-emerald-500 hover:bg-emerald-500/5')
                          }`}
                        >
                          <span className="inline-flex items-center gap-1.5">
                            <span className="shrink-0">{renderCategoryIcon(cat.slug, isSelected, 14, cat.color)}</span>
                            <span>{isRtl ? cat.name_ar : cat.name_en}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className={`flex items-center border rounded-[4px] px-2.5 py-1 w-full sm:w-28 md:w-32 lg:w-36 flex-shrink-0 transition-all ${
                    isThemeDark 
                      ? 'bg-[#000000]/40 border-gray-800/80 focus-within:border-emerald-500/35 focus-within:shadow-[0_0_12px_rgba(16,185,129,0.08)]' 
                      : 'bg-white border-gray-200 focus-within:border-emerald-500/35 focus-within:shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                  }`}>
                    <Search size={12} className="text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={isRtl ? 'ابحث...' : 'Search...'}
                      className={`flex-1 bg-transparent text-[11px] placeholder-gray-500 outline-none px-1.5 ${
                        isThemeDark ? 'text-white' : 'text-gray-800'
                      }`}
                    />
                    <div className="text-[9px] font-mono text-emerald-500 font-bold bg-emerald-500/5 px-1.5 py-0.5 rounded shrink-0 border border-emerald-500/10">
                      {posts.filter(p => !reportedPosts.includes(p.id)).filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.content.toLowerCase().includes(searchQuery.toLowerCase())).length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Flex Container for Persistent Sidebar + Feed */}
              <div className="flex flex-1 overflow-hidden">
                {/* Right/Left Sidebar for Navigation (swaps naturally based on dir="rtl" or "ltr") */}
                <aside className={`hidden lg:flex flex-col w-60 shrink-0 p-4 space-y-4 border-r border-l select-none overflow-hidden ${
                  isThemeDark ? 'bg-[#0a0a0c]/40 border-white/5' : 'bg-gray-50/50 border-gray-150'
                }`}>
                  <div className="flex-1 overflow-y-auto scrollbar-none pr-0.5 pb-2">
                    <div className="text-[9px] font-black uppercase tracking-wider text-gray-450 px-1 mb-3">
                      {isRtl ? 'جميع الأقسام' : 'ALL DEPARTMENTS'}
                    </div>

                    <div className="space-y-3.5">
                      <div
                        onClick={() => handleSelectCategory(null)}
                        className={`group flex items-center justify-between rounded-[4px] px-3.5 py-2.5 text-xs font-semibold cursor-pointer transition-all duration-300 border ${
                          selectedCategory === null
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 drop-shadow-[0_0_8px_rgba(16,185,129,0.15)] shadow-sm font-black'
                            : (isThemeDark 
                                ? 'bg-transparent border-transparent hover:border-emerald-500/10 hover:bg-emerald-500/5 text-gray-400' 
                                : 'bg-transparent border-transparent hover:border-emerald-500/10 hover:bg-emerald-500/5 text-slate-650')
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Layers size={14} className={`shrink-0 ${selectedCategory === null ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'text-gray-400 group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]'} transition-all duration-300`} />
                          <span className="truncate">{isRtl ? 'جميع الأقسام' : 'All Categories'}</span>
                        </span>
                      </div>

                      {categories.map((cat) => {
                        const isSelected = selectedCategory?.id === cat.id;
                        const config = getColorClasses(cat.color, isSelected);
                        return (
                          <div
                            key={cat.id}
                            onClick={() => handleSelectCategory(cat)}
                            className={`group flex items-center justify-between rounded-[4px] px-3.5 py-2.5 text-xs font-semibold cursor-pointer transition-all duration-330 border ${
                              isSelected
                                ? `${config.bg} ${config.text} ${config.border} ${config.glow} shadow-sm font-black`
                                : (isThemeDark 
                                    ? 'bg-transparent border-transparent hover:border-emerald-500/10 hover:bg-emerald-500/5 text-gray-400' 
                                    : 'bg-transparent border-transparent hover:border-emerald-500/10 hover:bg-emerald-500/5 text-slate-655')
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate font-medium">
                              <span className="shrink-0">{renderCategoryIcon(cat.slug, isSelected, 14, cat.color)}</span>
                              <span className="truncate">{isRtl ? cat.name_ar : cat.name_en}</span>
                            </span>
                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded shrink-0 border transition-all duration-330 ${
                              isSelected 
                                ? `${config.text} ${config.border} ${config.bg} ${config.glow}` 
                                : 'text-gray-400 border-transparent bg-emerald-500/5 group-hover:text-emerald-400 group-hover:border-emerald-500/10 group-hover:bg-emerald-500/5'
                            }`}>
                              {cat.post_count}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </aside>

                {/* Central posts / threads display feed stream */}
                <main className="flex-1 p-6 md:p-8 overflow-y-auto scrollbar-none space-y-6">
                  {postsLoading ? (
                    <div className="space-y-4 animate-pulse">
                      {[1, 2, 3].map(i => (
                        <div key={i} className={`p-5 h-28 border rounded-lg ${isThemeDark ? 'bg-[#1a1a1c] border-white/5' : 'bg-gray-50 border-gray-200'}`} />
                      ))}
                    </div>
                  ) : (() => {
                    const activePosts = posts.filter(p => !reportedPosts.includes(p.id));
                    const filtered = activePosts.filter(p => 
                      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      p.content.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    if (activePosts.length === 0) {
                      return (
                        <div className={`py-12 md:py-16 px-6 md:px-10 border rounded-2xl max-w-2xl mx-auto select-none flex flex-col items-center justify-center text-center transition-all duration-300 ${
                          isThemeDark 
                            ? 'bg-[#151518] border-gray-800/60 shadow-[0_4px_30px_rgba(0,0,0,0.4)]' 
                            : 'bg-white border-gray-200 shadow-[0_4px_24px_rgba(0,0,0,0.04)]'
                        }`}>
                          <div className="relative mb-5">
                            <div className="absolute inset-0 bg-emerald-500/10 blur-xl rounded-full" />
                            <div className={`relative w-14 h-14 rounded-full flex items-center justify-center border transition-transform duration-500 hover:scale-105 ${
                              isThemeDark ? 'bg-[#1e1e21] border-gray-800' : 'bg-slate-50 border-gray-200'
                            }`}>
                              <MessageSquare size={28} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                            </div>
                          </div>
                          
                          <h3 className={`text-base md:text-lg font-black tracking-tight mb-2 font-sans ${
                            isThemeDark ? 'text-white' : 'text-slate-900'
                          }`}>
                            {isRtl ? 'نأسف لإزعاجكم' : 'We Apologize for the Inconvenience'}
                          </h3>
                          
                          <p className={`text-xs md:text-sm leading-relaxed max-w-lg mb-6 font-sans font-medium ${
                            isThemeDark ? 'text-gray-400' : 'text-slate-600'
                          }`}>
                            {isRtl 
                              ? 'منتدى بيربليكستا قيد التطوير والتحضير الفني حالياً، وسيكون متاحاً للجميع لمشاركة الخبرات البرمجية ومختلف نقاشات السوق والبيانات في أقرب وقت.'
                              : 'Perplexta Forum is currently undergoing technical preparation and build-out. It will be available for everyone to exchange expertise, code, market strategies, and datasets in the near future.'
                            }
                          </p>
                          
                          <div className={`w-full max-w-md h-px my-4 ${
                            isThemeDark ? 'bg-gray-800/60' : 'bg-gray-200/80'
                          }`} />
                          
                          <span className={`text-[10px] md:text-xs font-bold mb-4 uppercase tracking-wider block font-sans ${
                            isThemeDark ? 'text-emerald-400' : 'text-emerald-600'
                          }`}>
                            {isRtl ? 'استكشف الميزات والأقسام التقنية النشطة حالياً' : 'Explore currently active technical sections'}
                          </span>
                          
                          {/* Section Navigation grid layout */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl mt-1">
                            {/* Chat Button */}
                            <button
                              onClick={() => navigate('/')}
                              className={`flex items-center gap-3 p-3 rounded-md border text-right transition-all duration-300 hover:scale-[1.01] hover:shadow-sm cursor-pointer ${
                                isThemeDark 
                                  ? 'bg-[#1a1a1c] border-gray-800/60 hover:border-emerald-500/30 text-white' 
                                  : 'bg-slate-50/50 border-gray-200 hover:border-emerald-500/30 text-slate-800'
                              }`}
                            >
                              <div className={`p-1.5 rounded-[4px] flex-shrink-0 ${
                                isThemeDark ? 'bg-gray-800 text-emerald-400' : 'bg-slate-100 text-emerald-600'
                              }`}>
                                <Terminal size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-black leading-tight truncate">
                                  {isRtl ? 'المحادثة والذكاء الاصطناعي' : 'AI Assistant Chat'}
                                </h4>
                                <p className="text-[9px] text-gray-500 truncate mt-0.5">
                                  {isRtl ? 'بيئة المحادثة والتحليلات المتكاملة' : 'Integrated analytical workspace'}
                                </p>
                              </div>
                            </button>

                            {/* Marketplace Button */}
                            <button
                              onClick={() => navigate('/marketplace')}
                              className={`flex items-center gap-3 p-3 rounded-md border text-right transition-all duration-300 hover:scale-[1.01] hover:shadow-sm cursor-pointer ${
                                isThemeDark 
                                  ? 'bg-[#1a1a1c] border-gray-800/60 hover:border-emerald-500/30 text-white' 
                                  : 'bg-slate-50/50 border-gray-200 hover:border-emerald-500/30 text-slate-800'
                              }`}
                            >
                              <div className={`p-1.5 rounded-[4px] flex-shrink-0 ${
                                isThemeDark ? 'bg-gray-800 text-emerald-400' : 'bg-slate-100 text-emerald-600'
                              }`}>
                                <Cpu size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-black leading-tight truncate">
                                  {isRtl ? 'متجر الحلول والبيانات' : 'Solutions Marketplace'}
                                </h4>
                                <p className="text-[9px] text-gray-500 truncate mt-0.5">
                                  {isRtl ? 'تطبيقات برمجية وحزم بيانات مخصصة' : 'Engineered trading tools & datasets'}
                                </p>
                              </div>
                            </button>

                            {/* Blog Button */}
                            <button
                              onClick={() => navigate('/blog')}
                              className={`flex items-center gap-3 p-3 rounded-md border text-right transition-all duration-300 hover:scale-[1.01] hover:shadow-sm cursor-pointer ${
                                isThemeDark 
                                  ? 'bg-[#1a1a1c] border-gray-800/60 hover:border-emerald-500/30 text-white' 
                                  : 'bg-slate-50/50 border-gray-200 hover:border-emerald-500/30 text-slate-800'
                              }`}
                            >
                              <div className={`p-1.5 rounded-[4px] flex-shrink-0 ${
                                isThemeDark ? 'bg-gray-800 text-emerald-400' : 'bg-slate-100 text-emerald-600'
                              }`}>
                                <BookOpen size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-black leading-tight truncate">
                                  {isRtl ? 'أبحاث بيربليكستا الفنية' : 'Perplexta Tech Blog'}
                                </h4>
                                <p className="text-[9px] text-gray-500 truncate mt-0.5">
                                  {isRtl ? 'دراسات حالة وتحليلات عميقة للمطورين' : 'Deep quant & engineering research'}
                                </p>
                              </div>
                            </button>

                            {/* Subscription Button */}
                            <button
                              onClick={() => navigate('/subscription')}
                              className={`flex items-center gap-3 p-3 rounded-md border text-right transition-all duration-300 hover:scale-[1.01] hover:shadow-sm cursor-pointer ${
                                isThemeDark 
                                  ? 'bg-[#1a1a1c] border-gray-800/60 hover:border-emerald-500/30 text-white' 
                                  : 'bg-slate-50/50 border-gray-200 hover:border-emerald-500/30 text-slate-800'
                              }`}
                            >
                              <div className={`p-1.5 rounded-[4px] flex-shrink-0 ${
                                isThemeDark ? 'bg-gray-800 text-emerald-400' : 'bg-slate-100 text-emerald-600'
                              }`}>
                                <Zap size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-black leading-tight truncate">
                                  {isRtl ? 'باقات الاشتراك والترقية' : 'Premium VIP Plans'}
                                </h4>
                                <p className="text-[9px] text-gray-500 truncate mt-0.5">
                                  {isRtl ? 'الوصول الكامل إلى نماذج النخبة الذكية' : 'Unlock full enterprise tools'}
                                </p>
                              </div>
                            </button>

                            {/* Rewards Button */}
                            <button
                              onClick={() => navigate('/rewards')}
                              className={`flex items-center gap-3 p-3 sm:col-span-2 rounded-md border text-right sm:text-center transition-all duration-300 hover:scale-[1.01] hover:shadow-sm cursor-pointer ${
                                isThemeDark 
                                  ? 'bg-[#1a1a1c] border-gray-800/60 hover:border-emerald-500/30 text-white' 
                                  : 'bg-slate-50/50 border-gray-200 hover:border-emerald-500/30 text-slate-800'
                              }`}
                            >
                              <div className={`p-1.5 rounded-[4px] flex-shrink-0 ${
                                isThemeDark ? 'bg-gray-800 text-emerald-400' : 'bg-slate-100 text-emerald-600'
                              }`}>
                                <UserCheck size={16} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-black leading-tight truncate">
                                  {isRtl ? 'التحقق والمكافآت (KYC)' : 'KYC Verification & Rewards'}
                                </h4>
                                <p className="text-[9px] text-gray-500 truncate mt-0.5">
                                  {isRtl ? 'توثيق العضوية وربح الرصيد وتتبع المهام' : 'Verify credentials and earn system credit'}
                                </p>
                              </div>
                            </button>
                          </div>
                        </div>
                      );
                    }

                    if (filtered.length === 0) {
                      return (
                        <div className="py-16 text-center border border-dashed border-gray-800 p-8 rounded-lg max-w-xl mx-auto select-none">
                          <Search size={36} className="mx-auto text-gray-500 mb-3" />
                          <h3 className="font-bold text-sm tracking-tight mb-1 text-white">{isRtl ? 'لا توجد نتائج بحث مطابقة' : 'No matching results found'}</h3>
                          <p className="text-xs text-gray-400 leading-relaxed max-w-sm mx-auto">{isRtl ? 'جرب البحث بكلمة مفتاحية مختلفة.' : 'Try scanning with a different terminology or filter query.'}</p>
                          <button
                            onClick={() => setSearchQuery('')}
                            className="mt-4 px-4 h-8 bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 rounded-[4px] text-[11px] font-bold cursor-pointer"
                          >
                            {isRtl ? 'إعادة ضبط البحث' : 'Clear search query'}
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {filtered.map((post, idx) => {
                          const postTags = getPostTags(
                            post.title, 
                            post.content, 
                            categories.find(c => c.id === post.category_id)?.slug || '', 
                            post.category_id
                          );
                          return (
                            <motion.div
                              key={post.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.04 }}
                              className={`p-5 border rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-[0_0_20px_rgba(16,185,129,0.03)] group transition-all duration-300 ${
                                isThemeDark ? 'bg-[#1a1a1c] border-gray-850 hover:border-emerald-500/35' : 'bg-[#fafafa] border-gray-200 hover:border-emerald-500/30'
                              }`}
                            >
                              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleSelectPost(post)}>
                                <div className="flex flex-wrap items-center gap-2 mb-2 select-none">
                                  {post.is_pinned && (
                                    <span className="flex items-center gap-0.5 text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-1.5 py-0.5 rounded-[3px]">
                                      <Pin size={8} />
                                      {isRtl ? 'مثبت' : 'Pinned'}
                                    </span>
                                  )}
                                  {post.is_locked && (
                                    <span className="flex items-center gap-0.5 text-[8px] font-black uppercase text-rose-450 bg-rose-500/10 border border-rose-500/15 px-1.5 py-0.5 rounded-[3px]">
                                      <Lock size={8} />
                                      {isRtl ? 'مغلق' : 'Locked'}
                                    </span>
                                  )}
                                  <span className="text-[9px] text-gray-500 font-mono flex items-center gap-1">
                                    <Calendar size={10} />
                                    {new Date(post.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}
                                  </span>
                                </div>

                                <h2 className={`text-sm font-black font-sans tracking-tight leading-snug truncate group-hover:text-emerald-400 transition-colors ${
                                  isThemeDark ? 'text-white' : 'text-gray-900'
                                }`}>
                                  {post.title}
                                </h2>
                                <p className={`text-[11px] mt-1 lines-clamp-2 select-text text-justify overflow-hidden leading-relaxed ${
                                  isThemeDark ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                  {post.content.slice(0, 180)}
                                  {post.content.length > 180 ? '...' : ''}
                                </p>

                                {/* Smart tags section */}
                                <div className="flex flex-wrap gap-1.5 mt-3 select-none">
                                  {postTags.map((tag, tagIdx) => (
                                    <span 
                                      key={tagIdx} 
                                      className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-[3px] bg-emerald-500/5 text-emerald-400/90 border border-emerald-500/10"
                                    >
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Author Metadata Column */}
                              <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto border-t border-gray-800/40 md:border-t-0 pt-3 md:pt-0 shrink-0">
                                {/* Compact author tag */}
                                <div className="flex items-center gap-2 select-none">
                                  {post.author_avatar ? (
                                    <img src={post.author_avatar} alt={post.author_name} className="w-6 h-6 rounded-full border border-gray-800 shrink-0" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-[9px] font-black tracking-widest shrink-0">
                                      {post.author_name[0].toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <span className={`block text-[11px] font-bold max-w-[80px] truncate leading-tight ${isThemeDark ? 'text-gray-300' : 'text-gray-800'}`}>{post.author_name}</span>
                                    <span className="text-[8px] text-emerald-500 font-mono tracking-wider">{post.author_role === 'admin' ? (isRtl ? 'مشرف' : 'Staff') : (isRtl ? 'عضو' : 'Peer')}</span>
                                  </div>
                                </div>

                                {/* Thread statistics */}
                                <div className="flex items-center gap-3 text-[10px] font-mono text-gray-500 select-none">
                                  <span className="flex items-center gap-1" title={isRtl ? 'المشاهدات' : 'Views'}>
                                    <Eye size={12} />
                                    {post.views}
                                  </span>
                                  <span className="flex items-center gap-1" title={isRtl ? 'الردود' : 'Replies'}>
                                    <MessageCircle size={12} />
                                    {post.comment_count}
                                  </span>
                                </div>

                                {/* Security reporting button */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReportPost(post.id);
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-rose-500 transition-colors cursor-pointer"
                                  title={isRtl ? 'إبلاغ عن محتوى معارض للسياسات أو تسريب برمجي' : 'Flag publication for server safety audit'}
                                >
                                  <Flag size={13} />
                                </button>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </main>
              </div>
            </motion.div>
          )}

        {/* VIEW 3: Create Post Thread Page with Markdown Editor */}
        {selectedCategory && isCreatingThread && (
          <motion.div
            key="create-thread"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Thread Creator Header - Sticky Header */}
            <header className={`p-6 md:px-8 border-b relative select-none flex-shrink-0 ${
              isThemeDark ? 'border-white/5 bg-[#080808]' : 'border-gray-200/80 bg-white'
            }`}>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Code size={18} className="text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <h2 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500 font-sans">
                    {isRtl ? `كتابة موضوع جديد: ${selectedCategory.name_ar}` : `Write New Topic: ${selectedCategory.name_en}`}
                  </h2>
                </div>
                <button
                  onClick={() => {
                    setIsCreatingThread(false);
                    setNewTitle('');
                    setNewContent('');
                  }}
                  className="text-xs text-gray-500 hover:text-rose-450 font-bold transition-colors cursor-pointer"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </header>

            <main className="flex-1 p-6 md:p-8 overflow-y-auto scrollbar-none">
              <div className={`max-w-3xl mx-auto border rounded-lg p-6 md:p-8 shadow-xl ${
                isThemeDark ? 'bg-[#121214] border-white/5' : 'bg-white border-gray-200'
              }`}>
                <form onSubmit={handleSubmitThread} className="space-y-5">
                  <div>
                    <label className={`block text-[10px] font-sans font-black uppercase mb-2 select-none ${isThemeDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {isRtl ? 'عنوان الموضوع' : 'Discussion Title'}
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder={isRtl ? 'اكتب عنواناً معبراً ودقيقاً لتحليلك الفني...' : 'Write an outstanding professional title...'}
                      maxLength={100}
                      className={`w-full h-11 border text-white rounded-[4px] px-4 text-xs sm:text-sm placeholder-gray-650 outline-none transition-theme font-sans font-medium ${
                        isThemeDark ? 'bg-[#121215] border-white/5 focus:border-emerald-500' : 'bg-gray-50 border-gray-250 focus:border-emerald-500 text-gray-900'
                      }`}
                    />
                  </div>

                  {/* Minimal Markdown Editor controls */}
                  <div className={`border rounded-[4px] overflow-hidden ${isThemeDark ? 'border-white/5 bg-[#121215]' : 'border-gray-255 bg-white'}`}>
                    <div className={`flex justify-between items-center border-b px-4 py-2 select-none ${isThemeDark ? 'bg-[#18181b] border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditorTab('write')}
                      className={`px-3 py-1 text-xs rounded-[3px] font-bold font-sans transition-all cursor-pointer ${editorTab === 'write' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'text-gray-400 hover:text-white'}`}
                    >
                      {isRtl ? 'محرر النصوص' : 'Write Markdown'}
                    </button>
                    <button
                      type="button"
                      disabled={!newContent.trim()}
                      onClick={() => setEditorTab('preview')}
                      className={`px-3 py-1 text-xs rounded-[3px] font-bold font-sans transition-all cursor-pointer disabled:opacity-40 ${editorTab === 'preview' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'text-gray-400 hover:text-white'}`}
                    >
                      {isRtl ? 'معاينة حية مدمجة' : 'Live Preview'}
                    </button>
                  </div>
                  
                  <span className="text-[10px] font-mono text-gray-550">
                    {isRtl ? 'يدعم التنسيقات البرمجية والرموز' : 'Supports Code Blocks & Markdown formatting'}
                  </span>
                </div>

                <div className="p-4">
                  {editorTab === 'write' ? (
                    <textarea
                      required
                      rows={10}
                      value={newContent}
                      onChange={(e) => setNewContent(e.target.value)}
                      placeholder={isRtl 
                        ? 'اكتب تفاصيل نقاشك هنا. تفضل باستخدام لغة مارك داون (Markdown) والأكواد البرمجية كالتالي:\n\n# عنوان رئيسي\n**نص عريض**\n```javascript\nconst code = "here";\n```' 
                        : 'Draft your content. Use standard markdown structure and code segments like:\n\n# Main Title\n**Bold Text**\n```python\nprint("quantitative code")\n```'}
                      className="w-full bg-transparent text-white placeholder-gray-650 outline-none resize-none text-[11px] sm:text-xs font-sans font-medium min-h-[180px]"
                    />
                  ) : (
                    <div className={`p-3 rounded-[3px] min-h-[180px] ${isThemeDark ? 'bg-black/40' : 'bg-gray-50'}`}>
                      {renderMarkdownPreview(newContent)}
                    </div>
                  )}
                </div>
              </div>

              {/* Character Limit and guidelines */}
              <div className="flex justify-between items-center text-[10px] font-mono text-gray-500 select-none pb-2">
                <span>{isRtl ? 'تنبيه: لا تقم بنشر أكواد السيرفر أو مفاتيح APIs حيوية.' : 'Notice: Avoid attaching internal backend controllers or credentials.'}</span>
                <span>{newContent.length} {isRtl ? 'رمز تم تقديمه' : 'characters entered'}</span>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingThread(false);
                    setNewTitle('');
                    setNewContent('');
                  }}
                  className={`px-5 h-11 border font-bold rounded-[4px] text-xs font-sans transition-all cursor-pointer ${
                    isThemeDark ? 'border-white/10 text-gray-300 hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {isRtl ? 'إلغاء المنشور' : 'Cancel draft'}
                </button>
                <button
                  type="submit"
                  disabled={submittingThread || !newTitle.trim() || !newContent.trim()}
                  className="flex items-center justify-center gap-2 px-6 h-11 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-45 text-white font-bold font-sans text-xs transition-theme shadow-md uppercase cursor-pointer hover:drop-shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                >
                  {submittingThread ? (
                    <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={13} className={isRtl ? 'rotate-180' : ''} />
                      <span>{isRtl ? 'نشر الموضوع فوراً للجميع' : 'Publish Discussion'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
            </div>
            </main>
          </motion.div>
        )}

        {/* VIEW 4: Discussion Post Detailed Screen & Nested Commentary Flow */}
        {selectedPost && (
          <motion.div
            key="post-thread-detail"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            {/* Navigation back and admin tools - Header */}
            <header className={`p-6 md:px-8 border-b relative select-none flex-shrink-0 ${
              isThemeDark ? 'border-white/5 bg-[#080808]' : 'border-gray-200/80 bg-white'
            }`}>
              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
              <div className="flex justify-between items-center">
                <button
                  onClick={() => setSelectedPost(null)}
                  className="group flex items-center gap-1.5 text-xs font-black text-gray-500 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={16} className={`group-hover:scale-115 transition-transform ${isRtl ? 'rotate-180' : ''}`} />
                  {isRtl ? 'العودة لمواضيع الساحة الحالية' : 'Back to Active Zone Threads'}
                </button>

                <div className="flex gap-2 select-none shrink-0">
                  {/* Regular reporting security flag */}
                  <button
                    type="button"
                    onClick={() => handleReportPost(selectedPost.id)}
                    className={`p-1.5 border text-xs flex items-center gap-1 cursor-pointer font-sans rounded-[4px] ${
                      isThemeDark ? 'border-white/10 bg-[#121214] text-gray-400 hover:text-rose-400 hover:border-rose-500/30' : 'border-gray-200 bg-white text-gray-500 hover:text-rose-600 hover:border-rose-300'
                    }`}
                    title={isRtl ? 'إبلاغ عن محتوى معارض' : 'Report threat to server security'}
                  >
                    <Flag size={13} />
                    <span className="hidden sm:inline">{isRtl ? 'إبلاغ أمني' : 'Report Shield'}</span>
                  </button>

                  {user?.role === 'admin' && (
                    <>
                      <button
                        onClick={() => handleTogglePin(selectedPost)}
                        className={`p-1.5 border rounded-[4px] transition-colors text-xs flex items-center gap-1 cursor-pointer font-sans ${selectedPost.is_pinned ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 font-bold' : (isThemeDark ? 'bg-transparent border-white/10 text-gray-400 hover:text-white' : 'bg-transparent border-gray-255 text-gray-750 hover:bg-gray-100')}`}
                      >
                        <Pin size={13} />
                        <span>{selectedPost.is_pinned ? (isRtl ? 'إزالة التثبيت' : 'Unpin') : (isRtl ? 'تثبيت' : 'Pin')}</span>
                      </button>

                      <button
                        onClick={() => handleToggleLock(selectedPost)}
                        className={`p-1.5 border rounded-[4px] transition-colors text-xs flex items-center gap-1 cursor-pointer font-sans ${selectedPost.is_locked ? 'bg-rose-500/15 border-rose-500/30 text-rose-455 font-bold' : (isThemeDark ? 'bg-transparent border-white/10 text-gray-400 hover:text-white' : 'bg-transparent border-gray-255 text-gray-750 hover:bg-gray-100')}`}
                      >
                        <Lock size={13} />
                        <span>{selectedPost.is_locked ? (isRtl ? 'فتح القفل' : 'Unlock') : (isRtl ? 'قفل التعليقات' : 'Lock')}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </header>

            {/* Scrollable details view */}
            <main className="flex-1 p-6 md:p-8 overflow-y-auto scrollbar-none space-y-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {postDetailLoading ? (
                  <div className={`h-64 border rounded-lg animate-pulse ${isThemeDark ? 'bg-white/5 border-white/5' : 'bg-gray-50 border-gray-200'}`} />
                ) : (
                  <div className="space-y-6">
                    {/* Core original thread card */}
                    <div className={`border rounded-lg p-6 md:p-8 shadow-xl ${isThemeDark ? 'bg-[#121214] border-white/5' : 'bg-white border-gray-200'}`}>
                      {/* Author metadata header */}
                      <div className="flex items-center justify-between border-b border-gray-500/5 pb-4 mb-5 select-none">
                        <div className="flex items-center gap-3">
                          {selectedPost.author_avatar ? (
                            <img src={selectedPost.author_avatar} alt={selectedPost.author_name} className="w-10 h-10 rounded-full border border-gray-800 shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                              {selectedPost.author_name[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="text-[12px] font-black text-white flex items-center gap-1.5">
                              <span className={isThemeDark ? 'text-white' : 'text-gray-900'}>{selectedPost.author_name}</span>
                              <span className={`text-[8px] tracking-wide font-black uppercase px-2 py-0.5 rounded-[3px] ${selectedPost.author_role === 'admin' ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/15' : 'text-gray-400 bg-gray-800/60 border border-gray-800'}`}>
                                {selectedPost.author_role === 'admin' ? (isRtl ? 'إشراف وتدقيق' : 'Staff Monitor') : (isRtl ? 'عضو خبير' : 'Verified Peer')}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[9px] text-gray-500 font-mono mt-1">
                              <Calendar size={10} />
                              <span>{new Date(selectedPost.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        {(user?.role === 'admin' || user?.id === selectedPost.user_id) && (
                          <button
                            onClick={() => handleDeletePost(selectedPost.id)}
                            className="p-2 text-gray-450 hover:text-rose-500 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] cursor-pointer transition-colors"
                            title={isRtl ? 'حذف الموضوع' : 'Delete Thread'}
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>

                      {/* Body text area with Markdown supported rendering preview */}
                      <h1 className={`text-base sm:text-lg font-black leading-snug tracking-tight mb-4 select-text font-sans ${isThemeDark ? 'text-white' : 'text-gray-900'}`}>
                        {selectedPost.title}
                      </h1>
                      
                      {/* Clean rendered body contents */}
                      <div className={`p-4 rounded-lg select-text border ${isThemeDark ? 'bg-black/30 border-white/5' : 'bg-gray-50 border-gray-200'}`}>
                        {renderMarkdownPreview(selectedPost.content)}
                      </div>
                    </div>

                    {/* Replies panel */}
                    <div className={`border rounded-lg p-6 md:p-8 ${isThemeDark ? 'bg-[#121214] border-white/5' : 'bg-white border-gray-200'}`}>
                      <h2 className={`text-xs sm:text-sm font-black mb-6 uppercase border-b pb-3 font-mono tracking-wider flex justify-between items-center ${isThemeDark ? 'text-white border-white/5' : 'text-gray-900 border-gray-200'}`}>
                        <span>{isRtl ? 'الردود التقنية ومقترحات الحلول' : 'Technical discussion feed'} ({comments.filter(c => !reportedComments.includes(c.id)).length})</span>
                        <span className="text-[10px] text-emerald-400/85 font-black font-sans">PERPLEXTA ENGINE PORT</span>
                      </h2>

                      {/* Add commentary reply */}
                      {selectedPost.is_locked ? (
                        <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-sm text-center mb-8 select-none">
                          <p className="text-xs text-rose-455 font-black flex items-center justify-center gap-1.5 font-sans">
                            <Lock size={12} />
                            {isRtl ? 'هذا الموضوع مغلق أمنياً من قبل الإشراف لكتابة ردود جديدة.' : 'This conversation zone is locked and preserved by administrative rules.'}
                          </p>
                        </div>
                      ) : token && user ? (
                        <form onSubmit={handleSubmitComment} className="mb-8">
                          {/* Markdown Editor implementation inside comments too */}
                          <div className={`border rounded-[4px] overflow-hidden ${isThemeDark ? 'bg-black/30 border-white/10' : 'bg-white border-gray-300'}`}>
                            <div className={`flex justify-between items-center border-b px-4 py-1.5 select-none text-[11px] ${isThemeDark ? 'bg-[#18181b]/80 border-white/10 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setCommentEditorTab('write')}
                                  className={`px-2 py-0.5 text-[10px] rounded-[3px] font-bold transition-all cursor-pointer ${commentEditorTab === 'write' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'text-gray-500 hover:text-gray-850'}`}
                                >
                                  {isRtl ? 'اكتب تعليقاً' : 'Write Reply'}
                                </button>
                                <button
                                  type="button"
                                  disabled={!newComment.trim()}
                                  onClick={() => setCommentEditorTab('preview')}
                                  className={`px-2 py-0.5 text-[10px] rounded-[3px] font-bold transition-all cursor-pointer disabled:opacity-40 ${commentEditorTab === 'preview' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15' : 'text-gray-500 hover:text-gray-850'}`}
                                >
                                  {isRtl ? 'معاينة التعليق' : 'Preview Live'}
                                </button>
                              </div>
                              <span className="font-mono font-bold text-[9px]">{1500 - newComment.length} {isRtl ? 'رمز متبقي' : 'chars limit'}</span>
                            </div>

                            <div className="p-3">
                              {commentEditorTab === 'write' ? (
                                <textarea
                                  rows={3}
                                  required
                                  value={newComment}
                                  onChange={(e) => setNewComment(e.target.value)}
                                  placeholder={isRtl ? 'اكتب ردك التقني هنا بحرية... يدعم الكود البرمجي عبر الرموز' : 'Participate with your technical trade analysis, coding reply here...'}
                                  maxLength={1500}
                                  className={`w-full bg-transparent placeholder-gray-600 outline-none resize-none text-xs sm:text-sm leading-relaxed font-sans font-medium ${isThemeDark ? 'text-white' : 'text-gray-900'}`}
                                />
                              ) : (
                                <div className={`p-3 rounded-[3px] min-h-[85px] ${isThemeDark ? 'bg-[#0b0b0d]' : 'bg-gray-100/50'}`}>
                                  {renderMarkdownPreview(newComment)}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-end mt-2 leading-none">
                            <button
                              type="submit"
                              disabled={submittingComment || !newComment.trim()}
                              className="flex items-center gap-1.5 px-5 h-9 rounded-[4px] bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 font-bold text-white text-xs cursor-pointer transition-theme uppercase"
                            >
                              {submittingComment ? (
                                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                              ) : (
                                <>
                                  <Send size={11} className={isRtl ? 'rotate-180' : ''} />
                                  <span>{isRtl ? 'نشر الرد' : 'Submit Reply'}</span>
                                </>
                              )}
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-sm text-center mb-8 select-none">
                          <p className="text-xs text-emerald-400 font-sans font-semibold leading-relaxed">
                            {isRtl ? 'يرجى تسجيل الدخول لكتابة رد على هذا الموضوع.' : 'Log in to write a commentary reply on this discussion.'}
                          </p>
                        </div>
                      )}

                      {/* Replies comments lists */}
                      {comments.filter(c => !reportedComments.includes(c.id)).length > 0 ? (
                        <div className="space-y-4 max-h-[550px] overflow-y-auto custom-scrollbar pr-1">
                          {comments.filter(c => !reportedComments.includes(c.id)).map((comment, index) => (
                            <div
                              key={comment.id}
                              className={`group/reply flex gap-3 p-4 border rounded-[4px] hover:border-emerald-500/20 transition-all duration-300 ${isThemeDark ? 'bg-black/30 border-white/5' : 'bg-white border-gray-250/70'}`}
                            >
                              {comment.author_avatar ? (
                                <img src={comment.author_avatar} alt={comment.author_name} className="w-7 h-7 rounded-full border border-gray-800 shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                                  {comment.author_name[0].toUpperCase()}
                                </div>
                              )}

                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-1.5 mb-2 select-none">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-[12px] font-black ${isThemeDark ? 'text-white' : 'text-gray-900'}`}>{comment.author_name}</span>
                                    {comment.author_role === 'admin' ? (
                                      <span className="text-[8px] tracking-wide font-black uppercase text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-1.5 py-0.5 rounded-[3px]">{isRtl ? 'إشراف' : 'Staff'}</span>
                                    ) : (
                                      <span className="text-[8px] tracking-wide font-bold uppercase text-gray-400 bg-gray-805 px-1.5 py-0.5 rounded-[3px]">{isRtl ? 'عضو' : 'Peer'}</span>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <span className="text-[9px] font-mono text-gray-500">{new Date(comment.created_at).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                                    
                                    {/* Micro inline security operations */}
                                    <button
                                      type="button"
                                      onClick={() => handleReportComment(comment.id)}
                                      className="p-1 text-gray-500 hover:text-rose-500 transition-colors"
                                      title={isRtl ? 'إبلاغ عن رد مخالف' : 'Flag reply for moderation review'}
                                    >
                                      <Flag size={10} />
                                    </button>

                                    {(user?.role === 'admin' || user?.id === comment.user_id) && (
                                      <button
                                        onClick={() => handleDeleteComment(comment.id)}
                                        className="opacity-0 group-hover/reply:opacity-100 p-1 text-gray-500 hover:text-rose-500 hover:drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] transition-all cursor-pointer"
                                        title={isRtl ? 'حذف الرد' : 'Delete Reply'}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Comment output with dynamic rendering */}
                                <div className={`text-[11px] sm:text-xs ${isThemeDark ? 'text-gray-300' : 'text-gray-750'}`}>
                                  {renderMarkdownPreview(comment.content)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-10 text-center text-gray-500 select-none">
                          <MessageSquare size={32} className="mx-auto text-gray-650 mb-2" />
                          <p className="text-xs font-sans font-medium">{isRtl ? 'لا توجد ردود بعد. شارك برأيك وساهم في إثراء الموضوع بالتصميم الهندسي!' : 'No conversation replies here yet. Share your technical feedback!'}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Block - Unified with Marketplace & Blog */}
      <footer className={`hidden md:block p-4 border-t text-[10px] select-none flex-shrink-0 ${
        isThemeDark ? 'bg-[#131315] border-gray-800/60 text-gray-500' : 'bg-gray-50 border-gray-150 text-gray-600'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-right">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
            <span className="font-sans font-black tracking-widest text-[9px] uppercase">
              PERPLEXTA PLATFORM INSIGHTS SYSTEM
            </span>
            <div className="flex items-center justify-center gap-2.5 text-[9px] text-emerald-500 font-bold">
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
    </div>

      {/* FLOATING ACTION BUTTON (FAB) & DYNAMIC SHORTCUT */}
      {token && user && !isCreatingThread && !selectedPost && (
        <div className="fixed bottom-6 right-6 z-40 select-none">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (selectedCategory) {
                setIsCreatingThread(true);
              } else {
                // If on main page, select first category and open creation
                const defaultCat = categories[0] || null;
                if (defaultCat) {
                  setSelectedCategory(defaultCat);
                  setIsCreatingThread(true);
                } else {
                  triggerToast('الرجاء اختيار قسم من اللوحة المجاورة للكتابة', 'Please click on a category cards first.');
                }
              }
            }}
            className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.55)] cursor-pointer outline-none relative group"
            title={isRtl ? 'إنشاء موضوع نقاش جديد' : 'Initiate New Topic'}
          >
            <Plus size={22} className="text-white font-extrabold" />
            
            {/* Tooltip on hover */}
            <span className="absolute right-14 bg-gray-900 border border-gray-800 text-white text-[10px] font-bold font-sans rounded px-2.5 py-1 transition-all whitespace-nowrap opacity-0 group-hover:opacity-100 duration-200 pointer-events-none shadow-md">
              {isRtl ? 'إنشاء موضوع نقاش جديد' : 'Start New Topic'}
            </span>
          </motion.button>
        </div>
      )}
    </div>
  );
};
