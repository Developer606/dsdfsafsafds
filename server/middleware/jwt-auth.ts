import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, JWTPayload } from '../utils/jwt';
import { storage } from '../storage';

/**
 * Middleware to verify JWT tokens and authenticate users
 * This is separate from session-based authentication
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
  
  // Fetch full user from database
  storage.getUser(decoded.id)
    .then(user => {
      if (!user) {
        return res.status(401).json({ 
          error: 'User not found',
          redirectTo: '/login'
        });
      }
      
      // Use req.locals instead of req.user to avoid conflicts with passport
      (req as any).jwtUser = user;
      next();
    })
    .catch(error => {
      console.error('Error fetching user:', error);
      res.status(500).json({ error: 'Authentication error' });
    });
}

/**
 * Middleware to check if JWT user is an admin
 */
export function jwtIsAdmin(req: Request, res: Response, next: NextFunction) {
  const jwtUser = (req as any).jwtUser;
  
  if (!jwtUser || !jwtUser.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * Middleware to check if a JWT user is blocked
 */
export async function jwtCheckBlockedStatus(req: Request, res: Response, next: NextFunction) {
  const jwtUser = (req as any).jwtUser;
  
  if (!jwtUser) {
    return next();
  }
  
  try {
    const user = await storage.getUser(jwtUser.id);
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