#!/bin/bash

# QQBot Platform 一键部署脚本
# 支持：本地开发部署、Docker 部署、生产构建
# 适用于零编程基础用户

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# 打印函数
print_info() { echo -e "${BLUE}[信息]${NC} $1"; }
print_success() { echo -e "${GREEN}[成功]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[警告]${NC} $1"; }
print_error() { echo -e "${RED}[错误]${NC} $1"; }
print_step() { echo -e "${CYAN}==>${NC} $1"; }
print_tip() { echo -e "${MAGENTA}[提示]${NC} $1"; }

# 显示 Banner
show_banner() {
    clear
    echo -e "${CYAN}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║                                                               ║"
    echo "║              🤖 QQBot Platform 一键部署脚本                  ║"
    echo "║                                                               ║"
    echo "║                    版本: v1.0                                ║"
    echo "║                                                               ║"
    echo "║         适用于零编程基础用户，简单易用                       ║"
    echo "║                                                               ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 显示主菜单
show_menu() {
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}                        请选择操作                            ${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${GREEN}1.${NC} 🚀 一键部署（推荐新手）     - Docker 容器化自动部署"
    echo -e "  ${GREEN}2.${NC} 🐳 Docker 部署              - 使用 Docker 容器部署"
    echo -e "  ${GREEN}3.${NC} 📦 生产构建                  - 构建生产版本"
    echo ""
    echo -e "  ${BLUE}4.${NC} ⚙️  仅安装依赖               - 安装 npm 依赖包"
    echo -e "  ${BLUE}5.${NC} 🔧 配置环境变量             - 设置 QQ 机器人配置"
    echo ""
    echo -e "  ${MAGENTA}6.${NC} 📊 查看服务状态             - 检查服务运行状态"
    echo -e "  ${MAGENTA}7.${NC} 🛑 停止所有服务             - 停止正在运行的服务"
    echo ""
    echo -e "  ${RED}0.${NC} 🚪 退出                      - 退出脚本"
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# 等待用户按键
wait_key() {
    echo ""
    print_tip "按任意键继续..."
    read -n 1 -s -r
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
    print_step "正在检查系统依赖..."
    echo ""
    
    local has_node=false
    local has_npm=false
    local has_docker=false
    
    # 检查 Node.js
    if check_command node; then
        local node_version=$(node -v)
        print_success "Node.js 已安装: $node_version"
        has_node=true
    else
        print_error "Node.js 未安装"
    fi
    
    # 检查 npm
    if check_command npm; then
        local npm_version=$(npm -v)
        print_success "npm 已安装: $npm_version"
        has_npm=true
    else
        print_error "npm 未安装"
    fi
    
    # 检查 Docker (可选)
    if check_command docker; then
        local docker_version=$(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',')
        print_success "Docker 已安装: $docker_version"
        has_docker=true
    else
        print_warn "Docker 未安装（Docker 部署功能将不可用）"
    fi
    
    echo ""
    
    if [ "$has_node" = false ] || [ "$has_npm" = false ]; then
        print_error "缺少必要依赖，请先安装 Node.js"
        echo ""
        print_tip "安装方法："
        echo "  Ubuntu/Debian: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs"
        echo "  CentOS/RHEL:   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash - && sudo yum install -y nodejs"
        echo "  macOS:         brew install node"
        echo "  Windows:       访问 https://nodejs.org/ 下载安装包"
        echo ""
        return 1
    fi
    
    print_success "依赖检查通过！"
    return 0
}

# 初始化环境配置
init_env() {
    print_step "正在初始化环境配置..."
    echo ""
    
    if [ -f ".env" ]; then
        print_warn ".env 配置文件已存在"
        echo ""
        read -p "是否覆盖现有配置？(y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "保留现有配置"
            return 0
        fi
        # 备份现有配置
        cp .env .env.backup.$(date +%Y%m%d%H%M%S)
        print_info "已备份现有配置"
    fi
    
    # 复制环境变量模板
    cp .env.example .env
    print_success "已创建配置文件 .env"
    
    # 生成随机 JWT 密钥
    local jwt_secret=$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null)
    if [ -n "$jwt_secret" ]; then
        # 替换 JWT_SECRET
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env 2>/dev/null || true
        else
            sed -i "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env 2>/dev/null || true
        fi
        print_success "已自动生成安全密钥"
    fi
    
    echo ""
    print_tip "════════════════════════════════════════════════════════════"
    print_tip "  重要：请编辑 .env 文件配置 QQ 机器人参数"
    print_tip "════════════════════════════════════════════════════════════"
    echo ""
    print_info "必填配置项："
    echo "  QQ_APP_ID       = 你的QQ机器人AppID"
    echo "  QQ_CLIENT_SECRET= 你的QQ机器人ClientSecret"
    echo ""
    print_info "可选配置项："
    echo "  QQ_GATEWAY_INTENTS = 消息接收权限（默认: 3，接收私聊和群消息）"
    echo "  ADMIN_PASSWORD     = 管理员密码（默认: admin123）"
    echo ""
}

# 配置环境变量（交互式）
config_env() {
    show_banner
    print_step "配置 QQ 机器人参数"
    echo ""
    
    if [ ! -f ".env" ]; then
        init_env
    fi
    
    echo ""
    print_info "请输入 QQ 机器人配置信息（直接回车跳过保持原值）"
    echo ""
    
    # 读取当前配置
    local current_appid=$(grep "^QQ_APP_ID=" .env 2>/dev/null | cut -d'=' -f2-)
    local current_secret=$(grep "^QQ_CLIENT_SECRET=" .env 2>/dev/null | cut -d'=' -f2-)
    local current_intents=$(grep "^QQ_GATEWAY_INTENTS=" .env 2>/dev/null | cut -d'=' -f2-)
    local current_password=$(grep "^ADMIN_PASSWORD=" .env 2>/dev/null | cut -d'=' -f2-)
    
    # QQ_APP_ID
    echo -e "${CYAN}QQ机器人 AppID${NC}（当前: ${YELLOW}${current_appid:-未设置}${NC}）"
    read -p "请输入: " appid
    if [ -n "$appid" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^QQ_APP_ID=.*/QQ_APP_ID=$appid/" .env
        else
            sed -i "s/^QQ_APP_ID=.*/QQ_APP_ID=$appid/" .env
        fi
    fi
    
    # QQ_CLIENT_SECRET
    echo ""
    echo -e "${CYAN}QQ机器人 ClientSecret${NC}（当前: ${YELLOW}${current_secret:-未设置}${NC}）"
    read -p "请输入: " secret
    if [ -n "$secret" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^QQ_CLIENT_SECRET=.*/QQ_CLIENT_SECRET=$secret/" .env
        else
            sed -i "s/^QQ_CLIENT_SECRET=.*/QQ_CLIENT_SECRET=$secret/" .env
        fi
    fi
    
    # QQ_GATEWAY_INTENTS
    echo ""
    echo -e "${CYAN}消息接收权限 Intents${NC}（当前: ${YELLOW}${current_intents:-3}${NC}）"
    echo "  1 = 仅私聊消息"
    echo "  2 = 仅群消息"
    echo "  3 = 私聊+群消息（推荐）"
    read -p "请选择 (1/2/3): " intents_choice
    case $intents_choice in
        1) intents=1 ;;
        2) intents=2 ;;
        3) intents=3 ;;
        *) intents=${current_intents:-3} ;;
    esac
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/^QQ_GATEWAY_INTENTS=.*/QQ_GATEWAY_INTENTS=$intents/" .env
    else
        sed -i "s/^QQ_GATEWAY_INTENTS=.*/QQ_GATEWAY_INTENTS=$intents/" .env
    fi
    
    # ADMIN_PASSWORD
    echo ""
    echo -e "${CYAN}管理员密码${NC}（当前: ${YELLOW}${current_password:-admin123}${NC}）"
    read -p "请输入新密码: " password
    if [ -n "$password" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=$password/" .env
        else
            sed -i "s/^ADMIN_PASSWORD=.*/ADMIN_PASSWORD=$password/" .env
        fi
    fi
    
    echo ""
    print_success "配置已保存！"
}

