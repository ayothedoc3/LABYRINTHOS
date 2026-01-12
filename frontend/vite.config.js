import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    // Handle client-side routing
    historyApiFallback: true,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
  // Define env prefix for Vite (VITE_ prefix)
  envPrefix: 'VITE_',
  // Optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'lucide-react',
      'framer-motion',
    ],
  },
});
