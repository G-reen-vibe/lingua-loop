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

// Full theme palettes for inline pre-paint script (avoids flash of wrong color).
const THEME_VARS: Record<string, Record<string, string>> = {
  emerald: {
    "--background": "#f0fdf4", "--foreground": "#052e16", "--card": "#ffffff",
    "--card-foreground": "#052e16", "--muted": "#dcfce7", "--muted-foreground": "#15803d",
    "--border": "#bbf7d0", "--input": "#bbf7d0", "--primary": "#10b981",
    "--theme-primary": "#10b981", "--theme-primary-hover": "#059669",
    "--theme-primary-light": "#dcfce7", "--primary-foreground": "#ffffff",
    "--accent": "#dcfce7", "--accent-foreground": "#052e16", "--destructive": "#dc2626",
    "--theme-gradient-from": "#dcfce7", "--theme-gradient-to": "#ffffff",
    "--ring": "#10b981", "--theme-ring": "#10b981",
  },
  ocean: {
    "--background": "#ecfeff", "--foreground": "#083344", "--card": "#ffffff",
    "--card-foreground": "#083344", "--muted": "#cffafe", "--muted-foreground": "#0e7490",
    "--border": "#a5f3fc", "--input": "#a5f3fc", "--primary": "#0891b2",
    "--theme-primary": "#0891b2", "--theme-primary-hover": "#0e7490",
    "--theme-primary-light": "#cffafe", "--primary-foreground": "#ffffff",
    "--accent": "#cffafe", "--accent-foreground": "#083344", "--destructive": "#dc2626",
    "--theme-gradient-from": "#cffafe", "--theme-gradient-to": "#ffffff",
    "--ring": "#0891b2", "--theme-ring": "#0891b2",
  },
  sunset: {
    "--background": "#fff7ed", "--foreground": "#431407", "--card": "#ffffff",
    "--card-foreground": "#431407", "--muted": "#ffedd5", "--muted-foreground": "#c2410c",
    "--border": "#fed7aa", "--input": "#fed7aa", "--primary": "#f97316",
    "--theme-primary": "#f97316", "--theme-primary-hover": "#ea580c",
    "--theme-primary-light": "#ffedd5", "--primary-foreground": "#ffffff",
    "--accent": "#ffedd5", "--accent-foreground": "#431407", "--destructive": "#dc2626",
    "--theme-gradient-from": "#ffedd5", "--theme-gradient-to": "#ffffff",
    "--ring": "#f97316", "--theme-ring": "#f97316",
  },
  royal: {
    "--background": "#faf5ff", "--foreground": "#3b0764", "--card": "#ffffff",
    "--card-foreground": "#3b0764", "--muted": "#f3e8ff", "--muted-foreground": "#7e22ce",
    "--border": "#e9d5ff", "--input": "#e9d5ff", "--primary": "#a855f7",
    "--theme-primary": "#a855f7", "--theme-primary-hover": "#9333ea",
    "--theme-primary-light": "#f3e8ff", "--primary-foreground": "#ffffff",
    "--accent": "#f3e8ff", "--accent-foreground": "#3b0764", "--destructive": "#dc2626",
    "--theme-gradient-from": "#f3e8ff", "--theme-gradient-to": "#ffffff",
    "--ring": "#a855f7", "--theme-ring": "#a855f7",
  },
  slate: {
    "--background": "#0f172a", "--foreground": "#e2e8f0", "--card": "#1e293b",
    "--card-foreground": "#e2e8f0", "--muted": "#334155", "--muted-foreground": "#94a3b8",
    "--border": "#334155", "--input": "#334155", "--primary": "#3b82f6",
    "--theme-primary": "#3b82f6", "--theme-primary-hover": "#2563eb",
    "--theme-primary-light": "#334155", "--primary-foreground": "#ffffff",
    "--accent": "#334155", "--accent-foreground": "#e2e8f0", "--destructive": "#ef4444",
    "--theme-gradient-from": "#1e293b", "--theme-gradient-to": "#0f172a",
    "--ring": "#3b82f6", "--theme-ring": "#3b82f6",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var raw = localStorage.getItem('lingua-loop-data-v1');
                  var theme = 'emerald';
                  if (raw) {
                    var data = JSON.parse(raw);
                    if (data.preferences && data.preferences.theme) {
                      theme = data.preferences.theme;
                    }
                  }
                  var vars = ${JSON.stringify(THEME_VARS)}[theme] || ${JSON.stringify(THEME_VARS)}.emerald;
                  var root = document.documentElement;
                  for (var key in vars) {
                    root.style.setProperty(key, vars[key]);
                  }
                  root.setAttribute('data-theme', theme);
                  if (theme === 'slate') root.classList.add('dark');
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
