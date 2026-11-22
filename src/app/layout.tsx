import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AERA Work Portal",
  description: "See every action your automations take, live.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
