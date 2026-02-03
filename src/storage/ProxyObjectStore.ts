/**
 * Object store that proxies uploads through a Netlify Function (same-origin, no CORS).
 * Use when VITE_USE_UPLOAD_PROXY=true (e.g. on Netlify where direct Firebase Storage hits CORS).
 */
import type { IObjectStore } from './IObjectStore';

const UPLOAD_FN = '/.netlify/functions/upload-logo';

export const ProxyObjectStore: IObjectStore = {
  async upload(tenantId: string, path: string, blob: Blob): Promise<string> {
    const form = new FormData();
    form.append('tenantId', tenantId);
    form.append('file', blob, path.split('/').pop() || 'file');
    const res = await fetch(UPLOAD_FN, { method: 'POST', body: form });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error || `Upload failed: ${res.status}`);
    }
    const data = (await res.json()) as { key: string; url?: string };
    if (!data.key) throw new Error('Upload response missing key');
    return data.key;
  },

  async getUrl(_tenantId: string, key: string): Promise<string> {
    const res = await fetch(`${UPLOAD_FN}?key=${encodeURIComponent(key)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string };
      throw new Error(err.error || `Get URL failed: ${res.status}`);
    }
    const data = (await res.json()) as { url: string };
    if (!data.url) throw new Error('Response missing url');
    return data.url;
  },

  isConfigured(): boolean {
    return true;
  },
};
