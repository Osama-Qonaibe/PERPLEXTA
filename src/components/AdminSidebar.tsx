import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Activity, Key, Database, Cpu, Landmark, 
  CreditCard, Users, Settings, Mail, ArrowRight,
  Send, Brain, ShoppingBag, ShieldAlert, UserPlus, Megaphone, Shield
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const AdminSidebar: React.FC<{ activeLanguage?: string }> = ({ activeLanguage }) => {
  const { t, user, theme, language: globalLang } = useAppContext();

  const language = activeLanguage || globalLang;
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const isSupport = user?.role === 'support';

  const navItems = [
    { icon: <Activity size={18} />, label: t('commandCenter'), path: '/admin/dashboard' },
    ...(!isSupport ? [
      { icon: <Shield size={18} />, label: language === 'ar' ? 'رادار الأمان' : 'Security Radar', path: '/admin/radar' },
      { icon: <Activity size={18} />, label: language === 'ar' ? 'مقاييس الأداء ورندر' : 'Render & Latency Metrics', path: '/admin/metrics' },
      { icon: <Key size={18} />, label: t('aiInfrastructure'), path: '/admin/keys' },
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
    <aside 
      className={`fixed top-[72px] bottom-0 h-[calc(100dvh-72px)] flex flex-col z-[70] shadow-2xl bg-[var(--bg-base)] border-[var(--border)] ${
        dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r'
      } translate-x-0 visible transition-colors`}
      style={{ width: isMobile ? '68%' : '240px', maxWidth: isMobile ? '260px' : 'none' }}
    >
        <nav className="flex-1 px-3 space-y-1 pt-[25px] overflow-y-auto custom-scrollbar scroll-smooth">
          {navItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] transition-theme border border-transparent ${
                isActive
                  ? 'bg-accent/10 text-accent border-accent/10 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]'
              }`
            }
            >
              {({ isActive }) => (
                <>
                  <div className={`transition-theme ${
                    isActive 
                      ? 'text-accent' 
                      : 'text-[var(--text-muted)] group-hover:text-accent'
                  }`}>
                    {item.icon}
                  </div>
                  <span className={`font-medium text-sm transition-colors ${isActive ? 'text-accent' : ''}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Navigation Lock */}
        <div className="p-4 border-t border-[var(--border)] mt-auto transition-colors">
          <NavLink 
            to="/"
            className="group flex items-center justify-between px-4 py-3 rounded-[var(--radius)] transition-theme border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-base)] hover:border-accent/30 shadow-sm hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="text-[var(--text-muted)] group-hover:text-accent transition-theme">
                <ArrowRight size={18} className={dir === 'rtl' ? 'rotate-180' : ''} />
              </div>
              <span className="font-bold text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{t('home')}</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-accent opacity-0 group-hover:opacity-100 transition-theme"></div>
          </NavLink>
        </div>
      </aside>
    );
};
