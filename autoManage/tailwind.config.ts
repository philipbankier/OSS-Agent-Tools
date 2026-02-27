import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        panel: '#0f172a',
      },
    },
  },
  plugins: [],
};

export default config;
