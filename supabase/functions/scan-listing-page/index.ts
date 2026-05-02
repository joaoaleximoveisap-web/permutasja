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

  // Verify token using the authenticated supabase client
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    console.error("Auth error:", authError);
    return new Response(JSON.stringify({ error: "Usuário não autenticado" }), { status: 401, headers: corsHeaders });
  }

  try {
    const { session_id, url } = await req.json();
    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");

    if (!FIRECRAWL_API_KEY) throw new Error("FIRECRAWL_API_KEY não configurada");

    // 1. Firecrawl scan - ONLY get links
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
    
    // Step 1A & 1E - Filter and Validate URLs
    const patterns = [
      '/imovel', '/imoveis', '/property', '/properties',
      '/listing', '/listings', '/detalhe', '/detail',
      '/apartamento', '/casa', '/terreno', '/comercial',
      '/empreendimento', '/residencial', '/lancamento'
    ];

    const rejectPatterns = [
      '/blog', '/sobre', '/contato', '/equipe', '/noticias',
      '/login', '/cadastro', '/busca', '/search',
      '#', 'javascript:', 'mailto:'
    ];

    const baseUrl = new URL(url);

    let validLinks = Array.from(new Set(
      rawLinks
        .map((l: any) => {
          let href = l.href;
          if (!href) return null;
          
          // Step 1C - Handle relative URLs
          if (href.startsWith('/')) {
            href = `${baseUrl.protocol}//${baseUrl.host}${href}`;
          }
          
          try {
            const linkUrl = new URL(href);
            // Step 1D - Normalize (remove tracking params)
            const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
            trackingParams.forEach(p => linkUrl.searchParams.delete(p));
            return linkUrl.toString().replace(/\/$/, ""); // Remove trailing slash
          } catch {
            return null;
          }
        })
        .filter((href: string | null) => {
          if (!href) return false;
          const lowHref = href.toLowerCase();
          const isProperty = patterns.some(p => lowHref.includes(p));
          const isJunk = rejectPatterns.some(p => lowHref.includes(p));
          return isProperty && !isJunk;
        })
    )) as string[];

    // Max limit 500
    if (validLinks.length > 500) {
      validLinks = validLinks.slice(0, 500);
    }

    if (validLinks.length === 0) {
      await supabase.from("import_sessions").update({ 
        status: "failed", 
        error_log: { code: "incompatible_page", message: "Nenhum link de imóvel individual encontrado na página de listagem." } 
      }).eq("id", session_id);
      return new Response(JSON.stringify({ found: 0 }), { headers: corsHeaders });
    }

    // 2. Create jobs - DO NOT extract images here
    const jobs = validLinks.map(link => ({
      session_id,
      property_url: link,
      status: "pending"
    }));

    // Batch insert to avoid issues
    await supabase.from("import_jobs").insert(jobs);
    
    await supabase.from("import_sessions").update({ 
      total_found: validLinks.length, 
      status: "processing",
      error_log: validLinks.length >= 500 ? "Limite de 500 imóveis atingido para esta sessão." : null
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
    console.error("Scan error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
