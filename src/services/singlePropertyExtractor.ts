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
function parsePropertyFromHTML(html: string, markdown: string, sourceUrl: string): ExtractedProperty | null {
  if (!html) return null

  const bodyText = markdown || ''

  // ============ TITLE ============
  let title = ''
  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
  if (ogTitleMatch) title = ogTitleMatch[1]
  if (!title) {
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    if (h1Match) title = h1Match[1].trim()
  }

  // ============ PRICE ============
  let price = ''
  const allPrices = bodyText.match(/R\$\s*[\d.,]+/g) || []
  if (allPrices.length > 0) {
    const parsed = allPrices.map(p => ({
      text: p,
      value: parseFloat(p.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'))
    })).filter(p => !isNaN(p.value) && p.value > 0)
    parsed.sort((a, b) => b.value - a.value)
    if (parsed[0]) price = parsed[0].text.trim()
  }

  // ============ AREA ============
  let area = ''
  const areaMatch = bodyText.match(/(\d+[\d.,]*)\s*m²/i)
  if (areaMatch) area = areaMatch[0]

  // ============ BEDROOMS ============
  let bedrooms = ''
  const bedMatch = bodyText.match(/(\d+)\s*(?:quarto|dormitório|dorm)/i)
  if (bedMatch) bedrooms = bedMatch[1]

  // ============ SUITES ============
  let suites = ''
  const suiteMatch = bodyText.match(/(\d+)\s*suíte/i)
  if (suiteMatch) suites = suiteMatch[1]

  // ============ BATHROOMS ============
  let bathrooms = ''
  const bathMatch = bodyText.match(/(\d+)\s*(?:banheiro|banh)/i)
  if (bathMatch) bathrooms = bathMatch[1]

  // ============ PARKING ============
  let parking = ''
  const parkMatch = bodyText.match(/(\d+)\s*vaga/i)
  if (parkMatch) parking = parkMatch[1]

  // ============ LOCATION ============
  let location = ''
  const locMatch = bodyText.match(/[A-ZÀ-Ú][a-zà-ú]+(?:\s[A-ZÀ-Ú][a-zà-ú]+)*\s*[-\/]\s*(?:PR|SP|RJ|MG|SC|RS|BA|GO|DF|CE|PE|ES)/i)
  if (locMatch) location = locMatch[0].trim()

  // ============ CONDO FEE ============
  let condoFee = ''
  const condoMatch = bodyText.match(/[Cc]ondomínio\s*R?\$?\s*([\d.,]+)/i)
  if (condoMatch) condoFee = 'R$ ' + condoMatch[1]

  // ============ DESCRIPTION ============
  let description = ''
  const descParts = bodyText.split(/descri[çc][ãa]o/i)
  if (descParts.length > 1) {
    description = descParts[1].substring(0, 800).trim()
  }

  // ============ PROPERTY CODE ============
  let propertyCode = ''
  const codeFromUrl = sourceUrl.match(/\/([A-Z]{2}\d+[-][A-Z]+)\/?$/i)
  if (codeFromUrl) propertyCode = codeFromUrl[1]

  // ============ PROPERTY TYPE ============
  let propertyType = ''
  const typeFromUrl = sourceUrl.match(/\/(casa|apartamento|terreno|sobrado|kitnet|comercial)/i)
  if (typeFromUrl) propertyType = typeFromUrl[1].charAt(0).toUpperCase() + typeFromUrl[1].slice(1)

  // ============ IMAGES ============
  const images = extractRealImagesFromHTML(html, sourceUrl)
  const finalImages = images.slice(0, 30)

  return {
    title: title || 'Não encontrado',
    price: price || 'Não encontrado',
    area: area || 'Não encontrado',
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
    features: [],
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
