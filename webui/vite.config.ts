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
    // 生产构建优化
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      // 代码分割
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          'react-query': ['@tanstack/react-query'],
          recharts: ['recharts'],
          lucide: ['lucide-react'],
          radix: ['@radix-ui/react-dialog', '@radix-ui/react-slot']
        }
      }
    },
    // 启用 CSS 代码分割
    cssCodeSplit: true,
    // 生成源映射
    sourcemap: false
  }
});
