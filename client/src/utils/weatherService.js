// Zero-dependency Weather & Geolocation Service for Tokyo Lofi and World Themes
// Uses Open-Meteo (free open weather API, no keys required) and BigDataCloud client reverse geocoding

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

export const DEFAULT_TOKYO_WEATHER = {
  country: 'TOKYO',
  city: 'Tokyo',
  temp: 18,
  condition: 'CLOUDY',
  timeZone: 'Asia/Tokyo',
  timeZoneLabel: 'TOKYO · JST (UTC+9)',
  isCustom: false
};

const CACHE_KEY = 'daymark_geo_weather_cache_v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour cache

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
 * Request user geolocation and fetch current weather + country name
 * If denied or error, falls back safely to Tokyo JST
 */
export async function requestUserLocationAndWeather() {
  // Check cache first
  const cached = getCachedWeather();
  if (cached) {
    return cached;
  }

  if (typeof window === 'undefined' || !navigator.geolocation) {
    return DEFAULT_TOKYO_WEATHER;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;

          // 1. Fetch live weather from Open-Meteo
          const weatherPromise = fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
          ).then(r => r.json());

          // 2. Fetch country name from BigDataCloud reverse geocode
          const geoPromise = fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          ).then(r => r.json()).catch(() => null);

          const [weatherRes, geoRes] = await Promise.all([weatherPromise, geoPromise]);

          const temp = weatherRes?.current?.temperature_2m != null 
            ? Math.round(weatherRes.current.temperature_2m) 
            : 22;
          const code = weatherRes?.current?.weather_code;
          const condition = parseWeatherCondition(code);
          const timeZone = weatherRes?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo';

          const countryName = geoRes?.countryName || geoRes?.countryCode || 'LOCAL';
          const cityName = geoRes?.city || geoRes?.locality || '';

          // Construct friendly timezone label (e.g. "INDIA · IST (UTC+5:30)")
          let offsetStr = '';
          try {
            const now = new Date();
            const formatter = new Intl.DateTimeFormat('en-US', {
              timeZone,
              timeZoneName: 'short'
            });
            const parts = formatter.formatToParts(now);
            const tzPart = parts.find(p => p.type === 'timeZoneName');
            if (tzPart) {
              offsetStr = tzPart.value;
            }
          } catch (e) {
            offsetStr = 'LOCAL';
          }

          const resolved = {
            country: countryName.toUpperCase(),
            city: cityName,
            temp,
            condition,
            timeZone,
            timeZoneLabel: `${countryName.toUpperCase()} · ${offsetStr}`,
            isCustom: true
          };

          setCachedWeather(resolved);
          resolve(resolved);
        } catch (err) {
          console.warn('[WeatherService] Failed to fetch weather/geo data:', err);
          resolve(DEFAULT_TOKYO_WEATHER);
        }
      },
      (error) => {
        console.info('[WeatherService] Geolocation permission denied or unavailable, using Tokyo JST fallback:', error.message);
        resolve(DEFAULT_TOKYO_WEATHER);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 3600000
      }
    );
  });
}
