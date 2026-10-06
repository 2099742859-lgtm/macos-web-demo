/* ═══ Web 部署垫片：没有 AndroidBridge 时用浏览器能力补齐 ═══
   仅在服务器部署（无 Java 桥）时加载 */
if (!window.AndroidBridge) {
  window.__isWebDeploy = true;
  window.AndroidBridge = {
    /* 网络请求走 fetch（受 CORS 限制，跨域走代理） */
    httpGet: (url, cb) => {
      fetch(url).then(r => r.text()).then(t => cb && cb(t)).catch(() => cb && cb(''));
    },
    httpGetBase64: (url, cb) => {
      fetch(url).then(r => r.blob()).then(b => {
        const rd = new FileReader();
        rd.onload = () => cb && cb(rd.result.split(',')[1] || '');
        rd.readAsDataURL(b);
      }).catch(() => cb && cb(''));
    },
    open: url => window.open(url, '_blank'),
    /* 硬件类降级为无副作用空实现 */
    setVolumePct: () => {}, getVolumePct: () => 50,
    captureScreen: () => {}, restartApp: () => location.reload(),
    micStart: () => false, micStop: () => '',
    hasPermission: () => true, requestPerms: () => {}, openAppSettings: () => {},
    openSysSettings: () => {}, getWifiInfo: () => JSON.stringify({ on: true, ssid: 'Web 部署' }),
    getBtInfo: () => JSON.stringify({ on: false, devices: [] }),
    writeWebFile: () => false, clearWebUpdate: () => {}, isUpdated: () => false,
    browserAttachTab: () => {}, browserNewTab: () => {}, browserCloseTab: () => {},
    browserSwitchTab: () => {}, browserLoadActive: () => {}, moveBrowser: () => {},
    browserShow: () => {}, browserHide: () => {},
    downloadApk: () => {},
  };
}
