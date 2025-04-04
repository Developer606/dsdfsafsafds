import express from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getGoogleOAuthCredentials } from '../utils/oauth-config';
import { storage } from '../storage';
import { randomBytes } from 'crypto';
import { hashPassword } from '../auth';

// Add a simple declaration 
declare module 'passport-google-oauth20' {
  namespace Strategy {
    interface Profile {
      id: string;
      displayName: string;
      name?: {
        familyName?: string;
        givenName?: string;
      };
      emails?: Array<{ value: string; type?: string }>;
      photos?: Array<{ value: string }>;
      provider: string;
      _raw: string;
      _json: any;
    }
  }
}

const router = express.Router();

// Initialize Google OAuth Strategy
export async function initializeGoogleStrategy() {
  try {
    const googleConfig = await getGoogleOAuthCredentials();
    
    // Log the callback URL for debugging
    console.log('Google OAuth callback URL:', googleConfig.callbackURL);
    
    if (!googleConfig.clientId || !googleConfig.clientSecret) {
      console.warn('Google OAuth credentials are missing or incomplete. Google authentication will not work.');
      return false;
    }
    
    // Log successful retrieval of credentials
    console.log('Google OAuth credentials loaded successfully', { 
      clientIdExists: !!googleConfig.clientId,
      clientSecretExists: !!googleConfig.clientSecret 
    });
    
    // Configure Google Strategy
    passport.use(
      new GoogleStrategy(
        {
          clientID: googleConfig.clientId,
          clientSecret: googleConfig.clientSecret,
          callbackURL: googleConfig.callbackURL,
          // Request expanded profile information including demographics where available
          scope: ['profile', 'email', 'https://www.googleapis.com/auth/user.birthday.read', 'https://www.googleapis.com/auth/user.gender.read'],
          // Enable proxy support for proper handling behind Replit's proxy server
          proxy: true,
          // Add passReqToCallback to access the request object in the callback
          passReqToCallback: true
        },
        async (req: express.Request, accessToken: string, refreshToken: string, profile: any, done: (error: Error | null, user?: any) => void) => {
          try {
            console.log('Google profile data received:', JSON.stringify(profile, null, 2));
            
            // Extract basic profile information
            const email = profile.emails && profile.emails[0] ? profile.emails[0].value : '';
            const displayName = profile.displayName || '';
            const firstName = profile.name?.givenName || '';
            const lastName = profile.name?.familyName || '';
            
            // Extract additional demographic information if available
            // Note: These fields are only available if the user has shared this data in their Google account
            // and the app has been granted the appropriate permissions
            let age = null;
            let gender = null;
            
            // Try to extract birthday to calculate age
            if (profile._json?.birthday) {
              try {
                const birthday = new Date(profile._json.birthday);
                const today = new Date();
                age = today.getFullYear() - birthday.getFullYear();
                // Adjust age if birthday hasn't occurred yet this year
                if (today.getMonth() < birthday.getMonth() || 
                    (today.getMonth() === birthday.getMonth() && today.getDate() < birthday.getDate())) {
                  age--;
                }
              } catch (err) {
                console.warn('Could not parse birthday from Google profile:', err);
              }
            }
            
            // Try to extract gender information
            if (profile._json?.gender) {
              gender = profile._json.gender.toLowerCase();
              // Map Google's gender format to our application's format
              if (gender === 'male' || gender === 'female') {
                // These match our format directly
              } else if (gender === 'other') {
                // Map to non-binary or other based on our app's options
                gender = 'non-binary';
              } else {
                // Default to prefer-not-to-say for any other values
                gender = 'prefer-not-to-say';
              }
            }
            
            if (!email) {
              return done(new Error('Could not retrieve email from Google profile'));
            }
            
            // Check if user already exists
            let user = await storage.getUserByEmail(email);
            
            if (user) {
              // User exists, update last login time with IP tracking
              const clientIP = (req.headers['x-forwarded-for'] || req.ip) as string;
              await storage.updateLastLogin(user.id, clientIP);
              console.log(`Google OAuth user ${email} logged in from IP: ${clientIP}`);
              return done(null, user);
            } else {
              // Create a new user
              const username = email.split('@')[0] + '_' + randomBytes(3).toString('hex');
              
              // Generate random secure password for OAuth users
              const password = randomBytes(16).toString('hex');
              const hashedPwd = await hashPassword(password);
              
              // Create user in database with all available profile data from Google
              // Check if we have enough profile data to mark the profile as completed
              const hasCompleteProfile = !!gender && !!age && age >= 13;
              
              // Create basic user with required fields
              const userData: any = {
                username,
                email,
                password: hashedPwd,
                fullName: displayName || `${firstName} ${lastName}`.trim(),
                role: 'user',
                isAdmin: false,
                isEmailVerified: true, // Auto-verify OAuth users since email is verified by Google
                profileCompleted: hasCompleteProfile, // Mark profile as completed if we have all required info
                subscriptionStatus: 'trial'
              };
              
              // Add optional demographic fields if available
              if (age && age >= 13) userData.age = age;
              if (gender) userData.gender = gender;
              if (profile._json?.tagline) userData.bio = profile._json.tagline;
              
              // Create the user with all available data
              user = await storage.createUser(userData);
              
              return done(null, user);
            }
          } catch (error) {
            console.error('Google authentication error:', error);
            return done(error as Error);
          }
        }
      )
    );
    
    return true;
  } catch (error) {
    console.error('Error initializing Google strategy:', error);
    return false;
  }
}

