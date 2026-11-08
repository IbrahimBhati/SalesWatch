import React, { useState } from 'react';
import {
  Send,
  Sliders,
  Bell,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { AppSettings } from '../types';
import { api } from '../api';

interface SettingsViewProps {
  settings: AppSettings;
  onSettingsUpdated: (updated: AppSettings) => void;
  onRefreshData: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onSettingsUpdated,
  onRefreshData,
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...settings });
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // States for actions
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [telegramFeedback, setTelegramFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const [isScanningAll, setIsScanningAll] = useState(false);
  const [scanAllFeedback, setScanAllFeedback] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const updated = await api.updateSettings(formData);
      onSettingsUpdated(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!formData.telegram_bot_token || !formData.telegram_chat_id) {
      setTelegramFeedback({
        success: false,
        message: 'Please provide both Bot Token and Chat ID before testing.',
      });
      return;
    }

    setIsTestingTelegram(true);
    setTelegramFeedback(null);

    try {
      const res = await api.testTelegram({
        token: formData.telegram_bot_token,
        chat_id: formData.telegram_chat_id,
        currency: formData.currency,
      });

      if (res.success) {
        setTelegramFeedback({
          success: true,
          message: 'Test notification delivered to your Telegram app!',
        });
      } else {
        setTelegramFeedback({
          success: false,
          message: res.error || 'Failed to dispatch test notification.',
        });
      }
    } catch (err: any) {
      setTelegramFeedback({
        success: false,
        message: err.message || 'Error communicating with Telegram Bot API.',
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const handleScanAllNow = async () => {
    setIsScanningAll(true);
    setScanAllFeedback(null);
    try {
      const results = await api.scanAllWebsites();
      const totalFound = results.reduce((acc, r) => acc + (r.productsFound || 0), 0);
      const totalQualifying = results.reduce((acc, r) => acc + (r.qualifyingDeals || 0), 0);
      setScanAllFeedback(`All ${results.length} active stores scanned. Indexed ${totalFound} products, discovered ${totalQualifying} deals.`);
      onRefreshData();
    } catch (err: any) {
      setScanAllFeedback(`Batch scan failed: ${err.message}`);
    } finally {
      setIsScanningAll(false);
    }
  };

  const isTelegramConfigured = Boolean(formData.telegram_bot_token && formData.telegram_chat_id);

  return (
    <div className="space-y-8 max-w-3xl animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
          Settings
        </h1>
        <p className="text-sm text-neutral-500 mt-1 font-normal">
          Configure default thresholds, Telegram notifications, and scanner intervals
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Section 1: Telegram Notification Setup */}
        <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Telegram Bot Notifications</h3>
                <p className="text-xs text-neutral-500">Receive instant alerts on your phone or desktop when deals drop</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="text-xs text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 font-medium"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>{showGuide ? 'Hide Setup Guide' : 'Setup Guide'}</span>
            </button>
          </div>

          {/* Telegram Setup Guide Accordion */}
          {showGuide && (
            <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs text-neutral-700 space-y-2 leading-relaxed animate-in fade-in duration-150">
              <h4 className="font-semibold text-neutral-900">How to create and connect your Telegram Bot:</h4>
              <ol className="list-decimal pl-4 space-y-1.5 text-neutral-600">
                <li>Open Telegram and search for <strong>@BotFather</strong> (the official bot creator).</li>
                <li>Send the command <code className="px-1.5 py-0.5 bg-neutral-200/70 rounded text-[11px]">/newbot</code> and follow instructions to name your bot.</li>
                <li>Copy the provided <strong>API token</strong> (e.g. <code className="px-1.5 py-0.5 bg-neutral-200/70 rounded text-[11px]">7123456789:ABCdefGhI...</code>) and paste it into the Bot Token field below.</li>
                <li>Open your newly created bot in Telegram and press <strong>Start</strong> (or send <code className="px-1.5 py-0.5 bg-neutral-200/70 rounded text-[11px]">/start</code>).</li>
                <li>To obtain your Chat ID, message <strong>@userinfobot</strong> on Telegram; it will reply immediately with your numeric ID (e.g. <code className="px-1.5 py-0.5 bg-neutral-200/70 rounded text-[11px]">123456789</code>).</li>
                <li>Paste both values below and click <strong>Send Test Notification</strong>.</li>
              </ol>
            </div>
          )}

          {/* Enable Notifications Switch */}
          <div className="flex items-center justify-between py-2 border-y border-neutral-100">
            <div>
              <span className="text-xs font-medium text-neutral-900 block">Enable Telegram Alerts</span>
              <span className="text-[11px] text-neutral-500">Automatically dispatch alerts when deals cross your threshold</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.notification_enabled}
                onChange={e => setFormData({ ...formData, notification_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0071e3]"></div>
            </label>
          </div>

          {/* Bot Token & Chat ID fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Telegram Bot Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  placeholder="e.g. 7123456789:AAHq_xyz..."
                  value={formData.telegram_bot_token}
                  onChange={e => setFormData({ ...formData, telegram_bot_token: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-neutral-50/80 border border-neutral-200 rounded-xl text-sm font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-700"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Telegram Chat ID
              </label>
              <input
                type="text"
                placeholder="e.g. 123456789 or @your_channel"
                value={formData.telegram_chat_id}
                onChange={e => setFormData({ ...formData, telegram_chat_id: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-neutral-50/80 border border-neutral-200 rounded-xl text-sm font-mono text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition"
              />
            </div>
          </div>

          {/* Test notification feedback */}
          {telegramFeedback && (
            <div
              className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                telegramFeedback.success
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                  : 'bg-red-50 text-red-700 border border-red-200/60'
              }`}
            >
              {telegramFeedback.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{telegramFeedback.message}</span>
            </div>
          )}

          {/* Test Notification Trigger */}
          <div className="pt-1 flex items-center justify-between">
            <div className="text-xs text-neutral-500">
              {isTelegramConfigured ? (
                <span className="text-emerald-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Credentials entered</span>
                </span>
              ) : (
                <span>Enter credentials above to test</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleTestTelegram}
              disabled={isTestingTelegram || !formData.telegram_bot_token || !formData.telegram_chat_id}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isTestingTelegram ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Test...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Test Notification</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section 2: General & Currency Preferences */}
        <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">General Defaults</h3>
              <p className="text-xs text-neutral-500">Default tracking parameters applied when adding new websites</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Default Discount Threshold
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="95"
                  step="5"
                  value={formData.default_discount_threshold}
                  onChange={e => setFormData({ ...formData, default_discount_threshold: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-neutral-50/80 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition pr-8 tabular-nums"
                />
                <span className="absolute right-3 top-2 text-xs font-semibold text-neutral-400 pointer-events-none">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Default Scan Frequency
              </label>
              <select
                value={formData.default_scan_frequency}
                onChange={e => setFormData({ ...formData, default_scan_frequency: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-neutral-50/80 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition cursor-pointer"
              >
                <option value={1}>Every 1 hour</option>
                <option value={2}>Every 2 hours</option>
                <option value={3}>Every 3 hours</option>
                <option value={6}>Every 6 hours</option>
                <option value={12}>Every 12 hours</option>
                <option value={24}>Once daily</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Preferred Currency Symbol
              </label>
              <select
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 bg-neutral-50/80 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition cursor-pointer"
              >
                <option value="PKR">PKR (Rs.)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="AED">AED (Dirham)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Monitoring & Automation Controls */}
        <div className="p-6 rounded-2xl bg-white border border-neutral-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-neutral-900">Background Scanner Automation</h3>
              <p className="text-xs text-neutral-500">Autonomous scraping cadence and health checks</p>
            </div>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-neutral-100">
            <div>
              <span className="text-xs font-medium text-neutral-900 block">Automatic Background Scanning</span>
              <span className="text-[11px] text-neutral-500">Check stores at scheduled intervals without requiring active browser sessions</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.auto_scan_enabled}
                onChange={e => setFormData({ ...formData, auto_scan_enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0071e3]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-2 border-t border-neutral-100">
            <div>
              <span className="text-xs font-medium text-neutral-900 block">Scan Failure Notifications</span>
              <span className="text-[11px] text-neutral-500">Report if a monitored store goes offline or changes its page layout</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.scan_failure_notifications}
                onChange={e => setFormData({ ...formData, scan_failure_notifications: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0071e3]"></div>
            </label>
          </div>

          {/* Manual Run All Action */}
          <div className="pt-3 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-neutral-500">
              Need to test all stores right away?
            </span>
            <button
              type="button"
              onClick={handleScanAllNow}
              disabled={isScanningAll}
              className="px-3.5 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanningAll ? 'animate-spin text-[#0071e3]' : ''}`} />
              <span>{isScanningAll ? 'Scanning All Stores...' : 'Scan All Stores Now'}</span>
            </button>
          </div>

          {scanAllFeedback && (
            <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200/60 text-xs text-neutral-700">
              {scanAllFeedback}
            </div>
          )}
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {saveSuccess ? (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings saved successfully</span>
            </span>
          ) : (
            <span />
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 text-xs font-medium text-white bg-[#0071e3] hover:bg-[#0077ed] rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
