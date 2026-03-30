import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      fontFamily: {
        sans: ['Inter', 'Space Grotesk', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
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
        priority: { low: "hsl(var(--priority-low))", medium: "hsl(var(--priority-medium))", high: "hsl(var(--priority-high))" },
        status: { unseen: "hsl(var(--status-unseen))", seen: "hsl(var(--status-seen))", progress: "hsl(var(--status-progress))", done: "hsl(var(--status-done))" },
        gold: { DEFAULT: "hsl(42 85% 58%)", light: "hsl(42 95% 72%)", dark: "hsl(35 88% 42%)" },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 2px)", sm: "calc(var(--radius) - 4px)", xl: "calc(var(--radius) + 4px)", "2xl": "calc(var(--radius) + 10px)" },
      backdropBlur: { xs: "4px" },
      boxShadow: {
        gold: "0 4px 20px hsla(42,85%,58%,0.3)",
        "gold-lg": "0 8px 40px hsla(42,85%,58%,0.4)",
        glass: "0 8px 32px hsla(222,20%,5%,0.3), inset 0 1px 0 hsla(0,0%,100%,0.06)",
        "glass-hover": "0 16px 48px hsla(222,20%,5%,0.45), inset 0 1px 0 hsla(0,0%,100%,0.08)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "slide-up": { from: { transform: "translateY(20px)", opacity: "0" }, to: { transform: "translateY(0)", opacity: "1" } },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
        "scale-in": { from: { transform: "scale(0.92)", opacity: "0" }, to: { transform: "scale(1)", opacity: "1" } },
        "bounce-in": { "0%": { transform: "scale(0.8)", opacity: "0" }, "60%": { transform: "scale(1.05)", opacity: "1" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "slide-up": "slide-up 0.35s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.3s ease-out both",
        "scale-in": "scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both",
        "bounce-in": "bounce-in 0.4s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
