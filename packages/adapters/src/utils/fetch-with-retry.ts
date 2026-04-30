/**
 * fetchWithRetry — shared HTTP utility for every adapter.
 *
 * gpc-cres learned the hard way (April '26 punch list): scrapers without
 * retry+timeout abort the entire pagination on a single transient failure.
 * Every adapter in this repo goes through this function.
 */

export type FetchWithRetryOptions = RequestInit & {
  /** Total tries; default 4. */
  retries?: number;
  /** Base backoff ms; default 500. Doubled each retry, jittered ±25%. */
  backoffMs?: number;
  /** Per-request timeout ms; default 20_000. */
  timeoutMs?: number;
  /** Status codes that should NOT be retried; default [400,401,403,404]. */
  noRetryStatus?: number[];
  /** User-Agent if not provided. SEC EDGAR requires a real UA. */
  userAgent?: string;
};

export class FetchError extends Error {
  status?: number;
  url: string;
  attempts: number;
  constructor(msg: string, url: string, attempts: number, status?: number) {
    super(msg);
    this.name = "FetchError";
    this.url = url;
    this.attempts = attempts;
    this.status = status;
  }
}

const DEFAULT_NO_RETRY = [400, 401, 403, 404];

export async function fetchWithRetry(
  url: string,
  opts: FetchWithRetryOptions = {},
): Promise<Response> {
  const {
    retries = 4,
    backoffMs = 500,
    timeoutMs = 20_000,
    noRetryStatus = DEFAULT_NO_RETRY,
    userAgent,
    headers,
    ...rest
  } = opts;

  const finalHeaders: Record<string, string> = {
    ...(userAgent ? { "User-Agent": userAgent } : {}),
    ...flattenHeaders(headers),
  };

  let attempt = 0;
  let lastError: unknown = null;

  while (attempt < retries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...rest,
        headers: finalHeaders,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (noRetryStatus.includes(res.status)) throw new FetchError(`HTTP ${res.status}`, url, attempt, res.status);
      if (!res.ok) {
        lastError = new FetchError(`HTTP ${res.status}`, url, attempt, res.status);
        await sleep(jitter(backoffMs * 2 ** (attempt - 1)));
        continue;
      }
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof FetchError && DEFAULT_NO_RETRY.includes(err.status ?? 0)) throw err;
      lastError = err;
      await sleep(jitter(backoffMs * 2 ** (attempt - 1)));
    }
  }

  throw lastError ?? new FetchError(`Failed after ${retries} attempts`, url, retries);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function jitter(ms: number): number {
  return ms * (0.75 + Math.random() * 0.5);
}

function flattenHeaders(h: HeadersInit | undefined): Record<string, string> {
  if (!h) return {};
  if (h instanceof Headers) {
    const out: Record<string, string> = {};
    h.forEach((v, k) => (out[k] = v));
    return out;
  }
  if (Array.isArray(h)) return Object.fromEntries(h);
  return h as Record<string, string>;
}
