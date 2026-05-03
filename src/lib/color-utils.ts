/**
 * Calculates the luminance of a hex color and returns the appropriate contrast color (Black or White).
 * Formula: (0.299 * R + 0.587 * G + 0.114 * B)
 * Threshold: 186 (as per user request)
 */
export function getContrastColor(hex: string): "#000000" | "#FFFFFF" {
  // Remove # if present
  const cleanHex = hex.replace("#", "");
  
  // Convert 3-char hex to 6-char
  const fullHex = cleanHex.length === 3 
    ? cleanHex.split("").map(char => char + char).join("") 
    : cleanHex;

  // Extract RGB
  const r = parseInt(fullHex.substring(0, 2), 16);
  const g = parseInt(fullHex.substring(2, 4), 16);
  const b = parseInt(fullHex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);

  // Return Black if luminance is high (> 186), else White
  return luminance > 186 ? "#000000" : "#FFFFFF";
}
