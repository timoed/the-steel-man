// In any environment (Product or Dev), we want to use the Explicit URL if provided.
// If explicitly provided (Vercel Env Var), use it.
// Otherwise, fallback to localhost:3000 (standard local dev).

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
