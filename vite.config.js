/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Firebase SDK → one long-cached vendor chunk
          if (id.includes('node_modules/firebase')) {
            return 'vendor-firebase';
          }
          // Recharts + D3 → charting chunk
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3') || id.includes('node_modules/victory')) {
            return 'vendor-charts';
          }
          // html2pdf and its dependencies (jspdf, html2canvas)
          if (id.includes('node_modules/html2pdf') || id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'vendor-pdf';
          }
          // pdfjs (PDF text extraction worker)
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'vendor-pdfjs';
          }
          // Admin panel — separate chunk (not needed for regular users)
          if (id.includes('src/components/admin')) {
            return 'admin-panel';
          }
          // Institution panel — separate chunk
          if (id.includes('src/components/institution')) {
            return 'institution-panel';
          }
          // All other node_modules → shared vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    css: true,
  },
})

