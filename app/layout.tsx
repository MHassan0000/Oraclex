import type { Metadata } from "next";
import { JetBrains_Mono, Sora, Space_Grotesk } from "next/font/google";

import { siteConfig } from "@/config/site";
import { clientEnv } from "@/lib/env/client";
import { cn } from "@/lib/utils";

import "./globals.css";
import { Providers } from "./providers";

const fontSans = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

const fontHeading = Sora({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  metadataBase: new URL(clientEnv.NEXT_PUBLIC_APP_URL ?? siteConfig.url),
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        fontSans.variable,
        fontMono.variable,
        fontHeading.variable,
        "h-full scroll-smooth",
      )}
    >
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
