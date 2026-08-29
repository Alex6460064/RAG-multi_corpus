import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next 16 injecte sinon un bloc "nextjs-agent-rules" dans CLAUDE.md à chaque
  // `next dev` / `next build`. Le CLAUDE.md du projet est tenu à la main.
  agentRules: false,

  // L'index vectoriel (storage/) est lu depuis le disque au runtime par la
  // route /api/chat. Sans ceci, le tracing Next ne l'embarque pas dans la
  // fonction serverless Vercel et la récupération échoue en production.
  outputFileTracingIncludes: {
    "/api/chat": ["./storage/**/*"],
  },
};

export default nextConfig;
