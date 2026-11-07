import type { Metadata } from "next";
import { BRAND } from "./components/brand";
import { RevealOnScroll, SiteFooter, SiteNav } from "./components/SiteChrome";
import { AskTani } from "./components/Tani";
import "./globals.css";

// Share previews (LinkedIn, iMessage, Slack) use app/opengraph-image.png; icons are app/icon.svg and app/apple-icon.png.
export const metadata: Metadata = {
  metadataBase: new URL(BRAND.url),
  title: `${BRAND.name} - clear market-entry plans`,
  description: `${BRAND.description} By ${BRAND.author}.`,
  openGraph: {
    type: "website",
    url: "/",
    siteName: BRAND.name,
    title: `${BRAND.name}: ${BRAND.headline}`,
    description: "Market-entry plans for brands from anywhere, into Japan, Singapore, India and the United States. Built on real research with live sources.",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Serif+Display:ital@1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap"
        />
      </head>
      <body>
        <SiteNav />
        {children}
        <SiteFooter />
        <AskTani />
        <RevealOnScroll />
      </body>
    </html>
  );
}
