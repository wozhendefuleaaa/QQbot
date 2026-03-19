#!/bin/bash

# QQBot Platform 一键部署脚本
# 支持：本地开发部署、Docker 部署、生产构建

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 打印函数
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${CYAN}==>${NC} $1"; }

# 显示 Banner
show_banner() {
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║           QQBot Platform 一键部署脚本 v1.0                ║"
    echo "║                                                           ║"
    echo "║  支持: 本地开发 | Docker 部署 | 生产构建                  ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        return 1
    fi
    return 0
}

# 检查系统依赖
check_dependencies() {
    print_step "检查系统依赖..."
    
    local missing_deps=()
    
    # 检查 Node.js
    if check_command node; then
        local node_version=$(node -v)
        print_info "Node.js 版本: $node_version"
    else
        missing_deps+=("node")
    fi
    
    # 检查 npm
    if check_command npm; then
        local npm_version=$(npm -v)
        print_info "npm 版本: $npm_version"
    else
        missing_deps+=("npm")
    fi
    
    # 检查 Docker (可选)
    if check_command docker; then
        local docker_version=$(docker --version)
        print_info "Docker: $docker_version"
    else
        print_warn "Docker 未安装，Docker 部署选项将不可用"
    fi
    
    # 检查 Docker Compose (可选)
    if check_command docker-compose || docker compose version &> /dev/null; then
        print_info "Docker Compose 已安装"
    else
        print_warn "Docker Compose 未安装，Docker 部署选项将不可用"
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "缺少必要依赖: ${missing_deps[*]}"
        print_info "请先安装 Node.js (推荐 v18+): https://nodejs.org/"
        exit 1
    fi
    
    print_success "依赖检查完成"
}

# 初始化环境配置
init_env() {
    print_step "初始化环境配置..."
    
    if [ -f ".env" ]; then
        print_warn ".env 文件已存在"
        read -p "是否覆盖现有配置? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "保留现有 .env 配置"
            return 0
        fi
        # 备份现有配置
        cp .env .env.backup.$(date +%Y%m%d%H%M%S)
        print_info "已备份现有配置到 .env.backup.*"
    fi
    
    # 复制环境变量模板
    cp .env.example .env
    print_success "已创建 .env 配置文件"
    
    # 生成随机 JWT 密钥
    local jwt_secret=$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
    if [ -n "$jwt_secret" ]; then
        # 替换 JWT_SECRET
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env
        else
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env
        fi
        print_success "已生成安全的 JWT 密钥"
    fi
    
    print_warn "请编辑 .env 文件配置 QQ 机器人相关参数："
    print_info "  - QQ_APP_ID: QQ 机器人 App ID"
    print_info "  - QQ_CLIENT_SECRET: QQ 机器人 Client Secret"
    print_info "  - 其他配置项可按需修改"
}

# 安装依赖
install_dependencies() {
    print_step "安装项目依赖..."
    
    # 安装根目录依赖
    print_info "安装根目录依赖..."
    npm install
    
    print_success "依赖安装完成"
}

# 本地开发部署
deploy_local() {
    print_step "开始本地开发部署..."
    
    check_dependencies
    init_env
    install_dependencies
    
    print_success "本地开发环境部署完成！"
    echo ""
    print_info "启动方式："
    print_info "  开发模式: npm run dev"
    print_info "  后端服务: npm run dev:backend"
    print_info "  前端服务: npm run dev:webui"
    echo ""
    print_info "访问地址："
    print_info "  后端 API: http://localhost:3000"
    print_info "  前端界面: http://localhost:5173"
}

# Docker 部署
deploy_docker() {
    print_step "开始 Docker 部署..."
    
    # 检查 Docker
    if ! check_command docker; then
        print_error "Docker 未安装，无法进行 Docker 部署"
        print_info "请先安装 Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    # 检查 Docker Compose
    if ! check_command docker-compose && ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装"
        print_info "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    init_env
    
    print_info "构建并启动 Docker 容器..."
    
    # 使用 docker-compose 或 docker compose
    if check_command docker-compose; then
        docker-compose up -d --build
    else
        docker compose up -d --build
    fi
    
    print_success "Docker 部署完成！"
    echo ""
    print_info "容器状态："
    if check_command docker-compose; then
        docker-compose ps
    else
        docker compose ps
    fi
    echo ""
    print_info "访问地址："
    print_info "  后端 API: http://localhost:3001"
    print_info "  前端界面: http://localhost:5173"
    print_info "  MySQL: localhost:3307"
    print_info "  Redis: localhost:6380"
    echo ""
    print_info "常用命令："
    print_info "  查看日志: docker-compose logs -f"
    print_info "  停止服务: docker-compose down"
    print_info "  重启服务: docker-compose restart"
}

# 生产构建
build_production() {
    print_step "开始生产构建..."
    
    check_dependencies
    install_dependencies
    
    print_info "构建生产版本..."
    npm run build
    
    print_success "生产构建完成！"
    echo ""
    print_info "构建产物："
    print_info "  后端: backend/dist/"
    print_info "  前端: webui/dist/"
    echo ""
    print_info "部署建议："
    print_info "  1. 将构建产物部署到服务器"
    print_info "  2. 配置反向代理 (nginx/caddy)"
    print_info "  3. 使用 PM2 管理后端进程"
}

# 停止服务
stop_services() {
    print_step "停止服务..."
    
    # 停止 Docker 服务
    if check_command docker-compose; then
        docker-compose down 2>/dev/null || true
    elif docker compose version &> /dev/null; then
        docker compose down 2>/dev/null || true
    fi
    
    # 停止本地进程
    local pids=$(lsof -ti:3000,5173,3001,3307,6380 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "$pids" | xargs kill -9 2>/dev/null || true
        print_info "已停止本地服务进程"
    fi
    
    print_success "服务已停止"
}

# 查看状态
show_status() {
    print_step "服务状态："
    echo ""
    
    # 检查 Docker 容器状态
    if check_command docker; then
        print_info "Docker 容器："
        docker ps -a --filter "name=qqbot-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || print_warn "无运行中的容器"
        echo ""
    fi
    
    # 检查端口占用
    print_info "端口占用："
    
    local ports=(3000 3001 5173 3307 6380)
    local services=("后端API(本地)" "后端API(Docker)" "前端界面" "MySQL" "Redis")
    
    for i in "${!ports[@]}"; do
        local port=${ports[$i]}
        local service=${services[$i]}
        if lsof -i:$port &> /dev/null; then
            echo -e "  ${GREEN}●${NC} $port - $service ${GREEN}运行中${NC}"
        else
            echo -e "  ${RED}○${NC} $port - $service ${RED}未运行${NC}"
        fi
    done
}

# 显示帮助
show_help() {
    show_banner
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  local      本地开发部署 (默认)"
    echo "  docker     Docker 容器化部署"
    echo "  build      生产构建"
    echo "  init       仅初始化环境配置"
    echo "  install    仅安装依赖"
    echo "  stop       停止所有服务"
    echo "  status     查看服务状态"
    echo "  help       显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 local       # 本地开发部署"
    echo "  $0 docker      # Docker 部署"
    echo "  $0 build       # 生产构建"
    echo "  $0 stop        # 停止服务"
}

# 主函数
main() {
    show_banner
    
    local command=${1:-local}
    
    case $command in
        local)
            deploy_local
            ;;
        docker)
            deploy_docker
            ;;
        build)
            build_production
            ;;
        init)
            init_env
            ;;
        install)
            check_dependencies
            install_dependencies
            ;;
        stop)
            stop_services
            ;;
        status)
            show_status
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "未知命令: $command"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
