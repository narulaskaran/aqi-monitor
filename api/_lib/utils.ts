/**
 * Bounded exponential backoff with jitter.
 *
 * Returns a delay in milliseconds: min(baseMs * 2^attempt, maxMs) * random(0..1).
 * The cap keeps waits well under Vercel's function timeout (default 5 s).
 *
 * @param attempt  zero-based attempt index (0 = first retry)
 * @param maxMs    upper bound in ms (default 5000)
 * @param baseMs   initial delay in ms (default 500)
 */
export function backoff(
  attempt: number,
  { maxMs = 5000, baseMs = 500 }: { maxMs?: number; baseMs?: number } = {},
): number {
  const delay = Math.min(baseMs * 2 ** attempt, maxMs);
  return delay * Math.random(); // jitter to avoid thundering herd
}
