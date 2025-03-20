import geoip from "geoip-lite";

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
    if (!ip) {
      console.log("No IP address provided for location lookup");
      return {
        countryCode: undefined,
        countryName: undefined,
        cityName: undefined,
      };
    }

    // Handle comma-separated IPs (X-Forwarded-For can contain multiple IPs)
    // Take the leftmost non-private IP which is typically the client's real IP
    let cleanIp: string | null = null;
    const ips = ip.split(",");

    for (const potentialIp of ips) {
      // Clean each IP (remove port, whitespace)
      const trimmedIp = potentialIp.split(":")[0].trim();

      // Skip private IPs, localhost, etc.
      if (
        trimmedIp === "127.0.0.1" ||
        trimmedIp === "localhost" ||
        trimmedIp.startsWith("192.168.") ||
        trimmedIp.startsWith("10.") ||
        trimmedIp.startsWith("172.16.") ||
        trimmedIp === "::1" ||
        trimmedIp === "undefined"
      ) {
        continue;
      }

      // Found a usable IP
      cleanIp = trimmedIp;
      break;
    }

    // If no usable IP was found
    if (!cleanIp) {
      console.log(`No usable public IP found in: ${ip}`);
      return {
        countryCode: undefined,
        countryName: undefined,
        cityName: undefined,
      };
    }

    // Look up the IP address
    const geo = geoip.lookup(cleanIp);

    if (!geo) {
      console.log(`No geolocation data found for IP: ${cleanIp}`);
      return {
        countryCode: undefined,
        countryName: undefined,
        cityName: undefined,
      };
    }

    // Return location information
    return {
      countryCode: geo.country,
      countryName: getCountryName(geo.country),
      cityName: geo.city,
      region: geo.region,
      latitude: geo.ll[0],
      longitude: geo.ll[1],
    };
  } catch (error) {
    console.error("Error getting location from IP:", error);
    return {
      countryCode: undefined,
      countryName: undefined,
      cityName: undefined,
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

  const countries: { [code: string]: string } = {
    US: "United States",
    CA: "Canada",
    GB: "United Kingdom",
    AU: "Australia",
    DE: "Germany",
    FR: "France",
    JP: "Japan",
    IN: "India",
    BR: "Brazil",
    IT: "Italy",
    ES: "Spain",
    CN: "China",
    RU: "Russia",
    MX: "Mexico",
    KR: "South Korea",
    NL: "Netherlands",
    SE: "Sweden",
    CH: "Switzerland",
    SG: "Singapore",
    ZA: "South Africa",
  };

  return countries[countryCode] || countryCode;
}
