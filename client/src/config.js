// In production (Vercel), API routes are at /api
// In development, they're at localhost:3001
export const API_URL = import.meta.env.VITE_API_URL || 
    (import.meta.env.PROD ? '/api' : 'http://localhost:3001');
