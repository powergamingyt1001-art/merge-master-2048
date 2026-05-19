import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
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

const SITE_URL = "https://merge-master-2048-oaou.vercel.app";

export const metadata: Metadata = {
  title: "Merge Master 2048",
  description:
    "Play Merge Master 2048 online for free. Addictive merge puzzle game with smooth gameplay, leaderboard, rewards and fun challenges.",
  keywords: [
    "2048 game",
    "merge master 2048",
    "online puzzle game",
    "addictive merge game",
    "free browser game",
    "puzzle challenge game",
    "2048 merge",
    "tile puzzle",
    "brain game",
    "casual game",
  ],
  authors: [{ name: "Merge Master 2048" }],
  creator: "Merge Master 2048",
  publisher: "Merge Master 2048",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Merge 2048",
  },
  openGraph: {
    title: "Merge Master 2048",
    description:
      "Play Merge Master 2048 online for free. Addictive merge puzzle game with smooth gameplay, leaderboard, rewards and fun challenges.",
    url: SITE_URL,
    type: "website",
    siteName: "Merge Master 2048",
    images: [
      {
        url: "/preview.png",
        width: 1200,
        height: 630,
        alt: "Merge Master 2048 - Play Free Online",
      },
    ],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Merge Master 2048",
    description:
      "Play Merge Master 2048 online for free. Addictive merge puzzle game with smooth gameplay, leaderboard, rewards and fun challenges.",
    images: ["/preview.png"],
  },
  alternates: {
    canonical: SITE_URL,
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
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <Toaster />
        </ThemeProvider>

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
