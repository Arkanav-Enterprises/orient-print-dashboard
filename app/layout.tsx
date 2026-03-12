import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Nav } from "./components/nav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OrientPrint — AI Rollout Tools",
  description: "Dashboard generator, skill creator, and client templates for AI rollouts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-black text-neutral-200`}>
        <Nav />
        {children}
      </body>
    </html>
  );
}
