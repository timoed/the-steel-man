// In Production (Vercel Monorepo), API is on same domain, so use relative path.
// In Development, we use localhost:3000.

export const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3000';
