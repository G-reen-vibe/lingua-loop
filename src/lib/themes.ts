// Theme system: applies CSS variables to the document root.
import { ThemeName } from "./types";

interface ThemeColors {
  primary: string; // main accent (buttons, highlights)
  primaryHover: string;
  primaryLight: string; // light bg tint
  primaryDark: string; // dark mode tint
  gradientFrom: string;
  gradientTo: string;
  ring: string; // focus ring
}

const THEMES: Record<ThemeName, ThemeColors> = {
  emerald: {
    primary: "#10b981",
    primaryHover: "#059669",
    primaryLight: "rgb(209 250 229)",
    primaryDark: "rgb(6 78 59 / 0.2)",
    gradientFrom: "rgb(209 250 229)",
    gradientTo: "#ffffff",
    ring: "#10b981",
  },
  ocean: {
    primary: "#0891b2",
    primaryHover: "#0e7490",
    primaryLight: "rgb(207 250 254)",
    primaryDark: "rgb(8 145 178 / 0.2)",
    gradientFrom: "rgb(207 250 254)",
    gradientTo: "#ffffff",
    ring: "#0891b2",
  },
  sunset: {
    primary: "#f97316",
    primaryHover: "#ea580c",
    primaryLight: "rgb(255 237 213)",
    primaryDark: "rgb(249 115 22 / 0.2)",
    gradientFrom: "rgb(255 237 213)",
    gradientTo: "#ffffff",
    ring: "#f97316",
  },
  royal: {
    primary: "#a855f7",
    primaryHover: "#9333ea",
    primaryLight: "rgb(243 232 255)",
    primaryDark: "rgb(168 85 247 / 0.2)",
    gradientFrom: "rgb(243 232 255)",
    gradientTo: "#ffffff",
    ring: "#a855f7",
  },
  slate: {
    primary: "#475569",
    primaryHover: "#334155",
    primaryLight: "rgb(241 245 249)",
    primaryDark: "rgb(71 85 105 / 0.2)",
    gradientFrom: "rgb(241 245 249)",
    gradientTo: "#ffffff",
    ring: "#475569",
  },
};

export function applyTheme(theme: ThemeName) {
  if (typeof document === "undefined") return;
  const colors = THEMES[theme];
  const root = document.documentElement;
  root.style.setProperty("--theme-primary", colors.primary);
  root.style.setProperty("--theme-primary-hover", colors.primaryHover);
  root.style.setProperty("--theme-primary-light", colors.primaryLight);
  root.style.setProperty("--theme-primary-dark", colors.primaryDark);
  root.style.setProperty("--theme-gradient-from", colors.gradientFrom);
  root.style.setProperty("--theme-gradient-to", colors.gradientTo);
  root.style.setProperty("--theme-ring", colors.ring);
  root.setAttribute("data-theme", theme);
}

export function getThemeColors(theme: ThemeName): ThemeColors {
  return THEMES[theme];
}
