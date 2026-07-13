import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lingua Loop - Spaced Repetition Language Learning",
  description: "Learn languages with spaced repetition and interactive game formats.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply theme before paint to avoid flash. Defaults to emerald. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var raw = localStorage.getItem('lingua-loop-data-v1');
                  var theme = 'emerald';
                  var soundEnabled = true;
                  if (raw) {
                    var data = JSON.parse(raw);
                    if (data.preferences && data.preferences.theme) {
                      theme = data.preferences.theme;
                    }
                    if (data.preferences && typeof data.preferences.soundEnabled === 'boolean') {
                      soundEnabled = data.preferences.soundEnabled;
                    }
                  }
                  var themes = {
                    emerald: { primary: '#10b981', primaryHover: '#059669', primaryLight: 'rgb(209 250 229)', primaryDark: 'rgb(6 78 59 / 0.2)', gradientFrom: 'rgb(209 250 229)', gradientTo: '#ffffff', ring: '#10b981' },
                    ocean: { primary: '#0891b2', primaryHover: '#0e7490', primaryLight: 'rgb(207 250 254)', primaryDark: 'rgb(8 145 178 / 0.2)', gradientFrom: 'rgb(207 250 254)', gradientTo: '#ffffff', ring: '#0891b2' },
                    sunset: { primary: '#f97316', primaryHover: '#ea580c', primaryLight: 'rgb(255 237 213)', primaryDark: 'rgb(249 115 22 / 0.2)', gradientFrom: 'rgb(255 237 213)', gradientTo: '#ffffff', ring: '#f97316' },
                    royal: { primary: '#a855f7', primaryHover: '#9333ea', primaryLight: 'rgb(243 232 255)', primaryDark: 'rgb(168 85 247 / 0.2)', gradientFrom: 'rgb(243 232 255)', gradientTo: '#ffffff', ring: '#a855f7' },
                    slate: { primary: '#475569', primaryHover: '#334155', primaryLight: 'rgb(241 245 249)', primaryDark: 'rgb(71 85 105 / 0.2)', gradientFrom: 'rgb(241 245 249)', gradientTo: '#ffffff', ring: '#475569' }
                  };
                  var c = themes[theme] || themes.emerald;
                  var root = document.documentElement;
                  root.style.setProperty('--theme-primary', c.primary);
                  root.style.setProperty('--theme-primary-hover', c.primaryHover);
                  root.style.setProperty('--theme-primary-light', c.primaryLight);
                  root.style.setProperty('--theme-primary-dark', c.primaryDark);
                  root.style.setProperty('--theme-gradient-from', c.gradientFrom);
                  root.style.setProperty('--theme-gradient-to', c.gradientTo);
                  root.style.setProperty('--theme-ring', c.ring);
                  root.setAttribute('data-theme', theme);
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
