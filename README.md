# Gas Stations in Poland Map

A web application that displays gas stations across Poland, pulled from OpenStreetMap API, with an interactive map allowing zoom and pan.

See working demo here: https://6b4382d5.stacje-paliw.pages.dev/

## Features

- Interactive map of Poland
- Gas stations marked by brand with different colors
- Data fetched from OpenStreetMap Overpass API
- Built with React, TypeScript, Vite, and Tailwind CSS

## Getting Started

1. Install dependencies: `npm install`
2. Run development server: `npm run dev`
3. Build for production: `npm run build`

## Hosting

The app can be hosted on any static site host like Netlify, Vercel, or GitHub Pages. For a simple server, use `npm install -g serve` then `serve dist` after building.
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
