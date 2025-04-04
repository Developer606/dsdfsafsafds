/**
 * Use this script to update the Google OAuth callback URL in your Google Cloud Console
 * 
 * HOW TO FIX THE "redirect_uri_mismatch" ERROR:
 * 
 * 1. Go to your Google Cloud Console: https://console.cloud.google.com/
 * 2. Navigate to your project
 * 3. Go to "APIs & Services" > "Credentials"
 * 4. Edit your OAuth 2.0 Client ID
 * 5. Add the following URL to the "Authorized redirect URIs" section
 * 6. Click "Save" and wait a few minutes for changes to propagate
 * 
 * IMPORTANT: For production deployment, add both your development and production URLs.
 * For example:
 * - https://your-replit-domain.replit.app/api/auth/google/callback
 * - https://yourapp.com/api/auth/google/callback
 */

// Get the Replit domain
const replitDomain = process.env.REPLIT_DOMAINS ? process.env.REPLIT_DOMAINS.split(',')[0] : '';

// Production domain (if set)
const productionDomain = process.env.PRODUCTION_DOMAIN;

// Generate the callback URLs
const devCallbackURL = replitDomain 
  ? `https://${replitDomain}/api/auth/google/callback`
  : 'http://localhost:5000/api/auth/google/callback';

const prodCallbackURL = productionDomain
  ? `https://${productionDomain}/api/auth/google/callback`
  : null;

console.log('\n========== GOOGLE OAUTH CONFIGURATION ==========');
console.log('\nDevelopment callback URL:');
console.log(devCallbackURL);

if (prodCallbackURL) {
  console.log('\nProduction callback URL:');
  console.log(prodCallbackURL);
}

console.log('\n========== HOW TO FIX REDIRECT_URI_MISMATCH ERROR ==========');
console.log('1. Go to Google Cloud Console: https://console.cloud.google.com/apis/credentials');
console.log('2. Find and edit your OAuth 2.0 Client ID');
console.log('3. Add the above URL(s) to "Authorized redirect URIs"');
console.log('4. Click "Save" and wait a few minutes for changes to propagate');
console.log('5. Try logging in again\n');