# macOS Web Demo (Android APK)

> 在 Android 上跑的 macOS Sequoia 网页还原——单 WebView 承载，打包成 APK 安装即用。

![平台](https://img.shields.io/badge/platform-Android-blue) ![无需 Gradle](https://img.shields.io/badge/build-no%20Gradle-green) ![大小](https://img.shields.io/badge/APK-~3.4MB-orange)

## ✨ 特性

- **完整开机流程**：Apple logo → 变速进度条 → 锁屏 → 桌面
- **虚拟舞台缩放**：横竖屏自动适配（逻辑分辨率 + transform scale）
- **窗口系统**：拖动 / 缩放 / 红绿灯 / 精灵最小化吸入 Dock / Sequoia 边缘分屏 / 调度中心 / App 切换器（⌘Tab）
- **Dock**：参考 macos-web 的抛物线放大算法，自动隐藏 / 左右位置 / 大小可调
- **菜单栏**：全部真功能（编辑命令真实作用于输入框、前往直达文件夹、显示真切视图）
- **深色模式** / 6 色强调色 / 8 张官方壁纸 + Picsum 在线壁纸
- **真联网**：Safari 窗口化原生浏览器（多标签 · 电脑模式 · 下载到 Download 目录）、高德 JS API 地图、Open-Meteo 实时天气、iTunes 音乐试听 / 播客 RSS
- **真硬件**：Photo Booth 拍照（前后摄 + 滤镜）、语音备忘录录音、真实 WiFi / 蓝牙信息、真音量控制、PixelCopy 截屏存相册、相册导入
- **真文件系统**：终端 mkdir/touch/rm/zip/unzip（JSZip）/wget 与访达互通，localStorage + IndexedDB 双层持久化
- **App Store 真能装应用**：2048 / 贪吃蛇 / 扫雷 / 白噪音（Web Audio 合成）/ 番茄钟 / 指南针
- **虚拟鼠标指针**：ful1e5/apple_cursor 正版光标素材，指针随触点，手型/I 型自动切换
- 语音备忘录 / 录音 / 真实电池电量 / 刘海全屏

## 📦 构建

无需 Gradle，纯手工工具链（aapt + javac + d8 + zipalign + apksigner）：

```bash
cd android && ./build.sh
# 输出 dist/macOS.apk
```

需要：Android SDK（platform android-30 + build-tools）、JDK 8+。

## 🗂 结构

```
android/          # 壳：MainActivity（WebView + Java 桥 + 窗口化浏览器 + 下载器 + 截屏）
web/              # 全部界面（纯 HTML/CSS/JS，无框架）
  js/icons.js     # SVG 图标库 + SF Symbols 字形
  js/apps.js      # 30+ 应用实现
  js/main.js      # 窗口管理器 / Dock / 菜单栏 / 系统服务
  icons/          # 正版 macOS 应用图标（macos-web, MIT）
  cursors/        # 光标素材（ful1e5/apple_cursor）
  wall/           # 官方壁纸（macos-web, MIT）
```

## 🙏 致谢素材

- [PuruVJ/macos-web](https://github.com/PuruVJ/macos-web) — 应用图标 / 壁纸 / Dock 放大算法参考（MIT）
- [ful1e5/apple_cursor](https://github.com/ful1e5/apple_cursor) — macOS 光标素材（GPL）
- Open-Meteo / iTunes Search API / 高德地图 JS API / Picsum

仅供学习演示，与 Apple Inc. 无关。
