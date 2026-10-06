# macOS Web Demo · Web 版

macOS 网页还原，纯静态站点——扔到任何静态服务器（GitHub Pages / Nginx / Vercel）就能跑。

## 部署

```bash
# 把 web/ 目录内容放到站点根目录即可
# 本地预览：
cd web && python3 -m http.server 8080
```

## 与 APK 版的区别

- 无原生桥：Safari 用 iframe 渲染、音量/截屏/录音等硬件能力降级或走 Web API
- 跨域请求受浏览器 CORS 限制
- 无 OTA（服务器上直接换文件就是更新）

APK 版见 `main` 分支。
