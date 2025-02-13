/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "**",
      },
      {
        protocol: "https",
        hostname: "ahzplqwjaloozgwqkjgk.supabase.co",
        pathname: "/storage/v1/object/public/facility-images/**",
      },
    ],
  },
}

module.exports = nextConfig

  