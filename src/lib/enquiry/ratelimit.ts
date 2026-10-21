// At most N enquiries per IP address per hour (in memory: the site runs as one container).
const hits = new Map<string, number[]>();

export function rateLimited(ip: string): boolean {
  const limit = Number(process.env.RATE_LIMIT || 10);
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => t > now - 3600_000);
  if (recent.length >= limit) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => t > now - 3600_000)) hits.delete(k);
  return false;
}
