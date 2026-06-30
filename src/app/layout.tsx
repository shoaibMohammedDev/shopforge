import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/layout/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ShopForge - Premium E-Commerce Platform",
  description: "Discover amazing products at unbeatable prices. Shop electronics, fashion, home goods, and more on ShopForge.",
  keywords: ["ShopForge", "e-commerce", "online shopping", "electronics", "fashion", "deals"],
  authors: [{ name: "ShopForge Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "ShopForge - Premium E-Commerce Platform",
    description: "Discover amazing products at unbeatable prices.",
    siteName: "ShopForge",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ShopForge - Premium E-Commerce Platform",
    description: "Discover amazing products at unbeatable prices.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
