import 'dotenv/config';
import { Redis } from '@upstash/redis';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

let redisClient = null;

if (redisUrl && redisToken) {
  try {
    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
    });
    console.log('[Redis] Upstash Redis client initialized successfully.');
  } catch (err) {
    console.warn('[Redis] Failed to initialize Upstash Redis client:', err.message);
    redisClient = null;
  }
} else {
  console.warn('[Redis] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not provided. Redis caching disabled.');
}

export const isRedisReady = () => Boolean(redisClient);

/**
 * 1. Live Ephemeral Presence Radar (Auto-expires on tab close / idle)
 */
export async function setLivePresence(userId, data, ttlSeconds = 65) {
  if (!redisClient || !userId) return false;
  try {
    const key = `presence:${userId}`;
    await redisClient.set(key, JSON.stringify({
      ...data,
      updated_at: Date.now()
    }), { ex: ttlSeconds });
    return true;
  } catch (err) {
    console.warn('[Redis] setLivePresence error:', err.message);
    return false;
  }
}

export async function getLivePresenceMulti(userIds = []) {
  if (!redisClient || !Array.isArray(userIds) || userIds.length === 0) return {};
  try {
    const keys = userIds.map(id => `presence:${id}`);
    const results = await redisClient.mget(...keys);
    const map = {};
    userIds.forEach((id, idx) => {
      const raw = results[idx];
      if (raw) {
        try {
          map[id] = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
          map[id] = null;
        }
      } else {
        map[id] = null;
      }
    });
    return map;
  } catch (err) {
    console.warn('[Redis] getLivePresenceMulti error:', err.message);
    return {};
  }
}

/**
 * 2. High-Throughput Leaderboard Cache
 */
export async function getCachedLeaderboard(groupId, date) {
  if (!redisClient) return null;
  try {
    const key = `leaderboard:${groupId}:${date}`;
    const cached = await redisClient.get(key);
    if (!cached) return null;
    return typeof cached === 'string' ? JSON.parse(cached) : cached;
  } catch (err) {
    console.warn('[Redis] getCachedLeaderboard error:', err.message);
    return null;
  }
}

export async function setCachedLeaderboard(groupId, date, data, ttlSeconds = 25) {
  if (!redisClient) return false;
  try {
    const key = `leaderboard:${groupId}:${date}`;
    await redisClient.set(key, JSON.stringify(data), { ex: ttlSeconds });
    return true;
  } catch (err) {
    console.warn('[Redis] setCachedLeaderboard error:', err.message);
    return false;
  }
}

export async function invalidateLeaderboard(groupId, date) {
  if (!redisClient) return;
  try {
    const key = `leaderboard:${groupId}:${date}`;
    await redisClient.del(key);
  } catch (err) {
    console.warn('[Redis] invalidateLeaderboard error:', err.message);
  }
}

/**
 * 3. Smart Nudge Rate-Limiting with Live Cooldown
 */
export async function checkAndSetNudgeCooldown(groupId, fromUserId, toUserId, cooldownSeconds = 300) {
  if (!redisClient) {
    // If Redis is not available, return allowed: true to let DB handle it
    return { allowed: true, remainingSeconds: 0 };
  }
  try {
    const key = `nudge:cooldown:${groupId}:${fromUserId}:${toUserId}`;
    // SET key 1 EX cooldown NX returns "OK" if key was set, or null if key already existed
    const setRes = await redisClient.set(key, '1', { ex: cooldownSeconds, nx: true });
    if (setRes === 'OK' || setRes === true) {
      return { allowed: true, remainingSeconds: cooldownSeconds };
    }
    // Key already exists, get remaining TTL
    const ttl = await redisClient.ttl(key);
    return {
      allowed: false,
      remainingSeconds: Math.max(1, ttl || 0)
    };
  } catch (err) {
    console.warn('[Redis] checkAndSetNudgeCooldown error:', err.message);
    return { allowed: true, remainingSeconds: 0 };
  }
}

export default redisClient;
