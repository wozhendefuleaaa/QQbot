# QQBot Platform - 统一 Docker 镜像
# 同时包含 backend 和 webui 服务

# 阶段1: 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制 package 文件
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY webui/package*.json ./webui/

# 安装依赖
RUN npm ci

# 复制源代码
COPY backend/ ./backend/
COPY webui/ ./webui/

# 构建后端
RUN npm run build -w backend

# 构建前端
RUN npm run build -w webui

# 阶段2: 生产镜像
FROM node:20-alpine

WORKDIR /app

# 安装必要工具
RUN apk add --no-cache curl

# 复制 package 文件
COPY package*.json ./
COPY backend/package*.json ./backend/
COPY webui/package*.json ./webui/

# 安装生产依赖（前端静态文件由后端 Express 托管，无需 serve）
RUN npm ci --omit=dev

# 从构建阶段复制构建产物
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/webui/dist ./webui/dist

# 复制插件目录
COPY backend/plugins/ ./backend/plugins/
COPY backend/src/plugins/ ./backend/src/plugins/

# 复制启动脚本
COPY docker-start.sh /app/docker-start.sh
RUN chmod +x /app/docker-start.sh

# 创建日志目录
RUN mkdir -p /app/logs

# 暴露端口（前端界面 + 后端 API 同端口）
EXPOSE 3000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# 启动命令
CMD ["/app/docker-start.sh"]
