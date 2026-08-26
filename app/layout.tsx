import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";

export const metadata: Metadata = {
  title: "StewardHQ",
  description: "Executive operating system for multi-business owners, teams, assets, and AI workforce.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "StewardHQ", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1324",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="appShell">
          <Sidebar />
          <main className="mainShell">{children}</main>
        </div>
        <MobileNav />
      </body>
    </html>
  );
}
