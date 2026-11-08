import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Plus, Loader2 } from 'lucide-react';
import { Sidebar, NavTab } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { OverviewView } from './views/OverviewView';
import { WebsitesView } from './views/WebsitesView';
import { AlertsView } from './views/AlertsView';
import { SettingsView } from './views/SettingsView';
import { AddWebsiteModal } from './components/AddWebsiteModal';
import { EditWebsiteModal } from './components/EditWebsiteModal';
import { PriceHistoryModal } from './components/PriceHistoryModal';
import { Website, Alert, AppSettings, DashboardStats, Product } from './types';
import { api } from './api';

const DEFAULT_STATS: DashboardStats = {
  monitored_websites: 0,
  products_discovered: 0,
  active_alerts: 0,
  last_scan: null,
};

const DEFAULT_SETTINGS: AppSettings = {
  default_discount_threshold: 50,
  default_scan_frequency: 3,
  telegram_bot_token: '',
  telegram_chat_id: '',
  notification_enabled: true,
  currency: 'PKR',
  auto_scan_enabled: true,
  scan_failure_notifications: true,
};

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [stats, setStats] = useState<DashboardStats>(DEFAULT_STATS);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [selectedProductHistory, setSelectedProductHistory] = useState<Product | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [fetchedStats, fetchedWebsites, fetchedAlerts, fetchedSettings] = await Promise.all([
        api.getStats().catch(() => DEFAULT_STATS),
        api.getWebsites().catch(() => []),
        api.getAlerts().catch(() => []),
        api.getSettings().catch(() => DEFAULT_SETTINGS),
      ]);

      setStats(fetchedStats);
      setWebsites(fetchedWebsites);
      setAlerts(fetchedAlerts);
      setSettings(fetchedSettings);
    } catch (err) {
      console.error('Failed to load SaleWatch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Subtle background refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const activeAlertsCount = alerts.filter(a => a.status === 'new').length;
  const isTelegramConnected = Boolean(settings.telegram_bot_token && settings.telegram_chat_id);

  const handleWebsiteAdded = (newSite: Website) => {
    setWebsites(prev => [newSite, ...prev]);
    loadData();
  };

  const handleWebsiteDeleted = (id: string) => {
    setWebsites(prev => prev.filter(w => w.id !== id));
    loadData();
  };

  const handleWebsiteUpdated = (updated: Website) => {
    setWebsites(prev => prev.map(w => (w.id === updated.id ? updated : w)));
    loadData();
  };

  const handleAlertUpdated = (updated: Alert) => {
    setAlerts(prev => prev.map(a => (a.id === updated.id ? updated : a)));
    loadData();
  };

  return (
    <div className="min-h-screen bg-[#fbfbfd] text-[#1d1d1f] flex flex-col md:flex-row antialiased selection:bg-[#0071e3]/15">
      {/* Desktop Minimal Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        activeAlertsCount={activeAlertsCount}
        telegramConnected={isTelegramConnected}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3.5 bg-white/80 backdrop-blur-md border-b border-neutral-200/80 sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
              <Tag className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-neutral-900">SaleWatch</span>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0071e3] text-white text-xs font-medium rounded-lg shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Store</span>
          </button>
        </header>

        {/* Viewport Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-10 max-w-6xl w-full mx-auto pb-24 md:pb-12">
          {isLoading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3 text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin text-[#0071e3]" />
              <span className="text-xs font-medium">Loading monitoring system...</span>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && (
                <OverviewView
                  stats={stats}
                  alerts={alerts}
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  onSelectProductHistory={setSelectedProductHistory}
                  onNavigateToAlerts={() => setActiveTab('alerts')}
                  currency={settings.currency}
                />
              )}

              {activeTab === 'websites' && (
                <WebsitesView
                  websites={websites}
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  onEditWebsite={setEditingWebsite}
                  onWebsiteDeleted={handleWebsiteDeleted}
                  onWebsiteUpdated={handleWebsiteUpdated}
                  onRefreshData={loadData}
                />
              )}

              {activeTab === 'alerts' && (
                <AlertsView
                  alerts={alerts}
                  onSelectProductHistory={setSelectedProductHistory}
                  onAlertUpdated={handleAlertUpdated}
                  currency={settings.currency}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  settings={settings}
                  onSettingsUpdated={updated => {
                    setSettings(updated);
                    loadData();
                  }}
                  onRefreshData={loadData}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        activeAlertsCount={activeAlertsCount}
      />

      {/* Modals */}
      <AddWebsiteModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onWebsiteAdded={handleWebsiteAdded}
        defaultThreshold={settings.default_discount_threshold}
        defaultFrequency={settings.default_scan_frequency}
      />

      <EditWebsiteModal
        website={editingWebsite}
        isOpen={Boolean(editingWebsite)}
        onClose={() => setEditingWebsite(null)}
        onUpdated={handleWebsiteUpdated}
      />

      <PriceHistoryModal
        product={selectedProductHistory}
        isOpen={Boolean(selectedProductHistory)}
        onClose={() => setSelectedProductHistory(null)}
      />
    </div>
  );
}
