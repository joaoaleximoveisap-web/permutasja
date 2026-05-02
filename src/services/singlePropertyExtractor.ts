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
}

export async function extractSingleProperty(url: string): Promise<ExtractedProperty> {

  // ==========================================
  // CALL 1: Extract structured data + HTML
  // ==========================================
  const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${FIRECRAWL_API_KEY}`
    },
    body: JSON.stringify({
      url,
      formats: ['extract', 'html', 'markdown'],
      waitFor: 5000,
      actions: [
        { type: 'wait', milliseconds: 2000 },
        { type: 'scroll', direction: 'down', amount: 1500 },
        { type: 'wait', milliseconds: 1500 },
        { type: 'scroll', direction: 'down', amount: 1500 },
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
            bathrooms: { type: 'string' },
            parking: { type: 'string' },
            suites: { type: 'string' },
            location: { type: 'string' },
            address: { type: 'string' },
            description: { type: 'string' },
            features: {
              type: 'array',
              items: { type: 'string' }
            },
            images: {
              type: 'array',
              items: { type: 'string' }
            }
          }
        },
        prompt: `You are extracting data from a Brazilian real estate property listing page.

Extract:
- title: the property name or listing title
- price: full price with R$ (if shows "Consulte" or hidden, return "Consulte")
- area: total area in m² (number + m²)
- bedrooms: number of bedrooms (quartos)
- bathrooms: number of bathrooms (banheiros)
- parking: number of parking spaces (vagas)
- suites: number of suites (suítes)
- location: neighborhood + city + state
- address: full street address if available
- description: full property description text (max 1000 chars)
- features: array of amenities/features (piscina, churrasqueira, etc)
- images: array of ALL property photo URLs

CRITICAL FOR IMAGES:
- Get EVERY property photo URL on the page
- Prefer the LARGEST version of each image
- If image URL has size params like ?w=400 or /400x300/, try to find the full URL
- Include gallery images, carousel images, slideshow images
- Include images loaded via data-src, data-lazy, data-original, srcset
- Do NOT include: logos, icons, agent photos, site headers, map screenshots
- Do NOT include thumbnails if full-size version exists
- Look inside image galleries, lightbox containers, swiper/slick carousels`
      }
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Firecrawl error ${response.status}: ${errorText}`)
  }

  const result = await response.json()
  const extracted = result?.data?.extract
  const html = result?.data?.html || ''

  // ==========================================
  // PHASE 2: DEEP IMAGE EXTRACTION FROM HTML
  // ==========================================
  // Firecrawl extract sometimes misses images
  // Parse HTML directly as backup

  const additionalImages = extractImagesFromHTML(html)
  
  // Merge images: Firecrawl extracted + HTML parsed
  const allImages = [
    ...(extracted?.images || []),
    ...additionalImages
  ]

  // ==========================================
  // PHASE 3: IMAGE PROCESSING PIPELINE
  // ==========================================
  const processedImages = processImages(allImages, url)

  return {
    title: extracted?.title || extractTitleFromHTML(html) || '',
    price: extracted?.price || extracted?.price_text || extractPriceFromHTML(html) || 'Consulte',
    area: extracted?.area || '',
    bedrooms: extracted?.bedrooms || '',
    bathrooms: extracted?.bathrooms || '',
    parking: extracted?.parking || '',
    suites: extracted?.suites || '',
    location: extracted?.location || '',
    address: extracted?.address || '',
    description: extracted?.description || '',
    features: extracted?.features || [],
    images: processedImages,
    source_url: url
  }
}

