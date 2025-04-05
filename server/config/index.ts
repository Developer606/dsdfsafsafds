import { getApiKey, setApiKey } from "../admin-db";

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

// Settings management
let forceProductionMode = false;

// Function to toggle between sandbox and production mode
export const togglePayPalMode = async (useProduction: boolean): Promise<boolean> => {
  try {
    forceProductionMode = useProduction;
    // Store the current mode in the database for persistence
    await setApiKey("PAYPAL_USE_PRODUCTION", useProduction ? "true" : "false", 
      `PayPal mode setting - ${useProduction ? 'Production' : 'Sandbox'} mode active`);
    console.log(`PayPal mode switched to ${useProduction ? 'PRODUCTION' : 'SANDBOX'}`);
    return true;
  } catch (error) {
    console.error("Error toggling PayPal mode:", error);
    return false;
  }
};

// Check the current active PayPal mode
export const getPayPalMode = async (): Promise<string> => {
  try {
    const storedMode = await getApiKey("PAYPAL_USE_PRODUCTION");
    // If we have a stored mode, use it
    if (storedMode) {
      forceProductionMode = storedMode === "true";
    }
    return forceProductionMode ? "production" : "sandbox";
  } catch (error) {
    console.error("Error getting PayPal mode:", error);
    return "sandbox"; // Default to sandbox if there's an error
  }
};

// Load PayPal configuration from database
export const getPayPalConfig = async () => {
  try {
    // First check if we have a stored mode preference
    await getPayPalMode();
    
    // Use the current mode setting to determine which credentials to return
    if (forceProductionMode) {
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
    if (forceProductionMode) {
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
