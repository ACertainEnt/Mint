/**
 * MINT Protocol Application URL Configuration
 *
 * Production default: https://mintverse.vercel.app
 * Dynamically resolves to window.location.origin in browser environments
 * while falling back to the configured production URL for SSR or static links.
 */

export const PRODUCTION_APP_URL = 'https://mintverse.vercel.app';

export function getPublicAppUrl(): string {
  // 1. Environment variable if explicitly specified
  const envUrl = (import.meta as any).env?.VITE_APP_URL || (import.meta as any).env?.APP_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/$/, '');
  }

  // 2. Browser window origin if available (supports local development on localhost or Cloud Run preview)
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }

  // 3. Fallback to production deployment URL
  return PRODUCTION_APP_URL;
}
