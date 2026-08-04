# GitHub Actions CI/CD 设置指南

## 1. 创建 GitHub 仓库

1. 在 GitHub 上创建新仓库（例如 `pixel-monitor`）
2. 添加 GitHub 远程仓库：

```bash
git remote add github https://github.com/YOUR_USERNAME/pixel-monitor.git
```

3. 推送代码：

```bash
git push github main
```

## 2. 配置 GitHub Secrets

在 GitHub 仓库的 **Settings → Secrets and variables → Actions** 中添加以下 Secrets：

| Secret 名称 | 说明 | 示例 |
|-------------|------|------|
| `SERVER_HOST` | 服务器 IP 地址 | `125.77.158.41` |
| `SERVER_USER` | SSH 用户名 | `root` |
| `SSH_PRIVATE_KEY` | SSH 私钥内容 | 见下方 |

### 生成 SSH 密钥（如果还没有）

```bash
# 在本地生成密钥对
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions -N ""

# 将公钥添加到服务器
ssh-copy-id -i ~/.ssh/github_actions.pub root@125.77.158.41

# 复制私钥内容（添加到 GitHub Secrets）
cat ~/.ssh/github_actions
```

将私钥内容完整复制，粘贴到 `SSH_PRIVATE_KEY` Secret 中。

## 3. 创建服务器目录

在服务器上创建部署目录：

```bash
ssh root@125.77.158.41
mkdir -p /opt/pixel-monitor
```

## 4. 触发部署

配置完成后，每次推送到 `main` 或 `master` 分支都会自动触发部署：

```bash
git add .
git commit -m "Your changes"
git push github main
```

也可以在 GitHub Actions 页面手动触发（workflow_dispatch）。

## 5. 查看部署状态

在 GitHub 仓库的 **Actions** 标签页可以查看部署进度和日志。

## 注意事项

- 确保服务器已安装 Docker 和 Docker Compose
- 确保服务器防火墙开放 3086 端口
- 部署失败时会自动显示容器日志用于排查
