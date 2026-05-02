const FIRECRAWL_API_KEY = import.meta.env.VITE_FIRECRAWL_API_KEY

export interface ExtractedProperty {
  title: string
  price: string
  area: string
  areaTerreno?: string
  bedrooms: string
  bathrooms: string
  parking: string
  suites: string
  location: string
  address: string
  condoFee?: string
  description: string
  features: string[]
  images: string[]
  source_url: string
  property_code?: string
  propertyType?: string
}

/**
 * NEW: parsePropertyFromHTML function
 * This function replaces ALL AI extraction.
 * It reads structured data directly from HTML patterns.
 */
function parsePropertyFromHTML(html: string, sourceUrl: string): ExtractedProperty | null {
  if (!html) return null

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const bodyText = doc.body?.textContent || ''

  // Helper: get text from first matching selector
  const getText = (...selectors: string[]): string => {
    for (const sel of selectors) {
      try {
        const el = doc.querySelector(sel)
        if (el?.textContent?.trim()) return el.textContent.trim()
      } catch {}
    }
    return ''
  }

  // Helper: get meta content
  const getMeta = (prop: string): string => {
    const el = doc.querySelector(
      `meta[property="${prop}"], meta[name="${prop}"]`
    )
    return el?.getAttribute('content')?.trim() || ''
  }

  // ============ TITLE ============
  let title = ''
  // Try og:title first (most reliable)
  title = getMeta('og:title')
  // Then h1
  if (!title) title = getText('h1', '.property-title', '.titulo-imovel', 
    '[class*="title"]', '[class*="titulo"]')
  // Then page title (remove site name)
  if (!title) {
    const pageTitle = doc.querySelector('title')?.textContent || ''
    title = pageTitle.split('|')[0].split(' - ')[0].trim()
  }

  // ============ PRICE ============
  let price = ''
  // Try specific price elements first
  const priceSelectors = [
    '[class*="preco"]', '[class*="price"]', '[class*="valor"]',
    '[class*="Preco"]', '[class*="Price"]', '[class*="Valor"]',
    '.property-price', '.listing-price', '.imovel-preco',
    'h2[class*="preco"]', 'h2[class*="price"]',
    'span[class*="preco"]', 'span[class*="price"]',
    'div[class*="preco"]', 'div[class*="price"]',
    'p[class*="preco"]', 'p[class*="price"]'
  ]
  for (const sel of priceSelectors) {
    try {
      const el = doc.querySelector(sel)
      const text = el?.textContent?.trim() || ''
      if (text && text.includes('R$')) {
        price = text.match(/R\$\s*[\d.,]+/)?.[0] || text
        break
      }
    } catch {}
  }
  // Fallback: find largest R$ value in page (likely the sale price)
  if (!price) {
    const allPrices = bodyText.match(/R\$\s*[\d.,]+/g) || []
    if (allPrices.length > 0) {
      // Parse all prices, pick the largest (sale price, not condo fee)
      const parsed = allPrices.map(p => {
        const num = parseFloat(p.replace(/R\$\s*/, '').replace(/\./g, '').replace(',', '.'))
        return { text: p, value: num }
      }).filter(p => !isNaN(p.value))
      parsed.sort((a, b) => b.value - a.value)
      price = parsed[0]?.text || ''
    }
  }

  // ============ AREA ============
  let area = ''
  let areaTerreno = ''
  // Look for labeled area fields
  const areaPatterns = [
    /(?:área\s*(?:útil|construída|privativa|total))\s*[:\s]*(\d+[\d.,]*\s*m²)/gi,
    /(\d+[\d.,]*\s*m²)\s*(?:útil|construída|privativa)/gi,
    /(\d+)\s*m²/gi
  ]
  for (const pattern of areaPatterns) {
    const matches = [...bodyText.matchAll(pattern)]
    if (matches.length > 0) {
      // First match is usually the built area
      area = matches[0][1]?.includes('m²') ? matches[0][1] : matches[0][1] + ' m²'
      // If there's a second, it might be land area
      if (matches.length > 1 && !areaTerreno) {
        areaTerreno = matches[1][1]?.includes('m²') ? matches[1][1] : matches[1][1] + ' m²'
      }
      break
    }
  }

  // ============ BEDROOMS ============
  let bedrooms = ''
  const bedroomPatterns = [
    /(\d+)\s*(?:quarto|dormitório|dorm)/gi,
    /(?:quarto|dormitório|dorm)[^\d]*(\d+)/gi
  ]
  for (const p of bedroomPatterns) {
    const m = p.exec(bodyText)
    if (m) { bedrooms = m[1]; break }
  }

  // ============ SUITES ============
  let suites = ''
  const suitePatterns = [
    /(\d+)\s*suíte/gi,
    /suíte[^\d]*(\d+)/gi
  ]
  for (const p of suitePatterns) {
    const m = p.exec(bodyText)
    if (m) { suites = m[1]; break }
  }

  // ============ BATHROOMS ============
  let bathrooms = ''
  const bathPatterns = [
    /(\d+)\s*(?:banheiro|banh|wc)/gi,
    /(?:banheiro|banh)[^\d]*(\d+)/gi
  ]
  for (const p of bathPatterns) {
    const m = p.exec(bodyText)
    if (m) { bathrooms = m[1]; break }
  }

  // ============ PARKING ============
  let parking = ''
  const parkPatterns = [
    /(\d+)\s*vaga/gi,
    /vaga[^\d]*(\d+)/gi
  ]
  for (const p of parkPatterns) {
    const m = p.exec(bodyText)
    if (m) { parking = m[1]; break }
  }

  // ============ LOCATION ============
  let location = ''
  // og:locality or region
  location = getMeta('og:locality') || getMeta('og:region')
  // Try address selectors
  if (!location) {
    location = getText(
      '[class*="endereco"]', '[class*="address"]',
      '[class*="localizacao"]', '[class*="location"]',
      '[class*="Endereco"]', '[class*="Address"]',
      'address'
    )
  }
  // Try og:title split (often "Tipo em Bairro - Cidade/UF")
  if (!location && title) {
    const parts = title.split(' - ')
    if (parts.length > 1) location = parts[parts.length - 1].trim()
  }
  // Fallback: find city/state pattern
  if (!location) {
    const cityMatch = bodyText.match(
      /(?:Londrina|Sertaneja|Cambé|Ibiporã|Rolândia|Maringá|Curitiba|São Paulo)[^\n]*\/\s*(?:PR|SP|RJ|MG|SC|RS|BA|GO|DF)/i
    )
    if (cityMatch) location = cityMatch[0].trim()
  }

  // ============ CONDO FEE ============
  let condoFee = ''
  const condoMatch = bodyText.match(/condomínio\s*R?\$?\s*([\d.,]+)/i)
  if (condoMatch) condoFee = 'R$ ' + condoMatch[1]

  // ============ DESCRIPTION ============
  let description = ''
  description = getText(
    '[class*="descricao"]', '[class*="description"]',
    '[class*="detalhe"]', '[class*="detail"]',
    '[class*="Descricao"]', '[class*="Description"]',
    '.property-description', '.listing-description',
    'article', '.text-content'
  )
  // Limit length
  if (description.length > 1000) description = description.substring(0, 1000) + '...'

  // ============ PROPERTY CODE ============
  let propertyCode = ''
  const codeMatch = bodyText.match(
    /(?:código|cod|ref|referência)[.:\s]*([A-Z]{2}\d+[-]?[A-Z]*)/i
  )
  if (codeMatch) propertyCode = codeMatch[1]
  // Try from URL
  if (!propertyCode) {
    const urlCode = sourceUrl.match(/\/([A-Z]{2}\d+[-][A-Z]+)$/i)
    if (urlCode) propertyCode = urlCode[1]
  }

  // ============ PROPERTY TYPE ============
  let propertyType = ''
  const typeMatch = title.match(
    /^(casa|apartamento|terreno|sobrado|kitnet|studio|loja|sala|galpão|chácara|sítio|fazenda|cobertura|flat)/i
  )
  if (typeMatch) propertyType = typeMatch[1]
  // From URL
  if (!propertyType) {
    const urlType = sourceUrl.match(
      /\/(casa|apartamento|terreno|sobrado|kitnet|comercial|rural)/i
    )
    if (urlType) propertyType = urlType[1]
  }

  // ============ FEATURES / AMENITIES ============
  const features: string[] = []
  const featureSelectors = [
    '[class*="caracteristica"]', '[class*="feature"]',
    '[class*="amenit"]', '[class*="comodidade"]',
    'ul[class*="feature"] li', 'ul[class*="caracteristica"] li'
  ]
  for (const sel of featureSelectors) {
    try {
      doc.querySelectorAll(sel).forEach(el => {
        const text = el.textContent?.trim()
        if (text && text.length > 2 && text.length < 50) {
          features.push(text)
        }
      })
      if (features.length > 0) break
    } catch {}
  }

  // ============ IMAGES (existing function) ============
  const images = extractRealImagesFromHTML(html, sourceUrl)
  const finalImages = images.slice(0, 30)

  return {
    title: title || 'Não encontrado',
    price: price || 'Não encontrado',
    area: area || 'Não encontrado',
    areaTerreno,
    bedrooms: bedrooms || '0',
    suites: suites || '0',
    bathrooms: bathrooms || '0',
    parking: parking || '0',
    location: location || 'Não encontrado',
    address: location || 'Não encontrado',
    condoFee,
    description: description || 'Não encontrado',
    property_code: propertyCode,
    propertyType,
    features,
    images: finalImages,
    source_url: sourceUrl
  }
}

