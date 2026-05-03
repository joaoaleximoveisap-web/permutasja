import { createContext, useContext, useState, useEffect } from "react";
import DESIGN_SYSTEM from "@/lib/design-system";

export type ThemeMode = "light" | "dark" | "sand" | "midnight" | "forest" | "ocean" | "rose" | "mist" | "sunset";

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  tokens: typeof DESIGN_SYSTEM;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("aurora-theme");
    return (saved as ThemeMode) || "light";
  });

  useEffect(() => {
    localStorage.setItem("aurora-theme", theme);
    const root = window.document.documentElement;
    
    // Default to light tokens if the specific theme is not in DESIGN_SYSTEM.themes
    const themeKey = (theme === "dark" || theme === "light") ? theme : "light";
    const activeTheme = DESIGN_SYSTEM.themes[themeKey as "light" | "dark"];
    
    root.style.setProperty("--background", activeTheme.background.main);
    root.style.setProperty("--foreground", activeTheme.text.primary);
    
    // Remove all possible theme classes
    root.classList.remove(
      "dark", "light", "sand", "midnight", "forest", 
      "ocean", "rose", "mist", "sunset"
    );
    root.classList.add(theme);

    // Apply specific dark mode class for tailwind
    // Add any dark themes here
    const darkThemes = ["dark", "midnight", "forest", "ocean", "rose", "mist", "sunset"];
    if (darkThemes.includes(theme)) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, tokens: DESIGN_SYSTEM }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
