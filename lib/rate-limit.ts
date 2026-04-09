import { getRedisClient } from "@/lib/redis";

type RateLimitInput = {
  key: string;
  limit: number;
  windowMs: number;
};

type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const globalBuckets = globalThis as typeof globalThis & {
  __recipeMgRateLimitBuckets__?: Map<string, Bucket>;
};

const buckets =
  globalBuckets.__recipeMgRateLimitBuckets__ ??
  (globalBuckets.__recipeMgRateLimitBuckets__ = new Map<string, Bucket>());
let missingRedisWarned = false;

function cleanupExpiredBuckets(now: number) {
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

function checkRateLimitInMemory(input: RateLimitInput): RateLimitResult {
  const now = Date.now();

  if (buckets.size > 5000) {
    cleanupExpiredBuckets(now);
  }

  const existing = buckets.get(input.key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(input.key, {
      count: 1,
      resetAt: now + input.windowMs,
    });

    return {
      ok: true,
      remaining: Math.max(0, input.limit - 1),
      retryAfterSeconds: Math.ceil(input.windowMs / 1000),
    };
  }

  if (existing.count >= input.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
    };
  }

  existing.count += 1;
  buckets.set(input.key, existing);

  return {
    ok: true,
    remaining: Math.max(0, input.limit - existing.count),
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

export async function checkRateLimit(
  input: RateLimitInput,
): Promise<RateLimitResult> {
  try {
    const redisClient = await getRedisClient();

    if (!redisClient) {
      if (!missingRedisWarned && process.env.NODE_ENV === "production") {
        console.error(
          "[RateLimit] REDIS_URL is not configured in production. Falling back to in-memory limiter.",
        );
        missingRedisWarned = true;
      }

      return checkRateLimitInMemory(input);
    }

    const key = `rate_limit:${input.key}`;
    const count = await redisClient.incr(key);

    if (count === 1) {
      await redisClient.pExpire(key, input.windowMs);
    }

    let ttlMs = await redisClient.pTTL(key);
    if (ttlMs < 0) {
      await redisClient.pExpire(key, input.windowMs);
      ttlMs = input.windowMs;
    }

    if (count > input.limit) {
      return {
        ok: false,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
      };
    }

    return {
      ok: true,
      remaining: Math.max(0, input.limit - count),
      retryAfterSeconds: Math.max(1, Math.ceil(ttlMs / 1000)),
    };
  } catch (error) {
    console.error(
      "[RateLimit] Redis unavailable, fallback to in-memory.",
      error,
    );
    return checkRateLimitInMemory(input);
  }
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}
