import React from 'react';
import {
  Globe,
  ShoppingBag,
  Tag,
  Clock,
  ArrowUpRight,
  Plus,
  TrendingDown,
  ExternalLink,
  History,
} from 'lucide-react';
import { DashboardStats, Alert, Product } from '../types';

interface OverviewViewProps {
  stats: DashboardStats;
  alerts: Alert[];
  onOpenAddModal: () => void;
  onSelectProductHistory: (product: Product) => void;
  onNavigateToAlerts: () => void;
  currency: string;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  stats,
  alerts,
  onOpenAddModal,
  onSelectProductHistory,
  onNavigateToAlerts,
  currency,
}) => {
  // Determine greeting based on local time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatLastScan = (scanTime: string | null) => {
    if (!scanTime) return 'Never';
    const date = new Date(scanTime);
    const diffMinutes = Math.round((Date.now() - date.getTime()) / 60000);
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 min ago';
    if (diffMinutes < 60) return `${diffMinutes} mins ago`;
    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const formatPrice = (amount: number, curr: string) => {
    return `${curr || currency} ${amount.toLocaleString()}`;
  };

  const recentAlerts = alerts.slice(0, 6);

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
            {getGreeting()}
          </h1>
          <p className="text-sm text-neutral-500 mt-1 font-normal">
            Your favorite stores, watched automatically.
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

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Monitored Websites */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/70 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium text-neutral-500">Monitored Websites</span>
            <Globe className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight tabular-nums">
            {stats.monitored_websites}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Active continuous checks
          </div>
        </div>

        {/* Products Discovered */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/70 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium text-neutral-500">Products Discovered</span>
            <ShoppingBag className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight tabular-nums">
            {stats.products_discovered}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Catalog items indexed
          </div>
        </div>

        {/* Active Sale Alerts */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/70 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium text-neutral-500">Active Sale Alerts</span>
            <Tag className="w-4 h-4 text-[#0071e3]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-neutral-900 tracking-tight tabular-nums">
            {stats.active_alerts}
          </div>
          <div className="text-[11px] text-[#0071e3] mt-1">
            Qualifying verified deals
          </div>
        </div>

        {/* Last Scan */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-neutral-200/70 shadow-xs">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium text-neutral-500">Last Scan</span>
            <Clock className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="text-lg sm:text-xl font-semibold text-neutral-900 tracking-tight mt-1 truncate">
            {formatLastScan(stats.last_scan)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1.5">
            Automatic background runner
          </div>
        </div>
      </div>

      {/* Recent Sale Alerts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 tracking-tight">Recent Sale Alerts</h2>
            <p className="text-xs text-neutral-500">Latest products verified at or above your discount threshold</p>
          </div>
          {alerts.length > 0 && (
            <button
              onClick={onNavigateToAlerts}
              className="text-xs font-medium text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 transition"
            >
              <span>View All ({alerts.length})</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {alerts.length === 0 ? (
          <div className="p-10 sm:p-14 rounded-2xl bg-white border border-neutral-200/70 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
              <TrendingDown className="w-6 h-6 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900 tracking-tight">No qualifying sales yet</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm leading-relaxed">
              Your stores are being monitored. We'll let you know when a great deal appears.
            </p>
            {stats.monitored_websites === 0 && (
              <button
                onClick={onOpenAddModal}
                className="mt-5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-medium rounded-xl transition shadow-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your First Store</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {recentAlerts.map(alert => (
              <div
                key={alert.id}
                className="p-4 rounded-2xl bg-white border border-neutral-200/70 hover:border-neutral-300 transition-all shadow-xs flex flex-col justify-between group"
              >
                <div>
                  <div className="flex gap-3">
                    {/* Product Image */}
                    {alert.image_url ? (
                      <img
                        src={alert.image_url}
                        alt={alert.product_name}
                        referrerPolicy="no-referrer"
                        className="w-20 h-20 object-cover rounded-xl bg-neutral-50 border border-neutral-100 shrink-0"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-400 shrink-0">
                        <ShoppingBag className="w-6 h-6 stroke-1" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-medium text-neutral-500 truncate">
                          {alert.website_name}
                        </span>
                        <span className="text-[11px] font-semibold text-[#0071e3] tabular-nums shrink-0">
                          {alert.discount_percentage}% OFF
                        </span>
                      </div>
                      <h4 className="text-xs font-semibold text-neutral-900 tracking-tight mt-0.5 line-clamp-2 leading-snug">
                        {alert.product_name}
                      </h4>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-sm font-bold text-neutral-900 tabular-nums">
                          {formatPrice(alert.sale_price, alert.currency)}
                        </span>
                        {(alert.regular_price || alert.original_price) > alert.sale_price && (
                          <span className="text-xs text-neutral-400 line-through tabular-nums" title="Regular retail price">
                            {formatPrice(alert.regular_price || alert.original_price, alert.currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card footer */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-neutral-100 text-[11px]">
                  <span className="text-neutral-400">
                    Detected {new Date(alert.detected_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        onSelectProductHistory({
                          id: alert.product_id,
                          website_id: alert.website_id,
                          website_name: alert.website_name,
                          name: alert.product_name,
                          product_url: alert.product_url,
                          image_url: alert.image_url,
                          currency: alert.currency,
                          regular_price: alert.regular_price || alert.original_price,
                          original_price: alert.regular_price || alert.original_price,
                          current_price: alert.sale_price,
                          previous_price: alert.previous_price,
                          discount_percentage: alert.discount_percentage,
                          is_verified_discount: true,
                          availability: 'in_stock',
                          last_seen_at: alert.detected_at,
                          created_at: alert.detected_at,
                        })
                      }
                      title="View Price History"
                      className="p-1 text-neutral-400 hover:text-neutral-700 transition"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={alert.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0071e3] hover:text-[#0077ed] font-medium flex items-center gap-1 transition"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
