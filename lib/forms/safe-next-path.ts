const FALLBACK = "/learn";
const ORIGIN = "http://same-site.invalid";

/**
 * Where to go after signing in. `next` comes from the URL, so it is only
 * honoured when it resolves to a path on this site. Parsing (rather than a
 * prefix check) matters: browsers read "/\evil.com" and "/<tab>/evil.com" as
 * links to another site.
 */
export function safeNextPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || /[\\\u0000-\u001f]/.test(value)) return FALLBACK;
  try {
    const url = new URL(value, ORIGIN);
    return url.origin === ORIGIN ? url.pathname + url.search : FALLBACK;
  } catch {
    return FALLBACK;
  }
}
