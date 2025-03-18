import geoip from 'geoip-lite';

export interface GeoLocation {
  countryCode?: string;
  countryName?: string;
  cityName?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * Get geolocation information from an IP address
 * @param ip The IP address to lookup
 * @returns GeoLocation object with country and city information
 */
export function getLocationFromIp(ip: string): GeoLocation {
  try {
    // Remove any port information from the IP address
    const cleanIp = ip.split(':')[0].trim();
    
    // Filter out private IPs, localhost, etc.
    if (
      cleanIp === '127.0.0.1' || 
      cleanIp === 'localhost' || 
      cleanIp.startsWith('192.168.') || 
      cleanIp.startsWith('10.') || 
      cleanIp.startsWith('172.16.')
    ) {
      return {
        countryCode: undefined,
        countryName: undefined,
        cityName: undefined
      };
    }

    // Look up the IP address
    const geo = geoip.lookup(cleanIp);
    
    if (!geo) {
      return {
        countryCode: undefined,
        countryName: undefined,
        cityName: undefined
      };
    }

    // Return location information
    return {
      countryCode: geo.country,
      countryName: getCountryName(geo.country),
      cityName: geo.city,
      region: geo.region,
      latitude: geo.ll[0],
      longitude: geo.ll[1]
    };
  } catch (error) {
    console.error('Error getting location from IP:', error);
    return {
      countryCode: undefined,
      countryName: undefined,
      cityName: undefined
    };
  }
}

/**
 * Get country name from country code
 * This is a simple mapping function - in a production environment,
 * you might want to use a more comprehensive library like i18n-iso-countries
 */
function getCountryName(countryCode?: string): string | undefined {
  if (!countryCode) return undefined;
  
  const countries: {[code: string]: string} = {
    'US': 'United States',
    'CA': 'Canada',
    'GB': 'United Kingdom',
    'AU': 'Australia',
    'DE': 'Germany',
    'FR': 'France',
    'JP': 'Japan',
    'IN': 'India',
    'BR': 'Brazil',
    'IT': 'Italy',
    'ES': 'Spain',
    'CN': 'China',
    'RU': 'Russia',
    'MX': 'Mexico',
    'KR': 'South Korea',
    'NL': 'Netherlands',
    'SE': 'Sweden',
    'CH': 'Switzerland',
    'SG': 'Singapore',
    'ZA': 'South Africa',
  };
  
  return countries[countryCode] || countryCode;
}