import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

// This config exists to mechanise the parts of DEVELOPMENT.md that a linter can
// actually check. Everything here maps to a rule already written down there, so
// that conventions stop depending on a reviewer remembering them. Conventions a
// linter can't see — CSS variables instead of hex, ui/ components instead of raw
// <button>, the context-hook split — still rest on review.
//
// Pinned to ESLint 9: eslint-plugin-react has no ESLint 10 support yet, and
// react/no-array-index-key is one of the rules worth having.
export default tseslint.config(
  { ignores: ["dist", "src-tauri", "node_modules"] },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: { react: { version: "detect" } },
    rules: {
      // Only the two long-standing hook rules. eslint-plugin-react-hooks v6's
      // `recommended` also turns on the React Compiler rules (refs,
      // set-state-in-effect, immutability), which flag ~17 places here. Those
      // are worth adopting, but they're a refactor of their own rather than a
      // convention already written down in DEVELOPMENT.md — enabling them as
      // part of a lint setup would just mean 17 suppressions.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",

      // "Don't use `index` as React key when items can reorder" (Don'ts).
      // The rule can't tell reorderable lists from static ones, so a genuinely
      // static list needs an eslint-disable with a comment saying why it's safe
      // — which is the documentation this convention was missing.
      "react/no-array-index-key": "error",

      // "Remove console.log calls (console.error in catch blocks is fine)"
      // (Before Committing).
      "no-console": ["error", { allow: ["error"] }],

      // react-refresh/only-export-components is deliberately off. It wants one
      // component per module, but this codebase colocates each context's
      // provider with its hooks on purpose (see "Context hooks" in CLAUDE.md),
      // so the rule fires on every context file for doing the documented thing.
      // Enabling it would mean seven suppressions and no bug found.

      // Deliberate unused values are spelled with a leading underscore rather
      // than left to look like an oversight.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Tests may log freely and reach for `any` when building fixtures.
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  }
);
