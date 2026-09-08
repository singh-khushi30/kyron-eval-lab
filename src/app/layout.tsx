import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kyron Eval Lab",
  description:
    "Evaluation platform for a healthcare voice agent. Synthetic data only.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
