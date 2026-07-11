import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeInit } from "@/components/ThemeInit";
import { PwaProvider } from "@/components/PwaProvider";
import { ToastContainer } from "@/components/Toast";
import "./globals.css";
import "./workspace.css";
import "./ui-polish.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sysadmin Notes",
  description: "Облачный блокнот для сисадмина: проекты, доступы, инструкции, задачи и учёт времени.",
  applicationName: "Sysadmin Notes",
  appleWebApp: {
    capable: true,
    title: "Sysadmin Notes",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#00796b" },
    { media: "(prefers-color-scheme: dark)", color: "#3ba55d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('sysadmin-notes-store')||'{}');var t=s.state&&s.state.theme;var r=t==='dark'?'dark':t==='light'?'light':(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.setAttribute('data-theme',r);document.documentElement.style.colorScheme=r;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeInit />
        {children}
        <PwaProvider />
        <ToastContainer />
      </body>
    </html>
  );
}
