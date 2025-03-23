import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '../../server/src/index';

// In development, we want to use the full URL
const getBaseUrl = () => {
  // Always use the full URL in development
  return 'http://localhost:3000';
};

export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/trpc`,
      // Add headers to ensure proper content type
      headers: () => ({
        'Content-Type': 'application/json',
      }),
    }),
  ],
}); 