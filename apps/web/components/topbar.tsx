"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Eye, Radar, Search, Settings as SettingsIcon } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/cn";

const authDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
const hasClerkKey = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const NAV = [
  { href: "/radar",      label: "Radar" },
  { href: "/alerts",     label: "Alerts" },
  { href: "/briefs",     label: "Brief" },
  { href: "/proof",      label: "Proof" },
  { href: "/signals",    label: "Signals" },
  { href: "/sources",    label: "Sources" },
  { href: "/watchlists", label: "Watchlists" },
] as const;

export function Topbar({
  watchlistCount = 0,
  plan: _plan = "pro",
}: {
  watchlistCount?: number;
  plan?: "free" | "pro";
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="relative z-30 flex h-[var(--header-h)] flex-shrink-0 items-center gap-3 border-b border-line bg-white px-4">
      {/* brand */}
      <div className="flex items-center gap-2 font-semibold tracking-tight">
        <div className="relative inline-flex h-[26px] w-[26px] items-center justify-center rounded-md bg-gradient-to-br from-ink to-ink-2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
          <Radar className="h-3.5 w-3.5" strokeWidth={1.6} />
        </div>
        <span className="text-[14px] tracking-[-0.01em]">
          Brick &amp; Yield
          <span className="ml-1.5 text-[11px] font-normal text-muted-2">/ beta</span>
        </span>
      </div>

      {/* divider */}
      <div className="h-4 w-px bg-line" />

      {/* nav */}
      <nav className="flex items-center gap-0.5">
        {NAV.map((n) => (
          <button
            key={n.href}
            onClick={() => router.push(n.href as any)}
            data-active={pathname?.startsWith(n.href) ? "true" : "false"}
            className="gcir-topnav-btn"
          >
            {n.label}
          </button>
        ))}
      </nav>

      {/* search */}
      <button
        className={cn(
          "mx-auto flex h-[34px] max-w-[480px] flex-1 cursor-text items-center gap-2 rounded-md border border-line bg-bg-2 px-3 text-[13px] text-muted transition-colors hover:border-stone-300",
        )}
        onClick={() => window.dispatchEvent(new CustomEvent("gcir:cmd"))}
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted-2" />
        <span className="flex-1 text-left">Search projects, owners, signals…</span>
        <span className="flex gap-0.5">
          <kbd className="rounded border border-line border-b-2 bg-white px-[5px] py-px font-mono text-[10.5px] text-muted">⌘</kbd>
          <kbd className="rounded border border-line border-b-2 bg-white px-[5px] py-px font-mono text-[10.5px] text-muted">K</kbd>
        </span>
      </button>

      {/* right cluster */}
      <div className="ml-auto flex items-center gap-2">
        <button className="gcir-pill" title="Active watchlists">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <Eye className="h-3 w-3" />
          {watchlistCount} watching
        </button>
        <span className="inline-flex h-[22px] items-center rounded-full bg-accent/10 px-2 text-[10.5px] font-semibold uppercase tracking-wider text-accent">
          Full access
        </span>
        <button className="gcir-icon-btn" title="Notifications">
          <Bell className="h-4 w-4" strokeWidth={1.6} />
        </button>
        <button className="gcir-icon-btn" title="Settings">
          <SettingsIcon className="h-4 w-4" strokeWidth={1.6} />
        </button>
        {authDisabled || !hasClerkKey ? (
          <div className="h-[30px] w-[30px] rounded-full border border-line bg-bg-2" />
        ) : (
          <UserButton
            appearance={{ elements: { avatarBox: "h-[30px] w-[30px]" } }}
          />
        )}
      </div>
    </header>
  );
}
