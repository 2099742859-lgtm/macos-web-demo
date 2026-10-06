# macOS Web Demo

macOS 网页还原 · Android APK。纯 HTML/CSS/JS，无框架。
**在线体验（GitHub Pages）**：https://2099742859-lgtm.github.io/macos-web-demo/

**APK 下载**：[Releases](https://github.com/2099742859-lgtm/macos-web-demo/releases)


## 构建

```bash
cd android && ./build.sh
# 输出 dist/macOS.apk
```

需要：Android SDK（platform android-30 + build-tools）、JDK 8+。

## 结构

```
android/   WebView 壳 + Java 桥
web/       全部界面与逻辑
ota/       差量更新清单
```

## 素材致谢

- [PuruVJ/macos-web](https://github.com/PuruVJ/macos-web)（MIT）
- [ful1e5/apple_cursor](https://github.com/ful1e5/apple_cursor)（GPL）

仅供学习演示，与 Apple Inc. 无关。