# 安装依赖
install_dependencies() {
    print_step "正在安装项目依赖..."
    echo ""
    
    print_info "这可能需要几分钟，请耐心等待..."
    echo ""
    
    # 安装根目录依赖
    npm install --silent 2>&1 | while read -r line; do
        # 只显示关键信息
        if [[ "$line" == *"error"* ]] || [[ "$line" == *"warn"* ]]; then
            echo "$line"
        fi
    done
    
    echo ""
    print_success "依赖安装完成！"
}

# 一键部署（Docker 容器化部署）
deploy_local() {
    show_banner
    print_step "🚀 开始一键部署（Docker 容器化）..."
    echo ""
    
    # 检查 Docker
    if ! check_command docker; then
        print_error "Docker 未安装，无法进行一键部署"
        echo ""
        print_tip "安装方法："
        echo "  Ubuntu/Debian: curl -fsSL https://get.docker.com | sh"
        echo "  CentOS/RHEL:   curl -fsSL https://get.docker.com | sh"
        echo "  macOS:         brew install --cask docker"
        echo "  Windows:       访问 https://www.docker.com/products/docker-desktop"
        echo ""
        wait_key
        return 1
    fi
    
    # 检查 Docker Compose
    if ! check_command docker-compose && ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装"
        echo ""
        print_tip "Docker Compose 通常随 Docker 一起安装，请检查 Docker 版本"
        echo ""
        wait_key
        return 1
    fi
    
    # 初始化环境（静默模式，只创建 .env 文件）
    if [ ! -f ".env" ]; then
        cp .env.example .env
        # 生成随机 JWT 密钥
        local jwt_secret=$(openssl rand -hex 32 2>/dev/null || node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null)
        if [ -n "$jwt_secret" ]; then
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env 2>/dev/null || true
            else
                sed -i "s/JWT_SECRET=.*/JWT_SECRET=$jwt_secret/" .env 2>/dev/null || true
            fi
        fi
        print_success "已创建配置文件 .env"
    else
        print_info "检测到已有配置文件"
    fi
    
    echo ""
    print_info "正在构建并启动 Docker 容器..."
    echo ""
    print_tip "首次运行需要下载镜像并构建，可能需要较长时间..."
    echo ""
    
    # 使用 docker-compose 或 docker compose
    if check_command docker-compose; then
        docker-compose up -d --build
    else
        docker compose up -d --build
    fi
    
    echo ""
    print_success "════════════════════════════════════════════════════════════"
    print_success "              🎉 一键部署完成！                              "
    print_success "════════════════════════════════════════════════════════════"
    echo ""
    print_info "容器状态："
    if check_command docker-compose; then
        docker-compose ps
    else
        docker compose ps
    fi
    echo ""
    print_info "访问地址："
    echo "  前端界面: http://localhost:5173"
    echo "  后端 API: http://localhost:3000"
    echo ""
    print_info "常用命令："
    echo "  查看日志: docker-compose logs -f qqbot"
    echo "  停止服务: docker-compose down"
    echo "  重启服务: docker-compose restart qqbot"
    echo ""
    print_tip "════════════════════════════════════════════════════════════"
    print_tip "  登录 WebUI 后可在「配置」页面配置 QQ 机器人参数"
    print_tip "  默认管理员密码: admin123（首次登录需修改）"
    print_tip "════════════════════════════════════════════════════════════"
    echo ""
}

