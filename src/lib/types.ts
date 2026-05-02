export type Permuta = {
  enabled: boolean;
  details?: string;
  acceptsTypes?: string[]; // ex: ["apartamento", "carro"]
};

export type Property = {
  id: string;
  title: string;
  price: number; // em BRL
  area: number; // m²
  bedrooms: number;
  bathrooms?: number;
  parking?: number;
  description: string;
  images: string[];
  sourceUrl?: string;
  city?: string;
  neighborhood?: string;
  type?: string; // apartamento, casa, terreno...
  tags: string[];
  permuta: Permuta;
  // Normalized / searchable fields para futura IA
  normalized: {
    pricePerSqm: number;
    titleLower: string;
    descriptionLower: string;
    keywords: string[];
  };
  createdAt: number;
  origin: "import" | "manual";
};

export type ThemeId =
  | "sand"
  | "midnight"
  | "forest"
  | "ocean"
  | "rose"
  | "mist"
  | "sunset";

export type ThemeOption = {
  id: ThemeId;
  name: string;
  description: string;
  swatch: [string, string, string]; // 3 cores HSL para preview
  tone: "light" | "dark";
};
