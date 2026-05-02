import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Usuário não autenticado" }), { status: 401, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("VITE_SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  // Verify token
  const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Usuário não autenticado" }), { status: 401, headers: corsHeaders });
  }

  try {
    const { session_id, url } = await req.json();
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY não configurada");

    // 1. Firecrawl scan
    const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["links"],
        waitFor: 5000,
      }),
    });

    const fcData = await fcRes.json();
    if (!fcRes.ok) throw new Error(fcData.error || "Erro no Firecrawl");

    const rawLinks = fcData.data?.links || [];
    const patterns = ['/imovel/', '/imoveis/', '/property/', '/listing/', '/detalhe/', '/venda/', '/comprar/'];
    
    const validLinks = Array.from(new Set(
      rawLinks
        .map((l: any) => l.href)
        .filter((href: string) => 
          href && patterns.some(p => href.toLowerCase().includes(p))
        )
    ));

    if (validLinks.length === 0) {
      await supabase.from("import_sessions").update({ status: "failed", error_log: "Nenhum link de imóvel encontrado." }).eq("id", session_id);
      return new Response(JSON.stringify({ found: 0 }), { headers: corsHeaders });
    }

    // 2. Create jobs
    const jobs = validLinks.map(link => ({
      session_id,
      property_url: link,
      status: "pending"
    }));

    await supabase.from("import_jobs").insert(jobs);
    await supabase.from("import_sessions").update({ 
      total_found: validLinks.length, 
      status: "processing" 
    }).eq("id", session_id);

    // 3. Trigger orchestration
    await fetch(`${Deno.env.get("VITE_SUPABASE_URL")}/functions/v1/orchestrate-import`, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ session_id })
    });

    return new Response(JSON.stringify({ found: validLinks.length }), { headers: corsHeaders });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});