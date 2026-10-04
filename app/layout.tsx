import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import "./buyer.css";
import "./collector.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SeaGres — Hasil Laut Gresik",
  description: "Catat hasil, bagikan lot, dan temukan pembeli lokal dari satu tempat.",
  applicationName: "SeaGres",
  icons: { icon: "/icon.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-scroll-behavior="smooth">
      <body className={jakarta.className}>{children}</body>
    </html>
  );
}
