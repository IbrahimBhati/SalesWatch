import React, { useState } from 'react';
import { X, Globe, Check, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../api';
import { Website } from '../types';

interface AddWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onWebsiteAdded: (site: Website) => void;
  defaultThreshold: number;
  defaultFrequency: number;
}

export const AddWebsiteModal: React.FC<AddWebsiteModalProps> = ({
  isOpen,
  onClose,
  onWebsiteAdded,
  defaultThreshold,
  defaultFrequency,
}) => {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [threshold, setThreshold] = useState(defaultThreshold || 50);
  const [frequency, setFrequency] = useState(defaultFrequency || 3);

  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    isValid?: boolean;
    storeName?: string;
    message?: string;
    favicon?: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleValidateUrl = async (urlToValidate: string) => {
    if (!urlToValidate || urlToValidate.trim().length < 4) return;
    setIsValidating(true);
    setValidationResult(null);
    setError(null);

    try {
      const res = await api.validateUrl(urlToValidate.trim());
      setValidationResult(res);
      if (res.isValid && res.storeName && !name) {
        setName(res.storeName);
      }
    } catch (err: any) {
      setValidationResult({ isValid: false, message: err.message || 'Validation failed' });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) {
      setError('Please provide a website URL.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newSite = await api.addWebsite({
        url: url.trim(),
        name: name.trim() || undefined,
        discount_threshold: Number(threshold),
        scan_frequency: Number(frequency),
      });
      onWebsiteAdded(newSite);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add website. Please check the URL.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setUrl('');
    setName('');
    setValidationResult(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-neutral-200/80 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 tracking-tight">Add Clothing Store</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Enter the store URL to begin automated discount tracking</p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50/80 border border-red-200/60 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Website URL */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Website URL <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-neutral-400">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                placeholder="e.g. pk.khaadi.com or store.example.com"
                value={url}
                onChange={e => setUrl(e.target.value)}
                onBlur={() => handleValidateUrl(url)}
                className="w-full pl-9 pr-24 py-2.5 bg-neutral-50/80 border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition"
              />
              <button
                type="button"
                onClick={() => handleValidateUrl(url)}
                disabled={isValidating || !url}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-neutral-200/70 hover:bg-neutral-200 text-neutral-700 text-xs font-medium rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Verifying</span>
                  </>
                ) : (
                  <span>Verify</span>
                )}
              </button>
            </div>

            {/* Validation State feedback */}
            {validationResult && (
              <div className="mt-2 text-xs flex items-center gap-1.5">
                {validationResult.isValid ? (
                  <div className="flex items-center gap-1 text-emerald-600">
                    <Check className="w-3.5 h-3.5" />
                    <span>Website verified ({validationResult.storeName || 'Online'})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-amber-600">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{validationResult.message || 'Unable to connect to website'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Store Name */}
          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">
              Store Name <span className="text-neutral-400 font-normal">(optional, auto-detected)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Khaadi, Zara, Asos"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-50/80 border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition"
            />
          </div>

          {/* Discount Threshold & Scan Frequency Grid */}
          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Discount Threshold
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="95"
                  step="5"
                  value={threshold}
                  onChange={e => setThreshold(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-neutral-50/80 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition pr-8 tabular-nums"
                />
                <span className="absolute right-3 top-2.5 text-xs font-semibold text-neutral-400 pointer-events-none">%</span>
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">Alert when discount is ≥ this value</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                Scan Frequency
              </label>
              <select
                value={frequency}
                onChange={e => setFrequency(Number(e.target.value))}
                className="w-full px-3 py-2 bg-neutral-50/80 border border-neutral-200 rounded-xl text-sm font-medium text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition"
              >
                <option value={1}>Every 1 hour</option>
                <option value={2}>Every 2 hours</option>
                <option value={3}>Every 3 hours (Recommended)</option>
                <option value={6}>Every 6 hours</option>
                <option value={12}>Every 12 hours</option>
                <option value={24}>Once daily</option>
              </select>
              <p className="text-[11px] text-neutral-400 mt-1">Background scan cadence</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-medium text-white bg-[#0071e3] hover:bg-[#0077ed] rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Adding Store...</span>
                </>
              ) : (
                <span>Start Monitoring</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
