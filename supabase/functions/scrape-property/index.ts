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
      console.log("Discover mode: using Firecrawl for JS rendering...");
      const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: ["html"],
          waitFor: 5000, // Wait for JS rendering as requested
          onlyMainContent: false,
        }),
      });
      
      const data = await res.json();
      const html = data.data?.html || "";
      
      // Advanced Link Detection Pattern
      // Looking for /imovel/, /detalhe/, /venda/, /aluguel/ etc in hrefs
      const linkPatterns = [
        /href=["']([^"']+\/(?:imovel|property|listing|detalhe|venda|comprar|alugar|apartamento|casa)[^"']*)["']/gi,
        /data-href=["']([^"']+)["']/gi,
        /data-url=["']([^"']+)["']/gi
      ];
      
      const links = new Set<string>();
      for (const pattern of linkPatterns) {
        let m;
        while ((m = pattern.exec(html)) !== null) {
          try {
            const abs = absolutize(m[1], url);
            const u = new URL(abs);
            // Ignore common assets and ensure same host
            if (u.host === new URL(url).host && !/\.(css|js|png|jpg|jpeg|gif|svg|woff2?|pdf)$/i.test(u.pathname)) {
              links.add(abs);
            }
          } catch { /* skip */ }
        }
      }

      // Detection Stats for debugging
      const cardPattern = /<div|section|li[^>]*?(?:card|item|listing|property|result)[^>]*?>/gi;
      const cardMatches = (html.match(cardPattern) || []).length;
      const priceMatches = (html.match(/R\$\s*[\d.,]+/g) || []).length;

      return new Response(JSON.stringify({ 
        data: Array.from(links).slice(0, 50),
        debug: {
          elementsScanned: html.length,
          potentialCards: cardMatches,
          pricesFound: priceMatches,
          linksExtracted: links.size
        }
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- MODE: SINGLE EXTRACTION (HIGH QUALITY + FALLBACK) ---
    let extracted: any = null;

    // Attempt 1: Firecrawl Extract (LLM-powered)
    try {
      const fcRes = await fetch("https://api.firecrawl.dev/v2/scrape", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          formats: [
            { type: "json", schema: {
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
              }
            }},
            "html"
          ],
          waitFor: 2000,
        }),
      });

      const result = await fcRes.json();
      const doc = result.data || result;
      extracted = doc.json || doc.extract || null;

      // Fallback: if LLM extract failed, parse HTML for at least title + images + price
      if ((!extracted || !extracted.title) && doc.html) {
        const html = doc.html as string;
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i) || html.match(/property=["']og:title["']\s+content=["']([^"']+)/i);
        const priceMatch = html.match(/R\$\s*([\d.,]+)/i);
        const areaMatch = html.match(/(\d+)\s*m[²2]/i);
        const bedMatch = html.match(/(\d+)\s*(?:quartos?|dormit[óo]rios?|su[íi]tes?)/i);

        const imgs = new Set<string>();
        const ogImg = html.match(/property=["']og:image["']\s+content=["']([^"']+)/i)?.[1];
        if (ogImg) imgs.add(absolutize(ogImg, url));
        const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
        let m;
        while ((m = imgRe.exec(html)) !== null) {
          if (!JUNK_RE.test(m[1])) imgs.add(absolutize(m[1], url));
        }

        extracted = {
          title: titleMatch?.[1]?.trim() || "Imóvel importado",
          price: priceMatch ? parseNumber(priceMatch[1]) : 0,
          area: areaMatch ? parseInt(areaMatch[1], 10) : 0,
          bedrooms: bedMatch ? parseInt(bedMatch[1], 10) : 0,
          description: "",
          images: Array.from(imgs).slice(0, 20),
          missingFields: ["city", "neighborhood", "type"]
        };
      }
    } catch (e) {
      console.error("Firecrawl error:", e);
    }

    if (!extracted || !extracted.title) {
      return new Response(JSON.stringify({ 
        error: "Não foi possível extrair os dados deste link. Tente outro imóvel ou adicione manualmente." 
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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