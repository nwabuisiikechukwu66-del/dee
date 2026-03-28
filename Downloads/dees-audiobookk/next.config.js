/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['pdf-parse', 'epub2'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'www.gutenberg.org' },
      { protocol: 'https', hostname: 'covers.openlibrary.org' },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