# 启动服务
start_services() {
    show_banner
    print_step "正在启动服务..."
    echo ""
    
    # 检查是否已安装依赖
    if [ ! -d "node_modules" ]; then
        print_warn "未检测到依赖，正在安装..."
        install_dependencies
    fi
    
    # 后台启动后端
    print_info "启动后端服务..."
    npm run dev:backend > logs/backend.log 2>&1 &
    echo $! > logs/backend.pid 2>/dev/null || true
    
    # 等待后端启动
    sleep 3
    
    # 后台启动前端
    print_info "启动前端服务..."
    npm run dev:webui > logs/webui.log 2>&1 &
    echo $! > logs/webui.pid 2>/dev/null || true
    
    sleep 2
    
    echo ""
    print_success "服务已启动！"
    echo ""
    print_info "访问地址："
    echo "  前端界面: http://localhost:5173"
    echo "  后端 API: http://localhost:3000"
    echo ""
    print_info "日志文件："
    echo "  后端日志: logs/backend.log"
    echo "  前端日志: logs/webui.log"
    echo ""
    print_tip "按 Ctrl+C 可停止服务"
    echo ""
    
    # 等待用户中断
    wait
}

# Docker 部署
deploy_docker() {
    show_banner
    print_step "🐳 开始 Docker 部署..."
    echo ""
    
    # 检查 Docker
    if ! check_command docker; then
        print_error "Docker 未安装，无法进行 Docker 部署"
        echo ""
        print_tip "安装方法："
        echo "  Ubuntu/Debian: curl -fsSL https://get.docker.com | sh"
        echo "  CentOS/RHEL:   curl -fsSL https://get.docker.com | sh"
        echo "  macOS:         brew install --cask docker"
        echo "  Windows:       访问 https://www.docker.com/products/docker-desktop"
        echo ""
        wait_key
        return 1
    fi
    
    # 检查 Docker Compose
    if ! check_command docker-compose && ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装"
        echo ""
        print_tip "Docker Compose 通常随 Docker 一起安装，请检查 Docker 版本"
        echo ""
        wait_key
        return 1
    fi
    
    # 初始化环境
    if [ ! -f ".env" ]; then
        init_env
    fi
    
    echo ""
    print_info "正在构建并启动 Docker 容器..."
    echo ""
    print_tip "首次运行需要下载镜像，可能需要较长时间..."
    echo ""
    
    # 使用 docker-compose 或 docker compose
    if check_command docker-compose; then
        docker-compose up -d --build
    else
        docker compose up -d --build
    fi
    
    echo ""
    print_success "════════════════════════════════════════════════════════════"
    print_success "              🎉 Docker 部署完成！                           "
    print_success "════════════════════════════════════════════════════════════"
    echo ""
    print_info "容器状态："
    if check_command docker-compose; then
        docker-compose ps
    else
        docker compose ps
    fi
    echo ""
    print_info "访问地址："
    echo "  前端界面: http://localhost:5173"
    echo "  后端 API: http://localhost:3000"
    echo "  MySQL:    localhost:3307 (用户: qqbot, 密码: qqbot)"
    echo "  Redis:    localhost:6380"
    echo ""
    print_info "常用命令："
    echo "  查看日志: docker-compose logs -f qqbot"
    echo "  停止服务: docker-compose down"
    echo "  重启服务: docker-compose restart qqbot"
    echo ""
}

