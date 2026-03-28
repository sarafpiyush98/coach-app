import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Rajdhani } from "next/font/google";
import { ServiceWorkerRegistration } from "@/components/ServiceWorkerRegistration";
import { BottomNav } from "@/components/BottomNav";
// import { ParticlesBg } from "@/components/particles-bg";
import { SystemToastContainer } from "@/components/ui/system-toast";
import { MuteToggle } from "@/components/mute-toggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "THE SYSTEM",
  description: "The System assigns. The System records.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "THE SYSTEM",
  },
};

export const viewport: Viewport = {
  themeColor: "#0C0C0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${rajdhani.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <ServiceWorkerRegistration />
        <SystemToastContainer />
        <MuteToggle />
        {/* <ParticlesBg /> */}
        <main className="relative z-10 flex-1 pb-20">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
