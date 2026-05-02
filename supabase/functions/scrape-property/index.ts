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
  const candidates: { url: string; priority: number; resolution: number }[] = [];

  // 1. Meta Tags (Priority 3)
  const metaOg = html.match(/property=["']og:image["']\s+content=["']([^"']+)/i);
  if (metaOg) candidates.push({ url: absolutize(metaOg[1], baseUrl), priority: 3, resolution: 1000 });

  const metaTwitter = html.match(/name=["']twitter:image["']\s+content=["']([^"']+)/i);
  if (metaTwitter) candidates.push({ url: absolutize(metaTwitter[1], baseUrl), priority: 3, resolution: 1000 });

  // 2. JSON-LD (Priority 1)
  const jsonLdMatches = html.matchAll(/<script type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi);
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1]);
      const findImages = (obj: any) => {
        if (typeof obj === "string" && /\.(jpe?g|png|webp|avif)/i.test(obj)) {
          candidates.push({ url: absolutize(obj, baseUrl), priority: 1, resolution: 1200 });
        } else if (Array.isArray(obj)) {
          obj.forEach(findImages);
        } else if (typeof obj === "object" && obj !== null) {
          if (obj.url && typeof obj.url === "string") findImages(obj.url);
          if (obj.image) findImages(obj.image);
          Object.values(obj).forEach(findImages);
        }
      };
      findImages(data);
    } catch { /* ignore */ }
  }

  // 3. Next.js Data (Priority 2)
  const nextData = html.match(/<script id=["']__NEXT_DATA__["'] type=["']application\/json["']>([\s\S]*?)<\/script>/i);
  if (nextData) {
    try {
      const data = JSON.parse(nextData[1]);
      const findImages = (obj: any) => {
        if (typeof obj === "string" && (obj.startsWith("http") || obj.startsWith("/")) && /\.(jpe?g|png|webp|avif)/i.test(obj)) {
          candidates.push({ url: absolutize(obj, baseUrl), priority: 2, resolution: 1100 });
        } else if (Array.isArray(obj)) {
          obj.forEach(findImages);
        } else if (typeof obj === "object" && obj !== null) {
          Object.values(obj).forEach(findImages);
        }
      };
      findImages(data);
    } catch { /* ignore */ }
  }

  // 4. Standard Images and Data Attributes
  const imgRe = /<img[^>]+(?:src|data-src|data-lazy-src|data-original|data-image|data-full|data-large)=["']([^"']+)["']/gi;
  let m;
  while ((m = imgRe.exec(html)) !== null) {
    candidates.push({ url: absolutize(m[1], baseUrl), priority: 5, resolution: 800 });
  }

  // 5. Srcset (Highest Resolution)
  const srcsetRe = /srcset=["']([^"']+)["']/gi;
  while ((m = srcsetRe.exec(html)) !== null) {
    const parts = m[1].split(",").map(p => p.trim());
    let best = { url: "", val: 0 };
    parts.forEach(p => {
      const [u, s] = p.split(/\s+/);
      const val = s ? parseInt(s.replace(/[^\d]/g, ""), 10) : 1;
      if (val > best.val) best = { url: u, val };
    });
    if (best.url) candidates.push({ url: absolutize(best.url, baseUrl), priority: 4, resolution: best.val });
  }

  // 6. CSS Backgrounds
  const bgRe = /background-image:\s*url\(["']?([^"')]+)["']?\)/gi;
  while ((m = bgRe.exec(html)) !== null) {
    candidates.push({ url: absolutize(m[1], baseUrl), priority: 5, resolution: 700 });
  }

  // Filter and Process
  const seen = new Set<string>();
  const final = candidates
    .filter(c => {
      const url = c.url.toLowerCase();
      // Step 3: Low Quality Filter
      if (JUNK_RE.test(url)) return false;
      if (/\.(svg|gif|ico)$/i.test(url)) return false;
      if (url.includes("1x1") || url.includes("32x32") || url.includes("64x64")) return false;
      return true;
    })
    .map(c => ({
      ...c,
      url: upgradeImageUrl(c.url)
    }))
    .filter(c => {
      // Step 5: Deduplication
      const baseUrl = c.url.split("?")[0];
      if (seen.has(baseUrl)) return false;
      seen.add(baseUrl);
      return true;
    })
    .sort((a, b) => {
      // Step 8: Ordering
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.resolution - a.resolution;
    });

  // Step 6: Minimum Result Rule
  if (final.length === 0 && candidates.length > 0) {
    // Relaxed filter fallback
    return Array.from(new Set(candidates.slice(0, 10).map(c => upgradeImageUrl(c.url))));
  }

  return final.map(f => f.url).slice(0, 25);
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

    // Manual HTML extraction (fallback if no LLM extract)
    if ((!extracted || !extracted.title) && html) {
      const titleMatch = 
        html.match(/property=["']og:title["']\s+content=["']([^"']+)/i) ||
        html.match(/<title>([^<]+)<\/title>/i);
      const descMatch = html.match(/property=["']og:description["']\s+content=["']([^"']+)/i);
      const priceMatch = html.match(/R\$\s*([\d.,]+)/i);
      const areaMatch = html.match(/(\d+)\s*m[²2]/i);
      const bedMatch = html.match(/(\d+)\s*(?:quartos?|dormit[óo]rios?|su[íi]tes?)/i);
      const bathMatch = html.match(/(\d+)\s*(?:banheiros?|wc)/i);
      const parkMatch = html.match(/(\d+)\s*(?:vagas?|garagens?)/i);

      const imgs = new Set<string>();
      const ogImg = html.match(/property=["']og:image["']\s+content=["']([^"']+)/i)?.[1];
      if (ogImg) imgs.add(absolutize(ogImg, url));
      const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
      let m;
      while ((m = imgRe.exec(html)) !== null) {
        if (!JUNK_RE.test(m[1]) && /\.(jpe?g|png|webp|avif)/i.test(m[1])) {
          imgs.add(absolutize(m[1], url));
        }
      }

      extracted = {
        title: titleMatch?.[1]?.trim() || "Imóvel importado",
        description: descMatch?.[1]?.trim() || "",
        price: priceMatch ? parseNumber(priceMatch[1]) : 0,
        area: areaMatch ? parseInt(areaMatch[1], 10) : 0,
        bedrooms: bedMatch ? parseInt(bedMatch[1], 10) : 0,
        bathrooms: bathMatch ? parseInt(bathMatch[1], 10) : 0,
        parking: parkMatch ? parseInt(parkMatch[1], 10) : 0,
        images: Array.from(imgs).slice(0, 20),
        missingFields: ["city", "neighborhood", "type"]
      };
    }

    if (!extracted || !extracted.title) {
      return new Response(JSON.stringify({ 
        error: "Não foi possível acessar este link. Verifique a URL ou adicione manualmente." 
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean and upgrade images
    if (extracted.images && extracted.images.length) {
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