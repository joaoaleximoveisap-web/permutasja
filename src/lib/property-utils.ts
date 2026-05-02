import { Property } from "./types";

export const formatBRL = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(v);

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function buildNormalized(p: Omit<Property, "normalized" | "id" | "createdAt" | "origin"> & { id?: string }) {
  const titleLower = p.title.toLowerCase();
  const descriptionLower = (p.description || "").toLowerCase();
  const base = `${titleLower} ${descriptionLower} ${p.tags.join(" ")} ${p.city ?? ""} ${p.neighborhood ?? ""}`;
  const keywords = Array.from(new Set(base.split(/[^a-zà-ú0-9]+/i).filter(w => w.length > 2)));
  return {
    pricePerSqm: p.area > 0 ? Math.round(p.price / p.area) : 0,
    titleLower,
    descriptionLower,
    keywords,
  };
}

// Mock scraper: gera dados realistas a partir da URL
const TITLES = [
  "Apartamento alto padrão com vista panorâmica",
  "Cobertura duplex com piscina privativa",
  "Casa em condomínio fechado com área gourmet",
  "Loft moderno em bairro nobre",
  "Studio mobiliado próximo ao metrô",
  "Sobrado amplo com quintal e churrasqueira",
];
const CITIES: Array<[string, string]> = [
  ["São Paulo", "Vila Madalena"],
  ["Rio de Janeiro", "Ipanema"],
  ["Curitiba", "Batel"],
  ["Belo Horizonte", "Savassi"],
  ["Florianópolis", "Jurerê"],
];
const TYPES = ["Apartamento", "Casa", "Cobertura", "Studio"];
const STOCK_IMAGES = [
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1280",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1280",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1280",
  "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=1280",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1280",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1280",
  "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1280",
  "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1280",
];

function pick<T>(arr: T[]) { return arr[Math.floor(Math.random() * arr.length)]; }

export async function mockScrape(url: string): Promise<Property> {
  await new Promise(r => setTimeout(r, 1200 + Math.random() * 800));
  const [city, neighborhood] = pick(CITIES);
  const type = pick(TYPES);
  const bedrooms = 1 + Math.floor(Math.random() * 4);
  const area = 35 + Math.floor(Math.random() * 220);
  const price = 250000 + Math.floor(Math.random() * 4000000);
  const title = pick(TITLES);
  const tags = [type.toLowerCase(), `${bedrooms} quartos`, neighborhood.toLowerCase()];
  if (price > 1500000) tags.push("alto padrão");
  if (area > 150) tags.push("amplo");
  const images = Array.from({ length: 4 }, () => pick(STOCK_IMAGES));
  const description = `${title} localizado em ${neighborhood}, ${city}. Imóvel com ${bedrooms} dormitórios, ${area}m² de área útil, acabamentos refinados e excelente localização. Importado de ${new URL(url).hostname}.`;
  const base = { title, price, area, bedrooms, description, images, sourceUrl: url, city, neighborhood, type, tags, permuta: { enabled: Math.random() > 0.6, details: "Aceita imóvel de menor valor ou veículo." } };
  return {
    id: uid(),
    ...base,
    normalized: buildNormalized(base as any),
    createdAt: Date.now(),
    origin: "import",
  };
}
