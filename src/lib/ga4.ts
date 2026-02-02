/**
 * Google Analytics 4 (gtag.js). Loads only when VITE_GA_MEASUREMENT_ID is set.
 * Uses the correct URL: https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX
 */

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function initGA4(): void {
  if (!GA_MEASUREMENT_ID || typeof document === 'undefined') return;

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID);
}
