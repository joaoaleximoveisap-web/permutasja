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

const JUNK_RE = /(logo|sprite|favicon|avatar|brand|icon[-_/.]|\/icons?\/|placeholder|blank|pixel|spacer|watermark|whatsapp|facebook|instagram|youtube|tiktok|linkedin|google|gtm|analytics|tracking|ads?[-_/.]|banner|aurora|perfil|avatar|creci|person|user|profile)/i;

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
    .replace(/-\d{2,4}x\d{2,4}(\.[a-z]+)$/i, "$1")
    .replace(/\/(?:[whcq]_[^/,]+,?)+\//gi, "/w_1600/");
  return url;
}

function extractAllImages(html: string, baseUrl: string): string[] {
  const images = new Set<string>();
  
  // OG Images
  const ogMatch = html.match(/property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (ogMatch) images.add(upgradeImageUrl(absolutize(ogMatch[1], baseUrl)));

  // Schema.org / JSON-LD images
  const ldMatch = html.match(/"image":\s*["']([^"']+)["']/gi);
  if (ldMatch) {
    ldMatch.forEach(m => {
      const u = m.match(/"image":\s*["']([^"']+)["']/i)?.[1];
      if (u) images.add(upgradeImageUrl(absolutize(u, baseUrl)));
    });
  }

  // Large <img> tags
  const imgRe = /<img\b[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = imgRe.exec(html)) !== null) {
    const src = m[1];
    if (!JUNK_RE.test(src)) {
      images.add(upgradeImageUrl(absolutize(src, baseUrl)));
    }
  }

  return Array.from(images).filter(u => !u.startsWith("data:")).slice(0, 20);
}

async function scrapeWithDirectFallback(url: string) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`Status ${res.status}`);
  const html = await res.text();
  return html;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url, mode } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: "URL obrigatória" }), { status: 400, headers: corsHeaders });

    // --- MODE: DISCOVER (BULK) ---
    if (mode === "discover") {
      const html = await scrapeWithDirectFallback(url);
      const linkRe = /href=["']([^"']+\/(?:imovel|property|listing|detalhe|venda|comprar)[^"']*)["']/gi;
      const links = new Set<string>();
      let m;
      while ((m = linkRe.exec(html)) !== null) {
        try {
          const abs = absolutize(m[1], url);
          if (new URL(abs).host === new URL(url).host) links.add(abs);
        } catch { /* skip */ }
      }
      return new Response(JSON.stringify({ data: Array.from(links).slice(0, 50) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- MODE: SINGLE EXTRACTION (DEFAULT) ---
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    
    if (FIRECRAWL_API_KEY) {
      console.log("Using Firecrawl Extract for high quality results...");
      const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["extract"],
          extract: {
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                price: { type: "number" },
                area: { type: "number" },
                bedrooms: { type: "number" },
                bathrooms: { type: "number" },
                parking: { type: "number" },
                description: { type: "string" },
                city: { type: "string" },
                neighborhood: { type: "string" },
                type: { type: "string" },
                images: { type: "array", items: { type: "string" } },
                permuta: { type: "boolean" },
                permutaDetails: { type: "string" }
              },
              required: ["title", "price"]
            }
          }
        }),
      });

      if (fcRes.ok) {
        const result = await fcRes.json();
        const data = result.data?.extract || result.extract;
        if (data && data.title) {
          // Process and upgrade images
          if (data.images) {
            data.images = data.images.map((u: string) => upgradeImageUrl(absolutize(u, url)));
          }
          return new Response(JSON.stringify({ data }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      console.warn("Firecrawl extract failed or returned incomplete data, falling back to manual...");
    }

    // --- FALLBACK: MANUAL PARSING ---
    const html = await scrapeWithDirectFallback(url);
    const images = extractAllImages(html, url);
    
    // Basic regex extraction
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const priceMatch = html.match(/R\$\s*([\d.,]+)/i);
    const areaMatch = html.match(/(\d+)\s*m[²2]/i);
    
    const data = {
      title: titleMatch?.[1]?.trim() || "Imóvel importado",
      price: priceMatch ? parseNumber(priceMatch[1]) : 0,
      area: areaMatch ? parseInt(areaMatch[1], 10) : 0,
      images,
      description: "",
      missingFields: ["neighborhood", "city", "bedrooms"]
    };

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});