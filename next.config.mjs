/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true, // Disables the built-in image optimization
    domains: [
      "oxmjhfafozlafqrhhawl.supabase.co",
      "img.clerk.com",
      "res.cloudinary.com",
      "images.unsplash.com",
      "cdn.pixabay.com",
      "images.pexels.com",
    ], // Allows images from these domains to be used in the `next/image` component
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
