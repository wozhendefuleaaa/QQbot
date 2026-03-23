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

# 启动后端服务
echo "[启动] 后端服务 (端口 3000)..."
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

# 启动前端静态文件服务
echo "[启动] 前端服务 (端口 5173)..."
cd /app/webui
serve -s dist -l 5173 > /app/logs/webui.log 2>&1 &
WEBUI_PID=$!
echo "前端 PID: $WEBUI_PID"

# 等待前端启动
sleep 2

# 检查前端是否正常运行
if ! kill -0 $WEBUI_PID 2>/dev/null; then
    echo "[错误] 前端服务启动失败，请查看日志: /app/logs/webui.log"
    cat /app/logs/webui.log
    exit 1
fi

echo ""
echo "=========================================="
echo "  🎉 服务启动成功！"
echo "=========================================="
echo ""
echo "  前端界面: http://0.0.0.0:5173"
echo "  后端 API: http://0.0.0.0:3000"
echo ""
echo "  日志位置:"
echo "    - 后端: /app/logs/backend.log"
echo "    - 前端: /app/logs/webui.log"
echo ""
echo "=========================================="

# 优雅关闭处理
shutdown() {
    echo ""
    echo "正在停止服务..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $WEBUI_PID 2>/dev/null || true
    echo "服务已停止"
    exit 0
}

trap shutdown SIGTERM SIGINT SIGQUIT

# 保持容器运行并监控进程
while true; do
    # 检查后端进程
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo "[警告] 后端服务已停止，正在重启..."
        cd /app
        node backend/dist/index.js > /app/logs/backend.log 2>&1 &
        BACKEND_PID=$!
    fi
    
    # 检查前端进程
    if ! kill -0 $WEBUI_PID 2>/dev/null; then
        echo "[警告] 前端服务已停止，正在重启..."
        cd /app/webui
        serve -s dist -l 5173 > /app/logs/webui.log 2>&1 &
        WEBUI_PID=$!
    fi
    
    sleep 5
done