// ==========================================
// HTML IMAGE EXTRACTOR (BACKUP)
// ==========================================
function extractImagesFromHTML(html: string): string[] {
  const images: string[] = []
  
  if (!html) return images

  // 1. Regular img src
  const imgSrcRegex = /<img[^>]+src=["']([^"']+)["']/gi
  let match
  while ((match = imgSrcRegex.exec(html)) !== null) {
    images.push(match[1])
  }

  // 2. data-src (lazy loaded)
  const dataSrcRegex = /<img[^>]+data-src=["']([^"']+)["']/gi
  while ((match = dataSrcRegex.exec(html)) !== null) {
    images.push(match[1])
  }

  // 3. data-lazy-src
  const dataLazyRegex = /data-lazy-src=["']([^"']+)["']/gi
  while ((match = dataLazyRegex.exec(html)) !== null) {
    images.push(match[1])
  }

  // 4. data-original
  const dataOrigRegex = /data-original=["']([^"']+)["']/gi
  while ((match = dataOrigRegex.exec(html)) !== null) {
    images.push(match[1])
  }

  // 5. srcset (pick largest)
  const srcsetRegex = /srcset=["']([^"']+)["']/gi
  while ((match = srcsetRegex.exec(html)) !== null) {
    const srcset = match[1]
    const parts = srcset.split(',').map(s => s.trim())
    // Pick the last one (usually largest)
    if (parts.length > 0) {
      const largest = parts[parts.length - 1].split(/\s+/)[0]
      if (largest) images.push(largest)
    }
  }

  // 6. background-image in style
  const bgRegex = /background-image:\s*url\(["']?([^"')]+)["']?\)/gi
  while ((match = bgRegex.exec(html)) !== null) {
    images.push(match[1])
  }

  // 7. og:image meta tag
  const ogRegex = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/gi
  while ((match = ogRegex.exec(html)) !== null) {
    images.push(match[1])
  }

  // 8. JSON-LD structured data
  const jsonLdRegex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const jsonData = JSON.parse(match[1])
      if (jsonData.image) {
        if (Array.isArray(jsonData.image)) {
          images.push(...jsonData.image)
        } else if (typeof jsonData.image === 'string') {
          images.push(jsonData.image)
        } else if (jsonData.image.url) {
          images.push(jsonData.image.url)
        }
      }
      // Also check photo/photos
      if (jsonData.photo) {
        const photos = Array.isArray(jsonData.photo) ? jsonData.photo : [jsonData.photo]
        photos.forEach((p: any) => {
          if (typeof p === 'string') images.push(p)
          else if (p?.contentUrl) images.push(p.contentUrl)
          else if (p?.url) images.push(p.url)
        })
      }
    } catch (e) {
      // Invalid JSON-LD, skip
    }
  }

  return images
}

// ==========================================
// TITLE FALLBACK
// ==========================================
function extractTitleFromHTML(html: string): string {
  // Try h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
  if (h1Match) return h1Match[1].trim()
  
  // Try og:title
  const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
  if (ogMatch) return ogMatch[1].trim()
  
  // Try title tag (remove site name)
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
  if (titleMatch) {
    const title = titleMatch[1].split('|')[0].split('-')[0].trim()
    return title
  }
  
  return ''
}

// ==========================================
// PRICE FALLBACK
// ==========================================
function extractPriceFromHTML(html: string): string {
  // Look for R$ pattern
  const priceMatch = html.match(/R\$\s*[\d.,]+/i)
  if (priceMatch) return priceMatch[0].trim()
  return ''
}

