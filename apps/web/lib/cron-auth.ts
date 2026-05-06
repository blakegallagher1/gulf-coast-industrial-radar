import { NextResponse } from "next/server";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalRequest(req: Request): boolean {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = req.headers.get("host");
  const rawHost = forwardedHost ?? host;
  if (!rawHost) return false;

  const hostname = rawHost.split(":")[0]?.trim().toLowerCase();
  return hostname ? LOCAL_HOSTS.has(hostname) : false;
}

export function verifyCronAuthorization(req: Request): NextResponse | null {
  const token = process.env.CRON_SECRET ?? process.env.HEALTHCHECK_TOKEN;

  if (!token) {
    if (process.env.NODE_ENV !== "production" || isLocalRequest(req)) {
      return null;
    }

    return NextResponse.json(
      { error: "cron auth misconfigured" },
      { status: 503 },
    );
  }

  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${token}`;

  if (auth !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  return null;
}
