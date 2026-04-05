/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",

  // Allow images from Azure Blob Storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.blob.core.windows.net",
        pathname: "/**",
      },
    ],
  },

  // Prisma needs these to be available server-side (Next.js 14 option)
  experimental: {
    serverComponentsExternalPackages: [
      "@prisma/client", "@prisma/adapter-libsql", "@libsql/client",
      "pdfjs-dist", "@napi-rs/canvas", "adm-zip",
      "mammoth", "officeparser", "pdf-parse", "xlsx",
    ],
  },
};

export default nextConfig;
