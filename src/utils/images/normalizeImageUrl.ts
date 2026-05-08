export function normalizeImageUrlForSize(url: string, targetPx: number): string {
  if (!url) return url;

  // Deezer CDN URLs encode the requested artwork dimensions in the path.
  // Keep the same CDN asset while asking for a size closer to the rendered UI.
  if (url.includes('e-cdns-images.dzcdn.net/images/')) {
    const size = Math.min(Math.max(targetPx, 56), 1200);
    return url.replace(/\/\d+x\d+-/, `/${size}x${size}-`);
  }

  return url;
}
