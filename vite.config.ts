import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => ({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    host: '0.0.0.0',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    minify: 'esbuild' as const,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor';
          }
          // MUI Core - 가장 자주 사용되는 컴포넌트들
          if (id.includes('@mui/material') && (
            id.includes('Button') || 
            id.includes('Typography') || 
            id.includes('Box') || 
            id.includes('Container') ||
            id.includes('Paper') ||
            id.includes('TextField')
          )) {
            return 'mui-core';
          }
          // MUI Extended - 덜 자주 사용되는 컴포넌트들
          if (id.includes('@mui/material')) {
            return 'mui-extended';
          }
          // MUI Icons
          if (id.includes('@mui/icons-material')) {
            return 'mui-icons';
          }
          // Search related
          if (id.includes('fuse.js')) {
            return 'search';
          }
          // Router
          if (id.includes('react-router')) {
            return 'router';
          }
          // State management
          if (id.includes('zustand')) {
            return 'state';
          }
          // Other utilities
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      '@mui/material/styles',
      '@mui/material/useTheme',
      'fuse.js'
    ],
    exclude: ['@mui/icons-material'],
  },
}))
