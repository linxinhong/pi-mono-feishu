# pi-claw 项目指令

## 部署

当用户说"部署到 claw"时，执行以下操作：
1. git add & commit
2. git push
3. claw "cd ~/pi-claw && git pull"

## 日志查看

服务器日志位置：
```
~/.pi-claw/logs/
├── debug.log       # Debug 插件日志（工具调用、会话等）
├── feishu.log      # 飞书适配器日志
├── pi-claw.log     # 主程序日志
└── pi-claw.error.log  # 错误日志
```

常用日志查看命令：
- 主日志：`claw "cat ~/.pi-claw/logs/pi-claw.log | tail -100"`
- Debug日志：`claw "cat ~/.pi-claw/logs/debug.log | tail -100"`
- 错误日志：`claw "cat ~/.pi-claw/logs/pi-claw.error.log | tail -50"`
