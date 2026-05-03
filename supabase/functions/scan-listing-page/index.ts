import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url, page = 1 } = await req.json()
    console.log(`Scanning page ${page} of ${url}`)

    // Simulated scraping logic for Aurora Imobi
    // In a real scenario, this would use a fetch + DOM parser or a specialized scraping service
    const simulatedData = [
      {
        id: `aurora-${page}-101`,
        titulo: "Apartamento High-End Gleba Palhano",
        preco: 1850000,
        localizacao: { bairro: "Gleba Palhano", cidade: "Londrina", regiao: "Zona Sul" },
        caracteristicas: { area: 180, quartos: 3, vagas: 3 },
        midia: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800"],
        url: `${url}/imovel/101`
      },
      {
        id: `aurora-${page}-102`,
        titulo: "Casa de Luxo Alphaville",
        preco: 4200000,
        localizacao: { bairro: "Alphaville", cidade: "Londrina", regiao: "Zona Sul" },
        caracteristicas: { area: 450, quartos: 4, vagas: 4 },
        midia: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800"],
        url: `${url}/imovel/102`
      }
    ];

    return new Response(
      JSON.stringify({ properties: simulatedData, hasNextPage: page < 3 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
