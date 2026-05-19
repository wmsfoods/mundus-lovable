import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        brand: {
          DEFAULT: "#B64769",
          50: "#fdf3f4",
          100: "#fbe8eb",
          200: "#f6d5db",
          300: "#efb2bd",
          400: "#e5879a",
          500: "#d75c77",
          600: "#c23c60",
          700: "#a22e50",
          800: "#B64769",
          900: "#752642",
          950: "#411020",
        },
        p: {
          50: "var(--p050)",
          100: "var(--p100)",
          200: "var(--p200)",
          300: "var(--p300)",
          400: "var(--p400)",
          500: "var(--p500)",
          600: "var(--p600)",
          700: "var(--p700)",
          800: "var(--p800)",
          900: "var(--p900)",
          950: "var(--p950)",
        },
        g: {
          50: "var(--g050)",
          100: "var(--g100)",
          200: "var(--g200)",
          300: "var(--g300)",
          400: "var(--g400)",
          500: "var(--g500)",
          600: "var(--g600)",
          700: "var(--g700)",
          800: "var(--g800)",
          900: "var(--g900)",
          950: "var(--g950)",
        },
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        info: "var(--info)",
      },
      fontSize: {
        "fs-xs":   ["12px", { lineHeight: "1.5" }],
        "fs-sm":   ["14px", { lineHeight: "1.5" }],
        "fs-base": ["16px", { lineHeight: "1.5" }],
        "fs-lg":   ["18px", { lineHeight: "1.3" }],
        "fs-xl":   ["20px", { lineHeight: "1.3" }],
        "fs-2xl":  ["24px", { lineHeight: "1.3" }],
        "fs-3xl":  ["30px", { lineHeight: "1.2" }],
        "fs-4xl":  ["36px", { lineHeight: "1.2" }],
        "fs-5xl":  ["48px", { lineHeight: "1.2" }],
      },
      boxShadow: {
        header: "0 1px 2px 0 rgba(0,0,0,0.06), 0 1px 3px 0 rgba(0,0,0,0.10)",
        card:   "0 1px 2px 0 rgba(0,0,0,0.05)",
        hover:  "0 4px 12px -2px rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.06)",
      },
      spacing: {
        "sidebar-w": "220px",
        "header-h":  "89px",
      },
      maxWidth: {
        container: "1400px",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
