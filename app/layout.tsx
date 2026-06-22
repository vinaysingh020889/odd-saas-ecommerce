import type { Metadata } from "next";
import { runtimeConfig } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(runtimeConfig.appBaseUrl),
  title: {
    default: "OMDivyaDarshan",
    template: "%s | OMDivyaDarshan"
  },
  description: "Phase 0 foundation for the OMDivyaDarshan commerce SaaS app."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
