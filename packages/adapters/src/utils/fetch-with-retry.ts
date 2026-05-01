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

      // 2xx success
      if (res.ok) return res;

      // Permanent failure — don't retry
      if (noRetryStatus.includes(res.status)) {
        throw new FetchError(
          `non-retryable HTTP ${res.status} from ${url}`,
          url,
          attempt,
          res.status,
        );
      }

      // 5xx / 429 — retry with backoff
      if (attempt >= retries) {
        throw new FetchError(
          `HTTP ${res.status} from ${url} after ${attempt} attempts`,
          url,
          attempt,
          res.status,
        );
      }
      lastError = new FetchError(`HTTP ${res.status}`, url, attempt, res.status);
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof FetchError && err.status && noRetryStatus.includes(err.status)) {
        throw err;
      }
      lastError = err;
      if (attempt >= retries) {
        throw new FetchError(
          `network error from ${url} after ${attempt} attempts: ${(err as Error).message}`,
          url,
          attempt,
        );
      }
    }

    // jittered exponential backoff
    const delay = backoffMs * Math.pow(2, attempt - 1) * (0.75 + Math.random() * 0.5);
    await new Promise((r) => setTimeout(r, delay));
  }

  throw lastError instanceof Error
    ? lastError
    : new FetchError("exhausted retries", url, attempt);
}

function flattenHeaders(h?: HeadersInit): Record<string, string> {
  if (!h) return {};
  if (h instanceof Headers) return Object.fromEntries(h.entries());
  if (Array.isArray(h)) return Object.fromEntries(h);
  return h as Record<string, string>;
}
