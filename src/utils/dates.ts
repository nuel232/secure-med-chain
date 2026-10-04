/**
 * A drug is valid through the whole of its printed expiry date, so the on-chain
 * expiry is the END of that day (23:59:59 UTC), not midnight at the start of it.
 * `dateStr` must be YYYY-MM-DD. Returns Unix seconds.
 */
export function expiryToTimestamp(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T23:59:59Z`).getTime() / 1000);
}

export function isValidDateString(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(`${dateStr}T00:00:00Z`);
  // Round-trip catches things like 2026-02-31
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === dateStr;
}

export function isFutureExpiry(dateStr: string): boolean {
  return expiryToTimestamp(dateStr) * 1000 > Date.now();
}
