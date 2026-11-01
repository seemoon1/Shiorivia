import type { Metadata, Viewport } from "next";
import { Inter, Noto_Serif_SC, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script"; 
import { MusicProvider } from "../context/MusicContext";
import { LanguageProvider } from "../context/LanguageContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const serif = Noto_Serif_SC({ 
  subsets: ["latin"], 
  weight: ["400", "700"],
  variable: "--font-serif" 
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
});

export const metadata: Metadata = {
  title: "Shiorivia",
  description: "Shiorivia — a local-first, customizable AI story and chat experience.",
  manifest: "/manifest.json",
  openGraph: {
    title: "Shiorivia",
    description: "Where Stories Find Their Way.",
    images: [{ url: "/shiorivia-og.png", width: 1200, height: 630, alt: "Shiorivia Star Road" }],
  },
  twitter: { card: "summary_large_image", images: ["/shiorivia-og.png"] },
  icons: {
    icon: "/icon.svg",
    apple: "/shiorivia-app-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Shiorivia",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover", 
  themeColor: "#08182e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${inter.variable} ${serif.variable} ${mono.variable} font-sans`}>
        <Script 
          src="/lib/live2d.min.js" 
          strategy="beforeInteractive" 
        />
        
        {process.env.NEXT_PUBLIC_ENABLE_LOCAL_LIVE2D === "true" && <Script
          src="/lib/live2dcubismcore.min.js"
          strategy="beforeInteractive"
        />}
        
        <Script 
          src="/lib/vconsole.min.js"
          strategy="beforeInteractive"
        />
        <Script id="init-vconsole" strategy="afterInteractive">
          {`
            // 简单的移动端检测正则
            if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
                var vConsole = new VConsole();
            }
          `}
        </Script>
        <MusicProvider>
          <LanguageProvider>{children}</LanguageProvider>
        </MusicProvider>
      </body>
    </html>
  );
}