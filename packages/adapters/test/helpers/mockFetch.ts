/**
 * Mock fetch helper for adapter unit tests.
 *
 * Usage:
 *   const { fetch, setResponse } = createMockFetch();
 *   setResponse(200, fixtureText);
 *   // inject fetch into adapter context or globalThis
 */

export interface MockFetchHandle {
  fetch: typeof globalThis.fetch;
  setResponse(status: number, body: string, headers?: Record<string, string>): void;
  setError(err: Error): void;
  calls: Array<{ url: string; init?: RequestInit }>;
  reset(): void;
}

export function createMockFetch(): MockFetchHandle {
  let nextStatus = 200;
  let nextBody = "";
  let nextHeaders: Record<string, string> = {};
  let nextError: Error | null = null;
  const calls: Array<{ url: string; init?: RequestInit }> = [];

  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    calls.push({ url, init });

    if (nextError) {
      const err = nextError;
      nextError = null;
      throw err;
    }

    const status = nextStatus;
    const body = nextBody;
    const headers = new Headers(nextHeaders);

    return new Response(body, { status, headers });
  };

  return {
    fetch: fetch as unknown as typeof globalThis.fetch,
    setResponse(status, body, headers = {}) {
      nextStatus = status;
      nextBody = body;
      nextHeaders = headers;
      nextError = null;
    },
    setError(err) {
      nextError = err;
    },
    calls,
    reset() {
      nextStatus = 200;
      nextBody = "";
      nextHeaders = {};
      nextError = null;
      calls.length = 0;
    },
  };
}
