import React, { useEffect, useState } from 'react';
import { X, TrendingDown, ArrowDownRight, Loader2, Calendar } from 'lucide-react';
import { Product, PriceHistory } from '../types';
import { api } from '../api';

interface PriceHistoryModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PriceHistoryModal: React.FC<PriceHistoryModalProps> = ({
  product,
  isOpen,
  onClose,
}) => {
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (product && isOpen) {
      setLoading(true);
      api.getPriceHistory(product.id)
        .then(setHistory)
        .catch(err => console.error('Failed to load history:', err))
        .finally(() => setLoading(false));
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const formatPrice = (val: number) => {
    return `${product.currency} ${val.toLocaleString()}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-neutral-200/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-3">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="w-12 h-12 object-cover rounded-xl border border-neutral-100 bg-neutral-50"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400">
                <TrendingDown className="w-5 h-5" />
              </div>
            )}
            <div className="max-w-xs">
              <h3 className="text-sm font-semibold text-neutral-900 tracking-tight truncate">{product.name}</h3>
              <p className="text-xs text-neutral-500 mt-0.5">{product.website_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Price Summary Banner */}
        <div className="px-6 py-4 bg-neutral-50/60 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">Current Price</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-xl font-bold text-neutral-900 tabular-nums">{formatPrice(product.current_price)}</span>
              {(product.regular_price || product.original_price) > product.current_price && (
                <span className="text-xs text-neutral-400 line-through tabular-nums">
                  Regular: {formatPrice(product.regular_price || product.original_price)}
                </span>
              )}
            </div>
          </div>
          {product.discount_percentage > 0 && (
            <div className="text-right">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider block">Verified Discount</span>
              <div className="flex items-center justify-end gap-1 text-sm font-semibold text-[#0071e3] mt-0.5">
                <ArrowDownRight className="w-4 h-4" />
                <span>{product.discount_percentage}% OFF</span>
              </div>
              <span className="text-[10px] text-neutral-400 block mt-0.5">Calculated from regular price</span>
            </div>
          )}
        </div>

        {/* History List */}
        <div className="p-6">
          <h4 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
              <span>Price Log History</span>
            </div>
            <span className="text-[10px] text-neutral-400 font-normal">Tracking verified price drops</span>
          </h4>

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#0071e3]" />
              <span className="text-xs">Loading recorded prices...</span>
            </div>
          ) : history.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">
              Only initial discovery price recorded so far. Price shifts will be plotted on future scans.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {history.map((record, idx) => (
                <div
                  key={record.id || idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-neutral-50/80 border border-neutral-100 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-500 tabular-nums">
                      {new Date(record.recorded_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {record.is_new_drop ? (
                      <span className="text-[10px] text-[#0071e3] font-medium bg-[#0071e3]/10 px-1.5 py-0.5 rounded">
                        Price Drop
                      </span>
                    ) : record.price_change === 0 ? (
                      <span className="text-[10px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">
                        Stable
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    {(record.regular_price || record.original_price) > record.current_price && (
                      <span className="text-neutral-400 line-through tabular-nums">
                        {formatPrice(record.regular_price || record.original_price)}
                      </span>
                    )}
                    <span className="font-semibold text-neutral-900 tabular-nums">
                      {formatPrice(record.current_price)}
                    </span>
                    {record.discount_percentage > 0 && (
                      <span className="font-medium text-[#0071e3] tabular-nums">
                        -{record.discount_percentage}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/40">
          <a
            href={product.product_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium text-[#0071e3] hover:underline"
          >
            Visit Original Product Page →
          </a>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
