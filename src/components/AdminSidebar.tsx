import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Activity, Key, Database, Cpu, Landmark, 
  CreditCard, Users, Settings, Mail, ArrowRight,
  Send, Brain, ShieldAlert, UserPlus, Megaphone, Shield,
  Server
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const AdminSidebar: React.FC<{ activeLanguage?: string }> = ({ activeLanguage }) => {
  const { t, user, language: globalLang, isSidebarOpen, setIsSidebarOpen } = useAppContext();

  const language = activeLanguage || globalLang;
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const isSupport = user?.role === 'support';

  const navItems = [
    { icon: <Activity size={18} />, label: t('commandCenter'), path: '/admin/dashboard' },
    ...(!isSupport ? [
      { icon: <Shield size={18} />, label: language === 'ar' ? 'رادار الأمان' : 'Security Radar', path: '/admin/radar' },
      { icon: <Activity size={18} />, label: language === 'ar' ? 'مقاييس الأداء ورندر' : 'Render & Latency Metrics', path: '/admin/metrics' },
      { icon: <Key size={18} />, label: t('aiInfrastructure'), path: '/admin/keys' },
      { icon: <Server size={18} />, label: language === 'ar' ? 'مزودي خوادم الـ GPU' : 'GPU Infrastructure', path: '/admin/gpu' },
      { icon: <Database size={18} />, label: t('dbOrchestration'), path: '/admin/databases' },
      { icon: <Cpu size={18} />, label: t('toolOrchestrator'), path: '/admin/orchestrator' },
      { icon: <Landmark size={18} />, label: t('financeVault'), path: '/admin/finance' },
      { icon: <CreditCard size={18} />, label: t('plansSubscriptions'), path: '/admin/plans' },
      { icon: <UserPlus size={18} />, label: t('referralDashboard'), path: '/admin/referrals' },
    ] : []),
    { icon: <Users size={18} />, label: t('userManagement'), path: '/admin/users' },
    ...(!isSupport ? [
      { icon: <Megaphone size={18} />, label: language === 'ar' ? 'إدارة الإعلانات' : 'Ads Management', path: '/admin/ads' },
      { icon: <Brain size={18} />, label: language === 'ar' ? 'مركز الذاكرة' : 'Memory Center', path: '/admin/memories' },
      { icon: <Mail size={18} />, label: t('smartEmailHub'), path: '/admin/emails' },
      { icon: <Send size={18} />, label: t('smartBroadcast'), path: '/admin/broadcast' },
      { icon: <Settings size={18} />, label: t('systemSettings'), path: '/admin/settings' },
      { icon: <ShieldAlert size={18} />, label: language === 'ar' ? 'التدقيق والامتثال' : 'Compliance Audit', path: '/admin/audit' },
    ] : []),
  ];

  const isMobile = window.innerWidth < 768;

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      <aside 
        className={`fixed top-[72px] bottom-0 h-[calc(100dvh-72px)] flex flex-col z-[70] shadow-2xl bg-[var(--surface-page)] border-[var(--border-default)] transition-transform duration-base ${
          dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r'
        } ${
          !isMobile ? 'translate-x-0 visible' : (
            isSidebarOpen 
              ? 'translate-x-0 visible' 
              : (dir === 'rtl' ? 'translate-x-[100%] invisible' : '-translate-x-[100%] invisible')
          )
        }`}
        style={{ width: isMobile ? '240px' : '240px' }}
      >
        <nav className="flex-1 px-3 space-y-1 pt-[25px] overflow-y-auto custom-scrollbar scroll-smooth">
          {navItems.map((item, index) => (
            <NavLink
              key={`admin-nav-${item.path}-${index}`}
              to={item.path}
              onClick={() => {
                if (isMobile) setIsSidebarOpen(false);
              }}
              className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] transition-colors duration-base border border-transparent ${
                isActive
                  ? 'bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent-subtle)]'
                  : 'text-[var(--fg-muted)] hover:text-[var(--fg-primary)] hover:bg-[var(--surface-subtle)]'
              }`
            }
            >
              {({ isActive }) => (
                <>
                  <div className={`transition-colors duration-base ${
                    isActive 
                      ? 'text-[var(--accent)]' 
                      : 'text-[var(--fg-muted)] group-hover:text-[var(--accent)]'
                  }`}>
                    {item.icon}
                  </div>
                  <span className={`font-medium text-sm transition-colors duration-base ${isActive ? 'text-[var(--accent)]' : ''}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Navigation Lock */}
        <div className="p-4 border-t border-[var(--border-default)] mt-auto transition-colors duration-base">
          <NavLink 
            to="/"
            onClick={() => {
              if (isMobile) setIsSidebarOpen(false);
            }}
            className="group flex items-center justify-between px-4 py-3 rounded-[var(--radius-md)] transition-colors duration-base border border-[var(--border-default)] bg-[var(--surface-card)] hover:bg-[var(--surface-page)] hover:border-[var(--accent-subtle)]"
          >
            <div className="flex items-center gap-3">
              <div className="text-[var(--fg-muted)] group-hover:text-[var(--accent)] transition-colors duration-base">
                <ArrowRight size={18} className={dir === 'rtl' ? 'rotate-180' : ''} />
              </div>
              <span className="font-bold text-sm text-[var(--fg-secondary)] group-hover:text-[var(--fg-primary)] transition-colors duration-base">{t('home')}</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-[var(--radius-full)] bg-[var(--accent)] opacity-0 group-hover:opacity-100 transition-colors duration-base"></div>
          </NavLink>
        </div>
      </aside>
    </>
    );
};
