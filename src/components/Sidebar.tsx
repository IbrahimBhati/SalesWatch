import React from 'react';
import {
  LayoutDashboard,
  Globe,
  Tag,
  Settings as SettingsIcon,
  Send,
  Plus,
} from 'lucide-react';

export type NavTab = 'overview' | 'websites' | 'alerts' | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenAddModal: () => void;
  activeAlertsCount: number;
  telegramConnected: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddModal,
  activeAlertsCount,
  telegramConnected,
}) => {
  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'websites' as NavTab, label: 'Websites', icon: Globe },
    {
      id: 'alerts' as NavTab,
      label: 'Sale Alerts',
      icon: Tag,
      badge: activeAlertsCount > 0 ? activeAlertsCount : null,
    },
    { id: 'settings' as NavTab, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-neutral-200/80 bg-white min-h-screen px-4 py-6 justify-between select-none shrink-0">
      <div className="space-y-6">
        {/* Brand */}
        <div className="px-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-900 text-white flex items-center justify-center shadow-xs">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <span className="text-base font-semibold tracking-tight text-neutral-900 block leading-tight">
                SaleWatch
              </span>
              <span className="text-[11px] text-neutral-400 font-normal block">
                Never Miss a Great Deal
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="px-1">
          <button
            onClick={onOpenAddModal}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium rounded-xl shadow-xs transition duration-150 active:scale-[0.99]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Website</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-neutral-100/90 text-neutral-900 font-semibold'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#0071e3]' : 'text-neutral-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge !== null && item.badge !== undefined && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-neutral-900 text-white rounded-md tabular-nums">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Subtle Bottom Status */}
      <div className="px-3 pt-4 border-t border-neutral-100">
        <div className="flex items-center justify-between text-[11px] text-neutral-500">
          <div className="flex items-center gap-1.5">
            <Send className={`w-3.5 h-3.5 ${telegramConnected ? 'text-[#0071e3]' : 'text-neutral-400'}`} />
            <span>Telegram Bot</span>
          </div>
          <span
            className={`font-medium ${
              telegramConnected ? 'text-emerald-600' : 'text-neutral-400'
            }`}
          >
            {telegramConnected ? 'Active' : 'Unconfigured'}
          </span>
        </div>
      </div>
    </aside>
  );
};
