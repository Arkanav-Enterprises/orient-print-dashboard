import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Include template assets so the Offer Generator can read them at runtime on Vercel
  outputFileTracingIncludes: {
    "/api/tools/offer-generator": ["./Offer_Generator_Project/template_assets/**/*"],
  },
};

export default nextConfig;
