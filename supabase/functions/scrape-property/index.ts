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

// ---------- IMAGE PIPELINE (production-grade) ----------

const JUNK_RE = /(logo|sprite|favicon|avatar|brand|icon[-_/.]|\/icons?\/|placeholder|blank|pixel|spacer|watermark|whatsapp|facebook|instagram|youtube|tiktok|linkedin|google|gtm|analytics|tracking|ads?[-_/.]|banner|aurora|perfil|avatar|creci|person|user|profile)/i;
const GOOD_HINT_RE = /(gallery|galeria|carousel|slider|slideshow|fotos?|photos?|imovel|imoveis|property|listing|midia|media|cdn|upload|wp-content|images?\/|anuncio|principal|fachada|interno|externo)/i;
const EXT_RE = /\.(jpe?g|png|webp|avif)(\?|#|$)/i;

type ImgCandidate = {
  url: string;
  width?: number;
  height?: number;
  score: number;
  order: number;
};

function extractFromSrcset(srcset: string): { url: string; w?: number }[] {
  return srcset.split(",").map((part) => {
    const [u, descRaw] = part.trim().split(/\s+/);
    const desc = descRaw || "";
    const wMatch = desc.match(/(\d+)w/);
    return { url: u, w: wMatch ? parseInt(wMatch[1], 10) : undefined };
  }).filter((p) => p.url);
}

/** Strip resize/quality params and rewrite known thumbnail patterns to high-res. */
function upgradeImageUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  let url = rawUrl;
  try {
    const u = new URL(url);
    ["w", "h", "width", "height", "resize", "quality", "q", "fit", "size", "dpr"]
      .forEach((k) => u.searchParams.delete(k));
    url = u.toString().replace(/\?$/, "");
  } catch { /* keep */ }
  url = url
    .replace(/\/thumbs?\//gi, "/")
    .replace(/\/small\//gi, "/large/")
    .replace(/\/medium\//gi, "/large/")
    .replace(/_thumb(\.[a-z]+)$/i, "$1")
    .replace(/_small(\.[a-z]+)$/i, "$1")
    .replace(/_medium(\.[a-z]+)$/i, "$1")
    .replace(/-thumbnail(\.[a-z]+)$/i, "$1")
    // WordPress/imobi sites: -300x200.jpg -> .jpg
    .replace(/-\d{2,4}x\d{2,4}(\.[a-z]+)$/i, "$1")
    // Cloudinary: /w_300,h_200/ -> /w_1600/
    .replace(/\/(?:[whcq]_[^/,]+,?)+\//gi, "/w_1600/");
  return url;
}

function baseKey(url: string): string {
  try {
    const u = new URL(url);
    // Drop dimension-like suffixes for dedupe
    const path = u.pathname
      .replace(/-\d{2,4}x\d{2,4}(?=\.[a-z]+$)/i, "")
      .replace(/_(?:thumb|small|medium|large|original)(?=\.[a-z]+$)/i, "");
    return `${u.host}${path}`.toLowerCase();
  } catch {
    return url.toLowerCase().split("?")[0];
  }
}

/**
 * Production-grade image extractor:
 * 1) Detect gallery containers and boost images inside them
 * 2) Collect from <img>, srcset, <source>, background-image, og:image, JSON-LD
 * 3) Filter out logos/icons/social/UI junk
 * 4) Filter by min dimensions when known (>=400x300) — unknown allowed
 * 5) Upgrade thumbnail URLs to high-res
 * 6) Dedupe by base key (host+path without dimension suffix)
 * 7) Sort: in-gallery first, then by score (resolution + hints), preserving DOM order on ties
 */
function extractAllImages(html: string, baseUrl: string, ogImages: string[]): string[] {
  const candidates: ImgCandidate[] = [];
  let order = 0;

  // ---- 1. Detect gallery containers (rough offsets) ----
  const galleryRanges: Array<[number, number]> = [];
  const containerRe = /<(div|section|ul|aside)([^>]*)>/gi;
  let cm: RegExpExecArray | null;
  while ((cm = containerRe.exec(html)) !== null) {
    const attrs = cm[2] || "";
    if (/(gallery|galeria|carousel|slider|slideshow|fotos|photos|swiper|fotorama|lightbox|fancybox)/i.test(attrs)) {
      // Approximate range: from this tag to +8000 chars (cheap, no DOM parser)
      galleryRanges.push([cm.index, cm.index + 8000]);
    }
  }
  const inGallery = (idx: number) =>
    galleryRanges.some(([s, e]) => idx >= s && idx <= e);

  const addCandidate = (rawUrl: string, idx: number, w?: number, h?: number) => {
    if (!rawUrl) return;
    const abs = absolutize(rawUrl, baseUrl);
    if (!abs) return;
    if (abs.startsWith("data:")) return;
    if (JUNK_RE.test(abs)) return;
    // Must look like an image OR be on a media/cdn path
    if (!EXT_RE.test(abs) && !/\b(image|imagem|foto|photo|midia|media|cdn|upload|wp-content)\b/i.test(abs)) return;

    let score = 0;
    if (inGallery(idx)) score += 40;
    if (GOOD_HINT_RE.test(abs)) score += 8;
    if (w && h) {
      // hard filter on small images (likely icons/UI)
      if (w < 300 || h < 200) return;
      const ar = w / h;
      // exclude extreme aspect ratios (sprites, banners, thin strips)
      if (ar < 0.4 || ar > 3.5) return;
      score += Math.min(60, Math.round((w * h) / 20000));
    } else if (w) {
      if (w < 300) return;
      score += Math.min(40, Math.round(w / 30));
    }

    candidates.push({ url: upgradeImageUrl(abs), width: w, height: h, score, order: order++ });
  };

  // OG / JSON-LD images first (assumed valid, high score)
  ogImages.forEach((u) => {
    if (!u) return;
    const abs = absolutize(u, baseUrl);
    if (!abs || JUNK_RE.test(abs)) return;
    candidates.push({ url: upgradeImageUrl(abs), score: 50, order: order++ });
  });

  // <img> with optional width/height attributes
  const imgRe = /<img\b([^>]+)>/gi;
  let m: RegExpExecArray | null;
  while ((m = imgRe.exec(html)) !== null) {
    const attrs = m[1];
    const idx = m.index;
    const src =
      attrs.match(/\bdata-src=["']([^"']+)["']/i)?.[1] ||
      attrs.match(/\bdata-lazy(?:-src)?=["']([^"']+)["']/i)?.[1] ||
      attrs.match(/\bdata-original=["']([^"']+)["']/i)?.[1] ||
      attrs.match(/\bdata-full-src=["']([^"']+)["']/i)?.[1] ||
      attrs.match(/\bdata-zoom(?:-image)?=["']([^"']+)["']/i)?.[1] ||
      attrs.match(/\bdata-big=["']([^"']+)["']/i)?.[1] ||
      attrs.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    const w = parseInt(attrs.match(/\bwidth=["']?(\d+)/i)?.[1] || "0", 10) || undefined;
    const h = parseInt(attrs.match(/\bheight=["']?(\d+)/i)?.[1] || "0", 10) || undefined;

    if (src) addCandidate(src, idx, w, h);

    // srcset on the same <img>
    const srcset = attrs.match(/\bsrcset=["']([^"']+)["']/i)?.[1];
    if (srcset) {
      const parts = extractFromSrcset(srcset);
      // Prefer the largest variant
      parts.sort((a, b) => (b.w || 0) - (a.w || 0));
      const best = parts[0];
      if (best) addCandidate(best.url, idx, best.w, undefined);
    }
  }

  // <source srcset="...">
  const sourceRe = /<source\b([^>]+)>/gi;
  while ((m = sourceRe.exec(html)) !== null) {
    const srcset = m[1].match(/\bsrcset=["']([^"']+)["']/i)?.[1];
    if (!srcset) continue;
    const parts = extractFromSrcset(srcset).sort((a, b) => (b.w || 0) - (a.w || 0));
    if (parts[0]) addCandidate(parts[0].url, m.index, parts[0].w);
  }
  
  // JSON in script tags (look for arrays of high-res image URLs)
  const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  while ((m = scriptRe.exec(html)) !== null) {
    const scriptContent = m[1];
    // Look for things like "https://.../img.jpg" in arrays
    const urlMatches = scriptContent.match(/https?:\/\/[^"']+\.(?:jpe?g|png|webp|avif)/gi);
    if (urlMatches && urlMatches.length > 5) {
      urlMatches.forEach(u => {
        if (!JUNK_RE.test(u) && GOOD_HINT_RE.test(u)) {
          addCandidate(u, m!.index + 500); // give it a boost
        }
      });
    }
  }

  // ---- Dedupe by base key, keep best score ----
  const byKey = new Map<string, ImgCandidate>();
  for (const c of candidates) {
    const k = baseKey(c.url);
    const prev = byKey.get(k);
    if (!prev || c.score > prev.score) byKey.set(k, c);
  }

  // ---- Sort: score desc, then DOM order asc ----
  const sorted = Array.from(byKey.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.order - b.order;
  });

  // Safety: if everything looks weak (no scored > 10 and no og/gallery), return empty
  const hasStrong = sorted.some((c) => c.score >= 20);
  if (!hasStrong && sorted.length < 2) return [];

  return sorted.slice(0, 30).map((c) => c.url);
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

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function scrapeWithDirectFallback(url: string) {
  const directRes = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; PermutaSmart/1.0; +https://lovable.dev)",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    },
  });

  if (!directRes.ok) {
    throw new Error(`Fallback direto falhou com status ${directRes.status}`);
  }

  const html = await directRes.text();
  return {
    markdown: htmlToText(html),
    html,
    rawHtml: html,
    metadata: {},
  };
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

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY")?.trim().replace(/^['"]|['"]$/g, "");
    let doc: any;

    if (FIRECRAWL_API_KEY) {
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

      const fcData = await fcRes.json().catch(() => ({}));
      if (fcRes.ok) {
        doc = fcData.data || fcData;
      } else {
        console.warn("Firecrawl failed, using direct fallback:", fcData);
      }
    } else {
      console.warn("FIRECRAWL_API_KEY missing, using direct fallback");
    }

    if (!doc) {
      doc = await scrapeWithDirectFallback(url);
    }
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
