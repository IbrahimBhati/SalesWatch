import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Website } from '../types';
import { api } from '../api';

interface EditWebsiteModalProps {
  website: Website | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (site: Website) => void;
}

export const EditWebsiteModal: React.FC<EditWebsiteModalProps> = ({
  website,
  isOpen,
  onClose,
  onUpdated,
}) => {
  const [threshold, setThreshold] = useState(website?.discount_threshold || 50);
  const [frequency, setFrequency] = useState(website?.scan_frequency || 3);
  const [name, setName] = useState(website?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (website) {
      setThreshold(website.discount_threshold);
      setFrequency(website.scan_frequency);
      setName(website.name);
      setError(null);
    }
  }, [website]);

  if (!isOpen || !website) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const updated = await api.updateWebsite(website.id, {
        name: name.trim() || website.name,
        discount_threshold: Number(threshold),
        scan_frequency: Number(frequency),
      });
      onUpdated(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update website');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-xs transition-opacity animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-neutral-200/80 overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-semibold text-neutral-900 tracking-tight">Edit Store Settings</h3>
            <p className="text-xs text-neutral-500 mt-0.5">{website.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-xs text-red-700 border border-red-200/60">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1.5">Store Display Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-neutral-50/80 border border-neutral-200 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-[#0071e3]/30 focus:border-[#0071e3] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
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
                <option value={3}>Every 3 hours</option>
                <option value={6}>Every 6 hours</option>
                <option value={12}>Every 12 hours</option>
                <option value={24}>Once daily</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-medium text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-medium text-white bg-[#0071e3] hover:bg-[#0077ed] rounded-xl shadow-xs transition flex items-center gap-1.5"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
