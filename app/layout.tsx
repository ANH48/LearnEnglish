import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Be_Vietnam_Pro, Geist_Mono, Nunito } from "next/font/google";
import "./globals.css";

// Both fonts ship Vietnamese glyphs; Nunito's rounded letters keep headings friendly.
const body = Be_Vietnam_Pro({ variable: "--font-body", subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"] });
const display = Nunito({ variable: "--font-display", subsets: ["latin", "vietnamese"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LearnEnglish",
  description: "Học tiếng Anh theo khóa học, bài học và bài tập.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" className={`${body.variable} ${display.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
