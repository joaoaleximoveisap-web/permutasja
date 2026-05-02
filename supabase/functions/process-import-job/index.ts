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

    await supabase.from("import_jobs").update({ status: "processing", processed_at: new Date().toISOString() }).eq("id", job_id);

    // 2. Scrape individual page with Firecrawl Extract
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: job.property_url,
        formats: ["extract"],
        waitFor: 4000,
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
              description: { type: "string" },
              images: {
                type: "array",
                items: { type: "string" }
              }
            }
          },
          prompt: "Extract all real estate property details including title, price, area in m², bedrooms, bathrooms, parking spaces, full address or location, description, and all property image URLs. Return high quality image URLs only, not thumbnails."
        }
      }),
    });

    const fcData = await fcRes.json();
    const extracted = fcData.data?.extract;

    if (!extracted?.title || !extracted?.price) {
      throw new Error("Não foi possível extrair os dados básicos do imóvel.");
    }

    // Image quality filter
    const filteredImages = (extracted.images || []).filter((url: string) => {
      const low = url.toLowerCase();
      return (
        !low.includes('thumb') &&
        !low.includes('icon') &&
        !low.includes('logo') &&
        !low.includes('sprite') &&
        !low.includes('.svg') &&
        !low.includes('.gif') &&
        !low.includes('1x1') &&
        url.startsWith('http')
      );
    });
    extracted.images = filteredImages;

    // 4. Update job
    await supabase.from("import_jobs").update({ 
      status: "done", 
      raw_data: extracted,
      processed_at: new Date().toISOString() 
    }).eq("id", job_id);

    // 5. Update session stats
    await supabase.rpc("increment_session_done", { session_uuid: job.session_id });

    return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });

  } catch (error) {
    await supabase.from("import_jobs").update({ status: "failed", error_log: error.message }).eq("id", job_id);
    return new Response(JSON.stringify({ error: error.message }), { status: 200, headers: corsHeaders });
  }
});