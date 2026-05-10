import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Merge Master 2048 Challenge",
  description: "The ultimate 2048 merge puzzle game! Swipe tiles, use power-ups, reach 2048 and win coins!",
  keywords: ["2048", "merge master", "puzzle game", "tile game", "merge game", "challenge", "mobile game"],
  authors: [{ name: "Merge Master" }],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Merge 2048",
  },
  openGraph: {
    title: "Merge Master 2048 Challenge",
    description: "Swipe tiles, use power-ups, and reach 2048! Battle, win coins, climb the leaderboard!",
    type: "website",
    siteName: "Merge Master 2048",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#EDC22E",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA meta tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Merge 2048" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />

        {/* Adsterra Popunder Ad - Global */}
        <Script
          src="https://pl29392034.profitablecpmratenetwork.com/40/9d/aa/409daa8e988b716a6a40b571e679667a.js"
          strategy="afterInteractive"
        />

        {/* Adsterra Social Bar Ad - Global */}
        <Script
          src="https://pl29392035.profitablecpmratenetwork.com/b7/40/ba/b740ba65f24e56491e9bd88c482e6b7f.js"
          strategy="afterInteractive"
        />

        {/* PWA Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
