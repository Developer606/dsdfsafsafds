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
  console.log('Loading PayPal config from:', paypalConfigPath);
  const configFile = fs.readFileSync(paypalConfigPath, 'utf8');
  console.log('PayPal config file contents:', configFile);
  paypalConfig = JSON.parse(configFile);

  // Validate configuration
  if (!paypalConfig?.sandbox?.clientId || !paypalConfig?.sandbox?.clientSecret) {
    console.error('Invalid PayPal configuration: Missing sandbox credentials');
    throw new Error('Invalid PayPal configuration: Missing sandbox credentials');
  }

  console.log('PayPal config loaded successfully:', {
    hasSandboxId: !!paypalConfig.sandbox.clientId,
    hasSandboxSecret: !!paypalConfig.sandbox.clientSecret
  });
} catch (error) {
  console.error('Error loading PayPal configuration:', error);
  // Fallback to environment variables
  paypalConfig = {
    sandbox: {
      clientId: process.env.PAYPAL_CLIENT_ID || 'AYlJp6Gs5nzl0iywAa-6pKijZ8vujbYKhJgDZdTXZ2a2tWyEBAxj463gxxn0NyIv9_Epa0vZ6xEX0DHL',
      clientSecret: process.env.PAYPAL_SECRET || 'EEImgTe9dPCqdFwEjKroHj7-ahYcXPSUigU8U2EQi_AhTr1JdmRDmeOJ7k6Ke6V3mQ4QM2F0XaGIpOIM'
    },
    production: {
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_SECRET || ''
    }
  };
  console.log('Using fallback PayPal configuration:', {
    hasSandboxId: !!paypalConfig.sandbox.clientId,
    hasSandboxSecret: !!paypalConfig.sandbox.clientSecret
  });
}

export const getPayPalConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const config = isProduction ? paypalConfig.production : paypalConfig.sandbox;
  console.log('Returning PayPal config:', {
    isProduction,
    hasClientId: !!config.clientId,
    hasClientSecret: !!config.clientSecret
  });
  return config;
};