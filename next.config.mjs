import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // This app lives in a monorepo with multiple lockfiles; pin the tracing root
  // to the frontend so Next doesn't infer the wrong workspace root.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
