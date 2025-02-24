// Configuration settings for API keys and other sensitive data
export const config = {
  deepInfra: {
    apiKey: process.env.DEEPINFRA_API_KEY || "stM8x3slv4iexaxgVkjmh9CIrlGxIxlr",
    baseUrl: "https://api.deepinfra.com/v1/inference",
    model: "mistralai/Mixtral-8x7B-Instruct-v0.1"
  }
};
