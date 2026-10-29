import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Tests unitaires des bibliothèques (src/lib) : `npm test`. */
export default defineConfig({
  test: { include: ["src/**/*.test.ts"], environment: "node" },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
