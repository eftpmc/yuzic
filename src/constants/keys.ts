/**
 * Public identifiers baked into the app. These are not secrets — Last.fm
 * treats the api_key as a public app identifier, so committing one is fine.
 *
 * Set `EXPO_PUBLIC_LASTFM_API_KEY` at build time to enable Last.fm-backed
 * reads (similar-artists, top-tracks-by-artist). When the value is empty
 * those features stay quiet — the app runs fine without it, they just
 * don't return anything. Register an app at
 * https://www.last.fm/api/account/create to get one.
 */
export const LASTFM_API_KEY: string = process.env.EXPO_PUBLIC_LASTFM_API_KEY ?? '';
