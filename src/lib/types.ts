export type Permuta = {
  enabled: boolean;
  details?: string;
  acceptsTypes?: string[];
  desiredValue?: number;
};

export type UserRole = "corretor" | "angariador" | "proprietario" | "vendedor";

export type Property = {
  id: string;
  title: string;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms?: number;
  parking?: number;
  description: string;
  images: string[];
  coverIndex?: number;
  sourceUrl?: string;
  address?: string;
  condominium?: string;
  city?: string;
  neighborhood?: string;
  type?: string;
  tags: string[];
  permuta: Permuta;
  normalized: {
    pricePerSqm: number;
    titleLower: string;
    descriptionLower: string;
    keywords: string[];
  };
  createdAt: number;
  origin: "import" | "manual";
  status: "draft" | "published";
  isExclusive?: boolean;
  // Enrichment / learning
  role?: UserRole;
  authorized?: boolean;
  responsibilityAck?: boolean;
  originalData?: Record<string, unknown>;
  userCorrected?: boolean;
  /** Per-field provenance: "imported" | "user_corrected" | "manual" */
  fieldSources?: Record<string, "imported" | "user_corrected" | "manual">;
  missingFields?: string[];
};

export type ThemeId =
  | "sand" | "midnight" | "forest" | "ocean" | "rose" | "mist" | "sunset";

export type ThemeOption = {
  id: ThemeId;
  name: string;
  description: string;
  swatch: [string, string, string];
  tone: "light" | "dark";
};
