#!/bin/bash
# ═══ macOS Demo APK 构建脚本（无 Gradle，纯手工工具链） ═══
set -e
SDK=/workspace/android-sdk
AJAR=$SDK/platform/android30.jar
BT=$SDK/build-tools
P=/workspace/macos/android
B=$P/build
OUT=/workspace/macos/dist

echo '[1/6] 准备目录与资源'
rm -rf "$B" "$P/assets"
mkdir -p "$B/gen" "$B/classes" "$B/dex" "$P/assets" "$OUT"
python3 /workspace/macos/ota-pack.py   # 生成出厂基线 ota-manifest.json + 刷新 OTA 哈希
cp -r /workspace/macos/web/. "$P/assets/"

echo '[2/6] aapt 打包资源 + 生成 R.java'
aapt package -f -m -J "$B/gen" -M "$P/AndroidManifest.xml" -S "$P/res" -I "$AJAR"

echo '[3/6] javac 编译'
javac -source 8 -target 8 -cp "$AJAR" -d "$B/classes" \
  $(find "$P/src" -name '*.java') "$B"/gen/com/cetacea/macos/R.java

echo '[4/6] d8 编译 DEX'
java -cp "$BT/lib/d8.jar" com.android.tools.r8.D8 --lib "$AJAR" --min-api 21 --output "$B/dex" $(find "$B/classes" -name '*.class')

echo '[5/6] 组装 APK'
aapt package -f -M "$P/AndroidManifest.xml" -S "$P/res" -A "$P/assets" -I "$AJAR" -F "$B/unsigned.apk"
cd "$B/dex" && aapt add ../unsigned.apk classes.dex >/dev/null
cd "$B"
zipalign -f 4 "$B/unsigned.apk" "$B/aligned.apk"

echo '[6/6] 签名'
if [ ! -f "$P/debug.keystore" ]; then
  keytool -genkeypair -keystore "$P/debug.keystore" -alias macos \
    -storepass android -keypass android -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=macOS,O=Cetacea,C=CN" 2>/dev/null
fi
java -jar "$BT/lib/apksigner.jar" sign --ks "$P/debug.keystore" \
  --ks-pass pass:android --key-pass pass:android \
  --min-sdk-version 21 --v1-signing-enabled true --v2-signing-enabled true \
  --out "$OUT/macOS.apk" "$B/aligned.apk"
rm -f "$OUT/macOS.apk.idsig"
java -jar "$BT/lib/apksigner.jar" verify --print-certs "$OUT/macOS.apk" | head -3
ls -la "$OUT/macOS.apk"
echo 'BUILD_OK'
