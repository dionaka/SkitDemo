# B 站 Cookie（链接解析 / 下载）

将浏览器导出的 **Netscape 格式** Cookie 保存为：

```text
~/SkitDemo/uploads/cookies/bili_cookies.txt
```

（与 `backend/cookies/bili_cookies.txt` 二选一，优先读取 `uploads` 目录）

## 获取步骤

1. 浏览器安装扩展 [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/get-cookiestxt-locally/cclelndahbckbenkjhflpdbgdldlbecc)（或同类）
2. 打开 [bilibili.com](https://www.bilibili.com) 并**登录**
3. 点击扩展 → Export → 复制全部内容
4. 粘贴到本文件（需包含 `.bilibili.com` 与 `SESSDATA` 等字段）

也可在 `backend/.env` 中指定路径：

```env
BILI_COOKIES_PATH=/home/ecs-user/SkitDemo/uploads/cookies/bili_cookies.txt
```

## 说明

- B 站对未登录 / 无 Cookie 请求常返回 **HTTP 412**，yt-dlp 无法下载
- 配置 Cookie 后需重启后端；Cookie 过期需重新导出
- 更新 yt-dlp：`~/SkitDemo/backend/bin/yt-dlp -U` 或 `pip install -U yt-dlp`
