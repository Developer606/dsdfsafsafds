#!/usr/bin/env node
/**
 * Cross-platform start script for the Anime Character Chat Application (Built Version)
 * Works on Windows, macOS, Linux, and any other platform with Node.js
 */

// Set production environment
process.env.NODE_ENV = 'production';

// Import the main built application file
try {
  // We need to use require here since the built version might be CommonJS
  require('./dist/index.js');
} catch (err) {
  console.error('Failed to start the application:', err);
  console.error('\nMake sure you have built the application first with: npm run build');
  process.exit(1);
}