import { Inter } from "next/font/google";
import "material-symbols/outlined.css";
import "./globals.css";
import "@/lib/network/initOutboundProxy"; // Auto-initialize outbound proxy env
import "@/shared/services/bootstrap"; // Auto-run initializeApp (startup cleanup, background token refresh)
import { initConsoleLogCapture } from "@/lib/consoleLogBuffer";
import { RuntimeI18nProvider } from "@/i18n/RuntimeI18nProvider";

// Hook console immediately at module load time (server-side only, runs once)
initConsoleLogCapture();

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "K-spinning - AI Infrastructure Management",
  description: "One endpoint for all your AI providers. Manage keys, monitor usage, and scale effortlessly.",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `var d=document,r=d.documentElement,f=function(){r.classList.add('fonts-loaded')};if(d.fonts&&d.fonts.load){d.fonts.load('24px "Material Symbols Outlined"').then(f).catch(f);setTimeout(f,3000)}else{f()}`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <RuntimeI18nProvider>
          {children}
        </RuntimeI18nProvider>
      </body>
    </html>
  );
}
