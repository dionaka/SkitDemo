const buckets = new Map();

function hit(key, { limit, windowMs }) {
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || now - entry.start >= windowMs) {
    entry = { start: now, count: 0 };
    buckets.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > limit) {
    return false;
  }
  return true;
}

function assertRateLimit(key, options) {
  if (!hit(key, options)) {
    const err = new Error('操作过于频繁，请稍后再试');
    err.statusCode = 429;
    throw err;
  }
}

module.exports = { hit, assertRateLimit };
