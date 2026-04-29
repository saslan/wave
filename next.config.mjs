/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export — produces an `out/` folder with plain HTML/CSS/JS,
  // deployable to any static host (Hostinger, Netlify, Cloudflare Pages, GitHub Pages).
  output: "export",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  reactStrictMode: false, // animation state benefits from a single render path
};

export default nextConfig;
