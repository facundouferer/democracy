import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DEMOCRACIA.EXE - Sistema de Datos Legislativos",
  description: "Terminal de acceso a información de diputados - Argentina 2025",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-green-400 min-h-screen`}
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          background: 'linear-gradient(45deg, #0a0a0a 0%, #001a0a 50%, #0a0a0a 100%)',
        }}
      >
        <div className="min-h-screen relative">
          {/* Efecto de CRT */}
          <div className="fixed inset-0 pointer-events-none z-50">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-green-400/5 to-transparent opacity-20"></div>
            <div className="absolute inset-0" style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,65,0.03) 2px, rgba(0,255,65,0.03) 4px)',
            }}></div>
          </div>

          <Navbar />
          <main className="pt-6 relative z-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
