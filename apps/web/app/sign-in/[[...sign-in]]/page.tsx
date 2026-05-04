import { SignIn } from "@clerk/nextjs";
import { Radar } from "lucide-react";
import Link from "next/link";

export default function Page() {
  return (
    <main className="flex min-h-screen bg-[#0a0a0a]">
      {/* Left panel */}
      <div className="hidden flex-col justify-between p-12 lg:flex lg:w-[480px] border-r border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-white/[0.08] ring-1 ring-white/[0.12]">
            <Radar className="h-3.5 w-3.5 text-[#10a37f]" strokeWidth={1.8} />
          </div>
          <Link href="/" className="text-[13.5px] font-semibold tracking-[-0.01em] text-white">
            Brick &amp; Yield
          </Link>
        </div>
        <div>
          <blockquote className="text-[17px] font-medium leading-relaxed tracking-[-0.015em] text-white/70">
            &ldquo;We saw the Hyundai Steel land assembly 141 days before the public announcement.&rdquo;
          </blockquote>
          <div className="mt-4 text-[12.5px] text-white/30">
            Gulf Coast industrial intelligence platform
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-[7px] bg-white/[0.08] ring-1 ring-white/[0.12]">
              <Radar className="h-3.5 w-3.5 text-[#10a37f]" strokeWidth={1.8} />
            </div>
            <span className="text-[13.5px] font-semibold text-white">Brick &amp; Yield</span>
          </div>
          <h2 className="mb-2 text-[22px] font-semibold tracking-[-0.02em] text-white">
            Sign in
          </h2>
          <p className="mb-7 text-[13.5px] text-white/40">
            Access the full Gulf Coast intelligence platform.
          </p>
          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "bg-transparent shadow-none border-0 p-0",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton:
                  "bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.1] transition-colors rounded-lg h-10 text-[13px] font-medium",
                socialButtonsBlockButtonText: "text-white/80",
                dividerLine: "bg-white/[0.08]",
                dividerText: "text-white/30 text-[12px]",
                formFieldLabel: "text-white/50 text-[12.5px] font-medium",
                formFieldInput:
                  "bg-white/[0.05] border border-white/[0.1] text-white placeholder:text-white/25 rounded-lg h-10 text-[13.5px] focus:border-[#10a37f]/60 focus:ring-0",
                formButtonPrimary:
                  "bg-white text-[#0a0a0a] hover:bg-white/90 font-semibold rounded-lg h-10 text-[14px]",
                footerActionLink: "text-[#10a37f] hover:text-[#10a37f]/80",
                footerActionText: "text-white/35 text-[12.5px]",
                identityPreviewText: "text-white/60",
                identityPreviewEditButton: "text-[#10a37f]",
                formResendCodeLink: "text-[#10a37f]",
                otpCodeFieldInput:
                  "bg-white/[0.05] border border-white/[0.1] text-white rounded-lg",
                alertText: "text-white/70",
                alert: "bg-white/[0.04] border border-white/[0.08] rounded-lg",
              },
            }}
          />
        </div>
      </div>
    </main>
  );
}
