import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TEAM SPIRIT | AI-Powered AML Investigation",
  description: "AI-powered Anti-Money Laundering investigation platform detecting suspicious financial activities through autonomous AI agents, machine learning, and graph intelligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
