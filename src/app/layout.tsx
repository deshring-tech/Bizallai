import type { Metadata, Viewport } from "next";
import { siteUrl } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BizPage — one page where customers can actually book and pay",
    template: "%s",
  },
  description:
    "Describe your business, get a live page in under a minute. Bookings, prices, reviews and WhatsApp in one link.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
