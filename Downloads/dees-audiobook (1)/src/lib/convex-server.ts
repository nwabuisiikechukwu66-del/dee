// Server-side Convex client
// Only used when NEXT_PUBLIC_CONVEX_URL is configured
// App works fully without Convex via local storage

export function getConvexClient() {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    throw new Error('CONVEX_NOT_CONFIGURED')
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ConvexHttpClient } = require('convex/browser')
    return new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL)
  } catch {
    throw new Error('CONVEX_NOT_CONFIGURED')
  }
}
