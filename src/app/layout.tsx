import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: { default: "SRH Tokenization OS", template: "%s · SRH Tokenization OS" },
  description: "Institutional tokenization and digital capital markets operating system: structure, issue, distribute, settle, service and trade tokenised assets.",
  applicationName: "SRH Tokenization OS",
};

export const viewport: Viewport = {
  themeColor: "#f6f5f8",
  width: "device-width",
  initialScale: 1,
};

// Applies the saved theme before first paint to avoid a light flash in dark mode.
const themeScript = `(function(){try{var s=JSON.parse(localStorage.getItem('srh2.session')||'{}').state||{};var t=s.theme||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');var b={tnt_xyz:['#0E7C7B','#0A6362'],tnt_mrd:['#3346C8','#2636A6'],tnt_ngt:['#1F6F43','#185835']}[s.tenantId];if(b){document.documentElement.style.setProperty('--brand',b[0]);document.documentElement.style.setProperty('--brand-hover',b[1]);}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
