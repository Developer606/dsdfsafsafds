/**
 * Use this script to update the Google OAuth callback URL in your Google Cloud Console
 * 
 * 1. Go to your Google Cloud Console: https://console.cloud.google.com/
 * 2. Navigate to your project
 * 3. Go to "APIs & Services" > "Credentials"
 * 4. Edit your OAuth 2.0 Client ID
 * 5. Add the following URL to the "Authorized redirect URIs" section:
 */

// Get the Replit domain
const replitDomain = process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(',')[0] : '';

// Generate the callback URL
const callbackURL = replitDomain 
  ? `https://${replitDomain}/api/auth/google/callback`
  : 'http://localhost:5000/api/auth/google/callback';

console.log('Google OAuth callback URL:');
console.log(callbackURL);
console.log('\nAdd this URL to your Google Cloud Console > Credentials > OAuth 2.0 Client ID > Authorized redirect URIs');