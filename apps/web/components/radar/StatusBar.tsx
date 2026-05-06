export function StatusBar({
  health,
  count,
}: {
  health: { ok: number; degraded: number; total: number };
  count: number;
}) {
  return (
    <footer className="flex h-[var(--status-h)] flex-shrink-0 items-center gap-4 border-t border-line bg-bone-2/80 px-4 font-mono text-[10.5px] uppercase tracking-[0.10em] text-muted">
      <div className="flex items-center gap-2">
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="absolute inline-flex h-full w-full rounded-full opacity-70 gcir-ping"
            style={{ background: health.degraded ? "var(--warn)" : "var(--phosphor)" }}
          />
          <span
            className="relative inline-flex h-1.5 w-1.5 rounded-full"
            style={{ background: health.degraded ? "var(--warn)" : "var(--phosphor)" }}
          />
        </span>
        <span className="text-ink-3">
          {health.degraded === 0 ? "All public sources OK" : `${health.degraded} degraded`}
        </span>
        <span className="text-muted-2">·</span>
        <span>{health.ok}/{health.total} active</span>
      </div>

      <div className="h-3 w-px self-center bg-line" />

      <div>
        <span className="text-ink-3 font-semibold">{count}</span>
        <span className="ml-1.5 text-muted-2">alerts in view</span>
      </div>

      <div className="h-3 w-px self-center bg-line" />

      <div className="hidden md:block">
        <span className="text-muted-2">bearing</span>
        <span className="ml-1.5 text-ink-3">287°</span>
        <span className="ml-3 text-muted-2">sweep</span>
        <span className="ml-1.5 text-ink-3">0.6 Hz</span>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span className="text-muted-2">build</span>
        <span className="text-ink-3">2026.05 · v0.1.0</span>
        <span className="hidden h-3 w-px bg-line sm:block" />
        <span className="hidden text-muted-2 sm:inline">© Brick &amp; Yield</span>
      </div>
    </footer>
  );
}
