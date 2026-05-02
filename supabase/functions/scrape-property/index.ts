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
}

function parseNumber(s: string | undefined | null): number {
  if (!s) return 0;
  const cleaned = String(s).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function extractFromText(text: string, html: string): Partial<ExtractedProperty> {
  const out: Partial<ExtractedProperty> = {};

  // Price (R$ 1.234.567 or R$ 1234567,00)
  const priceMatch = text.match(/R\$\s*([\d.,]+)/i);
  if (priceMatch) out.price = parseNumber(priceMatch[1]);

  // Area (123 m² / 123m2)
  const areaMatch = text.match(/(\d{2,5}[.,]?\d*)\s*m[²2]/i);
  if (areaMatch) out.area = parseNumber(areaMatch[1]);

  // Bedrooms / quartos / dormitórios / suítes
  const bedMatch = text.match(/(\d+)\s*(?:quartos?|dormit[óo]rios?|su[íi]tes?)/i);
  if (bedMatch) out.bedrooms = parseInt(bedMatch[1], 10);

  // Bathrooms
  const bathMatch = text.match(/(\d+)\s*(?:banheiros?|wc)/i);
  if (bathMatch) out.bathrooms = parseInt(bathMatch[1], 10);

  // Parking
  const parkMatch = text.match(/(\d+)\s*(?:vagas?|garagens?)/i);
  if (parkMatch) out.parking = parseInt(parkMatch[1], 10);

  // Permuta
  const permutaMatch = text.match(/permuta[^.\n]{0,200}/i);
  if (permutaMatch) {
    out.permuta = true;
    out.permutaDetails = permutaMatch[0].trim().slice(0, 240);
  }

  // Images from HTML
  const imgs = new Set<string>();
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = imgRegex.exec(html)) !== null) {
    const src = m[1];
    if (/\.(jpe?g|png|webp)/i.test(src) && !/(logo|icon|sprite|placeholder|avatar)/i.test(src)) {
      imgs.add(src.startsWith("//") ? "https:" + src : src);
    }
    if (imgs.size >= 12) break;
  }
  // Also try og:image
  const ogMatches = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi);
  if (ogMatches) {
    ogMatches.forEach((tag) => {
      const m2 = tag.match(/content=["']([^"']+)["']/i);
      if (m2) imgs.add(m2[1]);
    });
  }
  out.images = Array.from(imgs).slice(0, 10);

  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "URL obrigatória" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try { new URL(url); } catch {
      return new Response(JSON.stringify({ error: "URL inválida" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(JSON.stringify({ error: "FIRECRAWL_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        formats: ["markdown", "html"],
        onlyMainContent: true,
      }),
    });

    const fcData = await fcRes.json();
    if (!fcRes.ok) {
      console.error("Firecrawl error:", fcData);
      const status = fcRes.status === 402 ? 402 : 502;
      return new Response(
        JSON.stringify({ error: fcData?.error || "Falha ao acessar o link", status: fcRes.status }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SDK v2 returns data at top-level OR under data
    const doc = fcData.data || fcData;
    const markdown: string = doc.markdown || "";
    const html: string = doc.html || doc.rawHtml || "";
    const metadata = doc.metadata || {};

    const text = `${markdown}\n${(metadata.title || "")}\n${(metadata.description || "")}`;
    const extracted = extractFromText(text, html);

    const title: string =
      metadata.ogTitle ||
      metadata.title ||
      (markdown.split("\n").find((l: string) => l.trim().startsWith("# "))?.replace(/^#\s+/, "") ?? "") ||
      "Imóvel importado";

    const description: string =
      metadata.description ||
      markdown.split("\n").filter((l: string) => l.trim().length > 40).slice(0, 3).join(" ").slice(0, 600) ||
      "";

    // Try to get city/neighborhood from URL or metadata
    const hostname = new URL(url).hostname;
    let city: string | undefined;
    let neighborhood: string | undefined;
    const urlPath = new URL(url).pathname.toLowerCase();
    const cityMatch = urlPath.match(/([a-z\-]+)-(?:pr|sp|rj|mg|sc|rs|ba|ce|pe|go|df|es|am|pa|ma|mt|ms|al|pi|rn|pb|se|to|ac|ap|ro|rr)\b/);
    if (cityMatch) city = cityMatch[1].replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const result: ExtractedProperty = {
      title: title.trim().slice(0, 200),
      price: extracted.price || 0,
      area: extracted.area || 0,
      bedrooms: extracted.bedrooms || 0,
      bathrooms: extracted.bathrooms,
      parking: extracted.parking,
      description: description.trim(),
      images: extracted.images || [],
      city: city || metadata.city,
      neighborhood: neighborhood || metadata.neighborhood,
      type: title.toLowerCase().includes("casa") ? "Casa"
        : title.toLowerCase().includes("cobertura") ? "Cobertura"
        : title.toLowerCase().includes("studio") || title.toLowerCase().includes("kitnet") ? "Studio"
        : "Apartamento",
      permuta: extracted.permuta || false,
      permutaDetails: extracted.permutaDetails,
    };

    return new Response(JSON.stringify({ data: result, source: hostname }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("scrape-property error:", err);
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
