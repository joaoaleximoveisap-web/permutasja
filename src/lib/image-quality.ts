/**
 * Image quality utilities — Modules 11 & 12
 * - Upgrade image URLs to highest available resolution
 * - Detect resolution & quality tier
 * - Optional realistic sharpening (canvas, no color changes)
 */

/**
 * Try to rewrite known thumbnail/resize patterns into the highest-resolution variant.
 * NEVER fabricates a URL that is unlikely to exist — only known safe transforms.
 */
export function upgradeImageUrl(rawUrl: string): string {
  if (!rawUrl) return rawUrl;
  let url = rawUrl;

  try {
    // Strip width/height query params (?w=300&h=200 → original)
    const u = new URL(url);
    const sizeKeys = ["w", "h", "width", "height", "resize", "quality", "q", "fit", "size"];
    let changed = false;
    sizeKeys.forEach((k) => {
      if (u.searchParams.has(k)) {
        u.searchParams.delete(k);
        changed = true;
      }
    });
    if (changed) url = u.toString().replace(/\?$/, "");
  } catch {
    // not a parseable URL, fall through to regex transforms
  }

  // Path patterns: /thumb/, /thumbs/, /small/, /medium/ → /large/ or /original/
  url = url
    .replace(/\/thumbs?\//gi, "/")
    .replace(/\/small\//gi, "/large/")
    .replace(/\/medium\//gi, "/large/")
    .replace(/\/_thumb\//gi, "/")
    .replace(/_thumb(\.[a-z]+)$/i, "$1")
    .replace(/_small(\.[a-z]+)$/i, "$1")
    .replace(/_medium(\.[a-z]+)$/i, "$1")
    .replace(/-thumbnail(\.[a-z]+)$/i, "$1")
    // -300x200.jpg style (WordPress)
    .replace(/-\d{2,4}x\d{2,4}(\.[a-z]+)$/i, "$1");

  // Cloudinary: /w_300,h_200/ or /c_fill,w_300/ → /w_1600/
  url = url.replace(/\/(w|h|c|q|f|dpr)_[^/]+\//gi, (m) => {
    if (m.includes("w_") || m.includes("h_")) return "/w_1600/";
    return "/";
  });

  // Imgix / common resize params already handled above via searchParams.

  return url;
}

/**
 * Returns BOTH the upgraded (display) and the original URL so we never lose source.
 */
export function pickImageVariants(rawUrl: string): { display: string; original: string } {
  return { display: upgradeImageUrl(rawUrl), original: rawUrl };
}

export type QualityTier = "low" | "medium" | "high";

export type ImageQuality = {
  width: number;
  height: number;
  tier: QualityTier;
};

/** Load an image and return its natural dimensions + quality tier. */
export function inspectImage(src: string, timeoutMs = 6000): Promise<ImageQuality | null> {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;
    const finish = (v: ImageQuality | null) => {
      if (done) return;
      done = true;
      resolve(v);
    };
    const t = setTimeout(() => finish(null), timeoutMs);
    img.crossOrigin = "anonymous";
    img.onload = () => {
      clearTimeout(t);
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const minSide = Math.min(w, h);
      const tier: QualityTier =
        minSide >= 900 ? "high" : minSide >= 500 ? "medium" : "low";
      finish({ width: w, height: h, tier });
    };
    img.onerror = () => {
      clearTimeout(t);
      finish(null);
    };
    img.src = src;
  });
}

/**
 * Apply a VERY subtle sharpen using a 3x3 convolution.
 * - No color change (operates per-channel symmetrically)
 * - Mild strength (amount ~0.25)
 * - Returns a data URL (PNG to avoid extra compression artifacts)
 * If the source can't be read (CORS), returns null and caller MUST fallback to original.
 */
export async function subtleSharpen(src: string, amount = 0.25): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const out = ctx.createImageData(canvas.width, canvas.height);
        const a = amount;
        // Kernel: mild unsharp-like
        // [ 0, -a,  0,
        //  -a, 1+4a,-a,
        //   0, -a,  0 ]
        const k = [0, -a, 0, -a, 1 + 4 * a, -a, 0, -a, 0];
        const w = canvas.width;
        const h = canvas.height;
        const src32 = imgData.data;
        const dst32 = out.data;
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            for (let c = 0; c < 3; c++) {
              let sum = 0;
              let ki = 0;
              for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                  const idx = ((y + ky) * w + (x + kx)) * 4 + c;
                  sum += src32[idx] * k[ki++];
                }
              }
              const di = (y * w + x) * 4 + c;
              dst32[di] = Math.max(0, Math.min(255, sum));
            }
            const ai = (y * w + x) * 4 + 3;
            dst32[ai] = src32[ai];
          }
        }
        // Copy borders untouched
        for (let i = 0; i < src32.length; i += 4) {
          if (dst32[i + 3] === 0 && src32[i + 3] !== 0) {
            dst32[i] = src32[i];
            dst32[i + 1] = src32[i + 1];
            dst32[i + 2] = src32[i + 2];
            dst32[i + 3] = src32[i + 3];
          }
        }
        ctx.putImageData(out, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
