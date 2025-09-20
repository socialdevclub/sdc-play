/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import commonjs from 'vite-plugin-commonjs';
import wyw from '@wyw-in-js/vite';

// https://vitejs.dev/config/
export default defineConfig({
  envPrefix: 'PUBLIC',
  plugins: [
    commonjs(),
    wyw({
      babelOptions: {
        presets: ['@babel/preset-typescript', '@babel/preset-react'],
      },
      include: ['**/*.{ts,tsx}'],
    }),
    react({
      jsxImportSource: '@emotion/react',
    }),
  ],
  resolve: {
    alias: [{ find: '@', replacement: '/src' }],
  },
  server: {
    allowedHosts: ['local.socialdev.club'],
  },
});
