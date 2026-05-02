import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

interface ExtractedProperty {
  title: string;
  price: number;
  area: number;
  bedrooms: number;
  bathrooms?: number;
  parking?: number;
  description: string;
  images: string[];
  city?: string;
  neighborhood?: string;
  type?: string;
  permuta?: boolean;
  permutaDetails?: string;
  missingFields: string[];
}

function parseNumber(s: string | undefined | null): number {
  if (!s) return 0;
  const cleaned = String(s).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function absolutize(src: string, base: string): string {
  try {
    if (src.startsWith("//")) return "https:" + src;
    if (src.startsWith("http")) return src;
    return new URL(src, base).toString();
  } catch { return src; }
}

// Extract images from many sources, NO FILTERING (per spec)
function extractAllImages(html: string, baseUrl: string, ogImages: string[]): string[] {
  const imgs = new Set<string>();
  ogImages.forEach((u) => u && imgs.add(absolutize(u, baseUrl)));

  // <img src=...>
  const imgRegex = /<img[^>]+(?:src|data-src|data-lazy|data-original)=["']([^"']+)["']/gi;
  let m;
  while ((m = imgRegex.exec(html)) !== null) {
    imgs.add(absolutize(m[1], baseUrl));
  }
  // srcset
  const srcsetRegex = /srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRegex.exec(html)) !== null) {
    m[1].split(",").forEach((part) => {
      const url = part.trim().split(" ")[0];
      if (url) imgs.add(absolutize(url, baseUrl));
    });
  }
  // background-image url(...)
  const bgRegex = /background(?:-image)?:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((m = bgRegex.exec(html)) !== null) {
    imgs.add(absolutize(m[1], baseUrl));
  }
  // og:image and twitter:image already captured but double-check
  const metaImg = /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image)["'][^>]+content=["']([^"']+)["']/gi;
  while ((m = metaImg.exec(html)) !== null) {
    imgs.add(absolutize(m[1], baseUrl));
  }

  // Keep only image-like extensions OR url contains 'image'/'foto'/'photo'
  return Array.from(imgs).filter((u) => /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u) || /image|foto|photo|midia|cdn/i.test(u)).slice(0, 40);
}

function extractJsonLd(html: string): any[] {
  const out: any[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch { /* skip */ }
  }
  return out;
}

function findInJsonLd(items: any[]): Partial<ExtractedProperty> {
  const out: Partial<ExtractedProperty> = {};
  for (const item of items) {
    const types = ([] as string[]).concat(item["@type"] || []);
    if (types.some((t) => /Product|Residence|House|Apartment|RealEstateListing|Offer/i.test(t))) {
      if (item.name && !out.title) out.title = String(item.name);
      if (item.description && !out.description) out.description = String(item.description);
      const offers = item.offers || item;
      const price = offers?.price || offers?.priceSpecification?.price || item.price;
      if (price && !out.price) out.price = parseNumber(String(price));
      const imgs = item.image;
      if (imgs && !out.images) {
        out.images = (Array.isArray(imgs) ? imgs : [imgs]).map((i: any) => typeof i === "string" ? i : i?.url).filter(Boolean);
      }
      const addr = item.address;
      if (addr) {
        if (addr.addressLocality && !out.city) out.city = String(addr.addressLocality);
        if (addr.addressRegion && !out.neighborhood) out.neighborhood = String(addr.addressRegion);
      }
      const beds = item.numberOfRooms || item.numberOfBedrooms;
      if (beds && !out.bedrooms) out.bedrooms = parseInt(String(beds), 10) || 0;
      const area = item.floorSize?.value || item.floorSize;
      if (area && !out.area) out.area = parseNumber(String(area));
    }
  }
  return out;
}

function extractMeta(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const re = /<meta[^>]+(?:property|name)=["']([^"']+)["'][^>]+content=["']([^"']*)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    meta[m[1].toLowerCase()] = m[2];
  }
  // also content first
  const re2 = /<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']([^"']+)["']/gi;
  while ((m = re2.exec(html)) !== null) {
    if (!meta[m[2].toLowerCase()]) meta[m[2].toLowerCase()] = m[1];
  }
  return meta;
}

