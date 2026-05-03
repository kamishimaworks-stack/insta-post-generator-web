const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

export function jstMidnightIso(now: Date = new Date()): string {
  const jstNowMs = now.getTime() + JST_OFFSET_MS;
  const jstMidnightUtcMs = Math.floor(jstNowMs / 86_400_000) * 86_400_000 - JST_OFFSET_MS;
  return new Date(jstMidnightUtcMs).toISOString();
}
