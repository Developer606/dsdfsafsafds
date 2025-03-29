/**
 * Cache service for high-traffic optimization
 * Implements a caching layer to reduce database load
 */
import NodeCache from "node-cache";
import { StatusCodes } from "http-status-codes";

// Default cache settings
const DEFAULT_TTL = 60; // 60 seconds
const CHECK_PERIOD = 120; // Clean up expired keys every 2 minutes

// Create cache with default settings - optimized for high-throughput
export const cache = new NodeCache({
  stdTTL: DEFAULT_TTL, 
  checkperiod: CHECK_PERIOD,
  useClones: false, // Disable cloning for better performance
  maxKeys: 10000, // Maximum number of keys to store
});

// Namespaced cache keys to avoid collisions
const createKey = (namespace: string, id: string | number) => `${namespace}:${id}`;

/**
 * Get item from cache or generate it with callback
 */
export async function getOrSet<T>(
  namespace: string,
  id: string | number,
  callback: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  const key = createKey(namespace, id);
  const cached = cache.get<T>(key);
  
  if (cached !== undefined) {
    return cached;
  }
  
  try {
    const result = await callback();
    cache.set(key, result, ttl);
    return result;
  } catch (error) {
    console.error(`Cache generation error for ${key}:`, error);
    throw error;
  }
}

/**
 * Invalidate a specific cache entry
 */
export function invalidate(namespace: string, id: string | number): boolean {
  return cache.del(createKey(namespace, id)) > 0;
}

/**
 * Invalidate all entries in a namespace
 */
export function invalidateNamespace(namespace: string): void {
  const keys = cache.keys().filter(key => key.startsWith(`${namespace}:`));
  if (keys.length > 0) {
    cache.del(keys);
  }
}

/**
 * Express middleware for caching routes
 * @param ttl TTL in seconds
 * @param keyGenerator Function to generate cache key from request
 */
export function cacheMiddleware(
  ttl: number = DEFAULT_TTL,
  keyGenerator?: (req: any) => string
) {
  return (req: any, res: any, next: any) => {
    // Skip cache if method is not GET
    if (req.method !== "GET") {
      return next();
    }
    
    // Generate cache key
    const key = keyGenerator 
      ? keyGenerator(req)
      : `route:${req.originalUrl || req.url}`;
    
    // Check cache
    const cachedResponse = cache.get(key);
    if (cachedResponse) {
      return res.status(StatusCodes.OK).json(cachedResponse);
    }
    
    // Store original json method
    const originalJson = res.json;
    
    // Override json method to cache response
    res.json = function(body: any) {
      if (res.statusCode < 400) {
        cache.set(key, body, ttl);
      }
      return originalJson.call(this, body);
    };
    
    next();
  };
}

/**
 * Clear entire cache
 */
export function clearCache(): void {
  cache.flushAll();
}

/**
 * Cache statistics
 */
export function getCacheStats() {
  return {
    keys: cache.keys().length,
    hits: cache.getStats().hits,
    misses: cache.getStats().misses,
    ksize: cache.getStats().ksize,
    vsize: cache.getStats().vsize,
  };
}