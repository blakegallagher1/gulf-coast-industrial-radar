"use client";

import { usePathname, useRouter } from "next/navigation";
import { Bell, Eye, Radar, Search, Settings as SettingsIcon } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/radar", label: "Radar" },
  { href: "/briefs", label: "Weekly Brief" },
  { href: "/signals", label: "Signals" },
  { href: "/sources", label: "Sources" },
  { href: "/watchlists", label: "Watchlists" },
] as const;

export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <header className="relative z-30 flex h-[var(--header-h)] flex-shrink-0 items-center gap-3.5 border-b border-line bg-white px-4">
      {/* brand */}
      <div className="flex items-center gap-2.5 font-semibold tracking-tight">
        <div className="relative inline-flex h-[26px] w-[26px] items-center justify-center rounded-md bg-gradient-to-br from-ink to-ink-2 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
          <Radar className="h-3.5 w-3.5" strokeWidth={1.6} />
        </div>
        <span className="text-[14px]">
          Gulf Coast Industrial Radar
          <span className="ml-1.5 text-[12.5px] font-normal text-muted-2">/ private beta</span>
        </span>
      </div>

      {/* nav */}
      <nav className="ml-3 flex items-center gap-0.5">
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

      {/* search trigger (command palette stub) */}
      <button
        className={cn(
          "mx-auto flex h-[34px] max-w-[520px] flex-1 cursor-text items-center gap-2 rounded-md border border-line bg-bg-2 px-3 text-[13px] text-muted transition-colors hover:border-stone-300",
        )}
        onClick={() => {
          /* command palette is wired in radar page */
          window.dispatchEvent(new CustomEvent("gcir:cmd"));
        }}
      >
        <Search className="h-3.5 w-3.5 flex-shrink-0 text-muted-2" />
        Search projects, owners, parcels, signals…
        <span className="ml-auto flex gap-0.5">
          <kbd className="rounded border border-line border-b-2 bg-white px-[5px] py-px font-mono text-[10.5px] text-muted">⌘</kbd>
          <kbd className="rounded border border-line border-b-2 bg-white px-[5px] py-px font-mono text-[10.5px] text-muted">K</kbd>
        </span>
      </button>

      {/* right cluster */}
      <div className="ml-auto flex items-center gap-2">
        <button className="gcir-pill" title="Watchlists tracking corridors">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          <Eye className="h-3 w-3" /> 13 watching
        </button>
        <button className="gcir-icon-btn" title="Notifications">
          <Bell className="h-4 w-4" strokeWidth={1.6} />
        </button>
        <button className="gcir-icon-btn" title="Settings">
          <SettingsIcon className="h-4 w-4" strokeWidth={1.6} />
        </button>
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-[30px] w-[30px]",
            },
          }}
        />
      </div>
    </header>
  );
}
