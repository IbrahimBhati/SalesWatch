import React, { useState } from 'react';
import {
  Globe,
  Plus,
  RefreshCw,
  Pause,
  Play,
  Sliders,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShoppingBag,
  Loader2,
} from 'lucide-react';
import { Website } from '../types';
import { api } from '../api';

interface WebsitesViewProps {
  websites: Website[];
  onOpenAddModal: () => void;
  onEditWebsite: (website: Website) => void;
  onWebsiteDeleted: (id: string) => void;
  onWebsiteUpdated: (website: Website) => void;
  onRefreshData: () => void;
}

export const WebsitesView: React.FC<WebsitesViewProps> = ({
  websites,
  onOpenAddModal,
  onEditWebsite,
  onWebsiteDeleted,
  onWebsiteUpdated,
  onRefreshData,
}) => {
  const [scanningSiteId, setScanningSiteId] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<{ id: string; text: string; isError?: boolean } | null>(null);
  const [deletingSite, setDeletingSite] = useState<Website | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleScanNow = async (site: Website) => {
    setScanningSiteId(site.id);
    setScanMessage(null);
    try {
      const res = await api.scanWebsite(site.id);
      if (res.success) {
        setScanMessage({
          id: site.id,
          text: `Scan complete: ${res.productsFound} products discovered, ${res.newSalesDetected || 0} real new sales detected${
            res.stableDiscountsIgnored ? ` (${res.stableDiscountsIgnored} stable discounts ignored)` : ''
          }.`,
        });
      } else {
        setScanMessage({
          id: site.id,
          text: res.error || 'Scan encountered an issue.',
          isError: true,
        });
      }
      onRefreshData();
    } catch (err: any) {
      setScanMessage({
        id: site.id,
        text: err.message || 'Scan failed',
        isError: true,
      });
    } finally {
      setScanningSiteId(null);
    }
  };

  const handleTogglePause = async (site: Website) => {
    const nextStatus = site.status === 'active' ? 'paused' : 'active';
    try {
      const updated = await api.updateWebsite(site.id, { status: nextStatus });
      onWebsiteUpdated(updated);
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingSite) return;
    setIsDeleting(true);
    try {
      await api.deleteWebsite(deletingSite.id);
      onWebsiteDeleted(deletingSite.id);
      setDeletingSite(null);
    } catch (err: any) {
      console.error('Failed to delete website:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatScanTime = (isoTime: string | null) => {
    if (!isoTime) return 'Pending scan';
    const d = new Date(isoTime);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
            Monitored Websites
          </h1>
          <p className="text-sm text-neutral-500 mt-1 font-normal">
            Manage your fashion stores and customize discount thresholds
          </p>
        </div>
        <button
          onClick={onOpenAddModal}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2 bg-[#0071e3] hover:bg-[#0077ed] text-white text-xs font-medium rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Add Website</span>
        </button>
      </div>

      {/* Website List */}
      {websites.length === 0 ? (
        <div className="p-10 sm:p-14 rounded-2xl bg-white border border-neutral-200/70 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
            <Globe className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-semibold text-neutral-900 tracking-tight">No websites tracked yet</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm leading-relaxed">
            Add a clothing store URL to automatically monitor products for price cuts.
          </p>
          <button
            onClick={onOpenAddModal}
            className="mt-5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-xl transition shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Store URL</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {websites.map(site => {
            const isScanning = scanningSiteId === site.id;
            const message = scanMessage?.id === site.id ? scanMessage : null;

            return (
              <div
                key={site.id}
                className="p-5 rounded-2xl bg-white border border-neutral-200/70 hover:border-neutral-300/90 transition shadow-xs"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Store Identity */}
                  <div className="flex items-start gap-3.5 min-w-0">
                    <img
                      src={site.favicon || `https://www.google.com/s2/favicons?domain=${new URL(site.url).hostname}&sz=64`}
                      alt={site.name}
                      onError={e => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                      className="w-10 h-10 rounded-xl object-contain p-1 border border-neutral-100 bg-neutral-50 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-neutral-900 tracking-tight truncate">
                          {site.name}
                        </h3>
                        {/* Status Label (Clean text, no bulky pills) */}
                        <div className="flex items-center gap-1.5 text-xs">
                          {site.status === 'active' && (
                            <span className="flex items-center gap-1 text-emerald-600 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </span>
                          )}
                          {site.status === 'paused' && (
                            <span className="flex items-center gap-1 text-neutral-400 font-medium">
                              <Pause className="w-3.5 h-3.5" />
                              <span>Paused</span>
                            </span>
                          )}
                          {site.status === 'error' && (
                            <span className="flex items-center gap-1 text-red-600 font-medium">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>Attention Required</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500 flex-wrap">
                        <a
                          href={site.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-neutral-900 flex items-center gap-1 transition truncate max-w-xs"
                        >
                          <span>{site.url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                        <span aria-hidden="true" className="text-neutral-300">·</span>
                        <span>Threshold: <strong className="font-semibold text-neutral-800">{site.discount_threshold}%+</strong></span>
                        <span aria-hidden="true" className="text-neutral-300">·</span>
                        <span>Every {site.scan_frequency}h</span>
                        {site.keywords && site.keywords.length > 0 && (
                          <>
                            <span aria-hidden="true" className="text-neutral-300">·</span>
                            <span className="text-[#0071e3]">
                              Keywords: <strong>{site.keywords.join(', ')}</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Operational Metrics & Actions */}
                  <div className="flex items-center gap-3 sm:gap-4 self-end lg:self-auto flex-wrap">
                    {/* Scan Schedule info */}
                    <div className="text-right hidden sm:block text-xs">
                      <div className="text-neutral-400 flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Last scan: {formatScanTime(site.last_scanned_at)}</span>
                      </div>
                      <div className="text-neutral-500 mt-0.5">
                        Next: {site.status === 'active' ? formatScanTime(site.next_scan_at) : 'Paused'}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleScanNow(site)}
                        disabled={isScanning}
                        title="Scan now"
                        className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-4 h-4 ${isScanning ? 'animate-spin text-[#0071e3]' : ''}`} />
                      </button>

                      <button
                        onClick={() => handleTogglePause(site)}
                        title={site.status === 'active' ? 'Pause monitoring' : 'Resume monitoring'}
                        className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition"
                      >
                        {site.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>

                      <button
                        onClick={() => onEditWebsite(site)}
                        title="Edit threshold and frequency"
                        className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition"
                      >
                        <Sliders className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeletingSite(site)}
                        title="Remove website"
                        className="p-2 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Scan Feedback Banner */}
                {message && (
                  <div
                    className={`mt-3.5 p-3 rounded-xl text-xs flex items-center gap-2 ${
                      message.isError
                        ? 'bg-red-50 text-red-700 border border-red-200/60'
                        : 'bg-neutral-50 text-neutral-800 border border-neutral-200/60'
                    }`}
                  >
                    {message.isError ? (
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span>{message.text}</span>
                  </div>
                )}

                {/* Stored Error Diagnostic */}
                {site.error_message && (
                  <div className="mt-3 p-2.5 rounded-xl bg-red-50/70 border border-red-200/60 text-xs text-red-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Scraper note: {site.error_message}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Delete */}
      {deletingSite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs transition animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-neutral-200 p-6 space-y-4">
            <h3 className="text-base font-semibold text-neutral-900">Remove {deletingSite.name}?</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Are you sure you want to stop monitoring this website? All discovered products and price history for this store will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSite(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition flex items-center gap-1.5"
              >
                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Remove Website</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
