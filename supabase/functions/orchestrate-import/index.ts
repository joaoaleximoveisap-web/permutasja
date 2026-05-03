import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { targetUrl } = await req.json()
    let currentPage = 1
    let totalExtracted = 0
    const processedIds = new Set<string>();

    while (currentPage <= 10) {
      // 1. Log start of page
      await supabase.from('import_logs').insert({
        status: 'running',
        message: `Extraindo página ${currentPage}...`,
        page_number: currentPage
      })

      // 2. Fetch from scan function
      const scanResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/scan-listing-page`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: targetUrl, page: currentPage })
      })

      if (!scanResponse.ok) throw new Error(`Scan failed on page ${currentPage}`);
      
      const { properties, hasNextPage } = await scanResponse.json()

      if (!properties || properties.length === 0) break

      // 3. Process and Upsert
      let pageExtracted = 0;
      for (const prop of properties) {
        if (processedIds.has(prop.id)) {
          console.log(`[Orchestrator] Duplicate detected: ${prop.id}. Stopping.`);
          return new Response(JSON.stringify({ success: true, totalExtracted, reason: 'duplicate_found' }), { headers: corsHeaders });
        }
        processedIds.add(prop.id);

        const { error } = await supabase.from('properties').upsert({
          external_id: prop.id,
          title: prop.titulo,
          price: prop.preco,
          url: prop.url,
          source: 'auroraimobi',
          data: prop, // Store full JSON-First object
          scraped_at: new Date().toISOString()
        }, { onConflict: 'external_id' })

        if (!error) {
          pageExtracted++;
          totalExtracted++;
          await supabase.from('import_logs').insert({
            status: 'success',
            message: `✔ Imóvel capturado: ${prop.titulo}`,
            details: { 
              price: prop.preco, 
              images: prop.midia.length,
              type: "property-card"
            }
          })
        }
      }

      if (!hasNextPage) break
      currentPage++
    }

    return new Response(
      JSON.stringify({ success: true, totalExtracted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
