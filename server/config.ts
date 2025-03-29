// Configuration settings for API keys and other sensitive data
export const config = {
  deepInfra: {
    apiKey: "",
    baseUrl: "https://api.deepinfra.com/v1/inference",
    model: "mistralai/Mixtral-8x7B-Instruct-v0.1"
  },
  // Key used for encrypting messages - should be 32 bytes (256 bits)
  // In production, this should be set via environment variables
  messageEncryptionKey: process.env.MESSAGE_ENCRYPTION_KEY || 'defaultmessageencryptionkey32chars00',
  
  // Whether to encrypt messages - default to true
  encryptMessages: true
};
