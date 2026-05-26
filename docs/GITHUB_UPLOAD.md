# 上传到 GitHub 指南

本地已完成首次提交（**不含密钥**）。按以下步骤推送到 GitHub。

## 已排除的敏感文件（不会上传）

- `backend/.env`
- `backend/data/`（加密 API 配置）
- `uploads/videos/`、`uploads/covers/` 中的实际文件
- `node_modules/`、`*.db`

## 方式一：GitHub 网页 + 命令行（推荐）

### 1. 在 GitHub 创建仓库

1. 打开 https://github.com/new
2. 仓库名例如：`short-drama-interactive`（自定）
3. 选择 **Private**（建议私有）
4. **不要**勾选 "Add a README"（本地已有）
5. 点击 Create repository

### 2. 推送代码

将下面命令中的 `你的用户名` 和 `仓库名` 替换后，在 PowerShell 执行：

```powershell
cd c:\Users\hp\Desktop\L

git remote add origin https://github.com/你的用户名/仓库名.git
git push -u origin main
```

首次推送会要求登录 GitHub（浏览器或 Personal Access Token）。

## 方式二：安装 GitHub CLI

```powershell
# 安装后执行
gh auth login
cd c:\Users\hp\Desktop\L
gh repo create short-drama-interactive --private --source=. --remote=origin --push
```

## 克隆到新电脑后

```powershell
git clone https://github.com/你的用户名/仓库名.git
cd 仓库名
cd backend && npm install
cd ../frontend && npm install
copy backend\.env.example backend\.env
# 启动服务后，在管理后台「API 配置」重新填写豆包密钥
```

## 安全提醒

- 推送前可运行：`git status` 确认没有 `.env` 或 `backend/data`
- 若曾误提交密钥，需在火山方舟控制台**轮换 API Key**
