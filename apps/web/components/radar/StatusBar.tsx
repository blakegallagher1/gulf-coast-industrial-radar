export function StatusBar({
  health,
  count,
}: {
  health: { ok: number; degraded: number; total: number };
  count: number;
}) {
  return (
    <footer className="flex h-[var(--status-h)] flex-shrink-0 items-center gap-4 border-t border-line bg-bg-2 px-4 text-[11.5px] text-muted">
      <div className="flex items-center gap-2">
        <span
          className="h-1.5 w-1.5 rounded-full"
          style={{ background: health.degraded ? "#c97a16" : "#10a37f" }}
        />
        {health.degraded === 0 ? "All sources OK" : `${health.degraded} degraded`}
        <span className="font-mono text-ink-3">· {health.ok}/{health.total} active</span>
      </div>
      <div className="h-3.5 w-px self-center bg-line" />
      <div className="font-mono">{count} alerts in view</div>
      <div className="ml-auto font-mono">
        build · 2026.04.30 · 0.1.0
      </div>
    </footer>
  );
}
