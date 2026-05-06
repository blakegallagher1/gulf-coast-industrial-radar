import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const authDisabled = process.env.NEXT_PUBLIC_DISABLE_AUTH === "true";
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export const metadata: Metadata = {
  title: {
    default: "Gulf Coast Industrial Radar",
    template: "%s · Gulf Coast Industrial Radar",
  },
  description:
    "Detect Gulf Coast industrial demand and site-control formation early enough to buy, option, entitle, sell, or avoid land before the market prices it in.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://brickandyield.com"),
};

function MaybeClerk({ children }: { children: React.ReactNode }) {
  if (authDisabled || !clerkPublishableKey) return <>{children}</>;
  return (
    <ClerkProvider
      signInFallbackRedirectUrl="/radar"
      signUpFallbackRedirectUrl="/radar"
      appearance={{
        elements: {
          card: "shadow-md",
          formButtonPrimary: "bg-ink hover:bg-black text-white rounded-md",
          headerTitle: "tracking-tight",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MaybeClerk>
      <html lang="en">
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600&display=swap"
            rel="stylesheet"
          />
          <link
            href="https://cdn.jsdelivr.net/npm/maplibre-gl@4.7.1/dist/maplibre-gl.css"
            rel="stylesheet"
          />
        </head>
        <body>{children}</body>
      </html>
    </MaybeClerk>
  );
}
