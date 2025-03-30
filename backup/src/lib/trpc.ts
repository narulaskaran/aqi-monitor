import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

// Define AppRouter type inline for simplicity
type AppRouter = {
  startVerification: {
    mutate: (input: { phone: string; zipCode: string }) => Promise<{ success: boolean; status?: string; error?: string }>;
  };
  verifyCode: {
    mutate: (input: { phone: string; zipCode: string; code: string }) => Promise<{ success: boolean; valid?: boolean; status?: string; error?: string }>;
  };
  fetchAirQuality: {
    query: (input: { latitude: number; longitude: number }) => Promise<{ index: number; category: string; dominantPollutant: string }>;
  };
  getSubscriptions: {
    query: () => Promise<any[]>;
  };
};

// Always use localhost for development
const baseUrl = 'http://localhost:3000';
console.log('TRPC client configured with base URL:', baseUrl);

// Simple TRPC client with basic logging
export const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${baseUrl}/trpc`,
      fetch: async (url, options) => {
        // Log request
        console.log(`Request to ${url}`);
        
        try {
          const response = await fetch(url, options);
          console.log(`Response status: ${response.status}`);
          return response;
        } catch (error) {
          console.error('Fetch error:', error);
          throw error;
        }
      },
    }),
  ],
});