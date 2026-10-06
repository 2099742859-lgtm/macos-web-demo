# macOS Web Demo · Web 版

macOS 网页还原，纯静态站点。

**在线体验（GitHub Pages）**：https://2099742859-lgtm.github.io/macos-web-demo/

**APK 下载（完整功能版）**：[Releases](https://github.com/2099742859-lgtm/macos-web-demo/releases)（见 `main` 分支）

## 自行部署

把本分支内容放到任意静态服务器根目录即可（Nginx / Vercel / OSS 均可）。

```bash
# 本地预览
python3 -m http.server 8080
```

## 与 APK 版的区别

- 无原生桥：Safari 用 iframe 渲染，音量/截屏/录音等硬件能力降级或走 Web API
- 跨域请求受浏览器 CORS 限制
- 无 OTA（直接换文件即更新）
