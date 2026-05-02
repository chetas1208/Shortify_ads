import type { Metadata } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import type { ReactNode } from "react";
import "./styles.css";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

export const metadata: Metadata = {
  title: {
    default: "Matcha | Cinematic AI Video Workspace",
    template: "%s | Matcha"
  },
  description: "Web-first AI video workspace for text-to-video, long-form clip extraction, and multimodal generation."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${sans.variable} ${display.variable}`}>{children}</body>
    </html>
  );
}
