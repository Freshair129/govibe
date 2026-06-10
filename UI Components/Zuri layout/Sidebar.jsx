'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X, ChevronRight, LogOut, LayoutDashboard, Settings } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { useLanguage } from '@/context/LanguageContext';
import modules, { getModuleFromPath } from '@/config/modules';

export default function Sidebar({ mobileOpen = false, onClose }) {
  const pathname = usePathname();
  const activeModuleKey = getModuleFromPath(pathname);
  const activeModule = activeModuleKey ? modules[activeModuleKey] : null;
  const subFeatures = activeModule ? activeModule.subFeatures : [];
  const { tenant } = useTenant();
  const { language, t } = useLanguage();
  const [isHovered, setIsHovered] = useState(false);

  // Consider mobile open as expanded
  const isExpanded = isHovered || mobileOpen;

  const isActive = (path) => {
    if (!pathname) return false;
    return pathname === path || pathname.startsWith(path + '/');
  };

  const isModuleActive = (key) => key === activeModuleKey;

  return (
    <>
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col 
          glass-sidebar-dark border-r border-white/10
          transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)]
          ${mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full w-20'}
          md:relative md:translate-x-0 ${isExpanded ? 'md:w-64' : 'md:w-20'}
          shadow-2xl
        `}
      >
        {/* Header: Module Context + close (mobile) */}
        <div className="flex items-center h-16 px-5 border-b border-white/5 shrink-0 overflow-hidden">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-white/5 text-[var(--brand)] font-bold shadow-inner shrink-0">
              {activeModule ? <activeModule.icon className="h-5 w-5" /> : <LayoutDashboard className="h-5 w-5" />}
            </div>
            <div className={`transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <span className="text-base font-bold text-white tracking-tight whitespace-nowrap">
                {activeModuleKey ? t(activeModuleKey) : t('dashboard')}
              </span>
              <p className="text-[10px] text-white/40 leading-none mt-0.5">{t('menu')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="md:hidden ml-auto p-2 rounded-lg text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Contextual Sub-Feature Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar py-4 px-3 space-y-1">
          {subFeatures.map((sub) => {
            const active = isActive(sub.path);

            return (
              <Link
                key={sub.path}
                href={sub.path}
                onClick={mobileOpen ? onClose : undefined}
                className={`
                  flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
                  transition-all duration-300 group relative
                  ${active
                    ? 'bg-[var(--brand)] text-white shadow-[0_0_15px_var(--brand-glow)]'
                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <sub.icon className={`h-5 w-5 shrink-0 transition-transform ${active ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className={`truncate transition-opacity duration-300 ${isExpanded ? 'opacity-100 font-semibold' : 'opacity-0'}`}>
                  {t(sub.label.toLowerCase()) !== sub.label.toLowerCase() ? t(sub.label.toLowerCase()) : sub.label}
                </span>

                {/* Indicator for collapsed active state */}
                {active && !isExpanded && (
                  <div className="absolute -left-3 w-1.5 h-6 bg-[var(--brand)] rounded-r-full shadow-[0_0_10px_var(--brand)]" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer: Settings & Sign out */}
        <div className="p-3 border-t border-white/5 space-y-1">
          <Link
            href="/settings"
            onClick={mobileOpen ? onClose : undefined}
            className={`
              flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
              transition-all duration-300 group relative
              ${isActive('/settings')
                ? 'bg-white/10 text-white'
                : 'text-white/40 hover:bg-white/5 hover:text-white'
              }
            `}
          >
            <Settings className="h-5 w-5 shrink-0 transition-transform group-hover:rotate-90 duration-500" />
            <span className={`truncate transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
              {t('settings')}
            </span>
          </Link>

          <button
            onClick={() => signOut()}
            className={`
              w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium
              text-white/40 hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group
            `}
          >
            <LogOut className="h-5 w-5 shrink-0 group-hover:-translate-x-1 transition-transform" />
            <span className={`truncate transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
              {t('sign_out')}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
