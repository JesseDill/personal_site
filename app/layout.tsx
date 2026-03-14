import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Portfolio Craft | Minecraft-inspired personal site starter",
  description: "A minimal Next.js and React Three Fiber starter for a Minecraft-inspired personal website.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
