import { Website, Product, Alert, AppSettings, DashboardStats, PriceHistory } from './types';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${res.status}`);
  }

  return res.json();
}

export const api = {
  // Stats
  getStats: () => fetchJson<DashboardStats>('/api/stats'),

  // Websites
  getWebsites: () => fetchJson<Website[]>('/api/websites'),
  validateUrl: (url: string) =>
    fetchJson<{ isValid: boolean; normalizedUrl: string; storeName: string; favicon?: string; message?: string }>(
      '/api/websites/validate',
      {
        method: 'POST',
        body: JSON.stringify({ url }),
      }
    ),
  addWebsite: (data: { url: string; name?: string; discount_threshold?: number; scan_frequency?: number }) =>
    fetchJson<Website>('/api/websites', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateWebsite: (id: string, updates: Partial<Website>) =>
    fetchJson<Website>(`/api/websites/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteWebsite: (id: string) =>
    fetchJson<{ success: boolean; message: string }>(`/api/websites/${id}`, {
      method: 'DELETE',
    }),
  scanWebsite: (id: string) =>
    fetchJson<any>(`/api/websites/${id}/scan`, {
      method: 'POST',
    }),
  scanAllWebsites: () =>
    fetchJson<any[]>('/api/scan/all', {
      method: 'POST',
    }),

  // Products
  getProducts: (params?: { website_id?: string; min_discount?: number }) => {
    const query = new URLSearchParams();
    if (params?.website_id) query.append('website_id', params.website_id);
    if (params?.min_discount) query.append('min_discount', String(params.min_discount));
    return fetchJson<Product[]>(`/api/products?${query.toString()}`);
  },
  getPriceHistory: (productId: string) => fetchJson<PriceHistory[]>(`/api/products/${productId}/history`),

  // Alerts
  getAlerts: () => fetchJson<Alert[]>('/api/alerts'),
  markAlertViewed: (id: string) =>
    fetchJson<Alert>(`/api/alerts/${id}/view`, {
      method: 'PATCH',
    }),

  // Settings
  getSettings: () => fetchJson<AppSettings>('/api/settings'),
  updateSettings: (settings: Partial<AppSettings>) =>
    fetchJson<AppSettings>('/api/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    }),
  testTelegram: (data?: { token?: string; chat_id?: string; currency?: string }) =>
    fetchJson<{ success: boolean; message?: string; error?: string }>('/api/telegram/test', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
};
