import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { 
  LayoutGrid, MessageSquare, Users, Mail, HardDrive, 
  Calendar, Shield, ExternalLink, ChevronRight, Search,
  ArrowLeft, Bell, Settings2, Info, GripVertical, X, HelpCircle,
  Key, Zap, Lock, ShieldAlert, AlertTriangle, RefreshCw,
  Link2, Settings, LogOut
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { GoogleChatManager } from '../components/GoogleChatManager';
import { GoogleContacts } from '../components/GoogleContacts';
import { ActionConfirmationModal } from '../components/ActionConfirmationModal';
import { toast } from 'sonner';

interface GoogleTool {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  available: boolean;
  status: 'connected' | 'syncing' | 'expired' | 'disconnected';
  unreadCount: number;
  guide: {
    steps: string[];
  };
}

const GoogleHubPage: React.FC = () => {
  const { language, theme, dir, user } = useAppContext();
  const [activeTab, setActiveTab] = useState<'overview' | 'chat' | 'contacts' | 'drive' | 'gmail'>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [guideTool, setGuideTool] = useState<GoogleTool | null>(null);
  const [selectedTool, setSelectedTool] = useState<GoogleTool | null>(null);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState(true);
  const isRtl = language === 'ar';

  const [tools, setTools] = useState<GoogleTool[]>([
    {
      id: 'chat',
      title: isRtl ? 'قوقل شات' : 'Google Chat',
      description: isRtl ? 'تواصل فورياً مع فرق العمل والمجموعات' : 'Collaborate instantly with teams and groups',
      icon: <MessageSquare size={24} className="text-emerald-500" />,
      color: 'emerald',
      available: true,
      status: 'connected',
      unreadCount: 3,
      guide: {
        steps: isRtl ? [
          'اضغط على "قوقل شات" لفتح واجهة المحادثة',
          'سيطلب منك قوقل الموافقة على صلاحيات الوصول',
          'بعد الموافقة، ستظهر غرف الدردشة والمساحات الخاصة بك',
          'يمكنك إرسال الرسائل واستقبال التنبيهات فوراً'
        ] : [
          'Click on Google Chat to open the conversation interface',
          'Google will request authorization for chat access',
          'Once approved, your spaces and rooms will appear',
          'You can send messages and receive notifications instantly'
        ]
      }
    },
    {
      id: 'contacts',
      title: isRtl ? 'جهات اتصال قوقل' : 'Google Contacts',
      description: isRtl ? 'إدارة ومزامنة جهات اتصالك باحترافية' : 'Manage and sync your professional contacts',
      icon: <Users size={24} className="text-blue-500" />,
      color: 'blue',
      available: true,
      status: 'syncing',
      unreadCount: 0,
      guide: {
        steps: isRtl ? [
          'افتح قسم جهات الاتصال للبدء',
          'وافق على صلاحية الوصول لجهات الاتصال في حسابك',
          'سيتم سحب جميع الأسماء والأرقام والبريد الإلكتروني',
          'يمكنك البحث والتعديل والمزامنة مباشرة من هنا'
        ] : [
          'Open the Contacts section to begin',
          'Authorize access to your Google account contacts',
          'All names, numbers, and emails will be imported',
          'You can search, edit, and sync directly from here'
        ]
      }
    },
    {
      id: 'drive',
      title: isRtl ? 'قوقل درايف' : 'Google Drive',
      description: isRtl ? 'الوصول إلى ملفاتك ومستنداتك السحابية' : 'Access your cloud files and documents',
      icon: <HardDrive size={24} className="text-amber-500" />,
      color: 'amber',
      available: false,
      status: 'disconnected',
      unreadCount: 0,
      guide: {
        steps: isRtl ? [
          'التكامل قيد التطوير حالياً',
          'سيتيح لك استعراض ورفع الملفات مباشرة',
          'يدعم المستندات والجداول والعروض التقديمية',
          'مزامنة فورية مع مساحتك التخزينية'
        ] : [
          'Integration is currently under development',
          'Will allow you to browse and upload files directly',
          'Supports Docs, Sheets, and Slides',
          'Instant sync with your cloud storage space'
        ]
      }
    },
    {
      id: 'gmail',
      title: isRtl ? 'جي ميل' : 'Gmail',
      description: isRtl ? 'إدارة رسائل البريد الإلكتروني الذكية' : 'Smart email management and automation',
      icon: <Mail size={24} className="text-red-500" />,
      color: 'red',
      available: false,
      status: 'disconnected',
      unreadCount: 0,
      guide: {
        steps: isRtl ? [
          'التكامل قيد التطوير حالياً',
          'قراءة وإرسال رسائل البريد الإلكتروني',
          'تصنيف ذكي للرسائل باستخدام الذكاء الاصطناعي',
          'إشعارات فورية للرسائل الهامة'
        ] : [
          'Integration is currently under development',
          'Read and send emails directly',
          'Smart categorization using AI',
          'Instant notifications for important emails'
        ]
      }
    }
  ]);

  useEffect(() => {
    fetchConnections();
    
    // Set up real-time notification listener (polling every 30 seconds)
    const notificationInterval = setInterval(() => {
      fetchChatNotifications();
    }, 30000);

    return () => clearInterval(notificationInterval);
  }, []);

  const fetchChatNotifications = async () => {
    try {
      // We need the Google Chat token from localStorage or similar
      // Since GoogleChatManager handles its own auth, we might need a shared way to get the token
      // For now, we'll try to fetch it if it's available in the manager's cached token
      // In a real app, this would be managed in a shared context or secure backend cookie
      const chatToken = localStorage.getItem('google_chat_token');
      if (!chatToken) return;

      const response = await fetch('/api/google-chat/unread-count', {
        headers: {
          'Authorization': `Bearer ${chatToken}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setTools(prev => prev.map(tool => 
          tool.id === 'chat' ? { ...tool, unreadCount: data.count } : tool
        ));
      }
    } catch (error) {
      console.error('Failed to fetch chat notifications:', error);
    }
  };

  const fetchConnections = async () => {
    try {
      setIsLoadingConnections(true);
      const response = await fetch('/api/google-integrations', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (response.ok) {
        const connections = await response.json();
        setTools(prev => prev.map(tool => {
          const conn = connections.find((c: any) => c.tool_id === tool.id);
          return {
            ...tool,
            status: conn?.is_connected ? 'connected' : 'disconnected',
            available: true // For this UI we want them available to be connected
          };
        }));
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const handleConnectTool = async (toolId: string, config: any = {}) => {
    try {
      const response = await fetch(`/api/google-integrations/${toolId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          is_connected: true,
          config
        })
      });

      if (response.ok) {
        toast.success(isRtl ? 'تم الربط بنجاح' : 'Connected successfully');
        fetchConnections();
        setSelectedTool(null);
      } else {
        throw new Error('Failed to connect');
      }
    } catch (error) {
      toast.error(isRtl ? 'فشل الربط' : 'Connection failed');
    }
  };

  const handleDisconnectTool = async (toolId: string) => {
    try {
      const response = await fetch(`/api/google-integrations/${toolId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        toast.success(isRtl ? 'تم قطع الاتصال' : 'Disconnected successfully');
        fetchConnections();
        setSelectedTool(null);
      }
    } catch (error) {
      toast.error(isRtl ? 'فشل قطع الاتصال' : 'Disconnection failed');
    }
  };

  const handleRevokeTokens = async () => {
    setIsRevoking(true);
    
    try {
      const response = await fetch('/api/google-integrations/revoke-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        setTools(prev => prev.map(t => ({
          ...t,
          status: 'disconnected',
          unreadCount: 0
        })));
        
        // Also clear local chat token
        localStorage.removeItem('google_chat_token');
        
        toast.success(isRtl ? 'تم سحب جميع صلاحيات الوصول بنجاح' : 'All access tokens revoked successfully', {
          description: isRtl ? 'تم قطع الاتصال بكافة خدمات قوقل وتأمين حسابك.' : 'All Google services disconnected and account secured.',
          icon: <ShieldAlert className="text-emerald-500" size={18} />
        });
      } else {
        throw new Error('Revocation failed');
      }
    } catch (error) {
      toast.error(isRtl ? 'فشل سحب الصلاحيات' : 'Revocation failed');
    } finally {
      setIsRevoking(false);
      setShowSecurityModal(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'connected':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-500">
              {isRtl ? 'متصل' : 'Connected'}
            </span>
          </div>
        );
      case 'syncing':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            <span className="text-[9px] font-black uppercase tracking-wider text-blue-500">
              {isRtl ? 'مزامنة' : 'Syncing'}
            </span>
          </div>
        );
      case 'expired':
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span className="text-[9px] font-black uppercase tracking-wider text-amber-500">
              {isRtl ? 'منتهي' : 'Expired'}
            </span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-500/10 border border-gray-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
            <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">
              {isRtl ? 'غير متصل' : 'Offline'}
            </span>
          </div>
        );
    }
  };

  const filteredTools = tools.filter(tool => 
    tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[var(--bg-main)] text-[var(--text-main)] pb-20">
      {/* Premium Header */}
      <div className="sticky top-0 z-40 bg-[var(--bg-main)]/80 backdrop-blur-xl border-b border-[var(--border-main)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => activeTab !== 'overview' ? setActiveTab('overview') : window.history.back()}
              className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors"
            >
              <ArrowLeft size={20} className={isRtl ? 'rotate-180' : ''} />
            </button>
            <div>
              <h1 className="text-lg font-black font-sans tracking-tight flex items-center gap-2">
                <LayoutGrid size={20} className="text-emerald-500" />
                {isRtl ? 'تكاملات قوقل الذكية' : 'Google Smart Integrations'}
              </h1>
              <p className="text-[10px] text-gray-500 font-medium flex items-center gap-3">
                {isRtl ? 'إدارة مركزية لجميع أدوات قوقل وورك سبيس' : 'Centralized management for Google Workspace'}
                <a 
                  href={window.location.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/5 border border-blue-500/10 text-[9px] font-bold text-blue-500 uppercase tracking-widest hover:bg-blue-500/10 transition-theme ml-1"
                >
                  <ExternalLink size={10} />
                  {isRtl ? 'فتح في نافذة جديدة' : 'Open in New Tab'}
                </a>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 max-w-md mx-4">
            <div className="relative w-full group">
              <Search 
                size={16} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-emerald-500 group-focus-within:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] transition-theme" 
              />
              <input
                type="text"
                placeholder={isRtl ? 'بحث في الأدوات...' : 'Search tools...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-main)] rounded-xl py-2 pl-10 pr-4 text-xs font-bold outline-none focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/5 transition-theme"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSecurityModal(true)}
              className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border-main)] text-gray-400 hover:text-emerald-500 transition-theme group relative"
            >
              <Shield size={18} className="group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[var(--bg-main)] shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            </button>
            <button className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--border-main)] text-gray-400 hover:text-emerald-500 transition-theme">
              <Settings2 size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Hero Section */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500/10 via-transparent to-blue-500/5 border border-emerald-500/20 p-8">
                <div className="relative z-10 max-w-2xl">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 mb-4 uppercase tracking-widest">
                    {isRtl ? 'تكامل احترافي' : 'Professional Integration'}
                  </span>
                  <h2 className="text-3xl font-black mb-4 leading-tight">
                    {isRtl ? 'قوة قوقل وورك سبيس، في قلب بيربليكستا' : 'The Power of Workspace, inside Perplexta'}
                  </h2>
                  <p className="text-gray-500 text-sm leading-relaxed mb-6">
                    {isRtl 
                      ? 'قمنا بتصميم هذا القسم ليكون مركز القيادة الخاص بك لجميع أدوات قوقل. يمكنك الآن إدارة المحادثات، جهات الاتصال، والملفات دون مغادرة المنصة.'
                      : 'We designed this section to be your command center for all Google tools. Manage chats, contacts, and files seamlessly without leaving the platform.'}
                  </p>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full -mr-32 -mt-32" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 blur-[80px] rounded-full -ml-24 -mb-24" />
              </div>

              {/* Tools Grid with Reorder Capability */}
              {filteredTools.length > 0 ? (
                <Reorder.Group 
                  axis="y" 
                  values={tools} 
                  onReorder={setTools}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
                >
                  {filteredTools.map((tool) => (
                    <Reorder.Item
                      key={tool.id}
                      value={tool}
                      dragListener={tool.available && searchQuery === ''}
                      whileDrag={{ scale: 1.05, boxShadow: "0 20px 40px rgba(0,0,0,0.1)" }}
                      className="relative"
                    >
                      <motion.div
                        whileHover={tool.available ? { 
                          y: -8, 
                          scale: 1.02,
                          transition: { type: 'spring', stiffness: 400, damping: 15 }
                        } : {}}
                        whileTap={tool.available ? { scale: 0.98 } : {}}
                        onClick={() => {
                          if (tool.status === 'connected') {
                            setActiveTab(tool.id as 'overview' | 'chat' | 'contacts' | 'drive' | 'gmail');
                          } else {
                            setSelectedTool(tool);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            if (tool.status === 'connected') {
                              setActiveTab(tool.id as 'overview' | 'chat' | 'contacts' | 'drive' | 'gmail');
                            } else {
                              setSelectedTool(tool);
                            }
                          }
                        }}
                        role="button"
                        tabIndex={tool.available ? 0 : -1}
                        className={`w-full relative p-5 rounded-2xl border text-right transition-theme group cursor-pointer ${
                          tool.available 
                            ? 'bg-[var(--bg-secondary)] border-[var(--border-main)] hover:border-emerald-500/50 hover:shadow-[0_10px_20px_rgba(16,185,129,0.08)]'
                            : 'bg-gray-50/50 dark:bg-gray-900/20 border-dashed border-gray-200 dark:border-gray-800 opacity-60 grayscale cursor-not-allowed'
                        }`}
                      >
                        {tool.available && searchQuery === '' && (
                          <>
                            <div className="absolute top-3 start-3 text-gray-300 dark:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGuideTool(tool);
                                }}
                                className="p-1 rounded-md hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                              >
                                <HelpCircle size={14} />
                              </button>
                            </div>
                            <div className="absolute top-3 end-3 text-gray-300 dark:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                              <GripVertical size={14} />
                            </div>
                          </>
                        )}
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-12 h-12 rounded-2xl bg-${tool.color}-500/10 flex items-center justify-center transition-theme group-hover:scale-110 group-hover:drop-shadow-[0_0_10px_rgba(16,185,129,0.4)] relative`}>
                            {tool.icon}
                            {tool.unreadCount > 0 && (
                              <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-emerald-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[var(--bg-secondary)] shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                              >
                                {tool.unreadCount}
                              </motion.div>
                            )}
                          </div>
                        </div>
                        <h3 className="font-black text-sm mb-2 flex items-center justify-between text-[var(--text-primary)]">
                          {tool.title}
                          {tool.available && <ChevronRight size={16} className={`transition-transform duration-300 group-hover:translate-x-${isRtl ? '-1' : '1'}`} />}
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors min-h-[3rem]">
                          {tool.description}
                        </p>
                        
                        {tool.available && (
                          <div className="absolute bottom-3 end-3 z-10">
                             {getStatusBadge(tool.status)}
                          </div>
                        )}
                        {!tool.available && (
                          <div className="absolute top-4 left-4 flex flex-col gap-2">
                             <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-gray-500/10 text-gray-400">
                              {isRtl ? 'قريباً' : 'Soon'}
                            </span>
                          </div>
                        )}
                      </motion.div>
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              ) : (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-center"
                >
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <Search size={24} className="text-gray-400" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{isRtl ? 'لا توجد نتائج' : 'No tools found'}</h3>
                  <p className="text-sm text-gray-500 max-w-xs mx-auto">
                    {isRtl ? 'لم نجد أي أدوات تطابق بحثك. جرب كلمات مفتاحية أخرى.' : 'We couldn\'t find any tools matching your search. Try different keywords.'}
                  </p>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="mt-6 text-emerald-500 font-bold hover:underline"
                  >
                    {isRtl ? 'عرض جميع الأدوات' : 'View all tools'}
                  </button>
                </motion.div>
              )}

              {/* Recent Activity / Integration Status */}
              <div className="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-main)] p-6 transition-theme hover:shadow-[0_10px_30px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                  <Info size={16} className="text-emerald-500 animate-pulse" />
                  {isRtl ? 'حالة التكامل والاتصال' : 'Integration & Connection Status'}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] transition-colors hover:border-emerald-500/20"
                  >
                    <p className="text-[10px] text-gray-500 mb-1">{isRtl ? 'المساحة المستخدمة' : 'Storage Used'}</p>
                    <div className="flex items-end justify-between">
                      <span className="text-lg font-black tracking-tight">1.2 GB</span>
                      <span className="text-[10px] text-emerald-500 font-bold">8%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '8%' }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" 
                      />
                    </div>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] transition-colors hover:border-emerald-500/20"
                  >
                    <p className="text-[10px] text-gray-500 mb-1">{isRtl ? 'أمان الواجهة' : 'API Security'}</p>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      <span className="text-sm font-bold">{isRtl ? 'مؤمن بالكامل' : 'Fully Secured'}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2">SSL v3 / OAuth 2.0</p>
                  </motion.div>
                  <motion.div 
                    whileHover={{ scale: 1.01 }}
                    className="p-4 rounded-xl border border-[var(--border-main)] bg-[var(--bg-main)] transition-colors hover:border-emerald-500/20"
                  >
                    <p className="text-[10px] text-gray-500 mb-1">{isRtl ? 'المزامنة الأخيرة' : 'Last Sync'}</p>
                    <span className="text-sm font-bold">{isRtl ? 'منذ دقيقتين' : '2 minutes ago'}</span>
                    <button className="mt-2 flex items-center gap-1 text-[10px] text-emerald-500 hover:text-emerald-400 transition-colors font-bold group">
                      <ExternalLink size={10} className="group-hover:rotate-12 transition-transform" />
                      {isRtl ? 'تحديث الآن' : 'Refresh Now'}
                    </button>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black flex items-center gap-3">
                  <MessageSquare className="text-emerald-500" />
                  {isRtl ? 'مساعد قوقل شات' : 'Google Chat Assistant'}
                </h2>
                <button 
                  onClick={() => setActiveTab('overview')}
                  className="text-xs font-bold text-emerald-500 hover:underline"
                >
                  {isRtl ? 'العودة للمركز' : 'Back to Hub'}
                </button>
              </div>
              <GoogleChatManager dir={dir} theme={theme} />
            </motion.div>
          )}

          {activeTab === 'contacts' && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black flex items-center gap-3">
                  <Users className="text-blue-500" />
                  {isRtl ? 'إدارة جهات الاتصال' : 'Contacts Management'}
                </h2>
                <button 
                  onClick={() => setActiveTab('overview')}
                  className="text-xs font-bold text-emerald-500 hover:underline"
                >
                  {isRtl ? 'العودة للمركز' : 'Back to Hub'}
                </button>
              </div>
              <GoogleContacts dir={dir} theme={theme} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Help/Guide Modal */}
      <AnimatePresence>
        {selectedTool && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTool(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[var(--bg-main)] rounded-3xl border border-[var(--border-main)] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between bg-gradient-to-r from-emerald-500/5 to-transparent">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-${selectedTool.color}-500/10 flex items-center justify-center`}>
                    {selectedTool.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{selectedTool.title}</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                      {selectedTool.status === 'connected' ? (isRtl ? 'إدارة الاتصال' : 'Manage Connection') : (isRtl ? 'إعداد الاتصال' : 'Setup Connection')}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelectedTool(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {selectedTool.status === 'connected' ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                      <div className="flex items-center gap-3 mb-2">
                        <Shield size={16} className="text-emerald-500" />
                        <h4 className="text-xs font-black">{isRtl ? 'الحالة نشطة' : 'Status: Active'}</h4>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        {isRtl ? 'تم ربط حسابك بنجاح. يمكنك الآن استخدام كافة ميزات الأداة.' : 'Your account is successfully linked. You can now use all tool features.'}
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase text-gray-400 px-1">{isRtl ? 'الإعدادات' : 'Settings'}</label>
                      <button className="w-full p-4 rounded-xl border border-[var(--border-main)] flex items-center justify-between hover:border-emerald-500/30 transition-theme group">
                        <div className="flex items-center gap-3">
                          <Settings size={18} className="text-gray-400 group-hover:text-emerald-500" />
                          <span className="text-xs font-bold">{isRtl ? 'تخصيص المزامنة' : 'Sync Preferences'}</span>
                        </div>
                        <ChevronRight size={16} className="text-gray-300" />
                      </button>
                      <button 
                        onClick={() => handleDisconnectTool(selectedTool.id)}
                        className="w-full p-4 rounded-xl border border-red-500/20 bg-red-500/5 flex items-center justify-between hover:bg-red-500/10 transition-theme group"
                      >
                        <div className="flex items-center gap-3">
                          <LogOut size={18} className="text-red-500" />
                          <span className="text-xs font-bold text-red-500">{isRtl ? 'قطع الاتصال' : 'Disconnect Tool'}</span>
                        </div>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-6 rounded-2xl border-2 border-dashed border-[var(--border-main)] flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                        <Link2 size={32} className="text-gray-400" />
                      </div>
                      <h4 className="text-sm font-black mb-2">{isRtl ? 'لم يتم الربط بعد' : 'Not Connected Yet'}</h4>
                      <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
                        {isRtl 
                          ? 'ابدأ عملية الربط الآمن للوصول إلى بياناتك ومزامنتها مع المنصة.' 
                          : 'Start the secure linking process to access and sync your data with the platform.'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <h5 className="text-[10px] font-black uppercase text-gray-400 px-1">{isRtl ? 'المطلوب' : 'Requirements'}</h5>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-main)]">
                          <Shield size={14} className="text-emerald-500 mb-2" />
                          <p className="text-[10px] font-bold">{isRtl ? 'صلاحية الوصول' : 'OAuth Access'}</p>
                        </div>
                        <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-main)]">
                          <RefreshCw size={14} className="text-blue-500 mb-2" />
                          <p className="text-[10px] font-bold">{isRtl ? 'مزامنة البيانات' : 'Data Sync'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-[var(--bg-secondary)] flex items-center justify-end gap-3 border-t border-[var(--border-main)]">
                <button onClick={() => setSelectedTool(null)} className="px-4 py-2 text-xs font-bold text-gray-500">{isRtl ? 'إلغاء' : 'Cancel'}</button>
                {selectedTool.status !== 'connected' && (
                  <button 
                    onClick={() => handleConnectTool(selectedTool.id)}
                    className="px-6 py-2 text-xs font-black bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-theme active:scale-95"
                  >
                    {isRtl ? 'تفعيل الاتصال' : 'Activate Connection'}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Help/Guide Modal */}
      <AnimatePresence>
        {guideTool && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setGuideTool(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[var(--bg-main)] rounded-3xl border border-[var(--border-main)] shadow-2xl overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-[var(--border-main)] flex items-center justify-between bg-gradient-to-r from-emerald-500/5 to-transparent">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-${guideTool.color}-500/10 flex items-center justify-center`}>
                    {guideTool.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-black">{guideTool.title}</h3>
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{isRtl ? 'دليل التكامل' : 'Integration Guide'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setGuideTool(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                    <h4 className="text-xs font-black mb-3 flex items-center gap-2">
                      <Key size={14} className="text-emerald-500" />
                      {isRtl ? 'متطلبات الوصول' : 'Access Requirements'}
                    </h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      {isRtl 
                        ? 'يتطلب هذا التكامل حساب قوقل نشط وصلاحيات "OAuth 2.0" للوصول إلى بياناتك الشخصية بأمان.'
                        : 'This integration requires an active Google account and OAuth 2.0 permissions to access your personal data securely.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-black mb-1 flex items-center gap-2">
                      <Zap size={14} className="text-amber-500" />
                      {isRtl ? 'خطوات التفعيل' : 'Activation Steps'}
                    </h4>
                    <div className="space-y-2">
                      {guideTool.guide.steps.map((step: string, idx: number) => (
                        <div key={idx} className="flex gap-3 group">
                          <span className="w-5 h-5 shrink-0 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-main)] flex items-center justify-center text-[10px] font-black group-hover:border-emerald-500/50 transition-colors">
                            {idx + 1}
                          </span>
                          <p className="text-[11px] text-gray-500 leading-tight py-0.5">{step}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                    <h4 className="text-xs font-black mb-3 flex items-center gap-2">
                      <Lock size={14} className="text-blue-500" />
                      {isRtl ? 'الخصوصية والأمان' : 'Privacy & Security'}
                    </h4>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      {isRtl 
                        ? 'يتم تشفير جميع البيانات المنتقلة باستخدام بروتوكول "AES-256". نحن لا نقوم بتخزين كلمات مرور حسابك أبداً.'
                        : 'All transmitted data is encrypted using the AES-256 protocol. We never store your account passwords.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-[var(--bg-secondary)] flex items-center justify-end gap-3 border-t border-[var(--border-main)]">
                <button 
                  onClick={() => setGuideTool(null)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-emerald-500 transition-colors"
                >
                  {isRtl ? 'إغلاق' : 'Close'}
                </button>
                <button 
                  className="px-5 py-2 text-xs font-black bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 transition-theme active:scale-95"
                  onClick={() => {
                    if (guideTool.available) {
                      setActiveTab(guideTool.id as 'overview' | 'chat' | 'contacts' | 'drive' | 'gmail');
                      setGuideTool(null);
                    } else {
                      setGuideTool(null);
                    }
                  }}
                >
                  {guideTool.available ? (isRtl ? 'ابدأ الآن' : 'Get Started') : (isRtl ? 'فهمت' : 'Understood')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Security Management Modal (Standard Platform Component) */}
      <ActionConfirmationModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        onConfirm={handleRevokeTokens}
        variant="danger"
        title={{
          ar: 'إدارة أمان الحساب',
          en: 'Account Security Management'
        }}
        description={{
          ar: 'هل أنت متأكد من رغبتك في سحب كافة صلاحيات الوصول لخدمات قوقل؟ سيؤدي هذا الإجراء إلى قطع الاتصال الفوري بكافة الخدمات المتصلة.',
          en: 'Are you sure you want to revoke all Google service access tokens? This action will immediately disconnect all linked services.'
        }}
        confirmLabel={{
          ar: 'تأكيد سحب الوصول',
          en: 'Confirm Revocation'
        }}
        cancelLabel={{
          ar: 'إلغاء',
          en: 'Cancel'
        }}
        extraContent={
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-amber-600 font-bold leading-tight">
              {isRtl 
                ? 'لا تقلق، لن يتم حذف أي ملفات من حسابك في قوقل. سيتم فقط قطع اتصال المنصة بالحساب.'
                : "Don't worry, no files will be deleted from your Google account. Only the platform's connection will be severed."}
            </p>
          </div>
        }
      />
    </div>
  );
};

export default GoogleHubPage;
