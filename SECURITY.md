# 安全说明

## 切勿提交到 Git 的内容

| 路径 | 说明 |
|------|------|
| `backend/data/` | AES 加密后的豆包 API 配置 |
| `backend/.env` | 本地环境变量 |
| `uploads/videos/` | 用户上传的视频文件 |
| `*.db` | SQLite 数据库（含业务数据） |

## 首次部署

1. 复制 `backend/.env.example` 为 `backend/.env`
2. 启动后访问管理后台 → **API 配置**，填写豆包 Endpoint 和 API Key
3. 密钥仅保存在本机 `backend/data/secrets.vault`

## 若密钥曾误提交

1. 立即在火山方舟控制台轮换 API Key
2. 使用 `git filter-repo` 或 BFG 从历史记录中清除
3. 强制推送前通知协作者
