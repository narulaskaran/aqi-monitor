import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../server/src/index';

// Get the base URL based on the environment
const getBaseUrl = () => {
  console.log('Environment variables:', {
    DEV: import.meta.env.DEV,
    PROD: import.meta.env.PROD,
    VITE_VERCEL_URL: import.meta.env.VITE_VERCEL_URL,
    VITE_VERCEL_ENV: import.meta.env.VITE_VERCEL_ENV,
    windowDefined: typeof window !== 'undefined',
    windowLocation: typeof window !== 'undefined' ? window.location.origin : 'no window',
  });

  // Check if we're running on a Vercel domain
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    console.log('Vercel domain detected, using window.location.origin');
    return window.location.origin;
  }

  // In development (localhost), use localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    console.log('Development environment detected');
    return 'http://localhost:3000';
  }

  // Fallback to window location for all other cases
  console.log('Falling back to window.location.origin:', window.location.origin);
  return window.location.origin;
};

// Add logging to the TRPC client creation as well
export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
      // Add headers to ensure proper content type
      headers: () => {
        const headers = {
          'Content-Type': 'application/json',
        };
        console.log('Request headers:', headers);
        return headers;
      },
    }),
  ],
});

// Log the final TRPC client configuration
console.log('TRPC client configured with base URL:', getBaseUrl()); 