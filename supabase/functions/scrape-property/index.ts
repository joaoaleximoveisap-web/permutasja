import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

function parseNumber(s: string | undefined | null): number {
  if (!s) return 0;
  // Handle R$ 4.500.000,00 -> 4500000
  const cleaned = String(s)
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3})/g, "")
    .replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function cleanTitle(title: string): string {
  if (!title) return "";
  const junk = [
    /Facilitado por/i, /Powered by/i, /Kenlo/i, /VivaReal/i, /Zap/i, 
    /Imóveis/i, /Imobiliária/i, /Software/i, /Plataforma/i
  ];
  let cleaned = title;
  junk.forEach(re => {
    cleaned = cleaned.replace(re, "").trim();
  });
  // Remove trailing dashes/pipes
  return cleaned.replace(/\s*[-|]\s*$/, "").trim();
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

  // 1. img src (Standard)
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) foundImgs.push(m[1]);
  // 2. data-src, data-lazy, data-original (Common lazy loading)
  for (const m of html.matchAll(/data-(?:src|lazy|original|full|large|img|source)=["']([^"']+)["']/gi)) foundImgs.push(m[1]);
  // 3. srcset largest resolution
  for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
    const parts = m[1].split(',').map(s => s.trim().split(/\s+/)[0]);
    if (parts.length > 0) foundImgs.push(parts[parts.length - 1]);
  }
  // 4. background-image in inline styles
  for (const m of html.matchAll(/style=["'][^"']*background-image\s*:\s*url\(["']?([^"')]+\.(?:jpg|jpeg|png|webp|avif)[^"']*)["']?\)/gi)) foundImgs.push(m[1]);
  // 5. og:image and twitter:image meta tags
  const ogM = html.match(/property=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i);
  if (ogM) foundImgs.push(ogM[1]);
  // 6. JSON-LD (Strict property schema)
  for (const m of html.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const d = JSON.parse(m[1]);
      const processImage = (img: any) => {
        if (typeof img === 'string') foundImgs.push(img);
        else if (img?.url) foundImgs.push(img.url);
        else if (img?.contentUrl) foundImgs.push(img.contentUrl);
      };
      if (d.image) Array.isArray(d.image) ? d.image.forEach(processImage) : processImage(d.image);
      if (d.photo) Array.isArray(d.photo) ? d.photo.forEach(processImage) : processImage(d.photo);
    } catch {}
  }
  // 7. Regex for any image URL inside quotes (last resort for JS-rendered arrays)
  for (const m of html.matchAll(/["'](https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp|avif)(?:\?[^"'\s]*)?)["']/gi)) foundImgs.push(m[1]);

  function findPropertyImages(allImages: string[], propertyUrl: string): string[] {
    const uniqueImages = Array.from(new Set(allImages.map(img => absolutize(img, propertyUrl))));
    
    // Strategy: Filter by relevance and size patterns
    return uniqueImages.filter(u => {
      try {
        const urlObj = new URL(u);
        const l = u.toLowerCase();
        
        // REJECT JUNK
        if (JUNK_RE.test(u)) return false;
        if (l.includes('.svg') || l.includes('.gif') || l.includes('.ico')) return false;
        
        // PRIORITIZE PROPERTY IMAGES
        // Common paths for property galleries
        const isGalleryPath = /imovel|property|listing|venda|aluguel|fotos?|gall?ery|media|uploads?|assets/i.test(urlObj.pathname);
        
        // Reject very small icons or tracking pixels
        if (l.includes('1x1') || l.includes('favicon')) return false;
        
        return true;
      } catch { return false; }
    });
  }

  const propertyPhotos = findPropertyImages(foundImgs, baseUrl);

  const realImages = propertyPhotos
    .map(u => upgradeImageUrl(u))
    .filter((u, i, a) => a.findIndex(x => x.replace(/\?.*$/,'').toLowerCase() === u.replace(/\?.*$/,'').toLowerCase()) === i)
    .slice(0, 40); // Increased limit to ensure gallery capture

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
      console.log("Discover mode: using Firecrawl v1 for consistency...");
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
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
    let markdown = "";

    if (FIRECRAWL_API_KEY) {
      try {
        const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: ["html", "markdown"], // Use markdown for clean text extraction
            waitFor: 5000,
            onlyMainContent: false, // Ensure we see labels and sidebar data
            actions: [
              { type: "wait", milliseconds: 2000 },
              { type: "scroll", direction: "down", amount: 1500 },
              { type: "wait", milliseconds: 1000 }
            ]
          }),
        });
        const result = await fcRes.json();
        if (fcRes.ok) {
          html = result.data?.html || "";
          markdown = result.data?.markdown || "";
        }
      } catch (e) { console.error("Firecrawl error:", e); }
    }

    // Step 2: Advanced Extraction from Visible Content (Markdown/Text)
    // We behave like a human reading the page
    const pageText = markdown || html.replace(/<[^>]*>/g, ' ');
    
    // PATTERN MATCHING (Human-like reading)
    // Price: R$ followed by numbers, dots, commas
    const priceMatch = pageText.match(/R\$\s*([\d.,]+)/i);
    // Area: number followed by m²
    const areaMatch = pageText.match(/(\d+)\s*m[²2]/i);
    // Rooms: number followed by keywords
    const bedMatch = pageText.match(/(\d+)\s*(?:quartos?|dormit[óo]rios?|su[íi]tes?|beds?)/i);
    const bathMatch = pageText.match(/(\d+)\s*(?:banheiros?|wc|baths?)/i);
    const parkMatch = pageText.match(/(\d+)\s*(?:vagas?|garagens?|parking)/i);
    
    // TITLE FIX (H1 priority from HTML)
    let title = "";
    const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    if (h1Match) {
      title = cleanTitle(h1Match[1].replace(/<[^>]*>/g, '').trim());
    }
    
    // Discard invalid titles
    if (title && (title.toLowerCase().includes("facilitado por") || title.toLowerCase().includes("powered by"))) {
      title = "";
    }
    
    if (!title) {
      const ogTitle = html.match(/property=["']og:title["']\s+content=["']([^"']+)/i);
      title = ogTitle ? cleanTitle(ogTitle[1]) : "";
    }

    // JSON-LD Fallback
    let ldData: any = {};
    const ldMatch = html.match(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/i);
    if (ldMatch) {
      try { ldData = JSON.parse(ldMatch[1]); } catch {}
    }

    // Priority Order applied here: Visible text patterns first
    extracted = {
      title: title || ldData.name || "Imóvel sem título",
      price: priceMatch ? parseNumber(priceMatch[1]) : (ldData.offers?.price || parseNumber(html.match(/itemprop=["']price["']\s+content=["']([^"']+)/i)?.[1])),
      area: areaMatch ? parseInt(areaMatch[1], 10) : (ldData.floorSize?.value || parseInt(html.match(/itemprop=["']floorSize["'][^>]*>([\d\s]+)/i)?.[1] || "0")),
      bedrooms: bedMatch ? parseInt(bedMatch[1], 10) : (ldData.numberOfRooms || 0),
      bathrooms: bathMatch ? parseInt(bathMatch[1], 10) : 0,
      parking: parkMatch ? parseInt(parkMatch[1], 10) : 0,
      description: ldData.description || html.match(/meta name=["']description["'] content=["']([^"']+)["']/i)?.[1] || "",
      images: extractImagesFromHtml(html, url),
      debug: {
        price_found: !!priceMatch,
        area_found: !!areaMatch,
        raw_text_snippet: pageText.slice(0, 500).replace(/\n/g, ' ')
      }
    };

    // STEP 5: VALIDATION
    if (!priceMatch && !areaMatch) {
       return new Response(JSON.stringify({ 
        error: "Dados não encontrados no conteúdo visível (Preço e Área não detectados)." 
      }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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