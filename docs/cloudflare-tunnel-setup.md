# 使用 Cloudflare Tunnel 部署 Slidev

使用 Cloudflare Tunnel 可以：
- ✅ 无需公网 IP 和开放端口
- ✅ 自动 HTTPS 证书
- ✅ 配合 Cloudflare Access 进行身份验证
- ✅ 隐藏真实服务器地址
- ✅ 全球 CDN 加速

## 方案对比

| 方案 | 安全性 | 复杂度 | 成本 |
|------|--------|--------|------|
| 当前直接访问 | ⭐⭐ | 低 | 免费 |
| Cloudflare Tunnel | ⭐⭐⭐⭐⭐ | 中 | 免费 |
| + Cloudflare Access | ⭐⭐⭐⭐⭐ | 中 | 免费（50用户以内）|

## 步骤一：安装 Cloudflare Tunnel

### 1. 安装 cloudflared

```bash
# 在服务器上执行（root@8.166.130.56）

# 下载安装包
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# 安装
dpkg -i cloudflared-linux-amd64.deb

# 验证安装
cloudflared --version
```

### 2. 登录 Cloudflare

```bash
# 执行登录命令，会显示一个链接，在浏览器中打开并授权
cloudflared tunnel login
```

运行后会显示类似：
```
Please open the following URL and log in with your Cloudflare account:

https://dash.cloudflare.com/argotunnel?callback=https%3A%2F%2Flocalhost%3A...

Leave cloudflared running to download the cert automatically.
```

在浏览器中打开链接，选择你的域名，点击"Authorize"。

## 步骤二：创建 Tunnel

```bash
# 创建 tunnel，名称可以自定义，例如 "pi-claw"
cloudflared tunnel create pi-claw

# 会输出类似：
# Tunnel credentials written to /root/.cloudflared/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx.json
# cloudflared will attempt to read the credentials from the above file
# if not provided explicitly
```

记录生成的 Tunnel ID（上面的文件名中的 UUID）。

## 步骤三：配置 Tunnel

创建配置文件：

```bash
# 获取你的域名
DOMAIN="your-domain.com"  # 替换为你的 Cloudflare 域名
TUNNEL_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"  # 替换为上面生成的 ID

cat > ~/.cloudflared/config.yml << EOF
tunnel: ${TUNNEL_ID}
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json

ingress:
  # Slidev 服务
  - hostname: slidev.${DOMAIN}
    service: http://localhost:3000
  
  # 可选：pi-claw 主服务
  - hostname: pi-claw.${DOMAIN}
    service: http://localhost:3000
  
  # 默认规则
  - service: http_status:404
EOF
```

## 步骤四：运行 Tunnel

### 方式 1：直接运行（测试）

```bash
cloudflared tunnel run pi-claw
```

看到类似输出表示成功：
```
INF Connection registered ...
INF Tunnel server started
```

### 方式 2：后台运行（生产）

```bash
# 安装为系统服务
cloudflared service install

# 启动服务
systemctl start cloudflared

# 查看状态
systemctl status cloudflared

# 设置开机自启
systemctl enable cloudflared
```

## 步骤五：配置 DNS

```bash
# 将域名指向 tunnel
DOMAIN="your-domain.com"
TUNNEL_ID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

cloudflared tunnel route dns pi-claw slidev.${DOMAIN}
# 可选：cloudflared tunnel route dns pi-claw pi-claw.${DOMAIN}
```

现在访问 `https://slidev.your-domain.com/slidev/` 即可。

## 步骤六：（可选）配置 Cloudflare Access

这是**访问控制**的关键！可以限制只有特定用户/邮箱能访问。

### 1. 登录 Cloudflare Dashboard

访问 https://dash.cloudflare.com/ → 选择你的域名 → Access → Applications

### 2. 创建 Access Application

点击 "Add an application" → 选择 "Self-hosted"

填写：
- **Application name**: `Slidev`
- **Session duration**: `24 hours`
- **Subdomain**: `slidev`
- **Domain**: `your-domain.com`
- **Path**: `/slidev/*`

### 3. 配置身份验证策略

添加规则：

**规则 1：允许特定邮箱**
```
Include: Emails
Emails: user1@company.com, user2@company.com
```

**规则 2：允许邮箱域名**
```
Include: Emails ending in
Domain: @company.com
```

**规则 3：允许飞书登录（需要配置 OIDC）**
```
Include: Authentication method
Method: Feishu (需要先在 IdP 配置)
```

