import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Garbage Day",
  description: "Who takes the garbage out today?",
  applicationName: "Garbage Day",
  manifest: "/garbage/manifest",
  appleWebApp: { capable: true, title: "Garbage", statusBarStyle: "black-translucent" },
  icons: { icon: "/pwa-icon/192?k=garbage", apple: "/pwa-icon/180?k=garbage" },
};

/** The garbage space has its own green accent; `data-space` scopes the colour overrides in globals.css. */
export default function GarbageLayout({ children }: { children: React.ReactNode }) {
  return <div data-space="garbage">{children}</div>;
}
