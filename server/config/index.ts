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

// Helper function to validate if credentials look like placeholders or invalid data
const validateCredentials = (clientId: string, clientSecret: string): boolean => {
  return !(!clientId || 
          clientId.length < 10 || 
          clientId.includes("sddfasf") || 
          clientId.includes("placeholder") ||
          !clientSecret ||
          clientSecret.length < 10 ||
          clientSecret.includes("sdrwfasf") ||
          clientSecret.includes("placeholder"));
};

// Check the validity of production credentials
export const validateProductionCredentials = async (): Promise<boolean> => {
  try {
    const clientId = await getApiKey("PAYPAL_PRODUCTION_CLIENT_ID") || "";
    const clientSecret = await getApiKey("PAYPAL_PRODUCTION_CLIENT_SECRET") || "";
    
    return validateCredentials(clientId, clientSecret);
  } catch (error) {
    console.error("Error validating production credentials:", error);
    return false;
  }
};

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
    const mode = await getPayPalMode();
    console.log(`Getting PayPal config for mode: ${mode}`);
    
    // Use the current mode setting to determine which credentials to return
    if (forceProductionMode) {
      // Try to get production credentials
      const clientId = await getApiKey("PAYPAL_PRODUCTION_CLIENT_ID") || "";
      const clientSecret = await getApiKey("PAYPAL_PRODUCTION_CLIENT_SECRET") || "";
      
      // Validate production credentials - if they look like placeholder data, fall back to sandbox
      const hasValidProductionCredentials = validateCredentials(clientId, clientSecret);

      if (!hasValidProductionCredentials) {
        console.warn("Production PayPal credentials appear to be invalid, falling back to Sandbox mode");
        
        // Fall back to sandbox credentials
        const sandboxClientId = await getApiKey("PAYPAL_SANDBOX_CLIENT_ID") || "";
        const sandboxClientSecret = await getApiKey("PAYPAL_SANDBOX_CLIENT_SECRET") || "";
        
        // Temporarily set mode back to sandbox to avoid payment processing issues
        // Don't update the stored mode, just use sandbox credentials
        
        return {
          clientId: sandboxClientId,
          clientSecret: sandboxClientSecret,
          usingFallback: true,
          hasValidProductionCredentials: false
        };
      }
      
      return {
        clientId,
        clientSecret,
        usingFallback: false,
        hasValidProductionCredentials: true
      };
    } else {
      const clientId = await getApiKey("PAYPAL_SANDBOX_CLIENT_ID") || "";
      const clientSecret = await getApiKey("PAYPAL_SANDBOX_CLIENT_SECRET") || "";
      
      // Check if production credentials are valid even when in sandbox mode
      // This is useful for the UI to show warnings
      const hasValidProductionCredentials = await validateProductionCredentials();
      
      return {
        clientId,
        clientSecret,
        usingFallback: false,
        hasValidProductionCredentials: hasValidProductionCredentials
      };
    }
  } catch (error) {
    console.error("Error loading PayPal configuration from database:", error);
    // Fallback to environment variables as a last resort
    if (forceProductionMode) {
      return {
        clientId: process.env.PAYPAL_CLIENT_ID || "",
        clientSecret: process.env.PAYPAL_SECRET || "",
        usingFallback: true,
        hasValidProductionCredentials: false
      };
    } else {
      return {
        clientId: process.env.PAYPAL_CLIENT_ID || "",
        clientSecret: process.env.PAYPAL_SECRET || "",
        usingFallback: true,
        hasValidProductionCredentials: false
      };
    }
  }
};
