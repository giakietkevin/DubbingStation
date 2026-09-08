/**
 * In-Memory Sliding Window Rate Limiter for Developer REST API v1
 * Tracks request counts per client (apiKeyId or IP) over a time window.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((record, key) => {
      if (record.resetTime <= now) {
        rateLimitStore.delete(key);
      }
    });
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitOptions {
  limit?: number;       // Max requests allowed in the window (default: 60)
  windowMs?: number;    // Window duration in ms (default: 60000ms / 1 min)
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter: number; // in seconds
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const limit = options.limit ?? 60;
  const windowMs = options.windowMs ?? 60 * 1000;
  const now = Date.now();

  const record = rateLimitStore.get(identifier);

  if (!record || record.resetTime <= now) {
    // New or expired window
    const resetTime = now + windowMs;
    rateLimitStore.set(identifier, { count: 1, resetTime });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetTime,
      retryAfter: 0,
    };
  }

  // Active window
  if (record.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return {
      allowed: false,
      limit,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter,
    };
  }

  record.count += 1;
  return {
    allowed: true,
    limit,
    remaining: limit - record.count,
    resetTime: record.resetTime,
    retryAfter: 0,
  };
}

export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };
  if (!result.allowed) {
    headers['Retry-After'] = result.retryAfter.toString();
  }
  return headers;
}
