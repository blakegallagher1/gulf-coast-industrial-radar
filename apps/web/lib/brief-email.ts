export function renderBriefEmail({
  briefId,
  title,
  topMovers,
  narrative,
  appUrl,
}: {
  briefId: string;
  title: string;
  topMovers: { name?: string; scoreDelta?: number; delta?: number }[];
  narrative: string;
  appUrl: string;
}): { subject: string; html: string } {
  const subject = `[GCIR] ${title}`;

  const moversHtml = topMovers
    .slice(0, 5)
    .map((m) => {
      const delta = m.scoreDelta ?? m.delta ?? 0;
      const sign = delta > 0 ? "+" : "";
      const color = delta > 0 ? "#b3261e" : "#10a37f";
      return `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml(m.name ?? "—")}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-family:monospace;color:${color}">${sign}${delta}</td>
      </tr>`;
    })
    .join("");

  const briefUrl = `${appUrl}/briefs/${briefId}`;
  const excerptText = narrative.length > 300 ? narrative.slice(0, 300) + "..." : narrative;

  const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#222;max-width:560px;margin:0 auto;padding:24px">
  <div style="margin-bottom:18px">
    <div style="font-size:12px;color:#666;letter-spacing:0.04em;text-transform:uppercase;font-weight:600">Weekly Intelligence Brief</div>
    <div style="font-size:22px;font-weight:600;margin-top:4px;line-height:1.3">${escapeHtml(title)}</div>
  </div>
  ${moversHtml ? `<p style="margin:0 0 6px;font-size:12px;color:#666;letter-spacing:0.04em;text-transform:uppercase;font-weight:600">Top movers</p>
  <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px">
    <thead><tr>
      <th style="text-align:left;padding:6px 12px;border-bottom:2px solid #ddd;font-weight:600">Project</th>
      <th style="text-align:right;padding:6px 12px;border-bottom:2px solid #ddd;font-weight:600">Score delta</th>
    </tr></thead>
    <tbody>${moversHtml}</tbody>
  </table>` : ""}
  <p style="font-size:14px;line-height:1.6;color:#333;margin-bottom:24px">${escapeHtml(excerptText)}</p>
  <a href="${briefUrl}" style="display:inline-block;background:#0d0d0d;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:600">Read the full brief</a>
  <p style="font-size:12px;color:#888;margin-top:24px;border-top:1px solid #eee;padding-top:12px">
    Gulf Coast Industrial Radar · gulfcoastradar.com
  </p>
</body></html>`;

  return { subject, html };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
