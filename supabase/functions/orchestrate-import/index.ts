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

  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { targetUrl } = await req.json()
    let currentPage = 1
    let totalImported = 0

    while (currentPage <= 10) {
      await supabaseClient.from('import_logs').insert({
        status: 'processing',
        message: `Iniciando extração da página ${currentPage}...`
      })

      // Call scan-listing-page function
      const scanResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/scan-listing-page`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url: targetUrl, page: currentPage })
      })

      const { properties, hasNextPage } = await scanResponse.json()

      if (!properties || properties.length === 0) break

      for (const prop of properties) {
        const { error } = await supabaseClient.from('properties').upsert({
          external_id: prop.id,
          title: prop.titulo,
          price: prop.preco,
          location: prop.localizacao,
          features: prop.caracteristicas,
          media: prop.midia,
          url: prop.url,
          source: 'Aurora Imobi'
        }, { onConflict: 'external_id' })

        if (!error) {
          totalImported++
          await supabaseClient.from('import_logs').insert({
            status: 'success',
            message: `Objeto [${prop.titulo}] criado com sucesso.`
          })
        }
      }

      if (!hasNextPage) break
      currentPage++
    }

    return new Response(
      JSON.stringify({ success: true, totalImported }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
