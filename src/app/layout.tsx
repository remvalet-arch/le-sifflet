import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToasterProvider } from "@/components/providers/ToasterProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ServiceWorkerRegister } from "@/components/providers/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { PostHogProvider } from "@/app/providers/PostHogProvider";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "VAR TIME — L'app du match en direct",
    template: "%s | VAR TIME",
  },
  description:
    "Pronos avant les matchs, paris VAR en direct, ligues entre potes. L'app du match en direct, 100% gratuite, sifflets virtuels.",
  applicationName: "VAR TIME",
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    url: appUrl,
    siteName: "VAR TIME",
    title: "VAR TIME — L'app du match en direct",
    description:
      "Pronos avant les matchs, paris VAR en direct, ligues entre potes. 100% gratuit.",
  },
  twitter: {
    card: "summary_large_image",
    title: "VAR TIME — L'app du match en direct",
    description:
      "Pronos, paris VAR en direct, ligues entre potes. 100% gratuit.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VAR TIME",
    startupImage: [
      {
        url: "/icon.svg",
      },
    ],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="h-full antialiased">
      <head>
        {/* Apply saved theme before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('theme');if(t==='light'||t==='high-contrast')document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full bg-zinc-950 text-zinc-50 font-sans">
        <NextIntlClientProvider messages={messages}>
          <PostHogProvider>
            <ThemeProvider />
            {children}
            <ServiceWorkerRegister />
            <InstallPrompt />
            <ToasterProvider />
          </PostHogProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
