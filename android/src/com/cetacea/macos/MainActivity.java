package com.cetacea.macos;

import android.app.Activity;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;

public class MainActivity extends Activity {
    private WebView web;
    private FrameLayout browserLayer;
    private android.webkit.ValueCallback<android.net.Uri[]> fileCallback;

    @Override
    protected void onActivityResult(int requestCode, int resultCode, android.content.Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == 42 && fileCallback != null) {
            android.net.Uri[] uris = null;
            if (resultCode == RESULT_OK && data != null) {
                if (data.getClipData() != null) {
                    int n = data.getClipData().getItemCount();
                    uris = new android.net.Uri[n];
                    for (int i = 0; i < n; i++) uris[i] = data.getClipData().getItemAt(i).getUri();
                } else if (data.getData() != null) {
                    uris = new android.net.Uri[]{ data.getData() };
                }
            }
            fileCallback.onReceiveValue(uris);
            fileCallback = null;
        }
    }
    private final ArrayList<WebView> tabs = new ArrayList<>();
    private int activeTab = -1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView w = new WebView(this);
        WebSettings s = w.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        s.setBlockNetworkImage(false);
        s.setLoadsImagesAutomatically(true);
        s.setGeolocationEnabled(true);
        w.setWebViewClient(new WebViewClient());
        w.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                request.grant(request.getResources());
            }
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                    GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
            @Override
            public boolean onShowFileChooser(WebView view,
                    android.webkit.ValueCallback<android.net.Uri[]> cb, FileChooserParams params) {
                fileCallback = cb;
                android.content.Intent i = params.createIntent();
                try { startActivityForResult(i, 42); } catch (Exception e) { fileCallback = null; }
                return true;
            }
        });
        /* 浏览器下载器：文件存到系统 Download/ 目录 */
        w.setDownloadListener((url, ua, contentDisposition, mime, len) -> {
            try {
                String fn = contentDisposition != null && contentDisposition.contains("filename=")
                    ? contentDisposition.split("filename=")[1].replace("\"", "").split(";")[0]
                    : android.net.Uri.parse(url).getLastPathSegment();
                if (fn == null || fn.isEmpty()) fn = "download.bin";
                android.app.DownloadManager dm = (android.app.DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                android.app.DownloadManager.Request req = new android.app.DownloadManager.Request(android.net.Uri.parse(url));
                req.setTitle(fn);
                req.setMimeType(mime);
                req.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, fn);
                dm.enqueue(req);
                web.evaluateJavascript("window.__dlNotify && window.__dlNotify('" + fn.replace("'", "") + "')", null);
            } catch (Exception ignored) {}
        });
        if (android.os.Build.VERSION.SDK_INT >= 23) {
            java.util.List<String> perms = new java.util.ArrayList<>();
            perms.add("android.permission.CAMERA");
            perms.add("android.permission.ACCESS_FINE_LOCATION");
            perms.add("android.permission.ACCESS_COARSE_LOCATION");
            perms.add("android.permission.RECORD_AUDIO");
            perms.add("android.permission.ACCESS_WIFI_STATE");
            if (android.os.Build.VERSION.SDK_INT >= 31)
                perms.add("android.permission.BLUETOOTH_CONNECT");
            requestPermissions(perms.toArray(new String[0]), 1);
        }
        setContentView(w);
        web = w;
        /* 刘海全屏：内容延伸到摄像头开孔区域 */
        if (android.os.Build.VERSION.SDK_INT >= 28) {
            android.view.WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.layoutInDisplayCutoutMode = 1;   /* LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES */
            getWindow().setAttributes(lp);
        }
        w.addJavascriptInterface(new NetBridge(), "AndroidBridge");
        /* OTA：更新过的网页存私有目录，存在则加载新版 */
        java.io.File otaIndex = new java.io.File(getFilesDir(), "web/index.html");
        w.loadUrl(otaIndex.exists()
            ? "file://" + otaIndex.getAbsolutePath()
            : "file:///android_asset/index.html");
        enterImmersive();
    }

    /* ═══ 窗口化多标签浏览器 ═══ */
    private void ensureLayer() {
        if (browserLayer != null) return;
        browserLayer = new FrameLayout(this);
        android.view.ViewGroup decor = (android.view.ViewGroup) getWindow().getDecorView();
        decor.addView(browserLayer);
    }

    private WebView makeTab() {
        WebView w = new WebView(this);
        WebSettings bs = w.getSettings();
        bs.setJavaScriptEnabled(true);
        bs.setDomStorageEnabled(true);
        bs.setUseWideViewPort(true);
        bs.setLoadWithOverviewMode(true);
        bs.setBuiltInZoomControls(true);
        bs.setDisplayZoomControls(false);
        bs.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        bs.setGeolocationEnabled(true);
        /* 电脑模式：桌面版 Chrome/Mac UA */
        bs.setUserAgentString("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36");
        final int idx = tabs.size();
        w.setWebViewClient(new WebViewClient() {
            @Override
            public void onPageFinished(WebView view, String url) {
                String t = view.getTitle() == null ? "" : view.getTitle()
                        .replace("\\", "\\\\").replace("'", "\\'").replace("\n", " ");
                final String tt = t;
                web.evaluateJavascript("window.__tabState && window.__tabState(" + idx + ", '" + tt + "', '" + url + "')", null);
            }
        });
        w.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                request.grant(request.getResources());
            }
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin,
                    GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });
        /* 标签页 WebView 也支持下载 */
        w.setDownloadListener((url, ua, contentDisposition, mime, len) -> {
            try {
                String fn = contentDisposition != null && contentDisposition.contains("filename=")
                    ? contentDisposition.split("filename=")[1].replace("\"", "").split(";")[0]
                    : android.net.Uri.parse(url).getLastPathSegment();
                if (fn == null || fn.isEmpty()) fn = "download.bin";
                android.app.DownloadManager dm = (android.app.DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                android.app.DownloadManager.Request req = new android.app.DownloadManager.Request(android.net.Uri.parse(url));
                req.setTitle(fn);
                req.setMimeType(mime);
                req.setNotificationVisibility(android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setDestinationInExternalPublicDir(android.os.Environment.DIRECTORY_DOWNLOADS, fn);
                dm.enqueue(req);
                web.evaluateJavascript("window.__dlNotify && window.__dlNotify('" + fn.replace("'", "") + "')", null);
            } catch (Exception ignored) {}
        });
        return w;
    }

    private void setActive(int i) {
        activeTab = i;
        for (int j = 0; j < tabs.size(); j++)
            tabs.get(j).setVisibility(j == i ? View.VISIBLE : View.GONE);
    }

    private void positionLayer(float x, float y, float w, float h) {
        if (browserLayer == null) return;
        float d = getResources().getDisplayMetrics().density;
        FrameLayout.LayoutParams lp = (FrameLayout.LayoutParams) browserLayer.getLayoutParams();
        lp.leftMargin = (int) (x * d);
        lp.topMargin = (int) (y * d);
        lp.width = (int) (w * d);
        lp.height = (int) (h * d);
        browserLayer.setLayoutParams(lp);
    }

    class NetBridge {
        @JavascriptInterface
        public void open(String url) {
            try {
                android.content.Intent i = new android.content.Intent(
                        android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url));
                i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void browserNewTab(final String url, final float x, final float y, final float w, final float h) {
            runOnUiThread(() -> {
                ensureLayer();
                positionLayer(x, y, w, h);
                browserLayer.setVisibility(View.VISIBLE);
                WebView t = makeTab();
                tabs.add(t);
                browserLayer.addView(t, new FrameLayout.LayoutParams(-1, -1));
                setActive(tabs.size() - 1);
                t.loadUrl(url);
            });
        }

        @JavascriptInterface
        public void browserSwitchTab(final int i) {
            runOnUiThread(() -> { if (i >= 0 && i < tabs.size()) setActive(i); });
        }

        @JavascriptInterface
        public void browserCloseTab(final int i) {
            runOnUiThread(() -> {
                if (i < 0 || i >= tabs.size()) return;
                WebView t = tabs.get(i);
                browserLayer.removeView(t);
                t.destroy();
                tabs.remove(i);
                if (tabs.isEmpty()) { activeTab = -1; browserLayer.setVisibility(View.GONE); }
                else setActive(Math.min(activeTab, tabs.size() - 1));
            });
        }

        @JavascriptInterface
        public void browserCloseAll() {
            runOnUiThread(() -> {
                if (browserLayer == null) return;
                for (WebView t : tabs) { browserLayer.removeView(t); t.destroy(); }
                tabs.clear();
                activeTab = -1;
                android.view.ViewGroup decor = (android.view.ViewGroup) getWindow().getDecorView();
                decor.removeView(browserLayer);
                browserLayer = null;
            });
        }

        @JavascriptInterface
        public void browserLoadActive(final String url) {
            runOnUiThread(() -> { if (activeTab >= 0 && activeTab < tabs.size()) tabs.get(activeTab).loadUrl(url); });
        }

        @JavascriptInterface
        public void browserBack() {
            runOnUiThread(() -> { if (activeTab >= 0 && tabs.get(activeTab).canGoBack()) tabs.get(activeTab).goBack(); });
        }

        @JavascriptInterface
        public void browserForward() {
            runOnUiThread(() -> { if (activeTab >= 0 && tabs.get(activeTab).canGoForward()) tabs.get(activeTab).goForward(); });
        }

        @JavascriptInterface
        public void browserReload() {
            runOnUiThread(() -> { if (activeTab >= 0) tabs.get(activeTab).reload(); });
        }

        @JavascriptInterface
        public void moveBrowser(final float x, final float y, final float w, final float h) {
            runOnUiThread(() -> positionLayer(x, y, w, h));
        }

        @JavascriptInterface
        public void browserHide() {
            runOnUiThread(() -> { if (browserLayer != null) browserLayer.setVisibility(View.GONE); });
        }

        @JavascriptInterface
        public void browserShow() {
            runOnUiThread(() -> { if (browserLayer != null) browserLayer.setVisibility(View.VISIBLE); });
        }

        @JavascriptInterface
        public boolean isAppInstalled(String pkg) {
            try { getPackageManager().getPackageInfo(pkg, 0); return true; }
            catch (Exception e) { return false; }
        }

        @JavascriptInterface
        public void launchApp(String pkg) {
            runOnUiThread(() -> {
                try {
                    android.content.Intent i = getPackageManager().getLaunchIntentForPackage(pkg);
                    if (i != null) startActivity(i);
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface
        /* 真实 WiFi 信息 */
        public String getWifiInfo() {
            try {
                android.net.wifi.WifiManager wm = (android.net.wifi.WifiManager)
                    getApplicationContext().getSystemService(WIFI_SERVICE);
                android.net.wifi.WifiInfo i = wm.getConnectionInfo();
                String ssid = (i.getSSID() == null ? "" : i.getSSID().replace("\"", ""));
                int ip = i.getIpAddress();
                String ipStr = (ip & 0xFF) + "." + ((ip >> 8) & 0xFF) + "." + ((ip >> 16) & 0xFF) + "." + ((ip >> 24) & 0xFF);
                return "{\"ssid\":\"" + ssid + "\",\"ip\":\"" + ipStr + "\",\"speed\":" + i.getLinkSpeed()
                    + ",\"rssi\":" + i.getRssi() + ",\"on\":" + wm.isWifiEnabled() + "}";
            } catch (Exception e) { return null; }
        }

        /* 真实蓝牙信息 */
        @JavascriptInterface
        public String getBtInfo() {
            try {
                android.bluetooth.BluetoothAdapter ba = android.bluetooth.BluetoothAdapter.getDefaultAdapter();
                if (ba == null) return null;
                StringBuilder sb = new StringBuilder("{\"on\":" + ba.isEnabled() + ",\"devices\":[");
                boolean first = true;
                if (ba.isEnabled()) {
                    for (android.bluetooth.BluetoothDevice d : ba.getBondedDevices()) {
                        if (!first) sb.append(',');
                        String n = d.getName();
                        sb.append("\"").append(n == null ? "未知设备" : n.replace("\"", "")).append("\"");
                        first = false;
                    }
                }
                return sb.append("]}").toString();
            } catch (Exception e) { return null; }
        }

        /* 浏览器内容快照（被覆盖/弹层打开时显示静态画面，后台继续渲染） */
        @JavascriptInterface
        public void browserSnapshot() {
            runOnUiThread(() -> {
                if (browserLayer == null || activeTab < 0 || activeTab >= tabs.size()) return;
                try {
                    WebView w = tabs.get(activeTab);
                    if (w.getWidth() < 10 || w.getHeight() < 10) return;
                    android.graphics.Bitmap bmp = android.graphics.Bitmap.createBitmap(
                        w.getWidth(), w.getHeight(), android.graphics.Bitmap.Config.ARGB_8888);
                    android.graphics.Canvas cv = new android.graphics.Canvas(bmp);
                    w.draw(cv);
                    ByteArrayOutputStream bos = new ByteArrayOutputStream();
                    bmp.compress(android.graphics.Bitmap.CompressFormat.JPEG, 82, bos);
                    String b64 = Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP);
                    web.evaluateJavascript("window.__browserShot && window.__browserShot('data:image/jpeg;base64," + b64 + "')", null);
                } catch (Exception ignored) {}
            });
        }

        /* OTA 更新：写入更新文件到私有 web 目录 */
        @JavascriptInterface
        public boolean writeWebFile(String path, String base64) {
            try {
                java.io.File f = new java.io.File(getFilesDir(), "web/" + path);
                f.getParentFile().mkdirs();
                java.io.FileOutputStream fos = new java.io.FileOutputStream(f);
                fos.write(Base64.decode(base64, Base64.NO_WRAP));
                fos.close();
                return true;
            } catch (Exception e) { return false; }
        }

        /* 回滚：清除 OTA 更新，回到 APK 内置版 */
        @JavascriptInterface
        public void clearWebUpdate() {
            try {
                java.io.File dir = new java.io.File(getFilesDir(), "web");
                deleteRecursively(dir);
            } catch (Exception ignored) {}
        }
        private void deleteRecursively(java.io.File f) {
            if (f.isDirectory()) for (java.io.File c : f.listFiles()) deleteRecursively(c);
            f.delete();
        }

        @JavascriptInterface
        public boolean isUpdated() {
            return new java.io.File(getFilesDir(), "web/index.html").exists();
        }

        /* 跳转系统 WiFi/蓝牙设置 */
        @JavascriptInterface
        public void openSysSettings(String what) {
            try {
                String action = "wifi".equals(what)
                    ? android.provider.Settings.ACTION_WIFI_SETTINGS
                    : android.provider.Settings.ACTION_BLUETOOTH_SETTINGS;
                android.content.Intent i = new android.content.Intent(action);
                i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            } catch (Exception ignored) {}
        }

        /* 真·音量控制（媒体音量 0~100） */
        @JavascriptInterface
        public void setVolumePct(int pct) {
            try {
                android.media.AudioManager am = (android.media.AudioManager) getSystemService(AUDIO_SERVICE);
                int max = am.getStreamMaxVolume(android.media.AudioManager.STREAM_MUSIC);
                am.setStreamVolume(android.media.AudioManager.STREAM_MUSIC, Math.max(0, Math.min(max, pct * max / 100)), 0);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public int getVolumePct() {
            try {
                android.media.AudioManager am = (android.media.AudioManager) getSystemService(AUDIO_SERVICE);
                return am.getStreamVolume(android.media.AudioManager.STREAM_MUSIC) * 100
                    / am.getStreamMaxVolume(android.media.AudioManager.STREAM_MUSIC);
            } catch (Exception e) { return 50; }
        }

        /* 真·截屏：抓全屏存相册 */
        @JavascriptInterface
        public void captureScreen() {
            runOnUiThread(() -> {
                try {
                    android.view.View rv = getWindow().getDecorView().getRootView();
                    android.graphics.Bitmap bmp = android.graphics.Bitmap.createBitmap(
                        rv.getWidth(), rv.getHeight(), android.graphics.Bitmap.Config.ARGB_8888);
                    android.graphics.Canvas canvas = new android.graphics.Canvas(bmp);
                    rv.draw(canvas);
                    android.content.ContentValues cv = new android.content.ContentValues();
                    cv.put(android.provider.MediaStore.Images.Media.DISPLAY_NAME,
                        "ScreenShot-" + System.currentTimeMillis() + ".png");
                    cv.put(android.provider.MediaStore.Images.Media.MIME_TYPE, "image/png");
                    android.net.Uri uri = getContentResolver().insert(
                        android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI, cv);
                    java.io.OutputStream os = getContentResolver().openOutputStream(uri);
                    bmp.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, os);
                    os.close();
                    web.evaluateJavascript("window.__shotSaved && window.__shotSaved()", null);
                } catch (Exception ignored) {}
            });
        }

        public void downloadApk(String url, String fileName) {            try {
                android.app.DownloadManager dm =
                    (android.app.DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                android.app.DownloadManager.Request req =
                    new android.app.DownloadManager.Request(android.net.Uri.parse(url));
                req.setTitle(fileName);
                req.setMimeType("application/vnd.android.package-archive");
                req.setNotificationVisibility(
                    android.app.DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                req.setDestinationInExternalFilesDir(MainActivity.this, "apk", fileName);
                dm.enqueue(req);
            } catch (Exception ignored) {}
        }

        @JavascriptInterface
        public void fetchText(String url, String cb) { fetch(url, cb, false); }

        @JavascriptInterface
        public void fetchBinary(String url, String cb) { fetch(url, cb, true); }

        private void fetch(final String url, final String cb, final boolean binary) {
            new Thread(() -> {
                HttpURLConnection c = null;
                String b64 = null;
                try {
                    c = (HttpURLConnection) new URL(url).openConnection();
                    c.setConnectTimeout(9000);
                    c.setReadTimeout(15000);
                    c.setRequestProperty("User-Agent",
                            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15");
                    if (c.getResponseCode() < 400) {
                        InputStream in = c.getInputStream();
                        ByteArrayOutputStream bos = new ByteArrayOutputStream();
                        byte[] buf = new byte[8192];
                        int n;
                        while ((n = in.read(buf)) != -1) bos.write(buf, 0, n);
                        b64 = Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP);
                    }
                } catch (Exception ignored) {}
                finally { if (c != null) c.disconnect(); }
                final String res = b64;
                final String cbName = binary ? "__binCb" : "__netCb";
                runOnUiThread(() -> web.evaluateJavascript(
                        "window." + cbName + " && window." + cbName + "('" + cb + "', " +
                        (res == null ? "null" : "'" + res + "'") + ")", null));
            }).start();
        }
    }

    private void enterImmersive() {
        getWindow().getDecorView().setSystemUiVisibility(5894);
        getWindow().setFlags(1024, 1024);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) enterImmersive();
    }

    @Override
    public void onBackPressed() {
        if (browserLayer != null && browserLayer.getVisibility() == View.VISIBLE
                && activeTab >= 0 && tabs.get(activeTab).canGoBack()) {
            tabs.get(activeTab).goBack();
        }
    }
}
