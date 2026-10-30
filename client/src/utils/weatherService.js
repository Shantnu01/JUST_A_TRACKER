// Zero-dependency Live Weather & Geolocation Service
// Uses BigDataCloud IP reverse geocoding + Open-Meteo (open free APIs, no keys required)

const WMO_CODE_MAP = {
  0: 'CLEAR',
  1: 'MAINLY CLEAR',
  2: 'PARTLY CLOUDY',
  3: 'OVERCAST',
  45: 'FOGGY',
  48: 'RIME FOG',
  51: 'LIGHT DRIZZLE',
  53: 'DRIZZLE',
  55: 'HEAVY DRIZZLE',
  56: 'FREEZING DRIZZLE',
  57: 'FREEZING DRIZZLE',
  61: 'SLIGHT RAIN',
  63: 'RAIN',
  65: 'HEAVY RAIN',
  66: 'FREEZING RAIN',
  67: 'FREEZING RAIN',
  71: 'LIGHT SNOW',
  73: 'SNOW',
  75: 'HEAVY SNOW',
  77: 'SNOW GRAINS',
  80: 'RAIN SHOWERS',
  81: 'RAIN SHOWERS',
  82: 'VIOLENT RAIN',
  85: 'SNOW SHOWERS',
  86: 'HEAVY SNOW',
  95: 'THUNDERSTORM',
  96: 'THUNDERSTORM',
  99: 'THUNDERSTORM WITH HAIL'
};

const CACHE_KEY = 'daymark_geo_weather_cache_v2';
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes cache

export function getCachedWeather() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
      return parsed.data;
    }
  } catch (e) {
    console.warn('[WeatherService] Error reading cache:', e);
  }
  return null;
}

export function setCachedWeather(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      timestamp: Date.now(),
      data
    }));
  } catch (e) {
    console.warn('[WeatherService] Error saving cache:', e);
  }
}

export function parseWeatherCondition(code) {
  if (code === undefined || code === null) return 'CLEAR';
  return WMO_CODE_MAP[code] || (code > 50 && code < 70 ? 'RAIN' : code >= 70 && code < 80 ? 'SNOW' : 'PARTLY CLOUDY');
}

/**
 * Request user geolocation and fetch current weather + city/country name
 * Uses IP geolocation first for instant, zero-prompt detection, falling back to browser timezone
 */
export async function requestUserLocationAndWeather() {
  const cached = getCachedWeather();
  if (cached) {
    return cached;
  }

  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  try {
    // 1. IP-based reverse geocode (zero permission prompt required)
    const geoRes = await fetch('https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en')
      .then(r => r.json())
      .catch(() => null);

    const lat = geoRes?.latitude;
    const lon = geoRes?.longitude;
    const countryName = geoRes?.countryName || geoRes?.countryCode || '';
    const cityName = geoRes?.city || geoRes?.locality || '';

    if (lat != null && lon != null) {
      // 2. Fetch live Open-Meteo weather for coordinates
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
      ).then(r => r.json()).catch(() => null);

      const temp = weatherRes?.current?.temperature_2m != null 
        ? Math.round(weatherRes.current.temperature_2m) 
        : 25;
      const code = weatherRes?.current?.weather_code;
      const condition = parseWeatherCondition(code);
      const timeZone = weatherRes?.timezone || browserTz;

      // Construct friendly offset label (e.g. "INDIA · IST (UTC+5:30)")
      let offsetStr = '';
      try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone,
          timeZoneName: 'short'
        });
        const parts = formatter.formatToParts(now);
        const tzPart = parts.find(p => p.type === 'timeZoneName');
        offsetStr = tzPart ? tzPart.value : '';
      } catch (e) {
        offsetStr = '';
      }

      const displayCity = cityName || countryName || 'LOCAL';
      const label = offsetStr ? `${displayCity.toUpperCase()} · ${offsetStr}` : displayCity.toUpperCase();

      const resolved = {
        country: (countryName || 'LOCAL').toUpperCase(),
        city: displayCity,
        temp,
        condition,
        timeZone,
        timeZoneLabel: label,
        isCustom: true
      };

      setCachedWeather(resolved);
      return resolved;
    }
  } catch (err) {
    console.warn('[WeatherService] IP geocode failed, falling back to browser timezone:', err);
  }

  // 3. Fallback to local browser timezone
  const fallbackLabel = browserTz.split('/').pop()?.replace(/_/g, ' ') || 'LOCAL';
  const resolvedFallback = {
    country: fallbackLabel.toUpperCase(),
    city: fallbackLabel,
    temp: 24,
    condition: 'CLEAR',
    timeZone: browserTz,
    timeZoneLabel: `${fallbackLabel.toUpperCase()} · ${browserTz}`,
    isCustom: true
  };
  return resolvedFallback;
}
