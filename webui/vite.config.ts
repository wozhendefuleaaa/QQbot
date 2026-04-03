import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// 支持本地开发和 Docker 环境
// 本地开发默认使用 http://localhost:3000
// Docker 环境设置 VITE_API_TARGET=http://backend:3000
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5175,
    host: '0.0.0.0',
    proxy: {
      // SSE 代理 - 需要特殊配置
      '/api/sse': {
        target: apiTarget,
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Accept', 'text/event-stream');
            proxyReq.setHeader('Cache-Control', 'no-cache');
            proxyReq.setHeader('Connection', 'keep-alive');
          });
          proxy.on('proxyRes', (proxyRes) => {
            proxyRes.headers['cache-control'] = 'no-cache';
            proxyRes.headers['connection'] = 'keep-alive';
            proxyRes.headers['x-accel-buffering'] = 'no';
          });
        }
      },
      // 普通 API 代理
      '/api': {
        target: apiTarget,
        changeOrigin: true
      },
      '/health': {
        target: apiTarget,
        changeOrigin: true
      },
      '/ready': {
        target: apiTarget,
        changeOrigin: true
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['recharts'],
          markdown: ['react-markdown'],
          ui: ['@radix-ui/react-dialog', 'lucide-react']
        }
      }
    }
  }
});
