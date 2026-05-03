import { createContext, useContext, useState, useEffect } from "react";
import DESIGN_SYSTEM from "@/lib/design-system";

type ThemeMode = "light" | "dark";

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
    
    // Apply theme tokens to CSS Variables
    const activeTheme = DESIGN_SYSTEM.themes[theme];
    
    root.style.setProperty("--background", activeTheme.background.main);
    root.style.setProperty("--foreground", activeTheme.text.primary);
    
    if (theme === "dark") {
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
