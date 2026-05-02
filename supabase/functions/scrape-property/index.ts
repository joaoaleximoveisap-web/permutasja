import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

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
    .replace(/-\d{2,4}x\d{2,4}(\.[a-z]+)$/i, "$1");
  return url;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url, mode } = await req.json();
    if (!url) return new Response(JSON.stringify({ error: "URL obrigatória" }), { status: 400, headers: corsHeaders });

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    // --- MODE: DISCOVER (BULK) ---
    if (mode === "discover") {
      const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["html"],
          onlyMainContent: false,
        }),
      });
      const data = await res.json();
      const html = data.data?.html || "";
      
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

    // --- MODE: SINGLE EXTRACTION (HIGH QUALITY) ---
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

    const result = await fcRes.json();
    const extracted = result.data?.extract || result.extract;

    if (!extracted || !extracted.title) {
      throw new Error("Não foi possível extrair os dados do imóvel.");
    }

    // Clean and upgrade images
    if (extracted.images) {
      extracted.images = extracted.images
        .map((u: string) => upgradeImageUrl(absolutize(u, url)))
        .filter((u: string) => !JUNK_RE.test(u) && !u.startsWith("data:"));
    }

    return new Response(JSON.stringify({ data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});