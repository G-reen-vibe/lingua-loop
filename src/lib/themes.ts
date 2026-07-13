// Theme system: applies a full color palette to the document root.
// Each theme overrides the shadcn/ui CSS variables, coloring the entire UI
// (background, text, cards, borders, etc.) — similar to dark mode.

import { ThemeName } from "./types";

interface FullTheme {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  input: string;
  primary: string;
  primaryHover: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  gradientFrom: string;
  gradientTo: string;
  ring: string;
}

const THEMES: Record<ThemeName, FullTheme> = {
  emerald: {
    background: "#f0fdf4",
    foreground: "#052e16",
    card: "#ffffff",
    cardForeground: "#052e16",
    muted: "#dcfce7",
    mutedForeground: "#15803d",
    border: "#bbf7d0",
    input: "#bbf7d0",
    primary: "#10b981",
    primaryHover: "#059669",
    primaryForeground: "#ffffff",
    accent: "#dcfce7",
    accentForeground: "#052e16",
    destructive: "#dc2626",
    gradientFrom: "#dcfce7",
    gradientTo: "#ffffff",
    ring: "#10b981",
  },
  ocean: {
    background: "#ecfeff",
    foreground: "#083344",
    card: "#ffffff",
    cardForeground: "#083344",
    muted: "#cffafe",
    mutedForeground: "#0e7490",
    border: "#a5f3fc",
    input: "#a5f3fc",
    primary: "#0891b2",
    primaryHover: "#0e7490",
    primaryForeground: "#ffffff",
    accent: "#cffafe",
    accentForeground: "#083344",
    destructive: "#dc2626",
    gradientFrom: "#cffafe",
    gradientTo: "#ffffff",
    ring: "#0891b2",
  },
  sunset: {
    background: "#fff7ed",
    foreground: "#431407",
    card: "#ffffff",
    cardForeground: "#431407",
    muted: "#ffedd5",
    mutedForeground: "#c2410c",
    border: "#fed7aa",
    input: "#fed7aa",
    primary: "#f97316",
    primaryHover: "#ea580c",
    primaryForeground: "#ffffff",
    accent: "#ffedd5",
    accentForeground: "#431407",
    destructive: "#dc2626",
    gradientFrom: "#ffedd5",
    gradientTo: "#ffffff",
    ring: "#f97316",
  },
  royal: {
    background: "#faf5ff",
    foreground: "#3b0764",
    card: "#ffffff",
    cardForeground: "#3b0764",
    muted: "#f3e8ff",
    mutedForeground: "#7e22ce",
    border: "#e9d5ff",
    input: "#e9d5ff",
    primary: "#a855f7",
    primaryHover: "#9333ea",
    primaryForeground: "#ffffff",
    accent: "#f3e8ff",
    accentForeground: "#3b0764",
    destructive: "#dc2626",
    gradientFrom: "#f3e8ff",
    gradientTo: "#ffffff",
    ring: "#a855f7",
  },
  slate: {
    // Dark theme
    background: "#0f172a",
    foreground: "#e2e8f0",
    card: "#1e293b",
    cardForeground: "#e2e8f0",
    muted: "#334155",
    mutedForeground: "#94a3b8",
    border: "#334155",
    input: "#334155",
    primary: "#3b82f6",
    primaryHover: "#2563eb",
    primaryForeground: "#ffffff",
    accent: "#334155",
    accentForeground: "#e2e8f0",
    destructive: "#ef4444",
    gradientFrom: "#1e293b",
    gradientTo: "#0f172a",
    ring: "#3b82f6",
  },
};

// Returns a compact object of CSS variable name -> value for inline script.
export function getThemeVars(theme: ThemeName): Record<string, string> {
  const t = THEMES[theme] || THEMES.emerald;
  return {
    "--background": t.background,
    "--foreground": t.foreground,
    "--card": t.card,
    "--card-foreground": t.cardForeground,
    "--muted": t.muted,
    "--muted-foreground": t.mutedForeground,
    "--border": t.border,
    "--input": t.input,
    "--primary": t.primary,
    "--theme-primary": t.primary,
    "--theme-primary-hover": t.primaryHover,
    "--theme-primary-light": t.accent,
    "--primary-foreground": t.primaryForeground,
    "--accent": t.accent,
    "--accent-foreground": t.accentForeground,
    "--destructive": t.destructive,
    "--theme-gradient-from": t.gradientFrom,
    "--theme-gradient-to": t.gradientTo,
    "--ring": t.ring,
    "--theme-ring": t.ring,
  };
}

export function applyTheme(theme: ThemeName) {
  if (typeof document === "undefined") return;
  const vars = getThemeVars(theme);
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  root.setAttribute("data-theme", theme);
  // Toggle dark class for shadcn components that use .dark selector
  if (theme === "slate") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
}

export function getThemeSwatchColor(theme: ThemeName): string {
  return THEMES[theme]?.primary ?? "#10b981";
}
