import Link from "next/link";

export function EmptyState({
  title,
  description,
  action,
  href,
}: {
  title: string;
  description: string;
  action?: string;
  href?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[7px] border border-dashed border-line bg-bone-2/40 py-16 text-center">
      <span className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-bone">
        <span className="h-2 w-2 rounded-full bg-accent" />
      </span>
      <h3 className="font-display text-[22px] tracking-tight text-ink">{title}</h3>
      <p className="mt-1.5 mb-5 max-w-sm text-[13px] leading-relaxed text-muted">{description}</p>
      {action && href && (
        <Link href={href as any} className="gcir-btn-primary px-4">
          {action}
        </Link>
      )}
    </div>
  );
}
