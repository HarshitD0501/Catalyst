import "./globals.css";
import Script from "next/script";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/components/auth/AuthProvider";

export const metadata = {
  title: "Catalyst — Elderly Care & Family Coordination Platform",
  description:
    "Catalyst: Intelligent elderly care platform with shared patient profiles, passcode-based family care circles, medication schedules, and proactive reminders.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.svg",
    apple: "/catalyst-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Catalyst",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  themeColor: "#172B4D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <body className="font-sans antialiased selection:bg-brand-peach selection:text-brand-navy" suppressHydrationWarning>
        <LanguageProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </LanguageProvider>
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
