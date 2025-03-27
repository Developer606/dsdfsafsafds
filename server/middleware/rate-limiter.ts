import { Request, Response, NextFunction } from "express";

// Simple in-memory rate limiter
interface RateLimit {
  count: number;
  resetTime: number;
}

// Store rate limits by IP address or user ID
const rateLimits = new Map<string, RateLimit>();

// Clean up rate limiter data periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, limit] of rateLimits.entries()) {
    if (limit.resetTime <= now) {
      rateLimits.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * Rate limiting middleware factory
 * @param maxRequests Maximum number of requests allowed in the time window
 * @param timeWindow Time window in milliseconds
 * @param keyGenerator Function to generate a key for the rate limit (defaults to IP address)
 * @returns Express middleware function
 */
export function rateLimiter(
  maxRequests: number = 100,
  timeWindow: number = 60000, // 1 minute in milliseconds
  keyGenerator: (req: Request) => string = (req) => 
    req.ip || req.socket.remoteAddress || "unknown"
) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get key for this request (IP address, user ID, etc.)
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Get or create rate limit for this key
    let rateLimit = rateLimits.get(key);
    if (!rateLimit || rateLimit.resetTime <= now) {
      // Create a new rate limit if none exists or the existing one has expired
      rateLimit = {
        count: 0,
        resetTime: now + timeWindow
      };
    }
    
    // Increment count and check if limit is exceeded
    rateLimit.count++;
    rateLimits.set(key, rateLimit);
    
    // Set rate limit headers
    res.setHeader("X-RateLimit-Limit", maxRequests.toString());
    res.setHeader("X-RateLimit-Remaining", Math.max(0, maxRequests - rateLimit.count).toString());
    res.setHeader("X-RateLimit-Reset", Math.ceil(rateLimit.resetTime / 1000).toString());
    
    if (rateLimit.count > maxRequests) {
      return res.status(429).json({
        error: "Too many requests, please try again later",
        retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000)
      });
    }
    
    next();
  };
}

/**
 * Special rate limiter for messaging endpoints
 * Uses user ID as the key instead of IP to better protect against spam
 */
export function messageRateLimiter(
  maxRequests: number = 50, // Maximum 50 messages per minute
  timeWindow: number = 60000 // 1 minute window
) {
  return rateLimiter(
    maxRequests,
    timeWindow,
    (req) => {
      // Use user ID from authenticated session as the key
      if (req.user && req.user.id) {
        return `user_${req.user.id}`;
      }
      // Fall back to IP if no user ID is available
      return req.ip || req.socket.remoteAddress || "unknown";
    }
  );
}

/**
 * Rate limiter for authentication endpoints
 * More restrictive to prevent brute force attacks
 */
export function authRateLimiter() {
  return rateLimiter(
    30, // Maximum 30 auth attempts
    300000 // In a 5 minute window
  );
}