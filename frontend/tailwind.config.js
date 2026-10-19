/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Los colores provienen de los tokens en src/index.css.
      // En formato "H S L" separado por espacios para que Tailwind
      // pueda aplicar opacidad: bg-primary/50, text-danger/80, etc.
      // Las claves van en kebab-case para que las clases se lean igual
      // que los tokens: bg-danger-subtle, text-danger-fg, etc.
      colors: {
        background: "hsl(var(--background))",
        surface: "hsl(var(--surface))",
        foreground: "hsl(var(--foreground))",

        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          active: "hsl(var(--primary-active))",
          foreground: "hsl(var(--primary-foreground))",
          subtle: "hsl(var(--primary-subtle))",
          // Escala completa expuesta para el pie de torta y la marca.
          50: "hsl(var(--blue-50))",
          100: "hsl(var(--blue-100))",
          200: "hsl(var(--blue-200))",
          300: "hsl(var(--blue-300))",
          400: "hsl(var(--blue-400))",
          500: "hsl(var(--blue-500))",
          600: "hsl(var(--blue-600))",
          700: "hsl(var(--blue-700))",
          800: "hsl(var(--blue-800))",
          900: "hsl(var(--blue-900))",
        },
        accent: "hsl(var(--accent))",

        success: "hsl(var(--success))",
        "success-subtle": "hsl(var(--success-subtle))",
        "success-fg": "hsl(var(--success-foreground))",

        warning: "hsl(var(--warning))",
        "warning-subtle": "hsl(var(--warning-subtle))",
        "warning-fg": "hsl(var(--warning-foreground))",

        danger: "hsl(var(--danger))",
        "danger-hover": "hsl(var(--danger-hover))",
        "danger-subtle": "hsl(var(--danger-subtle))",
        "danger-fg": "hsl(var(--danger-foreground))",
        "danger-border": "hsl(var(--danger-border))",

        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        border: "hsl(var(--border))",
        "border-strong": "hsl(var(--border-strong))",
        "input-border": "hsl(var(--input-border))",
        ring: "hsl(var(--ring))",
      },

      // Se usan los tokens en vez de la escala slate por defecto,
      // para que el tema se pueda cambiar desde un solo lugar.
      slate: {
        50: "hsl(var(--slate-50))",
        100: "hsl(var(--slate-100))",
        200: "hsl(var(--slate-200))",
        300: "hsl(var(--slate-300))",
        400: "hsl(var(--slate-400))",
        500: "hsl(var(--slate-500))",
        600: "hsl(var(--slate-600))",
        700: "hsl(var(--slate-700))",
        800: "hsl(var(--slate-800))",
        900: "hsl(var(--slate-900))",
      },

      borderRadius: {
        DEFAULT: "hsl(var(--radius-default))",
        sm: "hsl(var(--radius-sm))",
        lg: "hsl(var(--radius-lg))",
      },

      boxShadow: {
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-default)",
        lg: "var(--shadow-lg)",
      },

      transitionDuration: {
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};