import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "TOEIC Trainer",
  description: "Personal TOEIC study system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Sidebar />
        <main className="ml-[220px] min-h-screen p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
