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

    // Phase 2A - Scrape with scroll
    const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: job.property_url,
        formats: ["html", "markdown", "extract"],
        waitFor: 5000,
        actions: [
          { type: "wait", milliseconds: 2000 },
          { type: "scroll", direction: "down", amount: 800 },
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
          prompt: "Extraia os detalhes do imóvel brasileiro: título, preço (R$), área (m²), quartos, banheiros, vagas, endereço completo e descrição."
        }
      }),
    });

    const fcData = await fcRes.json();
    if (!fcRes.ok) throw new Error(fcData.error || "Erro no Firecrawl");

    const html = fcData.data?.html || "";
    const extracted = fcData.data?.extract || {};
    
    // --- PHASE 3: IMAGE HANDLING (INTELLIGENT GROUPING) ---
    function findPropertyImages(allImages: string[], propertyUrl: string): string[] {
      const segmentCounts: Record<string, string[]> = {};
      
      for (const img of allImages) {
        try {
          const urlObj = new URL(img);
          const segments = urlObj.pathname.split('/').filter(s => s.length > 3);
          
          for (const seg of segments) {
            // Skip common boilerplate path segments
            if (['images', 'image', 'img', 'photos', 'foto', 'fotos', 'media', 'upload', 'uploads', 'assets', 'static'].includes(seg.toLowerCase())) continue;
            
            if (!segmentCounts[seg]) segmentCounts[seg] = [];
            segmentCounts[seg].push(img);
          }
        } catch {}
      }
      
      // Best group is the one with most images sharing a segment (e.g. property ID or folder)
      let bestImages: string[] = [];
      for (const [seg, imgs] of Object.entries(segmentCounts)) {
        if (imgs.length >= 3 && imgs.length > bestImages.length) {
          bestImages = imgs;
        }
      }
      
      if (bestImages.length >= 3) return bestImages;
      
      // Fallback: use all images that don't match junk patterns
      return allImages;
    }

    const junkWords = ['logo', 'icon', 'favicon', 'avatar', 'sprite', 'placeholder', 'blank', 'pixel', 'spacer', 'watermark', 'whatsapp', 'facebook', 'instagram', 'header', 'footer', 'banner-site', 'widget'];
    const junkPatterns = [/\/100x/, /\/150x/, /\/200x/, /w=100/, /w=150/, /h=100/, /\.svg/, /\.gif/, /\.ico/];

    const allExtractedImages = Array.from(new Set(images))
      .filter(url => {
        if (!url.startsWith('http')) return false;
        const low = url.toLowerCase();
        if (junkWords.some(w => low.includes(w))) return false;
        if (junkPatterns.some(p => p.test(low))) return false;
        return true;
      });

    let filteredImages = findPropertyImages(allExtractedImages, job.property_url)
      .map(url => {
        // Phase 2D - Resolution Upgrade (Aggressive)
        return url
          .replace('/400x300/', '/1200x900/')
          .replace('/600x400/', '/1200x800/')
          .replace(/-medium\./i, '-large.')
          .replace(/-small\./i, '-large.')
          .replace(/_300\./i, '_1200.')
          .replace(/\?width=\d+/i, '?width=1200')
          .replace(/\?w=\d+/i, '?w=1200')
          .replace(/\/thumbs?\//i, '/full/')
          .replace(/\/small\//i, '/large/');
      });


    // Phase 2F - Validation
    if (filteredImages.length === 0) {
      throw new Error("zero_images");
    }

    if (!extracted.title || extracted.title.length < 5) {
       // Fallback for title
       const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
       extracted.title = h1Match ? h1Match[1].replace(/<[^>]*>/g, '').trim() : "Imóvel sem título";
       if (extracted.title === "Imóvel sem título") throw new Error("no_title");
    }

    const rawData = {
      ...extracted,
      images: filteredImages.slice(0, 30) // Limit to 30 images
    };

    // Phase 4 - Duplicate Detection (Simpler version for edge function)
    // In production, we'd do a fuzzy check here, but for now we rely on URL
    
    // 4. Update job
    await supabase.from("import_jobs").update({ 
      status: "done", 
      raw_data: rawData,
      processed_at: new Date().toISOString() 
    }).eq("id", job_id);

    // 5. Update session stats - Deduct credits only AFTER successful extraction (UI/Trigger logic)
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
