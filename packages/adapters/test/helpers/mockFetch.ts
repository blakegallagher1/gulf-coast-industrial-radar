/**
 * Shared fetch mock helper — no MSW dependency.
 * Stubs the global fetch for one request, returning fixture file contents.
 */
import { vi } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export function mockFetchOnce(fixturePath: string, mime: string) {
  const stub = vi.fn(async () => {
    const body = await readFile(
      resolve(__dirname, "..", "fixtures", fixturePath),
      "utf8",
    );
    return new Response(body, {
      status: 200,
      headers: { "content-type": mime },
    });
  });
  vi.stubGlobal("fetch", stub);
  return stub;
}

/**
 * Stub fetch to return an empty 200 response (for adapters that call
 * multiple URLs in sequence — call this after setting the first mock if
 * additional calls are expected but not under test).
 */
export function mockFetchEmpty(mime = "application/json") {
  const stub = vi.fn(async () => new Response("{}", { status: 200, headers: { "content-type": mime } }));
  vi.stubGlobal("fetch", stub);
  return stub;
}
