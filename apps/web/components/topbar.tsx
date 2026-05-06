"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Eye, Search, Settings as SettingsIcon } from "lucide-react";
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
    <header className="relative z-30 flex h-[var(--header-h)] flex-shrink-0 items-center gap-4 border-b border-line bg-bone/95 px-5 backdrop-blur-sm">
      {/* brand */}
      <Link href="/" className="flex items-center gap-2.5">
        <BrandMark />
        <div className="flex items-baseline gap-2 leading-none">
          <span className="font-display text-[18px] tracking-[-0.01em] text-ink">
            Brick &amp; Yield
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.20em] text-muted-2">
            v0.1
          </span>
        </div>
      </Link>

      {/* divider */}
      <div className="h-5 w-px bg-line" />

      {/* nav */}
      <nav className="flex items-center gap-px">
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
          "ml-auto mr-auto flex h-9 max-w-[460px] flex-1 cursor-text items-center gap-2.5 rounded-[5px] border border-line bg-bone-2/60 px-3 text-[12.5px] text-muted transition-all",
          "hover:border-ink/30 hover:bg-bone-2",
        )}
        onClick={() => window.dispatchEvent(new CustomEvent("gcir:cmd"))}
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted-2" />
        <span className="flex-1 text-left">Search projects, owners, parcels, signals…</span>
        <span className="flex gap-1">
          <kbd className="rounded-[3px] border border-line bg-bone px-[5px] py-px font-mono text-[10px] font-medium text-muted shadow-[0_1px_0_rgba(12,16,14,0.06)]">⌘</kbd>
          <kbd className="rounded-[3px] border border-line bg-bone px-[5px] py-px font-mono text-[10px] font-medium text-muted shadow-[0_1px_0_rgba(12,16,14,0.06)]">K</kbd>
        </span>
      </button>

      {/* right cluster */}
      <div className="flex items-center gap-2">
        <button className="gcir-pill" title="Active watchlists">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-[#3d8a5a] opacity-80 gcir-ping" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3d8a5a]" />
          </span>
          <Eye className="h-3 w-3" strokeWidth={1.8} />
          <span className="font-mono text-[11px] font-semibold">{watchlistCount}</span>
          <span className="text-muted-2">watching</span>
        </button>
        <span className="inline-flex h-[26px] items-center gap-1.5 rounded-[3px] border border-accent/30 bg-accent/10 px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-ink">
          <span className="h-1 w-1 rounded-full bg-accent" />
          Full access
        </span>
        <button className="gcir-icon-btn" title="Notifications">
          <Bell className="h-4 w-4" strokeWidth={1.6} />
        </button>
        <button className="gcir-icon-btn" title="Settings">
          <SettingsIcon className="h-4 w-4" strokeWidth={1.6} />
        </button>
        {authDisabled || !hasClerkKey ? (
          <div className="h-[30px] w-[30px] rounded-full border border-line bg-bone-2" />
        ) : (
          <UserButton
            appearance={{ elements: { avatarBox: "h-[30px] w-[30px]" } }}
          />
        )}
      </div>
    </header>
  );
}

function BrandMark() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center rounded-[5px] border border-ink/15 bg-ink shadow-inset">
      <svg viewBox="0 0 32 32" className="h-4 w-4" fill="none" stroke="#e9a539" strokeWidth="1.6">
        <circle cx="16" cy="16" r="13" />
        <circle cx="16" cy="16" r="6" opacity=".6" />
        <line x1="16" y1="16" x2="26" y2="6" stroke="#e9a539" strokeWidth="2.2" />
        <circle cx="16" cy="16" r="1.5" fill="#e9a539" stroke="none" />
      </svg>
    </span>
  );
}
