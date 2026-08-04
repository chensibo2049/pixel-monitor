# 像素课代表

面向大学生与政务单位的垂直 AI 生图网站：文字生图、参考图生成、账号 Logo、局部重绘、四图变体、透明背景、案例配方、校园代理分站与后台定价。

## 数据与存储

- 不使用 R2 或其他对象存储。
- SQLite 数据库位于 `DATA_DIR/pixel-monitor.db`。
- 用户生成图片位于 `DATA_DIR/images/`。
- 每个账号保存的 Logo 位于 `DATA_DIR/brand-assets/`，数据库记录默认说明、默认位置和是否自动使用。
- 应用每天自动把 SQLite 在线备份到 `DATA_DIR/backups/`，保留最近 14 份；超时订单会自动退款并清理残留文件。
- Docker 部署时把宿主机 `./data` 挂载到容器 `/app/data`，重启或更新容器不会丢数据。
- 自动备份只覆盖数据库；生产环境仍应定期异地备份整个 `data` 目录，才能同时保护原图。

## 本地开发

需要 Node.js 22+：

```bash
cp .env.example .env
npm install
npm run dev
```

打开终端显示的本地地址。首次注册赠送 30 积分；如果未配置 `ADMIN_EMAILS`，第一个访问后台的账号会成为站长。

## 环境变量

```dotenv
IMAGE_API_KEY=服务端生图密钥
IMAGE_API_BASE_URL=https://你的兼容服务/v1
ADMIN_EMAILS=站长邮箱,第二个管理员邮箱
AUTH_SECRET=至少32位随机字符串
DATA_DIR=./data
```

密钥只由 Next.js 服务端读取，不会发送到浏览器。已在聊天中暴露过的密钥建议到供应商后台轮换，然后只写入服务器 `.env`。

## Docker 部署（前后端一体）

Next.js 前端、API 后端、SQLite 与图片文件由一个 Docker 服务承载：

```bash
cp .env.example .env
# 编辑 .env
docker compose up -d --build
```

默认映射到服务器 `3086` 端口。健康检查：

```bash
curl http://127.0.0.1:3086/api/health
```

Nginx / 1Panel 反向代理到 `http://127.0.0.1:3086`，并关闭代理缓冲或对 `/api/generate/stream` 设置 `proxy_buffering off`，即可看到逐步生图。

更新版本前建议先备份：

```bash
tar -czf pixel-monitor-data-$(date +%F).tar.gz data
docker compose up -d --build
```

## 已接入的图片能力

- `POST /v1/images/generations`：单图或 `n=4` 四图包、WebP 80% 压缩、透明背景。
- 流式生成：服务端转发逐步预览，完成后保存最终图。
- `POST /v1/images/edits`：参考图生成、涂白蒙版局部重绘、去背景。
- `POST /v1/images/variations`：基于满意作品一次生成四个类似款。
- 账号 Logo：模型先预留安全区，生成完成后由服务端叠加原始 Logo，避免模型改字或变形。

实际支持的尺寸和字段以当前兼容生图服务为准；失败订单会自动退款并记录原因。
