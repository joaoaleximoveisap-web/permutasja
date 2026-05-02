const FIRECRAWL_API_KEY = import.meta.env.VITE_FIRECRAWL_API_KEY

export interface ExtractedProperty {
  title: string
  price: string
  area: string
  bedrooms: string
  bathrooms: string
  parking: string
  suites: string
  location: string
  address: string
  description: string
  features: string[]
  images: string[]
  source_url: string
  property_code?: string
}

/**
 * METHOD 1: Firecrawl (Enhanced)
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
      formats: ['extract', 'html', 'markdown', 'screenshot'],
      waitFor: 6000,
      timeout: 30000,
      skipTlsVerification: false,
      removeBase64Images: false,
      actions: [
        { type: 'wait', milliseconds: 3000 },
        { type: 'scroll', direction: 'down', amount: 2000 },
        { type: 'wait', milliseconds: 2000 },
        { type: 'scroll', direction: 'down', amount: 2000 },
        { type: 'wait', milliseconds: 1000 },
        { type: 'scroll', direction: 'up', amount: 5000 },
        { type: 'wait', milliseconds: 1000 }
      ],
      extract: {
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            price: { type: 'string' },
            area_util: { type: 'string' },
            area_total: { type: 'string' },
            bedrooms: { type: 'string' },
            suites: { type: 'string' },
            bathrooms: { type: 'string' },
            parking: { type: 'string' },
            location: { type: 'string' },
            address: { type: 'string' },
            condominium_fee: { type: 'string' },
            description: { type: 'string' },
            features: { type: 'array', items: { type: 'string' } },
            property_code: { type: 'string' },
            images: { type: 'array', items: { type: 'string' } }
          }
        },
        prompt: `Extract ALL data from this Brazilian real estate listing.
CRITICAL FOR IMAGES: Find EVERY property photo URL. 
Look in: img tags, data-src, srcset, background-image, 
galleries, carousels, lightbox containers, swiper slides.
Get the HIGHEST resolution version. 
Reject: logos, icons, agent photos, maps, social media icons.
Return full absolute URLs starting with https://`
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Firecrawl error ${response.status}: ${errorText}`)
  }

  const result = await response.json()
  const data = result?.data?.extract
  const html = result?.data?.html || ''

  // Deep image extraction from HTML as backup for Firecrawl's extraction
  const additionalImages = extractImagesFromHTML(html, url)
  const allImages = [
    ...(data?.images || []),
    ...additionalImages
  ]

  return {
    title: data?.title || extractTitleFromHTML(html) || '',
    price: data?.price || extractPriceFromHTML(html) || '',
    area: data?.area_util || data?.area_total || '',
    bedrooms: data?.bedrooms || '',
    bathrooms: data?.bathrooms || '',
    parking: data?.parking || '',
    suites: data?.suites || '',
    location: data?.location || '',
    address: data?.address || '',
    description: data?.description || '',
    features: data?.features || [],
    images: processImages(allImages, url),
    source_url: url,
    property_code: data?.property_code
  }
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

  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const baseUrl = new URL(url).origin

  // ---- EXTRACT IMAGES ----
  const images: string[] = []
  
  doc.querySelectorAll('img').forEach(img => {
    const src = img.getAttribute('src') 
      || img.getAttribute('data-src')
      || img.getAttribute('data-lazy')
      || img.getAttribute('data-original')
    if (src) images.push(src)
    
    const srcset = img.getAttribute('srcset')
    if (srcset) {
      const parts = srcset.split(',').map(s => s.trim())
      const last = parts[parts.length - 1]?.split(/\s+/)[0]
      if (last) images.push(last)
    }
  })

  doc.querySelectorAll('[style*="background"]').forEach(el => {
    const style = el.getAttribute('style') || ''
    const match = style.match(/url\(["']?([^"')]+)["']?\)/)
    if (match) images.push(match[1])
  })

  const ogImage = doc.querySelector('meta[property="og:image"]')
  if (ogImage) {
    const content = ogImage.getAttribute('content')
    if (content) images.push(content)
  }

  doc.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
    try {
      const data = JSON.parse(script.textContent || '')
      if (data.image) {
        if (Array.isArray(data.image)) images.push(...data.image)
        else if (typeof data.image === 'string') images.push(data.image)
        else if (data.image.url) images.push(data.image.url)
      }
      if (data.photo) {
        const photos = Array.isArray(data.photo) ? data.photo : [data.photo]
        photos.forEach((p: any) => {
          if (typeof p === 'string') images.push(p)
          else if (p?.contentUrl) images.push(p.contentUrl)
          else if (p?.url) images.push(p.url)
        })
      }
    } catch {}
  })

  doc.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href') || ''
    if (/\.(jpg|jpeg|png|webp)/i.test(href)) {
      images.push(href)
    }
  })

  // ---- EXTRACT TEXT DATA ----
  const getText = (selectors: string[]): string => {
    for (const sel of selectors) {
      const el = doc.querySelector(sel)
      if (el?.textContent?.trim()) return el.textContent.trim()
    }
    return ''
  }

  const title = getText(['h1', 'meta[property="og:title"]', 'title'])

  let price = ''
  const priceEl = doc.querySelector('[class*="preco"], [class*="price"], [class*="valor"]')
  if (priceEl) {
    price = priceEl.textContent?.trim() || ''
  }
  if (!price) {
    const bodyText = doc.body?.textContent || ''
    const priceMatch = bodyText.match(/R\$\s*[\d.,]+/)
    if (priceMatch) price = priceMatch[0]
  }

  const bodyContent = doc.body?.textContent || ''
  const areaMatch = bodyContent.match(/(\d+)\s*m²/i)
  const bedroomMatch = bodyContent.match(/(\d+)\s*(?:quarto|dormitório|dorm)/i)
  const bathMatch = bodyContent.match(/(\d+)\s*(?:banheiro|banh)/i)
  const parkMatch = bodyContent.match(/(\d+)\s*vaga/i)
  const suiteMatch = bodyContent.match(/(\d+)\s*suíte/i)

  const location = getText([
    '[class*="endereco"]', '[class*="address"]',
    '[class*="localizacao"]', '[class*="location"]',
    'meta[property="og:street-address"]'
  ])

  const description = getText([
    '[class*="descricao"]', '[class*="description"]',
    '[class*="detalhe"]', '[class*="detail"]'
  ])

  return {
    title,
    price,
    area: areaMatch ? areaMatch[0] : '',
    bedrooms: bedroomMatch ? bedroomMatch[1] : '',
    bathrooms: bathMatch ? bathMatch[1] : '',
    parking: parkMatch ? parkMatch[1] : '',
    suites: suiteMatch ? suiteMatch[1] : '',
    location,
    address: location,
    description: description.substring(0, 1000),
    features: [],
    images: processImages(images, url),
    source_url: url
  }
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
    
    // 2. Check if extraction was poor
    if (!property.images || property.images.length === 0) {
      console.log('Firecrawl returned 0 images, trying fallback...')
      const fallback = await fallbackExtraction(url)
      
      if (fallback.images.length > 0) {
        property.images = fallback.images
        method = 'firecrawl+fallback'
      }
      
      if (!property.title && fallback.title) property.title = fallback.title
      if (!property.price && fallback.price) property.price = fallback.price
      if (!property.description && fallback.description) property.description = fallback.description
    }
  } catch (firecrawlError) {
    console.warn('Firecrawl failed:', firecrawlError)
    // 3. Firecrawl failed completely, try fallback
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

function extractImagesFromHTML(html: string, sourceUrl: string): string[] {
  const images: string[] = []
  if (!html) return images

  const imgSrcRegex = /<img[^>]+src=["']([^"']+)["']/gi
  const dataSrcRegex = /<img[^>]+data-src=["']([^"']+)["']/gi
  const dataLazyRegex = /data-lazy-src=["']([^"']+)["']/gi
  const dataOrigRegex = /data-original=["']([^"']+)["']/gi
  const bgRegex = /background-image:\s*url\(["']?([^"')]+)["']?\)/gi
  const ogRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi

  let match
  while ((match = imgSrcRegex.exec(html)) !== null) images.push(match[1])
  while ((match = dataSrcRegex.exec(html)) !== null) images.push(match[1])
  while ((match = dataLazyRegex.exec(html)) !== null) images.push(match[1])
  while ((match = dataOrigRegex.exec(html)) !== null) images.push(match[1])
  while ((match = bgRegex.exec(html)) !== null) images.push(match[1])
  while ((match = ogRegex.exec(html)) !== null) images.push(match[1])

  return images
}

function extractTitleFromHTML(html: string): string {
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match) return h1Match[1].trim()
  const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
  if (ogMatch) return ogMatch[1].trim()
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  if (titleMatch) return titleMatch[1].split('|')[0].split('-')[0].trim()
  return ''
}

function extractPriceFromHTML(html: string): string {
  const priceMatch = html.match(/R\$\s*[\d.,]+/i)
  return priceMatch ? priceMatch[0].trim() : ''
}

function processImages(rawImages: string[], sourceUrl: string): string[] {
  const baseUrl = new URL(sourceUrl).origin

  return rawImages
    .map(img => {
      if (img.startsWith('//')) return 'https:' + img
      if (img.startsWith('/')) return baseUrl + img
      if (!img.startsWith('http')) return baseUrl + '/' + img
      return img
    })
    .filter(img => {
      const low = img.toLowerCase()
      // Filter trash
      return !(
        low.includes('logo') || low.includes('icon') ||
        low.includes('favicon') || low.includes('avatar') ||
        low.includes('sprite') || low.includes('placeholder') ||
        low.includes('.svg') || low.includes('.gif') ||
        low.includes('.ico') || low.includes('1x1') ||
        low.includes('whatsapp') || low.includes('facebook') ||
        low.includes('instagram') || low.includes('google') ||
        low.includes('maps.') || low.includes('staticmap') ||
        low.includes('corretor') || low.includes('agent') ||
        low.includes('banner') || low.includes('selo') ||
        low.includes('badge') || low.includes('watermark')
      )
    })
    .map(upgradeImageResolution)
    .filter((img, i, arr) => {
      // Deduplicate
      const normalized = img.replace(/\?.*$/, '').toLowerCase()
      return arr.findIndex(x => x.replace(/\?.*$/, '').toLowerCase() === normalized) === i
    })
}

function upgradeImageResolution(url: string): string {
  return url
    .replace(/\/thumb\//i, '/full/')
    .replace(/\/small\//i, '/large/')
    .replace(/-thumb\./i, '-large.')
    .replace(/_thumb\./i, '_large.')
    .replace(/\?w=\d+/i, '?w=1200')
    .replace(/\/\d{2,3}x\d{2,3}\//i, '/1200x900/')
}
