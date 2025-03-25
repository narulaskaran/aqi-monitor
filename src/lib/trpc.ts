import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../server/src/index';

// Get the base URL based on the environment
const getBaseUrl = () => {
  // Check if we're running on a Vercel domain
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
    return window.location.origin;
  }

  // In development (localhost), use localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }

  // Fallback to window location for all other cases
  return window.location.origin;
};

// Add logging to the TRPC client creation as well
export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
      headers: () => ({
        'Content-Type': 'application/json',
      }),
    }),
  ],
});

// Log the final TRPC client configuration
console.log('TRPC client configured with base URL:', getBaseUrl()); 