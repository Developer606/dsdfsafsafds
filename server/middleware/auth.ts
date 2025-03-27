import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JWTPayload } from '../utils/jwt';
import { storage } from '../storage';

// No need to redefine Express.User as it's already defined in server/auth.ts

/**
 * Middleware to verify JWT tokens and authenticate users
 */
export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  // Get token from authorization header
  const token = extractTokenFromHeader(req.header('Authorization'));
  
  if (!token) {
    return res.status(401).json({ 
      error: 'Authentication required',
      redirectTo: '/login'
    });
  }
  
  // Verify token
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ 
      error: 'Invalid or expired token',
      redirectTo: '/login'
    });
  }
  
  // Add user info to request object
  // Need to fetch complete user from database since JWT only contains essential fields
  storage.getUser(decoded.id)
    .then(user => {
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          redirectTo: '/login'
        });
      }
      req.user = user;
      next();
    })
    .catch(error => {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Authentication error' });
    });
}

/**
 * Middleware to check if user is an admin
 */
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Middleware to check if a user is blocked
 */
export async function checkBlockedStatus(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return next();
  }
  
  try {
    const user = await storage.getUser(req.user.id);
    if (user?.isBlocked) {
      return res.status(403).json({
        error: 'Your account has been blocked. Please contact support.',
      });
    }
    next();
  } catch (error) {
    console.error('Error checking blocked status:', error);
    next();
  }
}