function extractFromText(text: string): Partial<ExtractedProperty> {
  const out: Partial<ExtractedProperty> = {};
  const priceMatch = text.match(/R\$\s*([\d.,]+)/i);
  if (priceMatch) out.price = parseNumber(priceMatch[1]);
  const areaMatch = text.match(/(\d{2,5}[.,]?\d*)\s*m[²2]/i);
  if (areaMatch) out.area = parseNumber(areaMatch[1]);
  const bedMatch = text.match(/(\d+)\s*(?:quartos?|dormit[óo]rios?|su[íi]tes?)/i);
  if (bedMatch) out.bedrooms = parseInt(bedMatch[1], 10);
  const bathMatch = text.match(/(\d+)\s*(?:banheiros?|wc)/i);
  if (bathMatch) out.bathrooms = parseInt(bathMatch[1], 10);
  const parkMatch = text.match(/(\d+)\s*(?:vagas?|garagens?)/i);
  if (parkMatch) out.parking = parseInt(parkMatch[1], 10);
  const permutaMatch = text.match(/permuta[^.\n]{0,200}/i);
  if (permutaMatch) {
    out.permuta = true;
    out.permutaDetails = permutaMatch[0].trim().slice(0, 240);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL obrigatória" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try { new URL(url); } catch {
      return new Response(JSON.stringify({ error: "URL inválida" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "html", "rawHtml"],
        onlyMainContent: false,
        waitFor: 2500,
      }),
    });

    const fcData = await fcRes.json();
    if (!fcRes.ok) {
      console.error("Firecrawl error:", fcData);
      return new Response(
        JSON.stringify({ error: fcData?.error || "Falha ao acessar o link", status: fcRes.status }),
        { status: fcRes.status === 402 ? 402 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const doc = fcData.data || fcData;
    const markdown: string = doc.markdown || "";
    const html: string = doc.rawHtml || doc.html || "";
    const metadata = doc.metadata || {};

    // 1. JSON-LD
    const jsonld = extractJsonLd(html);
    const fromLd = findInJsonLd(jsonld);

    // 2. Meta tags (OG)
    const meta = extractMeta(html);
    const ogTitle = meta["og:title"] || meta["twitter:title"] || metadata.ogTitle || metadata.title;
    const ogDesc = meta["og:description"] || meta["twitter:description"] || metadata.description;
    const ogImage = meta["og:image"] || meta["twitter:image"] || metadata.ogImage;

    // 3. Text/markdown regex
    const text = `${markdown}\n${(metadata.title || "")}\n${(metadata.description || "")}\n${ogTitle || ""}\n${ogDesc || ""}`;
    const fromText = extractFromText(text);

    // 4. Images: combine all sources, NO FILTERING
    const ogImages = [ogImage, ...(fromLd.images || [])].filter(Boolean) as string[];
    const allImages = extractAllImages(html, url, ogImages);

    // Merge with priority: JSON-LD > regex/meta > fallback
    const title = fromLd.title || ogTitle || metadata.title || markdown.split("\n").find((l: string) => l.trim().startsWith("# "))?.replace(/^#\s+/, "").trim() || "";
    const description = fromLd.description || ogDesc || markdown.split("\n").filter((l: string) => l.trim().length > 40).slice(0, 3).join(" ").slice(0, 600) || "";
    const price = fromLd.price || fromText.price || 0;
    const area = fromLd.area || fromText.area || 0;
    const bedrooms = fromLd.bedrooms || fromText.bedrooms || 0;

    // Type heuristic
    const titleLow = (title || "").toLowerCase();
    const type = titleLow.includes("casa") ? "Casa"
      : titleLow.includes("cobertura") ? "Cobertura"
      : titleLow.includes("studio") || titleLow.includes("kitnet") ? "Studio"
      : titleLow.includes("terreno") ? "Terreno"
      : titleLow.includes("apartamento") ? "Apartamento"
      : "Imóvel";

    // City from URL path heuristic (e.g. /londrina-pr)
    const urlPath = new URL(url).pathname.toLowerCase();
    const cityMatch = urlPath.match(/([a-z\-]+)-(?:pr|sp|rj|mg|sc|rs|ba|ce|pe|go|df|es|am|pa|ma|mt|ms|al|pi|rn|pb|se|to|ac|ap|ro|rr)\b/);
    const city = fromLd.city || (cityMatch ? cityMatch[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : undefined);

    const missing: string[] = [];
    if (!title) missing.push("title");
    if (!price) missing.push("price");
    if (!area) missing.push("area");
    if (!bedrooms) missing.push("bedrooms");
    if (!allImages.length) missing.push("images");

    const result: ExtractedProperty = {
      title: (title || "Imóvel importado").slice(0, 240),
      price,
      area,
      bedrooms,
      bathrooms: fromText.bathrooms,
      parking: fromText.parking,
      description: (description || "").trim(),
      images: allImages,
      city,
      neighborhood: fromLd.neighborhood,
      type,
      permuta: fromText.permuta || false,
      permutaDetails: fromText.permutaDetails,
      missingFields: missing,
    };

    return new Response(JSON.stringify({ data: result, source: new URL(url).hostname }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("scrape-property error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
