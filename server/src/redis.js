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

/**
 * 4. Ephemeral Pod Hype Wall & Micro-Reactions (Ring Buffer)
 */
export async function pushPodHype(groupId, hypeItem) {
  if (!redisClient || !groupId) return null;
  try {
    const key = `pod:hype:${groupId}`;
    const payload = JSON.stringify({
      id: hypeItem.id || `hype_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_id: hypeItem.user_id,
      username: hypeItem.username,
      avatar_color: hypeItem.avatar_color,
      emoji: hypeItem.emoji,
      text: hypeItem.text,
      created_at: new Date().toISOString()
    });
    // Push to front of list
    await redisClient.lpush(key, payload);
    // Keep max 50 items
    await redisClient.ltrim(key, 0, 49);
    // Expire hype wall after 48 hours of inactivity
    await redisClient.expire(key, 172800);
    return true;
  } catch (err) {
    console.warn('[Redis] pushPodHype error:', err.message);
    return false;
  }
}

export async function getPodHype(groupId, limit = 25) {
  if (!redisClient || !groupId) return [];
  try {
    const key = `pod:hype:${groupId}`;
    const items = await redisClient.lrange(key, 0, limit - 1);
    if (!Array.isArray(items)) return [];
    return items.map(item => {
      try {
        return typeof item === 'string' ? JSON.parse(item) : item;
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch (err) {
    console.warn('[Redis] getPodHype error:', err.message);
    return [];
  }
}

/**
 * 5. Daily Pod Collective Goal Target (e.g. 15 hours / 900 minutes)
 */
export async function getPodDailyTarget(groupId, date) {
  if (!redisClient || !groupId) return 900; // default 15 hours (900 mins)
  try {
    const key = `pod:target:${groupId}:${date}`;
    const target = await redisClient.get(key);
    return target ? Number(target) : 900;
  } catch (err) {
    console.warn('[Redis] getPodDailyTarget error:', err.message);
    return 900;
  }
}

export async function setPodDailyTarget(groupId, date, targetMinutes) {
  if (!redisClient || !groupId) return false;
  try {
    const key = `pod:target:${groupId}:${date}`;
    await redisClient.set(key, String(targetMinutes), { ex: 604800 }); // 7-day TTL
    return true;
  } catch (err) {
    console.warn('[Redis] setPodDailyTarget error:', err.message);
    return false;
  }
}

export default redisClient;
