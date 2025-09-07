import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { htmlBasePath } from './plugins/html-base-path.js'

export default defineConfig(({ mode }) => ({
  plugins: [react(), htmlBasePath()],
  base: mode === 'github' ? '/kr-glossary/' : '/',
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
        manualChunks: {
          vendor: ['react', 'react-dom'],
          'mui-core': ['@mui/material', '@emotion/react', '@emotion/styled'],
          'mui-icons': ['@mui/icons-material'],
          router: ['react-router-dom'],
          search: ['fuse.js'],
          state: ['zustand']
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
