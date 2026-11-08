import React, { useState, useMemo } from 'react';
import {
  Tag,
  ShoppingBag,
  ExternalLink,
  History,
  Check,
  ArrowUpDown,
  Filter,
  Search,
} from 'lucide-react';
import { Alert, Product } from '../types';
import { api } from '../api';

interface AlertsViewProps {
  alerts: Alert[];
  onSelectProductHistory: (product: Product) => void;
  onAlertUpdated: (updated: Alert) => void;
  currency: string;
}

export const AlertsView: React.FC<AlertsViewProps> = ({
  alerts,
  onSelectProductHistory,
  onAlertUpdated,
  currency,
}) => {
  const [filterThreshold, setFilterThreshold] = useState<number | 'all' | 'recent'>('all');
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'highest_discount' | 'newest' | 'lowest_price'>('highest_discount');
  const [keywordSearch, setKeywordSearch] = useState('');

  // Extract unique store names
  const storeNames = useMemo(() => {
    const set = new Set<string>();
    alerts.forEach(a => set.add(a.website_name));
    return Array.from(set);
  }, [alerts]);

  // Filter & Sort
  const filteredAlerts = useMemo(() => {
    let result = [...alerts];

    // Keyword search filter
    if (keywordSearch.trim()) {
      const q = keywordSearch.trim().toLowerCase();
      result = result.filter(a =>
        a.product_name.toLowerCase().includes(q) ||
        a.website_name.toLowerCase().includes(q)
      );
    }

    // Store filter
    if (selectedStore !== 'all') {
      result = result.filter(a => a.website_name === selectedStore);
    }

    // Threshold filter
    if (filterThreshold === 'recent') {
      // Last 24 hours
      const oneDayAgo = Date.now() - 24 * 3600 * 1000;
      result = result.filter(a => new Date(a.detected_at).getTime() >= oneDayAgo);
    } else if (typeof filterThreshold === 'number') {
      result = result.filter(a => a.discount_percentage >= filterThreshold);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'highest_discount') {
        return b.discount_percentage - a.discount_percentage;
      }
      if (sortBy === 'newest') {
        return new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime();
      }
      if (sortBy === 'lowest_price') {
        return a.sale_price - b.sale_price;
      }
      return 0;
    });

    return result;
  }, [alerts, selectedStore, filterThreshold, sortBy]);

  const handleMarkViewed = async (alert: Alert) => {
    try {
      const updated = await api.markAlertViewed(alert.id);
      onAlertUpdated(updated);
    } catch (err) {
      console.error('Failed to mark alert viewed:', err);
    }
  };

  const formatPrice = (amount: number, curr: string) => {
    return `${curr || currency} ${amount.toLocaleString()}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-neutral-900">
            Sale Alerts
          </h1>
          <p className="text-sm text-neutral-500 mt-1 font-normal">
            Verified fashion discounts matching or surpassing your configured criteria
          </p>
        </div>
      </div>

      {/* Filter and Sort Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-neutral-100">
        {/* Threshold Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-xl overflow-x-auto text-xs font-medium shrink-0">
          <button
            onClick={() => setFilterThreshold('all')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              filterThreshold === 'all'
                ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            All Deals ({alerts.length})
          </button>
          <button
            onClick={() => setFilterThreshold(50)}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              filterThreshold === 50
                ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            50%+
          </button>
          <button
            onClick={() => setFilterThreshold(60)}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              filterThreshold === 60
                ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            60%+
          </button>
          <button
            onClick={() => setFilterThreshold(70)}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              filterThreshold === 70
                ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            70%+
          </button>
          <button
            onClick={() => setFilterThreshold('recent')}
            className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
              filterThreshold === 'recent'
                ? 'bg-white text-neutral-900 shadow-2xs font-semibold'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            Last 24 Hours
          </button>
        </div>

        {/* Store, Search & Sort selectors */}
        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={keywordSearch}
              onChange={e => setKeywordSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-neutral-100 hover:bg-neutral-200/60 rounded-xl text-xs font-medium text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#0071e3] transition w-32 sm:w-40"
            />
          </div>

          {storeNames.length > 1 && (
            <div className="relative">
              <select
                value={selectedStore}
                onChange={e => setSelectedStore(e.target.value)}
                className="pl-2.5 pr-7 py-1.5 bg-neutral-100 hover:bg-neutral-200/60 rounded-xl text-xs font-medium text-neutral-700 focus:outline-none transition appearance-none cursor-pointer"
              >
                <option value="all">All Stores</option>
                {storeNames.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <ArrowUpDown className="w-3.5 h-3.5" />
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200/60 rounded-xl text-xs font-medium text-neutral-700 focus:outline-none transition cursor-pointer"
            >
              <option value="highest_discount">Highest Discount</option>
              <option value="newest">Newest Detected</option>
              <option value="lowest_price">Lowest Price</option>
            </select>
          </div>
        </div>
      </div>

      {/* Alerts Grid / List */}
      {filteredAlerts.length === 0 ? (
        <div className="p-10 sm:p-14 rounded-2xl bg-white border border-neutral-200/70 text-center flex flex-col items-center justify-center max-w-xl mx-auto shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
            <Tag className="w-6 h-6 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-semibold text-neutral-900 tracking-tight">No sale alerts found</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-sm leading-relaxed">
            {alerts.length === 0
              ? "Your monitored stores haven't dropped prices to your threshold yet. SaleWatch continues scanning in the background."
              : 'No items match the current filter selection.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAlerts.map(alert => {
            const isUnread = alert.status === 'new';

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-2xl bg-white border transition shadow-xs flex flex-col justify-between ${
                  isUnread
                    ? 'border-[#0071e3]/40 ring-1 ring-[#0071e3]/10'
                    : 'border-neutral-200/70 hover:border-neutral-300'
                }`}
              >
                <div>
                  <div className="flex gap-3.5">
                    {/* Image */}
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

                    {/* Metadata & Title */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-medium text-neutral-500 truncate">
                          {alert.website_name}
                        </span>
                        <span className="text-xs font-bold text-[#0071e3] tabular-nums shrink-0">
                          {alert.discount_percentage}% OFF
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-neutral-900 tracking-tight mt-1 line-clamp-2 leading-snug">
                        {alert.product_name}
                      </h4>

                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-sm font-bold text-neutral-900 tabular-nums">
                          {formatPrice(alert.sale_price, alert.currency)}
                        </span>
                        {(alert.regular_price || alert.original_price) > alert.sale_price && (
                          <span className="text-xs text-neutral-400 line-through tabular-nums" title="Regular non-discounted price">
                            {formatPrice(alert.regular_price || alert.original_price, alert.currency)}
                          </span>
                        )}
                        {alert.previous_price && alert.previous_price > alert.sale_price && alert.previous_price !== (alert.regular_price || alert.original_price) && (
                          <span className="text-[10px] text-[#0071e3] font-medium tabular-nums">
                            (was {formatPrice(alert.previous_price, alert.currency)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between pt-3 mt-3.5 border-t border-neutral-100 text-[11px]">
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <span>
                      {new Date(alert.detected_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {alert.notification_sent_at && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-600 font-medium">Notified</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isUnread && (
                      <button
                        onClick={() => handleMarkViewed(alert)}
                        title="Mark as viewed"
                        className="px-2 py-1 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Seen</span>
                      </button>
                    )}

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
                      title="Inspect price history"
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
                      <span>Store</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