// ==========================================
// IMAGE PROCESSING PIPELINE
// ==========================================
function processImages(rawImages: string[], sourceUrl: string): string[] {
  const baseUrl = new URL(sourceUrl).origin

  let images = rawImages
    // 1. Convert relative to absolute
    .map(img => {
      if (img.startsWith('//')) return 'https:' + img
      if (img.startsWith('/')) return baseUrl + img
      if (!img.startsWith('http')) return baseUrl + '/' + img
      return img
    })
    // 2. Remove non-image URLs
    .filter(img => {
      const low = img.toLowerCase()
      return (
        low.includes('.jpg') || low.includes('.jpeg') ||
        low.includes('.png') || low.includes('.webp') ||
        low.includes('image') || low.includes('photo') ||
        low.includes('foto') || low.includes('img') ||
        low.includes('upload') || low.includes('media') ||
        // Accept URLs without clear extension if they look like CDN
        low.includes('cloudinary') || low.includes('imgix') ||
        low.includes('amazonaws') || low.includes('cdn') ||
        low.includes('googleusercontent')
      )
    })
    // 3. Reject trash images
    .filter(img => {
      const low = img.toLowerCase()
      return !(
        low.includes('logo') ||
        low.includes('icon') ||
        low.includes('favicon') ||
        low.includes('avatar') ||
        low.includes('sprite') ||
        low.includes('placeholder') ||
        low.includes('blank.') ||
        low.includes('pixel.') ||
        low.includes('spacer') ||
        low.includes('loading') ||
        low.includes('.svg') ||
        low.includes('.gif') ||
        low.includes('.ico') ||
        low.includes('1x1') ||
        low.includes('banner-site') ||
        low.includes('watermark') ||
        low.includes('selo') ||
        low.includes('badge') ||
        low.includes('whatsapp') ||
        low.includes('facebook') ||
        low.includes('instagram') ||
        low.includes('twitter') ||
        low.includes('linkedin') ||
        low.includes('youtube') ||
        low.includes('google-map') ||
        low.includes('maps.google') ||
        low.includes('staticmap') ||
        low.includes('corretor') ||
        low.includes('agente') ||
        low.includes('broker') ||
        low.includes('agent')
      )
    })
    // 4. Reject small dimension URLs
    .filter(img => {
      const low = img.toLowerCase()
      // Reject if URL contains tiny dimensions
      const tinyPattern = /[/_-](5\d|[1-9]\d|1[0-4]\d|150)x/i
      return !tinyPattern.test(low)
    })

  // 5. Upgrade to high resolution
  images = images.map(upgradeImageResolution)

  // 6. Deduplicate
  const seen = new Set<string>()
  images = images.filter(img => {
    // Normalize for comparison
    const normalized = img
      .replace(/\?.*$/, '')  // remove query params
      .replace(/\/+$/, '')   // remove trailing slash
      .toLowerCase()
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return true
  })

  // 7. Sort: og:image pattern first, then by URL length (longer = more specific = better)
  images.sort((a, b) => {
    const aIsOg = a.includes('og') || a.includes('share') || a.includes('cover')
    const bIsOg = b.includes('og') || b.includes('share') || b.includes('cover')
    if (aIsOg && !bIsOg) return -1
    if (!aIsOg && bIsOg) return 1
    return 0
  })

  return images
}

// ==========================================
// IMAGE RESOLUTION UPGRADER
// ==========================================
function upgradeImageResolution(url: string): string {
  let upgraded = url

  // Width params
  upgraded = upgraded.replace(/[?&]w=\d+/gi, (m) => m.replace(/\d+/, '1200'))
  upgraded = upgraded.replace(/[?&]width=\d+/gi, (m) => m.replace(/\d+/, '1200'))
  upgraded = upgraded.replace(/[?&]h=\d+/gi, (m) => m.replace(/\d+/, '900'))
  upgraded = upgraded.replace(/[?&]height=\d+/gi, (m) => m.replace(/\d+/, '900'))
  
  // Size in path: /400x300/ → /1200x900/
  upgraded = upgraded.replace(/\/\d{2,3}x\d{2,3}\//g, '/1200x900/')
  
  // Named sizes
  upgraded = upgraded.replace(/-thumb\./gi, '-large.')
  upgraded = upgraded.replace(/-thumbnail\./gi, '-large.')
  upgraded = upgraded.replace(/-small\./gi, '-large.')
  upgraded = upgraded.replace(/-medium\./gi, '-large.')
  upgraded = upgraded.replace(/_thumb\./gi, '_large.')
  upgraded = upgraded.replace(/_small\./gi, '_large.')
  upgraded = upgraded.replace(/_medium\./gi, '_large.')
  upgraded = upgraded.replace(/\/thumb\//gi, '/full/')
  upgraded = upgraded.replace(/\/thumbs\//gi, '/photos/')
  upgraded = upgraded.replace(/\/small\//gi, '/large/')
  upgraded = upgraded.replace(/\/medium\//gi, '/large/')

  // Cloudinary transformations
  if (upgraded.includes('cloudinary')) {
    upgraded = upgraded.replace(/\/w_\d+/g, '/w_1200')
    upgraded = upgraded.replace(/\/h_\d+/g, '/h_900')
    upgraded = upgraded.replace(/\/c_thumb/g, '/c_fill')
    upgraded = upgraded.replace(/\/q_\d+/g, '/q_90')
  }

  // imgix
  if (upgraded.includes('imgix')) {
    upgraded = upgraded.replace(/[?&]w=\d+/g, '?w=1200')
    upgraded = upgraded.replace(/[?&]q=\d+/g, '&q=90')
  }

  return upgraded
}
