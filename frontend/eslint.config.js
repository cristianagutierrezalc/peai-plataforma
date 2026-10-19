import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

/**
 * ESLint 9 exige configuracion plana (eslint.config.js).
 * Antes el proyecto usaba "eslint . --ext js,jsx" sin ningun archivo de
 * configuracion, asi que `npm run lint` fallaba siempre. El CI lo tenia
 * con `|| true`, por eso nunca se noto.
 *
 * eslint-plugin-react habilita las reglas de JSX (reconocer <Icon />
 * como uso de una variable) y react-hooks las reglas de hooks, que
 * detectan el usoEffect devolviendo una promesa en vez de una funcion
 * de limpieza.
 */
export default [
  {
    ignores: ["dist/**", "node_modules/**", "*.config.js"],
  },
  js.configs.recommended,
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        URL: "readonly",
      },
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.flat.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // El proyecto usa el runtime automatico de React 18, no hace falta
      // importar React en cada archivo.
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",

      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-empty": ["error", { allowEmptyCatch: true }],
      eqeqeq: ["error", "smart"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
];