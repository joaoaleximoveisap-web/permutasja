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

const JUNK_RE = /(logo|sprite|favicon|avatar|brand|icon[-_/.]|\/icons?\/|placeholder|blank|pixel|spacer|watermark|whatsapp|facebook|instagram|youtube|tiktok|linkedin|google|gtm|analytics|tracking|ads?[-_/.]|banner|aurora|perfil|avatar|creci|person|user|profile|map|marker|pin|button|search|menu|loading|spinner|dot)/i;

function upgradeImageUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  let url = rawUrl;
  try {
    const u = new URL(url);
    
    // Step 4: Resolution Upgrade
    const sizeParams = ["w", "h", "width", "height", "resize", "size"];
    sizeParams.forEach(p => {
      if (u.searchParams.has(p)) {
        const val = u.searchParams.get(p);
        if (val && /^\d+$/.test(val)) {
          const num = parseInt(val, 10);
          if (num < 1200) u.searchParams.set(p, "1200");
        }
      }
    });

    if (u.searchParams.has("quality") || u.searchParams.has("q")) {
      u.searchParams.set("quality", "90");
      u.searchParams.set("q", "90");
    }

    url = u.toString();
  } catch { /* keep */ }

  url = url
    .replace(/\/\d{2,4}x\d{2,4}\//gi, "/1200x900/")
    .replace(/\/thumbs?\//gi, "/")
    .replace(/\/small\//gi, "/large/")
    .replace(/\/medium\//gi, "/large/")
    .replace(/_thumb(\.[a-z]+)$/i, "_full$1")
    .replace(/_small(\.[a-z]+)$/i, "_large$1")
    .replace(/_medium(\.[a-z]+)$/i, "_large$1")
    .replace(/-thumbnail(\.[a-z]+)$/i, "$1")
    .replace(/-\d{2,4}x\d{2,4}(\.[a-z]+)$/i, "$1");

  return url;
}

function extractImagesFromHtml(html: string, baseUrl: string): string[] {
  const foundImgs: string[] = [];
  const baseOrigin = new URL(baseUrl).origin;

  // 1. img src
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) foundImgs.push(m[1]);
  // 2. data-src
  for (const m of html.matchAll(/data-src=["']([^"']+)["']/gi)) foundImgs.push(m[1]);
  // 3. data-lazy
  for (const m of html.matchAll(/data-(?:lazy|original)=["']([^"']+)["']/gi)) foundImgs.push(m[1]);
  // 4. srcset largest
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    const last = m[1].split(',').pop()?.trim().split(/\s+/)[0];
    if (last) foundImgs.push(last);
  }
  // 5. background-image
  for (const m of html.matchAll(/url\(["']?([^"')]+\.(?:jpg|jpeg|png|webp)[^"']*)["']?\)/gi)) foundImgs.push(m[1]);
  // 6. og:image
  const ogM = html.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  if (ogM) foundImgs.push(ogM[1]);
  // 7. JSON-LD
  for (const m of html.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const d = JSON.parse(m[1]);
      if (typeof d.image === 'string') foundImgs.push(d.image);
      if (Array.isArray(d.image)) d.image.forEach((i: any) => typeof i === 'string' ? foundImgs.push(i) : i?.url && foundImgs.push(i.url));
    } catch {}
  }
  // 8. Direct URLs
  for (const m of html.matchAll(/["'](https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)[^"'\s]*)["']/gi)) foundImgs.push(m[1]);

  const realImages = foundImgs
    .map(u => u.startsWith('//') ? 'https:' + u : u.startsWith('/') ? baseOrigin + u : u)
    .filter(u => { try { new URL(u); return true } catch { return false } })
    .filter(u => {
      const l = u.toLowerCase();
      return !(l.includes('logo') || l.includes('icon') || l.includes('favicon') ||
        l.includes('avatar') || l.includes('sprite') || l.includes('.svg') ||
        l.includes('.gif') || l.includes('.ico') || l.includes('whatsapp') ||
        l.includes('facebook') || l.includes('instagram') || l.includes('google') ||
        l.includes('maps.') || l.includes('staticmap') || l.includes('corretor') ||
        l.includes('agent') || l.includes('banner') || l.includes('selo') ||
        l.includes('badge') || l.includes('watermark') || l.includes('1x1') ||
        l.includes('placeholder') || l.includes('spinner') || l.includes('loading'));
    })
    .map(u => upgradeImageUrl(u))
    .filter((u, i, a) => a.findIndex(x => x.replace(/\?.*$/,'').toLowerCase() === u.replace(/\?.*$/,'').toLowerCase()) === i)
    .slice(0, 30);

  console.log('Real images found:', realImages.length);
  return realImages;
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

    // --- MODE: SINGLE EXTRACTION ---
    let extracted: any = null;
    let html = "";

    // Attempt 1: Firecrawl (LLM extract + HTML)
    if (FIRECRAWL_API_KEY) {
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
        if (fcRes.ok) {
          const doc = result.data || result;
          extracted = doc.json || doc.extract || null;
          html = doc.html || "";
        } else {
          console.warn("Firecrawl failed:", result);
        }
      } catch (e) {
        console.error("Firecrawl error:", e);
      }
    }

    // Attempt 2: Direct fetch fallback (if no Firecrawl HTML)
    if (!html) {
      try {
        const directRes = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
          },
        });
        if (directRes.ok) html = await directRes.text();
      } catch (e) {
        console.error("Direct fetch failed:", e);
      }
    }

    // Advanced Extraction Logic (Manual + Firecrawl Supplement)
    const scrapedImages = html ? extractImagesFromHtml(html, url) : [];
    
    if ((!extracted || !extracted.title) && html) {
      const titleMatch = 
        html.match(/property=["']og:title["']\s+content=["']([^"']+)/i) ||
        html.match(/<title>([^<]+)<\/title>/i);
      const descMatch = 
        html.match(/property=["']og:description["']\s+content=["']([^"']+)/i) ||
        html.match(/name=["']description["']\s+content=["']([^"']+)/i);
      
      const priceMatch = html.match(/R\$\s*([\d.,]+)/i);
      const areaMatch = html.match(/(\d+)\s*m[²2]/i);
      const bedMatch = html.match(/(\d+)\s*(?:quartos?|dormit[óo]rios?|su[íi]tes?)/i);
      const bathMatch = html.match(/(\d+)\s*(?:banheiros?|wc)/i);
      const parkMatch = html.match(/(\d+)\s*(?:vagas?|garagens?)/i);

      extracted = {
        title: titleMatch?.[1]?.trim() || "Imóvel importado",
        description: descMatch?.[1]?.trim() || "",
        price: priceMatch ? parseNumber(priceMatch[1]) : 0,
        area: areaMatch ? parseInt(areaMatch[1], 10) : 0,
        bedrooms: bedMatch ? parseInt(bedMatch[1], 10) : 0,
        bathrooms: bathMatch ? parseInt(bathMatch[1], 10) : 0,
        parking: parkMatch ? parseInt(parkMatch[1], 10) : 0,
        images: scrapedImages,
        missingFields: ["city", "neighborhood", "type"]
      };
    } else if (extracted) {
      // Merge Firecrawl LLM images with our advanced scraped images
      const llmImages = (extracted.images || []).map((u: string) => upgradeImageUrl(absolutize(u, url)));
      const combined = Array.from(new Set([...scrapedImages, ...llmImages]))
        .filter(u => !JUNK_RE.test(u))
        .slice(0, 30);
      
      extracted.images = combined;
    }

    if (!extracted || !extracted.title) {
      return new Response(JSON.stringify({ 
        error: "Não foi possível acessar este link. Verifique a URL ou adicione manualmente." 
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 7: Cover Image & Step 10: Debug Logging
    if (extracted.images && extracted.images.length > 0) {
      const metaOg = html ? html.match(/property=["']og:image["']\s+content=["']([^"']+)/i) : null;
      const ogUrl = metaOg ? upgradeImageUrl(absolutize(metaOg[1], url)) : null;
      
      if (ogUrl && extracted.images.includes(ogUrl)) {
        // Move OG image to front
        extracted.images = [ogUrl, ...extracted.images.filter(img => img !== ogUrl)];
      }
      
      extracted.cover_image = extracted.images[0];
      console.log(`Extraction complete for ${url}: ${extracted.images.length} images found. Cover: ${extracted.cover_image}`);
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