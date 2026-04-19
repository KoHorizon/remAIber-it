import { createContext, useContext, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";

export type Theme = "dark" | "ocean" | "forest" | "nord" | "light";

export const THEMES: { id: Theme; label: string; accent: string; bg: string }[] = [
  { id: "dark",   label: "Dark",   accent: "#e0a850", bg: "#141414" },
  { id: "ocean",  label: "Ocean",  accent: "#58a6ff", bg: "#0d1117" },
  { id: "forest", label: "Forest", accent: "#4caf78", bg: "#0d1410" },
  { id: "nord",   label: "Nord",   accent: "#88c0d0", bg: "#2e3440" },
  { id: "light",  label: "Light",  accent: "#d4a056", bg: "#f5f0e8" },
];

type ThemeContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "dark";
  });

  useLayoutEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
