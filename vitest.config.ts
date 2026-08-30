import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const src = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": src,
      /*
        `server-only` throws by design when imported outside a React Server
        Component. The modules under test are genuinely server-only; the marker
        is what enforces that in the app, and stubbing it here lets the pure
        logic inside them be tested without weakening that guarantee.
      */
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    /*
      `env.ts` validates configuration at import time and throws when it is
      missing — deliberately, so a misconfigured deploy fails loudly. Tests
      import modules that transitively reach it, so they need values present.
      These are obvious placeholders: no test may make a real network call.
    */
    env: {
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      ANTHROPIC_API_KEY: "test-anthropic-key",
    },
  },
});
