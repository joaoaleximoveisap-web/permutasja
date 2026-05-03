import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ThemeId } from "@/lib/types";
import { THEMES } from "@/lib/themes";
import { getContrastColor } from "@/lib/color-utils";

type Ctx = { theme: ThemeId; setTheme: (t: ThemeId) => void };
const ThemeCtx = createContext<Ctx | null>(null);

const KEY = "permutasja:theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    if (typeof window === "undefined") return "sand";
    return (localStorage.getItem(KEY) as ThemeId) || "sand";
  });

  useEffect(() => {
    // 1. Set the data-theme attribute
    document.documentElement.setAttribute("data-theme", theme);
    
    // 2. Automatic Contrast Rule: Calculate luminance of background
    const selectedTheme = THEMES.find(t => t.id === theme);
    if (selectedTheme && selectedTheme.swatch.length > 0) {
      const bgColor = selectedTheme.swatch[0];
      const textColor = getContrastColor(bgColor);
      
      // Force the contrast color globally
      document.documentElement.style.setProperty("--foreground", textColor === "#000000" ? "0 0% 0%" : "0 0% 100%");
      // Also sync sidebar foreground for consistency
      document.documentElement.style.setProperty("--sidebar-foreground", textColor === "#000000" ? "0 0% 0%" : "0 0% 100%");
    }

    localStorage.setItem(KEY, theme);
  }, [theme]);

  const value = useMemo(() => ({ theme, setTheme: setThemeState }), [theme]);
  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

