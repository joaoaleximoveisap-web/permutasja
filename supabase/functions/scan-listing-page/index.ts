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

    // 1. Firecrawl scan - Detect API and Links
    const fcRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["html", "links"],
        waitFor: 5000,
      }),
    });

    const fcData = await fcRes.json();
    if (!fcRes.ok) throw new Error(fcData.error || "Erro no Firecrawl");

    const html = fcData.data?.html || "";
    const rawLinks = fcData.data?.links || [];
    
    // --- PHASE 1: API DETECTION ---
    let apiEndpoint = null;
    
    // Scan script tags and window data for common API patterns
    const apiPatterns = [
      /https?:\/\/[^"'\s]+\/api\/(?:listings|properties|search|v1|v2)[^"'\s]*/gi,
      /https?:\/\/[^"'\s]+\/graphql/gi,
      /window\.__INITIAL_STATE__\s*=\s*({[\s\S]+?});/i,
      /window\.__NEXT_DATA__\s*=\s*({[\s\S]+?});/i,
      /<script[^>]+type=["']application\/json["'][^>]*>([\s\S]+?)<\/script>/gi
    ];

    for (const pattern of apiPatterns) {
      const match = html.match(pattern);
      if (match) {
        console.log("Potential API/Data found:", match[0].substring(0, 100));
        // We could extract and use it here, but for now we'll prioritize high-quality link extraction
        // as a robust baseline while reporting detection.
      }
    }

    // --- PHASE 2: ROBUST LINK EXTRACTION (FALLBACK/HYBRID) ---
    const patterns = [
      '/imovel', '/imoveis', '/property', '/properties',
      '/listing', '/listings', '/detalhe', '/detail',
      '/apartamento', '/casa', '/terreno', '/comercial',
      '/empreendimento', '/residencial', '/lancamento'
    ];

    const rejectPatterns = [
      '/blog', '/sobre', '/contato', '/equipe', '/noticias',
      '/login', '/cadastro', '/busca', '/search',
      '#', 'javascript:', 'mailto:', '/wp-admin/', '/wp-content/'
    ];

    const baseUrl = new URL(url);
    const domain = baseUrl.hostname;

    let validLinks = Array.from(new Set(
      rawLinks
        .map((l: any) => {
          let href = l.href;
          if (!href) return null;
          
          if (href.startsWith('/')) {
            href = `${baseUrl.protocol}//${baseUrl.host}${href}`;
          }
          
          try {
            const linkUrl = new URL(href);
            // Ensure same domain to avoid crawling external ads
            if (!linkUrl.hostname.includes(domain)) return null;

            const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
            trackingParams.forEach(p => linkUrl.searchParams.delete(p));
            return linkUrl.toString().replace(/\/$/, "");
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
      // Emergency: if patterns fail, try to find any link inside a "card" structure
      const cardLinksMatch = html.matchAll(/<(?:div|section|li|a)[^>]+(?:card|item|listing|property|result)[^>]*?>[\s\S]*?<a[^>]+href=["']([^"']+)["']/gi);
      const emergencyLinks = new Set<string>();
      for (const m of cardLinksMatch) {
        try {
          const abs = absolutize(m[1], url);
          const u = new URL(abs);
          if (u.hostname.includes(domain)) emergencyLinks.add(abs);
        } catch {}
      }
      
      if (emergencyLinks.size > 0) {
        validLinks = Array.from(emergencyLinks).slice(0, 500);
      }
    }

    if (validLinks.length === 0) {
      await supabase.from("import_sessions").update({ 
        status: "failed", 
        error_log: { 
          code: "incompatible_page", 
          message: "Nenhum link de imóvel individual encontrado. O site pode estar protegendo os dados via API dinâmica.",
          debug: { htmlLength: html.length, apiDetected: !!apiEndpoint }
        } 
      }).eq("id", session_id);
      return new Response(JSON.stringify({ found: 0 }), { headers: corsHeaders });
    }

    // 2. Create jobs - DO NOT extract images here (they will be extracted in process-import-job)
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
