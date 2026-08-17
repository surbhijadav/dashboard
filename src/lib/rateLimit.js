// Minimal in-memory fixed-window rate limiter (per process).
// Suitable for development / single-instance deploys; swap for Redis in production.
const buckets = new Map();
let lastSweep = Date.now();

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();

  if (now - lastSweep > 5 * 60 * 1000) {
    for (const [k, b] of buckets) {
      if (now > b.resetAt) buckets.delete(k);
    }
    lastSweep = now;
  }

  let bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

export function clientIp(req) {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'local';
}
