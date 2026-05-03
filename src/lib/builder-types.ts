export interface StyleConfig {
  backgroundColor?: string;
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  boxShadow?: string;
  display?: "block" | "flex" | "grid";
  flexDirection?: "row" | "column";
  alignItems?: string;
  justifyContent?: string;
  gap?: number;
  width?: string;
  height?: string;
  opacity?: number;
  transition?: string;
}

export interface ElementConfig {
  id: string;
  type: string;
  name: string;
  styles: StyleConfig;
  props: Record<string, any>;
  children: string[]; // IDs of child elements
  parentId?: string;
  className?: string;
}

export interface BuilderConfig {
  elements: Record<string, ElementConfig>;
  rootElementId: string;
  selectedElementId: string | null;
  classes: Record<string, StyleConfig>;
  globalTokens: {
    colors: Record<string, string>;
    fonts: Record<string, string>;
  };
}
