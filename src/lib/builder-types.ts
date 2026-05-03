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
  objectFit?: "cover" | "contain";
}

export type ElementType = "text" | "image" | "button" | "container" | "section";

export interface ElementConfig {
  id: string;
  type: ElementType;
  name: string;
  styles: StyleConfig;
  props: Record<string, any>;
  children: string[]; 
  parentId?: string;
  className?: string;
}

export interface BuilderConfig {
  elements: Record<string, ElementConfig>;
  rootElementId: string;
  selectedElementIds: string[]; // Support multi-selection
  classes: Record<string, StyleConfig>;
  globalTokens: {
    colors: Record<string, string>;
    fonts: Record<string, string>;
  };
}

