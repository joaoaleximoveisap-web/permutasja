import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.41.1";
function absolutize(src: string, base: string): string {
  try {
    if (src.startsWith("//")) return "https:" + src;
    if (src.startsWith("http")) return src;
    return new URL(src, base).toString();
  } catch { return src; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  console.log("\n[DEBUG] Iniciando extração de dados...");

  const supabase = createClient(
    Deno.env.get("VITE_SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get('Authorization');
    let user_id = "00000000-0000-0000-0000-000000000000"; // Default guest ID

    if (authHeader) {
      const jwt = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(jwt);
      if (user) {
        user_id = user.id;
        console.log(`[OK] Usuário autenticado: ${user.id} (${user.email})`);
      }
    } else {
      console.log("[INFO] Modo convidado (sem autenticação)");
    }

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
    if (!fcRes.ok) {
      if (fcData.error?.toLowerCase().includes("token") || fcRes.status === 401) {
        throw new Error("API Key do Firecrawl inválida ou não autorizada. Verifique suas configurações.");
      }
      throw new Error(fcData.error || "Erro no Firecrawl");
    }

    const html = fcData.data?.html || "";
    const rawLinks = fcData.data?.links || [];
    
    // --- PHASE 1: API & DATA DETECTION ---
    let validLinks: string[] = [];
    
    // 1. Check for __NEXT_DATA__ (Next.js)
    try {
      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]+?)<\/script>/);
      if (nextDataMatch) {
        const fullData = JSON.parse(nextDataMatch[1]);
        // Find links in common Next.js state paths
        const searchItems = fullData.props?.pageProps?.initialState?.search?.items || 
                          fullData.props?.pageProps?.properties || 
                          fullData.props?.pageProps?.listings;
        
        if (Array.isArray(searchItems)) {
          searchItems.forEach((item: any) => {
            const path = item.url || item.path || item.link;
            if (path) {
              try {
                const abs = path.startsWith('http') ? path : `${new URL(url).origin}${path.startsWith('/') ? '' : '/'}${path}`;
                validLinks.push(abs);
              } catch {}
            }
          });
        }
      }
    } catch (e) { console.warn("Next.js link extraction failed:", e); }

    // 2. Pattern-based extraction from raw links
    if (validLinks.length === 0) {
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

      validLinks = Array.from(new Set(
        rawLinks
          .map((l: any) => {
            let href = l.href;
            if (!href) return null;
            if (href.startsWith('/')) href = `${baseUrl.protocol}//${baseUrl.host}${href}`;
            try {
              const linkUrl = new URL(href);
              if (!linkUrl.hostname.includes(domain)) return null;
              return linkUrl.toString().replace(/\/$/, "");
            } catch { return null; }
          })
          .filter((href: string | null) => {
            if (!href) return false;
            const lowHref = href.toLowerCase();
            const isProperty = patterns.some(p => lowHref.includes(p));
            const isJunk = rejectPatterns.some(p => lowHref.includes(p));
            return isProperty && !isJunk;
          })
      )) as string[];
    }

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
          debug: { htmlLength: html.length, apiDetected: false }
        } 
      }).eq("id", session_id);
      return new Response(JSON.stringify({ found: 0 }), { headers: corsHeaders });
    }

    // 2. Create jobs - DO NOT extract anything here (it will be extracted in process-import-job)
    const jobs = validLinks.map(link => ({
      session_id,
      property_url: link,
      status: "pending"
    }));


    // Batch insert to avoid issues
    await supabase.from("import_sessions").update({ 
      total_found: validLinks.length, 
      status: "processing",
      user_id: user_id, // Ensure user_id is updated if guest
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
    console.error("\n[ERRO DETECTADO]");
    console.error(error.message);
    console.error(error.stack);

    return new Response(JSON.stringify({ 
      error: "Falha na varredura",
      motivo: error.message,
      onde: error.stack
    }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