/**
 * METHOD 1: Firecrawl (Scrape only)
 */
async function extractWithFirecrawl(url: string): Promise<ExtractedProperty> {
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
    },
    body: JSON.stringify({
      url,
      formats: ['html'],
      waitFor: 5000
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Firecrawl error ${response.status}: ${errorText}`)
  }

  const result = await response.json()
  const html = result?.data?.html || ''

  if (!html) {
    throw new Error('Firecrawl retornou HTML vazio')
  }

  const property = parsePropertyFromHTML(html, url)
  if (!property) {
    throw new Error('Falha ao processar o HTML da página')
  }

  return property
}

/**
 * METHOD 2: Browser-side Fallback
 */
async function fallbackExtraction(url: string): Promise<ExtractedProperty> {
  const corsProxies = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
  ]

  let html = ''
  
  for (const proxy of corsProxies) {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000)
      
      const res = await fetch(proxy + encodeURIComponent(url), {
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      
      if (res.ok) {
        html = await res.text()
        break
      }
    } catch (e) {
      console.warn(`Proxy ${proxy} failed:`, e)
      continue
    }
  }

  if (!html) {
    throw new Error('Não foi possível acessar a página através dos proxies')
  }

  const property = parsePropertyFromHTML(html, url)
  if (!property) {
    throw new Error('Falha ao processar o HTML da página (fallback)')
  }

  return property
}

/**
 * COMBINE BOTH METHODS
 */
export async function extractSingleProperty(url: string): Promise<ExtractedProperty> {
  let property: ExtractedProperty | null = null
  let method = 'firecrawl'

  try {
    // 1. Try Firecrawl
    property = await extractWithFirecrawl(url)
  } catch (firecrawlError) {
    console.warn('Firecrawl failed:', firecrawlError)
    // 2. Firecrawl failed completely, try fallback
    try {
      property = await fallbackExtraction(url)
      method = 'fallback'
    } catch (fallbackError) {
      console.error('Extraction failed completely:', fallbackError)
      throw new Error('Não foi possível extrair dados desta página.')
    }
  }

  console.log(`Extraction method: ${method}`)
  console.log(`Images found: ${property.images.length}`)
  
  return property
}

/**
 * SHARED UTILS
 */

function extractRealImagesFromHTML(html: string, sourceUrl: string): string[] {
  if (!html) return []
  
  const baseUrl = new URL(sourceUrl).origin
  const found: string[] = []

  // 1. img src attributes
  const imgSrc = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)
  for (const m of imgSrc) found.push(m[1])

  // 2. data-src (lazy loading)
  const dataSrc = html.matchAll(/data-src=["']([^"']+)["']/gi)
  for (const m of dataSrc) found.push(m[1])

  // 3. data-lazy / data-original
  const dataLazy = html.matchAll(/data-(?:lazy|original|lazy-src)=["']([^"']+)["']/gi)
  for (const m of dataLazy) found.push(m[1])

  // 4. srcset — pick largest
  const srcsets = html.matchAll(/srcset=["']([^"']+)["']/gi)
  for (const m of srcsets) {
    const parts = m[1].split(',').map(s => s.trim())
    // Get last entry (usually highest res)
    const last = parts[parts.length - 1]?.split(/\s+/)[0]
    if (last) found.push(last)
  }

  // 5. background-image CSS
  const bgImages = html.matchAll(/background-image:\s*url\(["']?([^"')]+)["']?\)/gi)
  for (const m of bgImages) found.push(m[1])

  // 6. og:image meta
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
  if (ogMatch) found.push(ogMatch[1])

  // 7. Also try reverse order (content before property)
  const ogMatch2 = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  if (ogMatch2) found.push(ogMatch2[1])

  // 8. JSON-LD image data
  const jsonLdBlocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)
  for (const block of jsonLdBlocks) {
    try {
      const data = JSON.parse(block[1])
      const extractJsonImages = (obj: any) => {
        if (!obj) return
        if (typeof obj.image === 'string') found.push(obj.image)
        if (Array.isArray(obj.image)) obj.image.forEach((i: any) => {
          if (typeof i === 'string') found.push(i)
          else if (i?.url) found.push(i.url)
        })
        if (obj.image?.url) found.push(obj.image.url)
        if (obj.photo) {
          const photos = Array.isArray(obj.photo) ? obj.photo : [obj.photo]
          photos.forEach((p: any) => {
            if (typeof p === 'string') found.push(p)
            else if (p?.contentUrl) found.push(p.contentUrl)
          })
        }
      }
      extractJsonImages(data)
      if (Array.isArray(data)) data.forEach(extractJsonImages)
      if (data['@graph']) data['@graph'].forEach(extractJsonImages)
    } catch {}
  }

  // 9. Direct image file links
  const imageLinks = html.matchAll(/["'](https?:\/\/[^"'\s]+\.(?:jpg|jpeg|png|webp)[^"'\s]*)["']/gi)
  for (const m of imageLinks) found.push(m[1])

  // =====================
  // PROCESS & CLEAN
  // =====================
  const processed = found
    // Make absolute URLs
    .map(url => {
      if (url.startsWith('//')) return 'https:' + url
      if (url.startsWith('/')) return baseUrl + url
      if (!url.startsWith('http')) return baseUrl + '/' + url
      return url
    })
    // Must be valid URL format
    .filter(url => {
      try { new URL(url); return true } catch { return false }
    })
    // Must look like an image
    .filter(url => {
      const low = url.toLowerCase()
      return (
        low.includes('.jpg') || low.includes('.jpeg') ||
        low.includes('.png') || low.includes('.webp') ||
        low.includes('/image') || low.includes('/photo') ||
        low.includes('/foto') || low.includes('/img') ||
        low.includes('/upload') || low.includes('/media') ||
        low.includes('cloudinary') || low.includes('amazonaws') ||
        low.includes('cdn') || low.includes('imgix') ||
        low.includes('arbo') || low.includes('jetimob') ||
        low.includes('vista') || low.includes('kenlo')
      )
    })
    // REJECT trash
    .filter(url => {
      const low = url.toLowerCase()
      return !(
        low.includes('logo') || low.includes('icon') ||
        low.includes('favicon') || low.includes('avatar') ||
        low.includes('sprite') || low.includes('placeholder') ||
        low.includes('blank') || low.includes('spacer') ||
        low.includes('.svg') || low.includes('.gif') ||
        low.includes('.ico') || low.includes('1x1') ||
        low.includes('whatsapp') || low.includes('facebook') ||
        low.includes('instagram') || low.includes('twitter') ||
        low.includes('linkedin') || low.includes('youtube') ||
        low.includes('google') || low.includes('maps.') ||
        low.includes('staticmap') || low.includes('map-') ||
        low.includes('corretor') || low.includes('agente') ||
        low.includes('agent') || low.includes('broker') ||
        low.includes('banner-site') || low.includes('header-bg') ||
        low.includes('footer') || low.includes('selo') ||
        low.includes('badge') || low.includes('watermark') ||
        low.includes('loading') || low.includes('spinner')
      )
    })
    // REJECT tiny images by URL pattern
    .filter(url => {
      // Reject dimensions below 200px in URL
      const tinyMatch = url.match(/[\/_-](\d+)x(\d+)/i)
      if (tinyMatch) {
        const w = parseInt(tinyMatch[1])
        const h = parseInt(tinyMatch[2])
        if (w < 200 || h < 200) return false
      }
      return true
    })
    // Upgrade resolution where possible
    .map(url => {
      return url
        .replace(/\/thumb\//, '/full/')
        .replace(/\/thumbs\//, '/photos/')
        .replace(/\/small\//, '/large/')
        .replace(/\/medium\//, '/large/')
        .replace(/-thumb\./gi, '-large.')
        .replace(/_thumb\./gi, '_large.')
        .replace(/-small\./gi, '-large.')
        .replace(/_small\./gi, '_large.')
        .replace(/-medium\./gi, '-large.')
        .replace(/\?w=\d+/gi, '?w=1200')
        .replace(/\?width=\d+/gi, '?width=1200')
    })

  // DEDUPLICATE by normalized URL
  const seen = new Set<string>()
  const deduped = processed.filter(url => {
    const key = url.replace(/\?.*$/, '').replace(/\/+$/, '').toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return deduped
}