// Routes for Google authentication
router.get(
  '/google',
  passport.authenticate('google', { 
    scope: [
      'profile', 
      'email',
      'https://www.googleapis.com/auth/user.birthday.read',
      'https://www.googleapis.com/auth/user.gender.read'
    ] 
  })
);

router.get(
  '/google/callback',
  (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // Check for error in query parameters from Google's OAuth server
    if (req.query.error) {
      console.error('Google returned an error:', req.query);
      
      // Handle specific error types
      if (req.query.error === 'redirect_uri_mismatch') {
        console.error('CRITICAL ERROR: Redirect URI mismatch. The callback URL configured in Google Cloud Console does not match the one used by the application.');
        return res.redirect('/?auth=failed&reason=redirect_uri_mismatch&message=Configuration+error');
      }
      
      return res.redirect(`/?auth=failed&reason=${req.query.error}`);
    }
    
    // Log the incoming callback request for detailed debugging
    console.log('Google callback received:', {
      query: req.query,
      path: req.path,
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
      headers: {
        host: req.headers.host,
        referer: req.headers.referer,
        origin: req.headers.origin
      }
    });
    
    // Custom callback to handle authentication with better error feedback
    passport.authenticate('google', (err: Error | null, user: any, info: any) => {
      if (err) {
        console.error('Google OAuth error:', err);
        
        // Look for specific error messages related to redirect_uri_mismatch
        const errorMsg = err.toString().toLowerCase();
        if (errorMsg.includes('redirect_uri_mismatch') || errorMsg.includes('redirect uri mismatch')) {
          console.error('CRITICAL: Redirect URI mismatch error detected.');
          return res.redirect('/?auth=failed&reason=redirect_uri_mismatch&message=The+Google+OAuth+redirect+URI+does+not+match');
        }
        
        return res.redirect('/?auth=failed&reason=error&message=' + encodeURIComponent(err.message));
      }
      
      if (!user) {
        console.error('Google OAuth failed - no user returned:', info);
        return res.redirect('/?auth=failed&reason=no_user');
      }
      
      // Log in the user
      req.login(user, (loginErr: Error | null) => {
        if (loginErr) {
          console.error('Google OAuth login error:', loginErr);
          return res.redirect('/?auth=failed&reason=login_error');
        }
        
        // On success, redirect to the home page with success parameter
        console.log('Google OAuth login successful for user:', user.email);
        
        // Check if user needs to complete profile
        if (!user.profileCompleted) {
          // Pass all available user data to frontend for profile completion
          const profileData = {
            fullName: user.fullName || '',
            email: user.email || '',
            age: user.age || undefined,
            gender: user.gender || undefined,
            bio: user.bio || undefined
          };
          
          // Encode profile data to pass in URL (safely)
          const encodedProfileData = encodeURIComponent(JSON.stringify(profileData));
          return res.redirect(`/?auth=success&profileComplete=false&profileData=${encodedProfileData}`);
        }
        
        return res.redirect('/?auth=success');
      });
    })(req, res, next);
  }
);

export default router;