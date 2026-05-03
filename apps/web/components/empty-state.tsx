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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <h3 className="mb-1.5 text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mb-4 max-w-sm text-[13px] text-muted">{description}</p>
      {action && href && (
        <Link href={href as any} className="gcir-btn-primary px-4">
          {action}
        </Link>
      )}
    </div>
  );
}