### 4. 飞书 OIDC 配置（高级）

如果你想用飞书登录 Cloudflare Access：

1. 飞书开放平台 → 你的应用 → 凭证与基础信息
2. 记录 App ID 和 App Secret
3. Cloudflare Access → IdP 配置 → 添加 OIDC
   - Name: `Feishu`
   - App ID: `cli_xxx`
   - App Secret: `xxx`
   - Auth URL: `https://open.feishu.cn/open-apis/authen/v1/index`
   - Token URL: `https://open.feishu.cn/open-apis/authen/v1/access_token`
   - User info URL: `https://open.feishu.cn/open-apis/authen/v1/user_info`
   - Scopes: `user_info`

## 完整部署脚本

保存为 `setup-cloudflare-tunnel.sh`：

```bash
#!/bin/bash
set -e

# 配置
DOMAIN="${1:-your-domain.com}"
TUNNEL_NAME="${2:-pi-claw}"

echo "=== 安装 Cloudflare Tunnel ==="
echo "域名: ${DOMAIN}"
echo "Tunnel 名称: ${TUNNEL_NAME}"

# 1. 安装 cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "安装 cloudflared..."
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
fi

echo "cloudflared 版本: $(cloudflared --version)"

# 2. 检查是否已登录
if [ ! -f ~/.cloudflared/cert.pem ]; then
    echo "请先运行: cloudflared tunnel login"
    echo "在浏览器中授权后，再运行此脚本"
    exit 1
fi

# 3. 创建 tunnel
if [ ! -f ~/.cloudflared/${TUNNEL_NAME}.json ]; then
    echo "创建 tunnel: ${TUNNEL_NAME}"
    cloudflared tunnel create ${TUNNEL_NAME}
else
    echo "Tunnel 已存在"
fi

# 4. 获取 Tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep ${TUNNEL_NAME} | awk '{print $1}')
echo "Tunnel ID: ${TUNNEL_ID}"

# 5. 创建配置
cat > ~/.cloudflared/config.yml << EOF
tunnel: ${TUNNEL_ID}
credentials-file: /root/.cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: slidev.${DOMAIN}
    service: http://localhost:3000
  - service: http_status:404
EOF

echo "配置文件已创建"

# 6. 配置 DNS
echo "配置 DNS..."
cloudflared tunnel route dns ${TUNNEL_NAME} slidev.${DOMAIN} || true

# 7. 安装为系统服务
echo "安装系统服务..."
cloudflared service install || true
systemctl enable cloudflared || true

echo ""
echo "=== 安装完成 ==="
echo "启动命令: systemctl start cloudflared"
echo "查看状态: systemctl status cloudflared"
echo "查看日志: journalctl -u cloudflared -f"
echo ""
echo "访问地址: https://slidev.${DOMAIN}/slidev/"
```

使用方法：

```bash
chmod +x setup-cloudflare-tunnel.sh
./setup-cloudflare-tunnel.sh your-domain.com pi-claw
```

## 配置飞书网页应用

使用 Cloudflare Tunnel 后，飞书网页应用配置改为：

```
桌面端首页地址: https://slidev.your-domain.com/slidev/
移动端首页地址: https://slidev.your-domain.com/slidev/

服务器域名白名单:
- slidev.your-domain.com
- *.cloudflareaccess.com (如果启用了 Access)
```

## 优势总结

### 安全性
- ✅ 无需开放服务器端口（Tunnel 是出站连接）
- ✅ 自动 HTTPS，无需配置证书
- ✅ 可隐藏真实服务器 IP
- ✅ Cloudflare DDoS 防护
- ✅ 可配置 Access 身份验证

### 便捷性
- ✅ 无需公网 IP
- ✅ 无需配置防火墙
- ✅ 全球 CDN 加速
- ✅ 自动证书续期

### 访问控制
- ✅ 邮箱白名单
- ✅ 邮箱域名白名单
- ✅ 飞书/企业微信/钉钉登录
- ✅ 一次性密码 (OTP)
- ✅ IP 白名单

## 参考文档

- [Cloudflare Tunnel 官方文档](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [Cloudflare Access 官方文档](https://developers.cloudflare.com/cloudflare-one/applications/)
- [Cloudflare Access + 飞书 OIDC](https://developers.cloudflare.com/cloudflare-one/identity/idp-integration/generic-oidc/)
