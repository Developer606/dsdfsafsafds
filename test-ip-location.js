import { getLocationFromIp } from './server/ip-location.js';

async function runTests() {
  // Test the function with Google's public DNS IP
  const testIp = '8.8.8.8';
  const location = getLocationFromIp(testIp);

  console.log('Testing IP location lookup for:', testIp);
  console.log('Result:', location);

  // Test with a local IP address
  const localIp = '192.168.1.1';
  const localLocation = getLocationFromIp(localIp);

  console.log('\nTesting IP location lookup for local IP:', localIp);
  console.log('Result:', localLocation);

  // Test with current machine's IP
  const machineIp = '127.0.0.1';
  const machineLocation = getLocationFromIp(machineIp);

  console.log('\nTesting IP location lookup for localhost:', machineIp);
  console.log('Result:', machineLocation);
}

runTests();