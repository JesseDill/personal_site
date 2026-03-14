import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jesse's World | Explorable Portfolio",
  description: "Minecraft-inspired 3D portfolio starter built with Next.js and React Three Fiber.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
