import { MediaBrowserBrand } from "../brand";

export async function testServerUrl(
  brand: MediaBrowserBrand,
  url: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${url}/System/Info/Public`);
    if (!res.ok) throw new Error();
    return { success: true };
  } catch {
    return { success: false, message: `Could not reach ${brand.label} server` };
  }
}
