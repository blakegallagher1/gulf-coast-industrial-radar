import { cn } from "@/lib/cn";

/**
 * Brick & Yield · Pilot House page header.
 * Used at the top of /alerts, /briefs, /proof, /signals, /sources, /watchlists.
 *
 * Composition:
 *   §NN · eyebrow code · UPPERCASE LABEL · coordinate badge
 *   {display title}
 *   {description}
 *   {horizon rule}
 */
export function PageHeader({
  eyebrow,
  sectionCode,
  title,
  titleAccent,
  description,
  meta,
  children,
  className,
}: {
  eyebrow: string;
  sectionCode?: string;
  title: string;
  titleAccent?: string; // optional second-line italic accent
  description?: string;
  meta?: React.ReactNode; // optional right-side coordinate or status pill
  children?: React.ReactNode; // optional pills / actions row beneath description
  className?: string;
}) {
  return (
    <header className={cn("relative pb-8", className)}>
      <div className="flex items-baseline justify-between gap-4">
        <div className="gcir-eyebrow">
          {sectionCode && <span className="num">{sectionCode}</span>}
          <span>{eyebrow}</span>
        </div>
        {meta && <div className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-muted">{meta}</div>}
      </div>

      <h1 className="mt-3 font-display text-[44px] leading-[1.0] tracking-[-0.022em] text-ink sm:text-[56px]">
        {title}
        {titleAccent && (
          <>
            <br />
            <span className="italic text-ink-3">{titleAccent}</span>
          </>
        )}
      </h1>

      {description && (
        <p className="mt-4 max-w-2xl text-[15.5px] leading-[1.6] text-muted">
          {description}
        </p>
      )}

      {children && <div className="mt-6">{children}</div>}

      <div className="gcir-horizon mt-7" />
    </header>
  );
}
