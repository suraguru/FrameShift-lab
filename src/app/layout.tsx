import type { Metadata } from "next";
import { Inter, VT323, IBM_Plex_Mono } from "next/font/google";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import MobileGuard from "@/components/MobileGuard";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const vt323 = VT323({ weight: "400", subsets: ["latin"], variable: "--font-vt323" });
const ibmPlex = IBM_Plex_Mono({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-ibm-plex",
});

export const metadata: Metadata = {
  title: "FrameShift | Creative Workstation",
  description:
    "Enterprise-grade retro-futuristic creative media workstation for real-time image and video processing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${vt323.variable} ${ibmPlex.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className="h-full font-sans bg-bg text-text-primary overflow-hidden"
        suppressHydrationWarning
      >
        <ErrorBoundary>
          <MobileGuard>{children}</MobileGuard>
        </ErrorBoundary>
      </body>
    </html>
  );
}

