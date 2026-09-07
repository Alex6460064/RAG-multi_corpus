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

  // Le bandeau de non-conseil et la date d'arrêt du corpus sont imposés sur
  // chaque déploiement : interdire l'encadrement en iframe empêche un tiers de
  // les faire sortir du cadre visible tout en affichant l'assistant.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