# 生产构建
build_production() {
    show_banner
    print_step "📦 开始生产构建..."
    echo ""
    
    if ! check_dependencies; then
        wait_key
        return 1
    fi
    
    echo ""
    install_dependencies
    
    echo ""
    print_info "正在构建生产版本..."
    npm run build
    
    echo ""
    print_success "════════════════════════════════════════════════════════════"
    print_success "              🎉 生产构建完成！                              "
    print_success "════════════════════════════════════════════════════════════"
    echo ""
    print_info "构建产物："
    echo "  后端: backend/dist/"
    echo "  前端: webui/dist/"
    echo ""
    print_tip "部署建议："
    echo "  1. 将构建产物上传到服务器"
    echo "  2. 配置反向代理 (nginx/caddy)"
    echo "  3. 使用 PM2 管理后端进程: pm2 start backend/dist/index.js"
    echo ""
}

# 停止服务
stop_services() {
    show_banner
    print_step "🛑 正在停止服务..."
    echo ""
    
    # 停止 Docker 服务
    if check_command docker; then
        if check_command docker-compose; then
            docker-compose down 2>/dev/null && print_info "已停止 Docker 服务" || true
        elif docker compose version &> /dev/null; then
            docker compose down 2>/dev/null && print_info "已停止 Docker 服务" || true
        fi
    fi
    
    # 停止本地进程
    local stopped=false
    
    for port in 3000 3001 5173; do
        local pid=$(lsof -ti:$port 2>/dev/null || true)
        if [ -n "$pid" ]; then
            kill -9 $pid 2>/dev/null || true
            stopped=true
            print_info "已停止端口 $port 上的服务"
        fi
    done
    
    # 停止通过 pid 文件记录的进程
    if [ -f "logs/backend.pid" ]; then
        local pid=$(cat logs/backend.pid 2>/dev/null)
        if [ -n "$pid" ] && kill -0 $pid 2>/dev/null; then
            kill $pid 2>/dev/null || true
            print_info "已停止后端服务 (PID: $pid)"
        fi
        rm -f logs/backend.pid
    fi
    
    if [ -f "logs/webui.pid" ]; then
        local pid=$(cat logs/webui.pid 2>/dev/null)
        if [ -n "$pid" ] && kill -0 $pid 2>/dev/null; then
            kill $pid 2>/dev/null || true
            print_info "已停止前端服务 (PID: $pid)"
        fi
        rm -f logs/webui.pid
    fi
    
    echo ""
    if [ "$stopped" = true ]; then
        print_success "服务已停止！"
    else
        print_info "没有发现运行中的服务"
    fi
    echo ""
}

