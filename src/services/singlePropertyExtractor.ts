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
            area: { type: 'string' },
            bedrooms: { type: 'string' },
            suites: { type: 'string' },
            bathrooms: { type: 'string' },
            parking: { type: 'string' },
            location: { type: 'string' },
            address: { type: 'string' },
            condominium_fee: { type: 'string' },
            description: { type: 'string' },
            features: { type: 'array', items: { type: 'string' } },
            property_code: { type: 'string' }
          }
        },
        prompt: 'Extract real estate property data from this Brazilian listing page. Get title, price in R$, area in m², bedrooms (quartos), suites (suítes), bathrooms (banheiros), parking (vagas), full address, condo fee, description, features list, and property reference code.'
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Firecrawl error ${response.status}: ${errorText}`)
  }

  const result = await response.json()
  const textData = result?.data?.extract || {}
  const html = result?.data?.html || ''

  // Parse REAL images from HTML
  let images = extractRealImagesFromHTML(html, url)

  // ALSO try fallback if zero images
  if (images.length === 0) {
    console.log('Zero images from HTML, trying CORS fallback...')
    try {
      const corsProxies = [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?'
      ]
      for (const proxy of corsProxies) {
        try {
          const res = await fetch(proxy + encodeURIComponent(url), {
            signal: AbortSignal.timeout(10000)
          })
          if (res.ok) {
            const fallbackHtml = await res.text()
            const fallbackImages = extractRealImagesFromHTML(fallbackHtml, url)
            if (fallbackImages.length > 0) {
              images = fallbackImages
              break
            }
          }
        } catch { continue }
      }
    } catch {}
  }

  // DEBUG
  console.log('=== REAL IMAGES ===', images)
  if (images.length > 0) {
    alert('IMAGENS REAIS:\nTotal: ' + images.length + '\n' + images.slice(0, 3).join('\n'))
  }

  return {
    title: textData.title || extractTitleFromHTML(html) || '',
    price: textData.price || extractPriceFromHTML(html) || '',
    area: textData.area || '',
    bedrooms: textData.bedrooms || '',
    bathrooms: textData.bathrooms || '',
    parking: textData.parking || '',
    suites: textData.suites || '',
    location: textData.location || '',
    address: textData.address || '',
    description: textData.description || '',
    features: textData.features || [],
    images: images,
    source_url: url,
    property_code: textData.property_code
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
    images: extractRealImagesFromHTML(html, url),
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
