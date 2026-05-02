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

    // 2. Scrape individual page
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: job.property_url,
        formats: ["markdown"],
        waitFor: 3000,
      }),
    });

    const fcData = await fcRes.json();
    const markdown = fcData.data?.markdown || "";

    // 3. Process with Lovable AI (OpenAI GPT-5-mini via Gateway)
    const aiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5-mini",
        messages: [
          { role: "system", content: "Extraia dados de imóveis em JSON puro. Campos: title, price (número), area (m²), bedrooms, bathrooms, parking, location, description, images (array)." },
          { role: "user", content: `Extraia deste conteúdo: ${markdown}` }
        ],
        response_format: { type: "json_object" }
      }),
    });

    const aiData = await aiRes.json();
    const extracted = JSON.parse(aiData.choices[0].message.content);

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