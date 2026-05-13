import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Activity, Key, Database, Cpu, Landmark, 
  CreditCard, Users, Settings, Mail, ArrowRight,
  Send
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';

export const AdminSidebar: React.FC<{ activeLanguage?: string }> = ({ activeLanguage }) => {
  const { t, user, theme, language: globalLang } = useAppContext();

  // Use locked language for stable transitions
  const language = activeLanguage || globalLang;
  const dir = language === 'ar' ? 'rtl' : 'ltr';

  const isSupport = user?.role === 'support';

  const navItems = [
    { icon: <Activity size={18} />, label: t('commandCenter'), path: '/admin/dashboard' },
    ...(!isSupport ? [
      { icon: <Key size={18} />, label: t('aiInfrastructure'), path: '/admin/keys' },
      { icon: <Database size={18} />, label: t('dbOrchestration'), path: '/admin/databases' },
      { icon: <Cpu size={18} />, label: t('toolOrchestrator'), path: '/admin/orchestrator' },
      { icon: <Landmark size={18} />, label: t('financeVault'), path: '/admin/finance' },
      { icon: <CreditCard size={18} />, label: t('plansSubscriptions'), path: '/admin/plans' },
    ] : []),
    { icon: <Users size={18} />, label: t('userManagement'), path: '/admin/users' },
    ...(!isSupport ? [
      { icon: <Mail size={18} />, label: t('smartEmailHub'), path: '/admin/emails' },
      { icon: <Send size={18} />, label: t('smartBroadcast'), path: '/admin/broadcast' },
      { icon: <Settings size={18} />, label: t('systemSettings'), path: '/admin/settings' },
    ] : []),
  ];

  const isMobile = window.innerWidth < 768;

  return (
    <aside 
      className={`fixed top-[72px] bottom-0 h-[calc(100vh-72px)] flex flex-col z-[70] shadow-2xl ${
        theme === 'dark' ? 'border-gray-800 bg-[#0f0f11]' : 'border-gray-200 bg-white'
      } ${dir === 'rtl' ? 'right-0 border-l' : 'left-0 border-r'} translate-x-0 visible`}
      style={{ width: isMobile ? '68%' : '240px', maxWidth: isMobile ? '260px' : 'none' }}
    >
        <nav className="flex-1 px-3 space-y-1 pt-[25px] overflow-y-auto custom-scrollbar scroll-smooth">
          {navItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-[4px] transition-all duration-300 border border-transparent ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.05)]'
                    : `text-gray-400 hover:text-gray-900 dark:hover:text-white ${theme === 'dark' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-50'}`
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className={`transition-all duration-300 ${
                    isActive 
                      ? 'text-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' 
                      : 'group-hover:text-emerald-500 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                  }`}>
                    {item.icon}
                  </div>
                  <span className={`font-medium text-sm transition-colors duration-300 ${isActive ? 'text-emerald-500' : ''}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Navigation Lock */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800/60 mt-auto">
          <NavLink 
            to="/"
            className={`group flex items-center justify-between px-4 py-3 rounded-[4px] transition-all duration-300 border border-transparent ${theme === 'dark' ? 'bg-[#1a1a1c] hover:bg-gray-800/50 border-gray-800/60 hover:border-emerald-500/30' : 'bg-gray-50 hover:bg-white border-gray-200 shadow-sm hover:shadow-md'}`}
          >
            <div className="flex items-center gap-3">
              <div className="text-gray-400 group-hover:text-emerald-500 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">
                <ArrowRight size={18} className={dir === 'rtl' ? 'rotate-180' : ''} />
              </div>
              <span className={`font-bold text-sm ${theme === 'dark' ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'}`}>{t('home')}</span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
          </NavLink>
        </div>
      </aside>
    );
};
