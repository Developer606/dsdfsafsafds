#!/usr/bin/env node
/**
 * Cross-platform start script for the Anime Character Chat Application
 * Works on Windows, macOS, Linux, and any other platform with Node.js
 */

// Set production environment
process.env.NODE_ENV = 'production';

// Import the main application file
import('./index.js').catch(err => {
  console.error('Failed to start the application:', err);
  process.exit(1);
});