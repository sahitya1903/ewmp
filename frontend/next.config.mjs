/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: import.meta.dirname,
  },
  // In production the browser talks to the backend through this same-origin
  // proxy, so the auth cookie stays first-party to this domain. Set BACKEND_URL
  // (no NEXT_PUBLIC_ prefix) on the host and NEXT_PUBLIC_API_URL=/api.
  // Locally BACKEND_URL is unset — apiFetch hits the backend directly via
  // NEXT_PUBLIC_API_URL and this rewrite is a no-op.
  async rewrites() {
    if (!process.env.BACKEND_URL) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
