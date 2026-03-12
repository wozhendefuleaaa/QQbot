import { Router, Request, Response, Application } from 'express';
import { messages, conversations, platformStatus, platformLogs, systemLogs } from '../../core/store.js';

const router = Router();

// 存储所有连接的 SSE 客户端
const sseClients: Set<Response> = new Set();

// 广播事件给所有客户端
export function broadcastEvent(event: string, data: unknown) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(client => {
    try {
      client.write(message);
    } catch {
      // 客户端可能已断开
    }
  });
}

// 广播新消息
export function broadcastNewMessage(conversationId: string, message: any) {
  broadcastEvent('message', { conversationId, message });
}

// 广播平台状态变化
export function broadcastPlatformStatus(status: any) {
  broadcastEvent('platform_status', status);
}

// 广播平台日志
export function broadcastPlatformLog(log: any) {
  broadcastEvent('platform_log', log);
}

// SSE 端点
router.get('/events', (req: Request, res: Response) => {
  // 设置 SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // 禁用 nginx 缓冲
  
  // 发送初始连接确认
  res.write('event: connected\ndata: {"status":"ok"}\n\n');
  
  // 添加到客户端列表
  sseClients.add(res);
  console.log(`[sse] 客户端连接，当前连接数: ${sseClients.size}`);
  
  // 心跳保活
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 30000);
  
  // 客户端断开时清理
  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
    console.log(`[sse] 客户端断开，当前连接数: ${sseClients.size}`);
  });
});

// 获取当前连接数
router.get('/clients', (_req: Request, res: Response) => {
  res.json({ count: sseClients.size });
});

export function registerSseRoutes(app: Application) {
  app.use('/api/sse', router);
}
