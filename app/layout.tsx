
import type { Metadata } from "next";
import "./globals.css";

import RoseRain from "@/components/RoseRain";

export const metadata: Metadata = {
  title: "Brainrot & Bookmarks — your personal story archive",
  description:
    "A little corner of the internet for your favourite movies, books, reviews, and stories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <RoseRain />
        {children}
      </body>
    </html>
  );
}
