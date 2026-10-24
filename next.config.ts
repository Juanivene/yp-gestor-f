import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // La foto de evidencia se comprime en el cliente (~300 KB), pero dejamos margen hasta el tope de 5 MB.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
  serverExternalPackages: ["@node-rs/argon2"],
};

export default nextConfig;
