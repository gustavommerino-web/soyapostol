/**
 * Flat-config ESLint for the soyapostol frontend.
 *
 * This file is consumed by the `eslint` binary directly (ESLint v9+ dropped
 * the legacy `.eslintrc` format). Craco / CRA use their own embedded linter
 * at dev-time, so this file exists solely for:
 *   1. The `pre-commit` hook (see /.pre-commit-config.yaml)
 *   2. Any CI / ad-hoc runs via `yarn eslint`.
 *
 * Rule bar mirrors the project's quality agreement:
 *   - no unused vars / imports (hard fail)
 *   - react-hooks/rules-of-hooks (hard fail)
 *   - react-hooks/exhaustive-deps (warn — many intentional fire-once effects)
 *   - no-undef (hard fail)
 *
 * Everything stylistic (quotes, semicolons, spacing) is intentionally left
 * off — we have prettier-style consistency via the editor, not the linter.
 */
import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import globals from "globals";

const ignored = [
    "build/**",
    "dist/**",
    "node_modules/**",
    "public/**",
    "scripts/**",
];

const browserNode = { ...globals.browser, ...globals.node };

export default [
    { ignores: ignored },
    js.configs.recommended,
    {
        files: ["src/**/*.{js,jsx,ts,tsx}"],
        languageOptions: {
            ecmaVersion: 2023,
            sourceType: "module",
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
            globals: browserNode,
        },
        plugins: {
            react: reactPlugin,
            "react-hooks": reactHooksPlugin,
        },
        settings: { react: { version: "detect" } },
        rules: {
            // React
            "react/jsx-uses-react": "off",       // JSX transform (React 17+)
            "react/react-in-jsx-scope": "off",
            "react/jsx-uses-vars": "error",
            "react/jsx-no-undef": "error",
            "react/prop-types": "off",
            "react/no-unescaped-entities": "off",
            "react/display-name": "off",

            // Hooks
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",

            // Hard errors (the pre-commit bar)
            "no-unused-vars": ["error", {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
                caughtErrorsIgnorePattern: "^(_|e|err|error|ex)$",
            }],
            "no-undef": "error",
            "no-empty": ["warn", { allowEmptyCatch: true }],
            "no-constant-condition": ["error", { checkLoops: false }],
        },
    },
];
