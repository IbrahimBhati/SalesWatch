import React from 'react';
import { LayoutDashboard, Globe, Tag, Settings as SettingsIcon } from 'lucide-react';
import { NavTab } from './Sidebar';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  activeAlertsCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  activeAlertsCount,
}) => {
  const tabs = [
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'websites' as NavTab, label: 'Websites', icon: Globe },
    {
      id: 'alerts' as NavTab,
      label: 'Alerts',
      icon: Tag,
      badge: activeAlertsCount > 0 ? activeAlertsCount : null,
    },
    { id: 'settings' as NavTab, label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-neutral-200/80 px-2 py-1.5 flex items-center justify-around">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelectTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition relative ${
              isActive ? 'text-[#0071e3]' : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {tab.badge !== null && tab.badge !== undefined && (
                <span className="absolute -top-1 -right-2 px-1 text-[9px] font-bold bg-[#0071e3] text-white rounded-full tabular-nums">
                  {tab.badge}
                </span>
              )}
            </div>
            <span className="text-[10px] font-medium mt-0.5">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};
