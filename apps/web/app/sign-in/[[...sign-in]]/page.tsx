import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function Page() {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-[#0c100e]">
      {/* Background sweep */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[1200px] -translate-x-1/2 -translate-y-1/2 opacity-30">
        <div className="gcir-sweep absolute inset-0 rounded-full" />
        <div className="absolute inset-[18%] rounded-full border border-bone/[0.05]" />
        <div className="absolute inset-[36%] rounded-full border border-bone/[0.05]" />
      </div>
      <div className="gcir-blueprint-dark pointer-events-none absolute inset-0 opacity-50" />

      {/* Left panel */}
      <div className="relative z-10 hidden flex-col justify-between p-12 lg:flex lg:w-[480px] border-r border-bone/[0.08]">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark />
          <div className="flex items-baseline gap-2">
            <span className="font-display text-[19px] tracking-[-0.01em] text-bone">Brick &amp; Yield</span>
            <span className="font-mono text-[10px] uppercase tracking-[0.20em] text-bone/40">est. 26</span>
          </div>
        </Link>

        <div>
          <div className="mb-3 inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] text-accent">
            <span className="h-px w-8 bg-accent/60" />
            From the operating log
          </div>
          <blockquote className="font-display text-[26px] leading-[1.18] tracking-[-0.018em] text-bone">
            <span className="text-accent">"</span>
            We saw the Hyundai Steel land assembly <span className="italic text-accent">141 days</span> before the public announcement.
            <span className="text-accent">"</span>
          </blockquote>
          <div className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-bone/35">
            Donaldsonville, LA · 30.1014°N · 90.9879°W
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <BrandMark />
            <span className="font-display text-[18px] tracking-[-0.01em] text-bone">Brick &amp; Yield</span>
          </div>

          <div className="gcir-eyebrow text-accent">
            <span className="num">§S1</span>
            <span>Sign in</span>
          </div>

          <h2 className="mt-3 font-display text-[42px] leading-[1.0] tracking-[-0.022em] text-bone">
            Open the radar.
          </h2>
          <p className="mt-3 mb-7 text-[14px] leading-relaxed text-bone/55">
            Full access to Gulf Coast industrial intelligence.
          </p>

          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-transparent shadow-none border-0 p-0",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "bg-bone/[0.04] border border-bone/[0.10] text-bone hover:bg-bone/[0.08] transition-colors rounded-[5px] h-10 text-[13px] font-medium",
                socialButtonsBlockButtonText: "text-bone/85",
                dividerLine: "bg-bone/[0.08]",
                dividerText: "text-bone/35 text-[11px] uppercase tracking-[0.14em]",
                formFieldLabel: "text-bone/55 text-[11.5px] font-medium uppercase tracking-[0.10em]",
                formFieldInput:
                  "bg-bone/[0.04] border border-bone/[0.10] text-bone placeholder:text-bone/25 rounded-[5px] h-10 text-[14px] focus:border-[#e9a539]/60 focus:ring-0",
                formButtonPrimary:
                  "bg-[#e9a539] text-[#0c100e] hover:bg-[#f4b94f] font-semibold uppercase tracking-[0.08em] rounded-[5px] h-10 text-[12.5px]",
                footerActionLink: "text-[#e9a539] hover:text-[#f4b94f]",
                footerActionText: "text-bone/35 text-[12px]",
                identityPreviewText: "text-bone/60",
                identityPreviewEditButton: "text-[#e9a539]",
                formResendCodeLink: "text-[#e9a539]",
                otpCodeFieldInput:
                  "bg-bone/[0.04] border border-bone/[0.10] text-bone rounded-[5px]",
                alertText: "text-bone/75",
                alert: "bg-bone/[0.04] border border-bone/[0.08] rounded-[5px]",
              },
            }}
          />

          <div className="mt-10 font-mono text-[10px] uppercase tracking-[0.18em] text-bone/30">
            console · operating · v0.1.0
          </div>
        </div>
      </div>
    </main>
  );
}

function BrandMark() {
  return (
    <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-[5px] border border-bone/15 bg-bone/[0.04] backdrop-blur">
      <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" stroke="#e9a539" strokeWidth="1.4">
        <circle cx="16" cy="16" r="13" />
        <circle cx="16" cy="16" r="8" opacity=".55" />
        <line x1="16" y1="16" x2="26" y2="6" stroke="#e9a539" strokeWidth="2" />
        <circle cx="16" cy="16" r="2.5" fill="#e9a539" stroke="none" />
      </svg>
    </span>
  );
}
