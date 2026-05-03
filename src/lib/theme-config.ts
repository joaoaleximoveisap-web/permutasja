import { ThemeId } from "./types";

export interface ThemeColors {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  border: string;
  input: string;
  ring: string;
  sidebarBackground: string;
  sidebarForeground: string;
  sidebarBorder: string;
}

export interface ThemeTypography {
  fontFamily: string;
  baseSize: number;
  headingWeight: string;
  letterSpacing: string;
  lineHeight: string;
}

export interface ThemeLayout {
  radius: number;
  cardPadding: number;
  globalPadding: number;
  gridColumns: number;
  shadow: string;
  overlayOpacity: number;
}

export interface ThemeConfig {
  id: string;
  name: string;
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
}
