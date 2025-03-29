import { Request, Response, NextFunction } from 'express';
import { StatusError } from '../encryption-routes';

/**
 * Global error handler middleware for encryption-related API routes
 * Ensures consistent error responses and proper error logging
 */
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('API Error:', err);
  
  if (err instanceof StatusError) {
    return res.status(err.status).json({
      error: err.message
    });
  }
  
  // For other types of errors, return a generic 500 response
  return res.status(500).json({
    error: 'An unexpected error occurred'
  });
}