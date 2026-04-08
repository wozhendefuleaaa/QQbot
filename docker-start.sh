#!/bin/sh
# Docker 容器启动脚本 - 同时启动 backend 和 webui

set -e

echo "=========================================="
echo "  QQBot Platform 启动中..."
echo "=========================================="

# 创建日志目录
mkdir -p /app/logs

# 生产模式
echo "[模式] 生产环境"

# 启动后端服务（生产环境同时托管前端静态文件）
echo "[启动] 后端服务 (端口 3000)..."
echo "[启动] 前端界面通过后端同端口提供"
cd /app
node backend/dist/index.js > /app/logs/backend.log 2>&1 &
BACKEND_PID=$!
echo "后端 PID: $BACKEND_PID"

# 等待后端启动
sleep 3

# 检查后端是否正常运行
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "[错误] 后端服务启动失败，请查看日志: /app/logs/backend.log"
    cat /app/logs/backend.log
    exit 1
fi

echo ""
echo "=========================================="
echo "  🎉 服务启动成功！"
echo "=========================================="
echo ""
echo "  访问地址: http://0.0.0.0:3000"
echo "  (前端界面 + 后端 API 同端口)"
echo ""
echo "  日志位置: /app/logs/backend.log"
echo ""
echo "=========================================="

# 优雅关闭处理
shutdown() {
    echo ""
    echo "正在停止服务..."
    kill $BACKEND_PID 2>/dev/null || true
    echo "服务已停止"
    exit 0
}

trap shutdown SIGTERM SIGINT SIGQUIT

# 保持容器运行并监控后端进程
while true; do
    # 检查后端进程
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "[警告] 后端服务已停止，正在重启..."
        cd /app
        node backend/dist/index.js > /app/logs/backend.log 2>&1 &
        BACKEND_PID=$!
    fi
    
    sleep 5
done
