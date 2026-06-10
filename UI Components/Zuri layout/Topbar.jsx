'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronDown, LogOut, User, Menu, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTenant } from '@/context/TenantContext';
import { useTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import modules, { getModuleFromPath, getModuleList } from '@/config/modules';

export default function Topbar({ user = null, onMenuToggle }) {
  const pathname = usePathname();
  const activeModuleKey = getModuleFromPath(pathname);
  const moduleList = getModuleList();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notificationCount] = useState(3);
  const { tenant } = useTenant();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();

  const activeLabel = activeModuleKey ? modules[activeModuleKey]?.label : t('dashboard');

  return (
    <header className="glass-topbar h-16 shrink-0 z-40 sticky top-0 shadow-sm">
      <div className="h-full flex items-center justify-between px-4 sm:px-6">
        
        {/* Left: Branding & Hamburger (mobile) */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0 pr-2 md:pr-4 border-none md:border-r border-white/10 shrink-0">
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 -ml-2 rounded-xl text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            aria-label={t('open_menu')}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] text-white font-bold text-base shrink-0 shadow-[0_0_15px_var(--brand-glow)]">
              {tenant?.name?.[0]?.toUpperCase() ?? 'Z'}
            </div>
            <div className="hidden sm:block">
              <span className="block text-sm font-bold text-white tracking-tight whitespace-nowrap">
                {tenant?.name ?? 'Zuri SME'}
              </span>
              <p className="text-[10px] text-white/40 leading-none mt-0.5 whitespace-nowrap">{t('business_intelligence')}</p>
            </div>
          </div>
        </div>

        {/* Center-Left: Module Line */}
        <nav className="flex-1 overflow-x-auto scrollbar-hide flex items-center gap-1 sm:gap-2 px-4 sm:px-6 shrink-0 md:shrink border-r border-white/10 mr-2 md:mr-4 h-full">
          {moduleList.map(({ key, label, icon: Icon, subFeatures }) => {
            const active = activeModuleKey === key;
            const baseHref = subFeatures.find(f => f.label === 'Dashboard')?.path ?? subFeatures[0]?.path ?? `/${key}`;
            return (
              <Link
                key={key}
                href={baseHref}
                className={`
                  glass-nav-item min-w-[72px] sm:min-w-[80px] h-[56px] relative
                  ${active ? 'active' : 'hover:bg-white/5'}
                `}
              >
                <Icon className={`h-5 w-5 transition-all duration-300 ${active ? 'text-[var(--brand)]' : 'text-white/50'}`} />
                <span className={`glass-nav-label whitespace-nowrap transition-all duration-300 ${active ? 'text-[var(--brand)]' : 'text-white/40'}`}>
                  {t(key) !== key ? t(key) : label}
                </span>

                {/* Active Indicator Underline */}
                <div className="glass-nav-indicator" />
              </Link>
            );
          })}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="group relative p-2.5 rounded-xl text-white/50 hover:bg-white/5 hover:text-white transition-all duration-300"
            aria-label={t('theme_toggle')}
          >
            <div className="relative h-5 w-5 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.div
                  key={theme}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'backOut' }}
                  whileHover={{ 
                    scale: 1.25,
                    filter: 'drop-shadow(0 0 8px var(--brand-glow))',
                    color: 'var(--brand)'
                  }}
                  className="absolute"
                >
                  {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </motion.div>
              </AnimatePresence>
            </div>
          </button>

          {/* Language Switcher */}
          <button 
            onClick={toggleLanguage}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-white/40 hover:text-white hover:bg-white/5 transition-all duration-300 border border-white/10 group"
            aria-label={t('language_switcher')}
          >
            <span className={`text-[11px] font-bold tracking-widest transition-colors ${language === 'th' ? 'text-[var(--brand)]' : 'group-hover:text-white'}`}>TH</span>
            <span className="text-[10px] opacity-20 whitespace-pre"> | </span>
            <span className={`text-[11px] font-bold tracking-widest transition-colors ${language === 'en' ? 'text-[var(--brand)]' : 'group-hover:text-white'}`}>EN</span>
          </button>

          {/* Notifications */}
          <button 
            className="relative p-2.5 rounded-xl text-white/50 hover:bg-white/5 hover:text-white transition-colors"
            aria-label={t('notifications')}
          >
            <Bell className="h-5 w-5" />
            {notificationCount > 0 && (
              <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand)] text-[10px] font-bold text-white shadow-[0_0_8px_var(--brand-glow)]">
                {notificationCount}
              </span>
            )}
          </button>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu((v) => !v)}
              className="flex items-center gap-3 p-1 pr-2 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[var(--brand)] to-[var(--brand-dark)] flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                {user?.name?.[0]?.toUpperCase() ?? 'U'}
              </div>
              <div className="hidden sm:block text-left min-w-0 pr-1">
                <p className="text-sm font-bold text-white truncate leading-tight">
                  {user?.name ?? t('sme_owner')}
                </p>
                <p className="text-[10px] text-white/40 leading-none mt-0.5 truncate uppercase tracking-widest">
                  {user?.email ?? user?.role ?? t('owner_role')}
                </p>
              </div>
              <ChevronDown className={`h-4 w-4 text-white/30 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-white/5 z-20 py-2 animate-entrance">
                  <div className="px-4 py-2 border-b border-gray-50 dark:border-white/5 mb-1">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{user?.name ?? t('sme_owner')}</p>
                    <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest mt-1">{user?.role ?? t('owner_role')}</p>
                  </div>
                  <Link
                    href="/settings"
                    onClick={() => setShowUserMenu(false)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-[var(--brand-surface)] hover:text-[var(--brand-dark)] transition-colors"
                  >
                    <User className="h-4 w-4" /> {t('my_account')}
                  </Link>
                  <div className="my-1 border-t border-gray-50 dark:border-white/5" />
                  <button
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" /> {t('sign_out')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
