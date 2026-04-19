/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "@prisma/client",
      "@prisma/adapter-better-sqlite3",
      "better-sqlite3",
      "@libsql/client",
      "@prisma/adapter-libsql",
    ],
  },
};

export default nextConfig;