# 查看状态
show_status() {
    show_banner
    print_step "📊 服务状态"
    echo ""
    
    # 检查 Docker 容器状态
    if check_command docker; then
        local containers=$(docker ps -a --filter "name=qqbot-" --format "{{.Names}}" 2>/dev/null)
        if [ -n "$containers" ]; then
            print_info "Docker 容器："
            docker ps -a --filter "name=qqbot-" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null
            echo ""
        fi
    fi
    
    # 检查端口占用
    print_info "本地服务："
    echo ""
    
    local ports=(3000 3001 5173 3307 6380)
    local services=("后端API(本地)" "后端API(Docker)" "前端界面" "MySQL(Docker)" "Redis(Docker)")
    
    for i in "${!ports[@]}"; do
        local port=${ports[$i]}
        local service=${services[$i]}
        if lsof -i:$port &> /dev/null; then
            echo -e "  ${GREEN}●${NC} 端口 $port - $service ${GREEN}运行中${NC}"
        else
            echo -e "  ${RED}○${NC} 端口 $port - $service ${RED}未运行${NC}"
        fi
    done
    
    echo ""
    
    # 检查配置文件
    print_info "配置文件："
    if [ -f ".env" ]; then
        echo -e "  ${GREEN}●${NC} .env 配置文件已存在"
        local appid=$(grep "^QQ_APP_ID=" .env 2>/dev/null | cut -d'=' -f2-)
        if [ -n "$appid" ]; then
            echo -e "    QQ_APP_ID: ${YELLOW}$appid${NC}"
        else
            echo -e "    ${RED}QQ_APP_ID 未配置${NC}"
        fi
    else
        echo -e "  ${RED}○${NC} .env 配置文件不存在"
    fi
    
    echo ""
}

# 主循环
main() {
    # 创建日志目录
    mkdir -p logs
    
    while true; do
        show_banner
        show_menu
        
        read -p "请输入选项编号 [0-7]: " choice
        echo ""
        
        case $choice in
            1)
                deploy_local
                wait_key
                ;;
            2)
                deploy_docker
                wait_key
                ;;
            3)
                build_production
                wait_key
                ;;
            4)
                show_banner
                check_dependencies
                echo ""
                install_dependencies
                wait_key
                ;;
            5)
                config_env
                wait_key
                ;;
            6)
                show_status
                wait_key
                ;;
            7)
                stop_services
                wait_key
                ;;
            0)
                show_banner
                print_info "感谢使用，再见！"
                echo ""
                exit 0
                ;;
            *)
                print_error "无效选项，请重新选择"
                sleep 1
                ;;
        esac
    done
}

# 如果带参数运行，则执行对应命令
if [ $# -gt 0 ]; then
    case $1 in
        local)
            show_banner
            deploy_local
            ;;
        docker)
            show_banner
            deploy_docker
            ;;
        build)
            show_banner
            build_production
            ;;
        init)
            show_banner
            init_env
            ;;
        install)
            show_banner
            check_dependencies
            echo ""
            install_dependencies
            ;;
        stop)
            stop_services
            ;;
        status)
            show_status
            ;;
        help|--help|-h)
            show_banner
            echo "用法: $0 [命令]"
            echo ""
            echo "命令:"
            echo "  (无参数)    显示交互式菜单"
            echo "  local       一键部署（Docker 容器化部署）"
            echo "  docker      Docker 容器化部署"
            echo "  build       生产构建"
            echo "  init        初始化环境配置"
            echo "  install     安装依赖"
            echo "  stop        停止所有服务"
            echo "  status      查看服务状态"
            echo "  help        显示帮助信息"
            echo ""
            echo "示例:"
            echo "  $0           # 显示交互式菜单（推荐新手）"
            echo "  $0 local     # 一键 Docker 部署"
            echo "  $0 docker    # Docker 部署"
            echo "  $0 status    # 查看状态"
            ;;
        *)
            print_error "未知命令: $1"
            echo "运行 '$0 help' 查看帮助"
            exit 1
            ;;
    esac
else
    # 无参数运行，显示交互式菜单
    main
fi
