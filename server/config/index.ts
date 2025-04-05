import { getApiKey } from "../admin-db";

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

// Load PayPal configuration from database
export const getPayPalConfig = async () => {
  const isProduction = process.env.NODE_ENV === "production";
  
  try {
    if (isProduction) {
      const clientId = await getApiKey("PAYPAL_PRODUCTION_CLIENT_ID") || "";
      const clientSecret = await getApiKey("PAYPAL_PRODUCTION_CLIENT_SECRET") || "";
      
      return {
        clientId,
        clientSecret
      };
    } else {
      const clientId = await getApiKey("PAYPAL_SANDBOX_CLIENT_ID") || "";
      const clientSecret = await getApiKey("PAYPAL_SANDBOX_CLIENT_SECRET") || "";
      
      return {
        clientId,
        clientSecret
      };
    }
  } catch (error) {
    console.error("Error loading PayPal configuration from database:", error);
    // Fallback to environment variables as a last resort
    if (isProduction) {
      return {
        clientId: process.env.PAYPAL_CLIENT_ID || "",
        clientSecret: process.env.PAYPAL_SECRET || ""
      };
    } else {
      return {
        clientId: process.env.PAYPAL_CLIENT_ID || "",
        clientSecret: process.env.PAYPAL_SECRET || ""
      };
    }
  }
};
