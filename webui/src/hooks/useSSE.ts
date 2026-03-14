import { useEffect, useRef, useState, useCallback } from 'react';

interface UseSSEOptions {
  url: string;
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  onMessage?: (data: unknown) => void;
  onPlatformStatus?: (data: unknown) => void;
  onConnectionChange?: (connected: boolean) => void;
}

interface SSEState {
  connected: boolean;
  reconnecting: boolean;
  retryCount: number;
  error: string | null;
}

/**
 * 改进的 SSE Hook
 * - 指数退避重连
 * - 最大重试次数限制
 * - 连接状态管理
 * - 自动清理
 * - 使用 ref 存储回调避免依赖变化导致重连
 */
export function useSSE(options: UseSSEOptions) {
  const {
    url,
    maxRetries = 10,
    initialRetryDelay = 1000,
    maxRetryDelay = 30000
  } = options;

  // 使用 ref 存储回调，避免依赖变化导致重连
  const onMessageRef = useRef(options.onMessage);
  const onPlatformStatusRef = useRef(options.onPlatformStatus);
  const onConnectionChangeRef = useRef(options.onConnectionChange);

  // 更新 ref
  useEffect(() => {
    onMessageRef.current = options.onMessage;
    onPlatformStatusRef.current = options.onPlatformStatus;
    onConnectionChangeRef.current = options.onConnectionChange;
  });

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const retryCountRef = useRef(0);
  const isSubscribedRef = useRef(true);
  const isConnectingRef = useRef(false);

  const [state, setState] = useState<SSEState>({
    connected: false,
    reconnecting: false,
    retryCount: 0,
    error: null
  });

  const calculateDelay = useCallback((retryCount: number) => {
    // 指数退避：1s, 2s, 4s, 8s, 16s, 30s, 30s...
    const delay = Math.min(initialRetryDelay * Math.pow(2, retryCount), maxRetryDelay);
    // 添加随机抖动避免同时重连
    const jitter = delay * 0.1 * Math.random();
    return delay + jitter;
  }, [initialRetryDelay, maxRetryDelay]);

  const connect = useCallback(() => {
    // 防止重复连接
    if (isConnectingRef.current) {
      console.log('[SSE] 正在连接中，跳过重复连接请求');
      return;
    }

    if (!isSubscribedRef.current) {
      console.log('[SSE] 组件已卸载，跳过连接');
      return;
    }

    // 检查是否超过最大重试次数
    if (retryCountRef.current >= maxRetries) {
      setState(prev => ({
        ...prev,
        reconnecting: false,
        error: `连接失败，已达到最大重试次数 (${maxRetries})`
      }));
      return;
    }

    // 关闭现有连接
    if (eventSourceRef.current) {
      console.log('[SSE] 关闭现有连接');
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    isConnectingRef.current = true;
    setState(prev => ({ ...prev, reconnecting: true, error: null }));

    console.log('[SSE] 创建新连接:', url);

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        isConnectingRef.current = false;
        retryCountRef.current = 0;
        console.log('[SSE] 连接已建立');
        setState({
          connected: true,
          reconnecting: false,
          retryCount: 0,
          error: null
        });
        onConnectionChangeRef.current?.(true);
      };

      eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessageRef.current?.(data);
        } catch (err) {
          console.error('[SSE] 解析消息失败:', err);
        }
      });

      eventSource.addEventListener('platform_status', (event) => {
        try {
          const data = JSON.parse(event.data);
          onPlatformStatusRef.current?.(data);
        } catch (err) {
          console.error('[SSE] 解析平台状态失败:', err);
        }
      });

      eventSource.onerror = (e) => {
        console.log('[SSE] 连接错误:', e);
        isConnectingRef.current = false;
        
        if (eventSourceRef.current === eventSource) {
          eventSource.close();
          eventSourceRef.current = null;
        }

        setState(prev => ({
          ...prev,
          connected: false,
          reconnecting: true
        }));
        onConnectionChangeRef.current?.(false);

        if (!isSubscribedRef.current) return;

        retryCountRef.current += 1;
        const delay = calculateDelay(retryCountRef.current);

        console.log(`[SSE] 连接错误，${Math.round(delay / 1000)}秒后重试 (${retryCountRef.current}/${maxRetries})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          if (isSubscribedRef.current) {
            connect();
          }
        }, delay);
      };
    } catch (err) {
      isConnectingRef.current = false;
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[SSE] 创建连接失败:', errorMessage);
      setState(prev => ({
        ...prev,
        connected: false,
        reconnecting: false,
        error: errorMessage
      }));
    }
  }, [url, maxRetries, calculateDelay]);

  // 手动重连
  const reconnect = useCallback(() => {
    console.log('[SSE] 手动重连');
    retryCountRef.current = 0;
    isConnectingRef.current = false;
    setState(prev => ({ ...prev, retryCount: 0, error: null }));
    connect();
  }, [connect]);

  // 断开连接
  const disconnect = useCallback(() => {
    console.log('[SSE] 断开连接');
    isSubscribedRef.current = false;
    isConnectingRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }
    
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    
    setState({
      connected: false,
      reconnecting: false,
      retryCount: 0,
      error: null
    });
  }, []);

  // 只在 url 变化时连接，组件卸载时断开
  useEffect(() => {
    isSubscribedRef.current = true;
    connect();

    return () => {
      disconnect();
    };
  }, [url]); // 只依赖 url，不依赖 connect 和 disconnect

  return {
    ...state,
    reconnect,
    disconnect
  };
}
