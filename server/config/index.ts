import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

interface PayPalConfig {
  sandbox: {
    clientId: string;
    clientSecret: string;
  };
  production: {
    clientId: string;
    clientSecret: string;
  };
}

// Get directory path in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load PayPal configuration
const paypalConfigPath = path.join(__dirname, 'paypal.config.json');
let paypalConfig: PayPalConfig;

try {
  const configFile = fs.readFileSync(paypalConfigPath, 'utf8');
  paypalConfig = JSON.parse(configFile);

  // Validate configuration
  if (!paypalConfig?.sandbox?.clientId || !paypalConfig?.sandbox?.clientSecret) {
    throw new Error('Invalid PayPal configuration: Missing sandbox credentials');
  }
} catch (error) {
  console.error('Error loading PayPal configuration:', error);
  // Fallback to environment variables
  paypalConfig = {
    sandbox: {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_SECRET || ''
    },
    production: {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_SECRET || ''
    }
  };
}

export const getPayPalConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction ? paypalConfig.production : paypalConfig.sandbox;
};