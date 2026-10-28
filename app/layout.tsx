
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "reel & rose. — your personal film diary",
  description:
    "A little corner of the internet for your favourite movies, series, and stories.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
