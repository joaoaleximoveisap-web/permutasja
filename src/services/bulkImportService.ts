const FIRECRAWL_API_KEY = import.meta.env.VITE_FIRECRAWL_API_KEY;

// ============================================
// PHASE 1: SCAN LISTING PAGE FOR PROPERTY URLS
// ============================================
export async function scanListingPage(url: string): Promise<string[]> {
  if (!FIRECRAWL_API_KEY) {
    throw new Error('VITE_FIRECRAWL_API_KEY não configurada');
  }

  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
    },
    body: JSON.stringify({
      url,
      formats: ['links', 'html'],
      waitFor: 5000
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Firecrawl scan error:', response.status, errorText);
    
    if (response.status === 402) {
      throw new Error('Créditos do Firecrawl esgotados. Verifique seu plano.');
    } else if (response.status === 429) {
      throw new Error('Muitas requisições ao Firecrawl. Aguarde um momento.');
    } else if (response.status === 401) {
      throw new Error('Chave da API do Firecrawl inválida.');
    }
    throw new Error(`Erro ao acessar a página (${response.status})`);
  }

  const result = await response.json();
  
  // Extract property links
  const allLinks: string[] = result?.data?.links || [];
  
  const propertyPatterns = [
    '/imovel', '/imoveis', '/property', '/properties',
    '/listing', '/detalhe', '/detail',
    '/apartamento', '/casa', '/terreno', '/comercial',
    '/empreendimento', '/residencial', '/lancamento'
  ];
  
  const baseUrl = new URL(url).origin;
  
  const propertyUrls = allLinks
    .map(link => {
      // Handle relative URLs
      if (link.startsWith('/')) return baseUrl + link;
      if (!link.startsWith('http')) return baseUrl + '/' + link;
      return link;
    })
    .filter(link => {
      const lower = link.toLowerCase();
      // Must match at least one property pattern
      return propertyPatterns.some(p => lower.includes(p));
    })
    .filter(link => {
      const lower = link.toLowerCase();
      // Reject non-property pages
      return ![
        '/blog', '/sobre', '/contato', '/equipe',
        '/login', '/cadastro', '/busca', '/search',
        '/politica', '/termos', '/faq'
      ].some(p => lower.includes(p));
    });
  
  // Deduplicate
  const unique = [...new Set(propertyUrls)];
  
  return unique;
}

// ============================================
// PHASE 2: EXTRACT SINGLE PROPERTY DATA
// ============================================
export async function extractPropertyData(propertyUrl: string) {
  if (!FIRECRAWL_API_KEY) {
    throw new Error('VITE_FIRECRAWL_API_KEY não configurada');
  }
  
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
    },
    body: JSON.stringify({
      url: propertyUrl,
      formats: ['extract', 'links', 'html'],
      waitFor: 4000,
      extract: {
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            price: { type: 'string' },
            area: { type: 'string' },
            bedrooms: { type: 'string' },
            bathrooms: { type: 'string' },
            parking: { type: 'string' },
            location: { type: 'string' },
            description: { type: 'string' },
            images: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        prompt: 'Extraia os dados do imóvel desta página de listagem brasileira. Obtenha: título, preço em R$, área em m², quartos, banheiros, vagas, localização/endereço completo, descrição e TODAS as URLs das fotos do imóvel (alta resolução, não miniaturas ou logotipos).'
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Firecrawl extraction error:', response.status, errorText);
    
    if (response.status === 402) {
      throw new Error('Créditos esgotados');
    } else if (response.status === 429) {
      throw new Error('Limite de taxa excedido');
    }
    throw new Error(`Falha na extração (${response.status})`);
  }

  const result = await response.json();
  const extracted = result?.data?.extract;

  if (!extracted) {
    throw new Error('Nenhum dado extraído');
  }

  // Filter images
  if (extracted.images) {
    extracted.images = extracted.images.filter((img: string) => {
      const low = img.toLowerCase();
      return (
        img.startsWith('http') &&
        !low.includes('thumb') &&
        !low.includes('icon') &&
        !low.includes('logo') &&
        !low.includes('sprite') &&
        !low.includes('placeholder') &&
        !low.includes('.svg') &&
        !low.includes('.gif') &&
        !low.includes('.ico') &&
        !low.includes('1x1')
      );
    });
  }

  return {
    title: extracted.title || '',
    price: extracted.price || 'Consulte',
    area: extracted.area || '',
    bedrooms: extracted.bedrooms || '',
    bathrooms: extracted.bathrooms || '',
    parking: extracted.parking || '',
    location: extracted.location || '',
    description: extracted.description || '',
    images: extracted.images || [],
    source_url: propertyUrl
  };
}

// ============================================
// PHASE 3: ORCHESTRATE BULK IMPORT
// ============================================
export async function orchestrateBulkImport(
  urls: string[],
  onProgress: (done: number, total: number, current: any) => void,
  onError: (url: string, error: string) => void
) {
  const results: any[] = [];
  const total = urls.length;
  const DELAY_BETWEEN = 2000; // ms

  for (let i = 0; i < total; i++) {
    const url = urls[i];
    
    try {
      const data = await extractPropertyData(url);
      
      // Validate minimum requirements
      if (!data.title || data.title.length < 3) {
        onError(url, 'Título não encontrado');
        continue;
      }
      
      // Check duplicate by title in current batch
      const isDuplicate = results.some(
        r => r.title.toLowerCase() === data.title.toLowerCase()
      );
      
      if (isDuplicate) {
        onError(url, 'Duplicado');
        continue;
      }
      
      results.push(data);
      onProgress(results.length, total, data);
      
    } catch (err: any) {
      onError(url, err.message || 'Erro desconhecido');
    }
    
    // Rate limiting delay
    if (i < total - 1) {
      await new Promise(r => setTimeout(r, DELAY_BETWEEN));
    }
  }
  
  return results;
}
