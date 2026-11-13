import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Pages and routes read through features/<name>/*-queries.ts and write through *-actions.ts.
    files: ["app/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [{ group: ["**/lib/db"], message: "Gọi hàm trong features/<tên>/*-queries.ts thay vì query database trong app/." }] }],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
