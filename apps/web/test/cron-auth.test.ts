import { afterEach, describe, expect, it } from "vitest";
import { verifyCronAuthorization } from "../lib/cron-auth";

const ORIGINAL_ENV = { ...process.env };

function withEnv(
  overrides: Record<string, string | undefined>,
  run: () => void,
): void {
  Object.assign(process.env, ORIGINAL_ENV);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  run();
}

describe("verifyCronAuthorization", () => {
  afterEach(() => {
    Object.assign(process.env, ORIGINAL_ENV);
  });

  it("fails closed in production when the cron secret is missing", () => {
    withEnv(
      {
        NODE_ENV: "production",
        CRON_SECRET: undefined,
        HEALTHCHECK_TOKEN: undefined,
      },
      () => {
        const response = verifyCronAuthorization(
          new Request("https://brickandyield.com/api/cron/qlad", {
            method: "POST",
            headers: { host: "brickandyield.com" },
          }),
        );

        expect(response?.status).toBe(503);
      },
    );
  });

  it("allows local requests without a cron secret outside production", () => {
    withEnv(
      {
        NODE_ENV: "test",
        CRON_SECRET: undefined,
        HEALTHCHECK_TOKEN: undefined,
      },
      () => {
        const response = verifyCronAuthorization(
          new Request("http://localhost:3000/api/cron/qlad", {
            method: "POST",
            headers: { host: "localhost:3000" },
          }),
        );

        expect(response).toBeNull();
      },
    );
  });

  it("rejects requests with the wrong bearer token", () => {
    withEnv(
      {
        NODE_ENV: "production",
        CRON_SECRET: "top-secret",
        HEALTHCHECK_TOKEN: undefined,
      },
      () => {
        const response = verifyCronAuthorization(
          new Request("https://brickandyield.com/api/cron/qlad", {
            method: "POST",
            headers: {
              authorization: "Bearer wrong-secret",
              host: "brickandyield.com",
            },
          }),
        );

        expect(response?.status).toBe(401);
      },
    );
  });

  it("accepts requests with the expected bearer token", () => {
    withEnv(
      {
        NODE_ENV: "production",
        CRON_SECRET: "top-secret",
        HEALTHCHECK_TOKEN: undefined,
      },
      () => {
        const response = verifyCronAuthorization(
          new Request("https://brickandyield.com/api/cron/qlad", {
            method: "POST",
            headers: {
              authorization: "Bearer top-secret",
              host: "brickandyield.com",
            },
          }),
        );

        expect(response).toBeNull();
      },
    );
  });
});
