import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { ThemeConfig } from "@/lib/theme-config";
import { THEMES } from "@/lib/themes";
import { getContrastColor } from "@/lib/color-utils";
import { supabase } from "@/integrations/supabase/client";

interface ThemeContextType {
  config: ThemeConfig;
  updateConfig: (updates: Partial<ThemeConfig>) => void;
  updateColors: (colors: Partial<ThemeConfig["colors"]>) => void;
  updateTypography: (typo: Partial<ThemeConfig["typography"]>) => void;
  updateLayout: (layout: Partial<ThemeConfig["layout"]>) => void;
  resetTheme: () => void;
}

const defaultConfig: ThemeConfig = {
  id: "custom",
  name: "Custom Theme",
  colors: {
    background: "#F5F5F3",
    foreground: "#1A1A1A",
    card: "#FFFFFF",
    cardForeground: "#1A1A1A",
    popover: "#FFFFFF",
    popoverForeground: "#1A1A1A",
    primary: "#C6A87D",
    primaryForeground: "#FFFFFF",
    secondary: "#E5E5E0",
    secondaryForeground: "#1A1A1A",
    muted: "#F0F0EE",
    mutedForeground: "#71717A",
    accent: "#C6A87D",
    accentForeground: "#FFFFFF",
    border: "#E2E2E2",
    input: "#E2E2E2",
    ring: "#C6A87D",
    sidebarBackground: "#FFFFFF",
    sidebarForeground: "#1A1A1A",
    sidebarBorder: "#E2E2E2",
  },
  typography: {
    fontFamily: "Inter",
    baseSize: 16,
    headingWeight: "700",
    letterSpacing: "-0.02em",
    lineHeight: "1.5",
  },
  layout: {
    radius: 1,
    cardPadding: 24,
    globalPadding: 24,
    gridColumns: 3,
    shadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
    overlayOpacity: 0.4,
  }
};

const ThemeEditorContext = createContext<ThemeContextType | null>(null);

export function ThemeEditorProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem("permutasja:custom-theme");
    return saved ? JSON.parse(saved) : defaultConfig;
  });
  const [hydrated, setHydrated] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from Supabase (overrides local if exists)
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("ui_config")
        .select("settings")
        .eq("element_id", "theme::custom")
        .maybeSingle();
      if (data?.settings) {
        setConfig(data.settings as unknown as ThemeConfig);
      }
      setHydrated(true);
    })();
  }, []);

  const updateConfig = (updates: Partial<ThemeConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const updateColors = (colors: Partial<ThemeConfig["colors"]>) => {
    setConfig(prev => ({ ...prev, colors: { ...prev.colors, ...colors } }));
  };

  const updateTypography = (typo: Partial<ThemeConfig["typography"]>) => {
    setConfig(prev => ({ ...prev, typography: { ...prev.typography, ...typo } }));
  };

  const updateLayout = (layout: Partial<ThemeConfig["layout"]>) => {
    setConfig(prev => ({ ...prev, layout: { ...prev.layout, ...layout } }));
  };

  const resetTheme = () => setConfig(defaultConfig);

  useEffect(() => {
    localStorage.setItem("permutasja:custom-theme", JSON.stringify(config));
    
    // Apply CSS Variables
    const root = document.documentElement;
    
    // Apply Colors
    Object.entries(config.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key.replace(/[A-Z]/g, m => "-" + m.toLowerCase())}`, value);
    });

    // Handle standard shadcn variable mappings
    root.style.setProperty("--background", config.colors.background);
    root.style.setProperty("--foreground", config.colors.foreground);
    root.style.setProperty("--primary", config.colors.primary);
    root.style.setProperty("--accent", config.colors.accent);
    root.style.setProperty("--card", config.colors.card);
    root.style.setProperty("--border", config.colors.border);
    root.style.setProperty("--radius", `${config.layout.radius}rem`);

    // Apply Typography
    root.style.setProperty("--font-family", config.typography.fontFamily);
    root.style.setProperty("--base-font-size", `${config.typography.baseSize}px`);

    // Auto-save to Supabase (debounced) — só após hidratação para não sobrescrever
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      supabase
        .from("ui_config")
        .upsert(
          { element_id: "theme::custom", settings: config as any },
          { onConflict: "element_id" }
        )
        .then(() => {});
    }, 500);
  }, [config, hydrated]);

  return (
    <ThemeEditorContext.Provider value={{ config, updateConfig, updateColors, updateTypography, updateLayout, resetTheme }}>
      {children}
    </ThemeEditorContext.Provider>
  );
}

export function useThemeEditor() {
  const ctx = useContext(ThemeEditorContext);
  if (!ctx) throw new Error("useThemeEditor must be used within ThemeEditorProvider");
  return ctx;
}
