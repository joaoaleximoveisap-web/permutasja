import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("VITE_SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const { job_id } = await req.json();

    // 1. Get job
    const { data: job } = await supabase.from("import_jobs").select("*").eq("id", job_id).single();
    if (!job || job.status !== "pending") return new Response("Skip", { headers: corsHeaders });

    await supabase.from("import_jobs").update({ 
      status: "processing", 
      processed_at: new Date().toISOString() 
    }).eq("id", job_id);

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    // Phase 2A - Scrape with individual property URL (STRICT)
    console.log(`Analyzing property: ${job.property_url}`);
    
    const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: job.property_url,
        formats: ["html", "extract"],
        waitFor: 5000,
        actions: [
          { type: "wait", milliseconds: 2000 },
          { type: "scroll", direction: "down", amount: 1500 }, // More aggressive scroll
          { type: "wait", milliseconds: 1000 }
        ],
        extract: {
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              price: { type: "string" },
              area: { type: "string" },
              bedrooms: { type: "string" },
              bathrooms: { type: "string" },
              parking: { type: "string" },
              location: { type: "string" },
              description: { type: "string" }
            }
          },
          prompt: "Extraia título (h1 ou og:title), preço (padrão R$), área, quartos, banheiros, vagas, endereço e descrição deste imóvel."
        }
      }),
    });

    const fcData = await fcRes.json();
    if (!fcRes.ok) throw new Error(fcData.error || "Erro no Firecrawl");

    const html = fcData.data?.html || "";
    const extracted = fcData.data?.extract || {};
    
    // --- STEP 3 & 4: IMAGE EXTRACTION (STRICT) ---
    const foundImgs: string[] = [];
    if (html) {
      // img src
      for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)) foundImgs.push(m[1]);
      // data-src
      for (const m of html.matchAll(/data-src=["']([^"']+)["']/gi)) foundImgs.push(m[1]);
      // srcset (largest)
      for (const m of html.matchAll(/srcset=["']([^"']+)["']/gi)) {
        const parts = m[1].split(',').map(s => s.trim());
        const largest = parts[parts.length - 1].split(/\s+/)[0];
        if (largest) foundImgs.push(largest);
      }
      // background-image
      for (const m of html.matchAll(/url\(["']?([^"')]+\.(?:jpg|jpeg|png|webp)[^"']*)["']?\)/gi)) foundImgs.push(m[1]);
      // JSON-LD images
      for (const m of html.matchAll(/<script[^>]+ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
        try {
          const d = JSON.parse(m[1]);
          const images = d.image || d.photo || d.gallery;
          if (Array.isArray(images)) images.forEach(i => foundImgs.push(typeof i === 'string' ? i : i.url));
          else if (typeof images === 'string') foundImgs.push(images);
        } catch {}
      }
    }
    
    // STRICT REJECTION
    const rejectKeywords = ['logo', 'icon', 'avatar', 'sprite', 'placeholder', 'banner', 'header', 'footer', 'thumb', 'thumbnail', 'small', '.svg', '.gif'];
    
    const validImgs = Array.from(new Set(foundImgs))
      .map(src => {
        try {
          if (src.startsWith('//')) return "https:" + src;
          if (src.startsWith('http')) return src;
          return new URL(src, job.property_url).toString();
        } catch { return null; }
      })
      .filter(url => {
        if (!url) return false;
        const low = url.toLowerCase();
        return !rejectKeywords.some(k => low.includes(k));
      }) as string[];

    // --- STEP 5: REQUIRE MULTIPLE IMAGES ---
    if (validImgs.length < 2) {
      throw new Error("Imóvel sem imagens válidas");
    }

    // --- STEP 6: DATA EXTRACTION VALIDATION ---
    if (!extracted.title || extracted.title.length < 5) {
      const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
      extracted.title = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : "";
    }

    if (!extracted.title) {
      throw new Error("Não foi possível extrair o título do imóvel");
    }

    const rawData = {
      ...extracted,
      images: validImgs.slice(0, 30),
      debug: {
        analyzedUrl: job.property_url,
        totalFound: foundImgs.length,
        validFound: validImgs.length
      }
    };

    // 4. Update job
    await supabase.from("import_jobs").update({ 
      status: "done", 
      raw_data: rawData,
      processed_at: new Date().toISOString() 
    }).eq("id", job_id);

    // 5. Update session stats
    await supabase.rpc("increment_session_done", { session_uuid: job.session_id });

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

  } catch (error) {
    console.error("Process error:", error);
    const errorCode = error.message === "zero_images" ? "zero_images" : 
                     error.message === "no_title" ? "no_title" : "parse_failed";
    
    await supabase.from("import_jobs").update({ 
      status: "failed", 
      error_log: { 
        code: errorCode, 
        message: error.message,
        timestamp: new Date().toISOString()
      } 
    }).eq("id", job_id);
    
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: corsHeaders });
  }
});
