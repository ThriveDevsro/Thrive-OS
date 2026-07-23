import type { Metadata } from "next";
import { Sora } from "next/font/google";
import "./globals.css";
import "./mobile.css";
import "./tasks.css";
import "./interactions.css";
import "./sidebar.css";
import "./sidebar-overrides.css";
import "./logout.css";
import "./login-clean.css";
import "./recovery.css";
import "./modules.css";
import "./calendar.css";
import "./calendar-week.css";
import "./quick-create.css";
import "./topbar.css";
import "./team.css";
import "./ai.css";
import "./copilot.css";
import "./connections.css";
import "./inbox.css";
import "./dashboard-role.css";
import "./invite.css";
import "./readability.css";
import "./typography-overrides.css";
import "./lead-batch.css";
import "./company-profile-fixes.css";
import "./navigation-performance.css";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Thrive OS",
  description: "Thrive Dev company operating system",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Thrive OS",
  },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={sora.variable} suppressHydrationWarning>
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
