import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// NEXT_PUBLIC_API_URL=/api (relative): this server passes /api and /uploads on to the
// backend, so the browser only ever talks to the site's own address — what a dev
// tunnel (or a phone on the tunnel) needs. With a full backend URL (production), it's off.
const proxyApi = (process.env.NEXT_PUBLIC_API_URL || "").startsWith("/");
const backend = (process.env.API_PROXY_TARGET || "http://localhost:5000").replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app lives in a monorepo with multiple lockfiles; pin the tracing root
  // to the frontend so Next doesn't infer the wrong workspace root.
  outputFileTracingRoot: __dirname,
  async rewrites() {
    return proxyApi
      ? [
          { source: "/api/:path*", destination: `${backend}/api/:path*` },
          { source: "/uploads/:path*", destination: `${backend}/uploads/:path*` },
        ]
      : [];
  },
};

export default nextConfig;
