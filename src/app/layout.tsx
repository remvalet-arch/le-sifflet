import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToasterProvider } from "@/components/providers/ToasterProvider";
import { ServiceWorkerRegister } from "@/components/providers/ServiceWorkerRegister";

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "VAR Time",
    template: "%s | VAR Time",
  },
  description:
    "Second écran football : signale les actions en direct, prédis les décisions de la VAR, grimpe au classement.",
  applicationName: "VAR Time",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VAR Time",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50 font-sans">
        {children}
        <ServiceWorkerRegister />
        <ToasterProvider />
      </body>
    </html>
  );
}
