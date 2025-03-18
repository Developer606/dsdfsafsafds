import geoip from 'geoip-lite';

function testIpLocation(ip: string): void {
  console.log(`Testing IP: ${ip}`);
  const geo = geoip.lookup(ip);
  console.log('Result:', geo);
  console.log('-------------------');
}

// Test with various IPs
testIpLocation('8.8.8.8');  // Google DNS
testIpLocation('1.1.1.1');  // Cloudflare DNS
testIpLocation('192.168.1.1');  // Local IP
testIpLocation('127.0.0.1');  // Localhost