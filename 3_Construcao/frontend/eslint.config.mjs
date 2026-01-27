import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // Project overrides.
  {
    rules: {
      // Many API/pages are still being typed; keep lint green while we improve typing.
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]);

export default eslintConfig;
