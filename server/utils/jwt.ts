import jwt from 'jsonwebtoken';

// Secret key for JWT token signing
// In a production environment, this should be stored in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Define the payload structure
export interface JWTPayload {
  id: number;
  email: string;
  username: string;
  isAdmin: boolean;
}

/**
 * Generate a JWT token for a user
 * @param payload User information to include in the token
 * @returns Signed JWT token
 */
export function generateToken(payload: JWTPayload): string {
  // Type assertion to any to bypass TypeScript's strict checking
  return jwt.sign(payload, JWT_SECRET as any, { expiresIn: '1d' } as any);
}

/**
 * Verify a JWT token
 * @param token JWT token to verify
 * @returns Decoded payload or null if invalid
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    // Type assertion to any to bypass TypeScript's strict checking
    const decoded = jwt.verify(token, JWT_SECRET as any) as JWTPayload;
    return decoded;
  } catch (error) {
    console.error('Error verifying JWT token:', error);
    return null;
  }
}

/**
 * Extract token from Authorization header
 * @param authHeader Authorization header value
 * @returns JWT token or null if not found
 */
export function extractTokenFromHeader(authHeader?: string): string | null {
  if (!authHeader) return null;
  
  // Format should be "Bearer [token]"
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Generate a refresh token (for extended sessions)
 * @param userId User ID to associate with the refresh token
 * @returns Signed refresh token
 */
export function generateRefreshToken(userId: number): string {
  // Type assertion to any to bypass TypeScript's strict checking
  return jwt.sign({ id: userId }, JWT_SECRET as any, { expiresIn: '7d' } as any);
}

/**
 * Create a token that expires quickly, for sensitive operations
 * @param payload Data to include in the token
 * @param expiresIn Expiration time (defaults to 15 minutes)
 * @returns Short-lived token
 */
export function generateShortLivedToken(payload: any, expiresIn: string = '15m'): string {
  // Type assertion to any to bypass TypeScript's strict checking
  return jwt.sign(payload, JWT_SECRET as any, { expiresIn } as any);
}