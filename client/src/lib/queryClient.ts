import { QueryClient, QueryFunction } from "@tanstack/react-query";

/**
 * Custom API error class with additional metadata
 */
export class ApiError extends Error {
  status: number;
  statusText: string;
  responseText: string;
  url: string;
  
  constructor(status: number, statusText: string, responseText: string, url: string) {
    super(`${status}: ${responseText || statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.responseText = responseText;
    this.url = url;
  }
  
  get isNetworkError(): boolean {
    return this.status === 0 || this.status === 502 || this.status === 503 || this.status === 504;
  }
  
  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403;
  }
  
  get isRateLimitError(): boolean {
    return this.status === 429;
  }
}

/**
 * Validate response and throw a detailed error if not OK
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    // Create detailed error object for better error handling
    throw new ApiError(res.status, res.statusText, text, res.url);
  }
}

/**
 * Enhanced API request function with better error handling
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  retryCount: number = 0
): Promise<Response> {
  const maxRetries = 2; // Maximum number of automatic retries
  
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Log detailed error information
    console.error(`API Request failed (${method} ${url}):`, error);

    // Auto-retry for network errors or 5xx server errors
    if (retryCount < maxRetries && 
        (error instanceof ApiError && (error.isNetworkError || error.status >= 500))) {
      console.log(`Automatically retrying request (attempt ${retryCount + 1}/${maxRetries})...`);
      // Exponential backoff: 500ms, 1000ms, etc.
      await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
      return apiRequest(method, url, data, retryCount + 1);
    }
    
    // Re-throw the error for the caller to handle
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
