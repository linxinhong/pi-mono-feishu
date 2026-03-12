#!/bin/bash
# Cloudflare Tunnel 一键部署脚本
# 在服务器上执行: bash setup-cloudflare-tunnel.sh

set -e

echo "========================================"
echo "  Cloudflare Tunnel 部署脚本"
echo "========================================"
echo ""

# 配置变量（用户修改这里）
DOMAIN="${1:-your-domain.com}"      # 你的 Cloudflare 域名
EMAIL="${2:-your-email@gmail.com}"  # 你的邮箱（用于 Access）
TUNNEL_NAME="${3:-pi-claw}"

echo "配置信息:"
echo "  域名: ${DOMAIN}"
echo "  授权邮箱: ${EMAIL}"
echo "  Tunnel 名称: ${TUNNEL_NAME}"
echo ""

# 步骤 1: 安装 cloudflared
if command -v cloudflared &> /dev/null; then
    echo "✓ cloudflared 已安装"
    cloudflared --version
else
    echo "→ 安装 cloudflared..."
    cd /tmp
    wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i cloudflared-linux-amd64.deb
    rm -f cloudflared-linux-amd64.deb
    echo "✓ 安装完成"
fi

# 步骤 2: 检查登录状态
if [ ! -f ~/.cloudflared/cert.pem ]; then
    echo ""
    echo "========================================"
    echo "  请先登录 Cloudflare"
    echo "========================================"
    echo ""
    echo "执行命令: cloudflared tunnel login"
    echo "然后在浏览器中授权"
    echo ""
    exit 1
fi

echo "✓ 已登录 Cloudflare"

# 步骤 3: 创建 tunnel
if cloudflared tunnel list | grep -q "${TUNNEL_NAME}"; then
    echo "✓ Tunnel '${TUNNEL_NAME}' 已存在"
    TUNNEL_ID=$(cloudflared tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')
else
    echo "→ 创建 tunnel: ${TUNNEL_NAME}"
    cloudflared tunnel create "${TUNNEL_NAME}"
    TUNNEL_ID=$(cloudflared tunnel list | grep "${TUNNEL_NAME}" | awk '{print $1}')
fi

echo "  Tunnel ID: ${TUNNEL_ID}"

# 步骤 4: 创建配置文件
echo "→ 创建配置文件..."

mkdir -p ~/.cloudflared

cat > ~/.cloudflared/config.yml << EOF
tunnel: ${TUNNEL_ID}
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json

# 日志设置
logfile: /var/log/cloudflared.log
loglevel: info

# 路由配置
ingress:
  # Slidev 演示
  - hostname: slidev.${DOMAIN}
    service: http://localhost:3000
    originRequest:
      noTLSVerify: true
  
  # 默认 404
  - service: http_status:404
EOF

echo "✓ 配置文件已创建"

# 步骤 5: 配置 DNS
echo "→ 配置 DNS..."
cloudflared tunnel route dns "${TUNNEL_NAME}" "slidev.${DOMAIN}" || echo "DNS 已配置或域名不存在"

# 步骤 6: 安装为系统服务
echo "→ 安装系统服务..."
cloudflared service install 2>/dev/null || true

# 步骤 7: 启动服务
echo "→ 启动服务..."
systemctl restart cloudflared 2>/dev/null || cloudflared tunnel run "${TUNNEL_NAME}" &

echo ""
echo "========================================"
echo "  部署完成！"
echo "========================================"
echo ""
echo "访问地址:"
echo "  https://slidev.${DOMAIN}/slidev/"
echo ""
echo "管理命令:"
echo "  查看状态: systemctl status cloudflared"
echo "  查看日志: tail -f /var/log/cloudflared.log"
echo "  重启服务: systemctl restart cloudflared"
echo ""
echo "下一步：配置 Cloudflare Access"
echo "  1. 登录 https://dash.cloudflare.com/"
echo "  2. 点击 Zero Trust → Access → Applications"
echo "  3. 添加 Self-hosted 应用"
echo "  4. 域名: slidev.${DOMAIN}"
echo "  5. 策略: Allow → Emails → ${EMAIL}"
echo ""
