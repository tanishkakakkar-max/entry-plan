import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Entry Plan - market-entry strategy for brands",
  description:
    "Tell us your brand and a country. Get a staked market-entry plan grounded in on-the-ground research. By Tanishka Kakkar.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500&family=Inter:wght@400;600&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
