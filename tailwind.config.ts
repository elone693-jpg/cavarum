import type { Config } from 'tailwindcss';

const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './preview.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: token('background'),
        foreground: token('foreground'),
        surface: { DEFAULT: token('surface'), raised: token('surface-raised') },
        muted: { DEFAULT: token('muted'), foreground: token('muted-foreground') },
        border: { DEFAULT: token('border'), strong: token('border-strong') },
        ring: token('ring'),
        primary: { DEFAULT: token('primary'), strong: token('primary-strong'), foreground: token('primary-foreground') },
        cane: token('cane'),
        slate: token('slate'),
        copper: token('copper'),
        destructive: { DEFAULT: token('destructive'), foreground: token('destructive-foreground') },
        // Alias conservé pour les composants existants.
        card: token('surface'),
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
      },
      spacing: {
        'safe-b': 'env(safe-area-inset-bottom)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
