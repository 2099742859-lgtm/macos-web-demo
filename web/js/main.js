/* ═══ macOS Demo 系统核心 ═══ */
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

let zTop = 100, winSeq = 0, cascade = 0;
let wallIdx = +(localStorage.getItem('mac_wall') || 0);
let brightnessLevel = 0;
let activeWinId = null;
let batteryPct = 100;
let tickClock = null;
const winByApp = {};   // appId -> winId

/* 程序坞设置 */
let settings = {};
try { settings = JSON.parse(localStorage.getItem('mac_settings') || '{}'); } catch (e) { settings = {}; }
if (settings.magnify === undefined) settings.magnify = true;
if (settings.autohide === undefined) settings.autohide = false;
if (settings.menubarHide === undefined) settings.menubarHide = false;
if (settings.animOn === undefined) settings.animOn = true;
if (settings.animSpeed === undefined) settings.animSpeed = 100;   // 60~200 %
if (settings.clock24 === undefined) settings.clock24 = true;
if (settings.showSec === undefined) settings.showSec = false;
if (settings.dockPos === undefined) settings.dockPos = 'bottom';
if (settings.stageLight === undefined) settings.stageLight = false;
if (settings.reduceTransparency === undefined) settings.reduceTransparency = false;
if (settings.scale === undefined) settings.scale = 100;           // 80~130 %
if (settings.fontSize === undefined) settings.fontSize = 13.5;    // 菜单字号
let baseDock = settings.dockSize || 52;
let dockBase = baseDock;
function saveSettings() { localStorage.setItem('mac_settings', JSON.stringify(settings)); }
function setDockSize(px) {
  baseDock = px; settings.dockSize = px; saveSettings();
  applyScale();
  $$('.dock-ico').forEach(i => { i.style.width = dockBase + 'px'; i.style.height = dockBase + 'px'; });
}
function setMagnify(b) { settings.magnify = b; saveSettings(); }
function setAutohide(b) {
  settings.autohide = b; saveSettings();
  $('#desktop').classList.toggle('dock-auto', b);
  $('#dockWrap').classList.remove('dock-peek');
}
function setMenubarHide(b) {
  settings.menubarHide = b; saveSettings();
  document.body.classList.toggle('mb-auto', b);
}
function setAnim(on, speed) {
  if (on !== undefined) settings.animOn = on;
  if (speed !== undefined) settings.animSpeed = speed;
  saveSettings();
  document.documentElement.style.setProperty('--anim', settings.animOn ? (settings.animSpeed / 100) : 0.01);
}
function setClockOpts(h24, sec) {
  if (h24 !== undefined) settings.clock24 = h24;
  if (sec !== undefined) settings.showSec = sec;
  saveSettings();
  tickClock && tickClock();
}
function setDockPos(pos) {
  settings.dockPos = pos; saveSettings();
  const d = $('#desktop');
  d.classList.remove('dock-left', 'dock-right');
  if (pos === 'left') d.classList.add('dock-left');
  if (pos === 'right') d.classList.add('dock-right');
  $('#dock').classList.toggle('vertical', pos !== 'bottom');
}
function setExtra(k, v) {
  settings[k] = v; saveSettings();
  document.body.classList.toggle('reduce-transparency', settings.reduceTransparency);
  document.body.classList.toggle('stage-light', settings.stageLight);
}
function setScale(pct) {
  settings.scale = pct; saveSettings();
  applyScale();
}

/* ───────── 虚拟舞台：逻辑分辨率 + 整体缩放（真·自适应任意屏幕） ───────── */
let stageW = 1280, stageH = 800, viewScale = 1;
function applyStage() {
  const vw = window.innerWidth, vh = window.innerHeight;
  const k = 100 / (settings.scale || 100);   /* 数值越大 → 界面元素越大 */
  if (vw >= vh) {           /* 横屏：逻辑高度基准 800 */
    stageH = Math.round(800 * k);
    stageW = Math.round(stageH * vw / vh);
  } else {                  /* 竖屏：逻辑宽度基准 430 */
    stageW = Math.round(430 * k);
    stageH = Math.round(stageW * vh / vw);
  }
  viewScale = vw / stageW;
  const st = $('#stage');
  st.style.width = stageW + 'px';
  st.style.height = stageH + 'px';
  st.style.transform = `scale(${viewScale})`;
  /* Dock 图标适配舞台宽度 */
  const fit = Math.max(18, Math.floor((stageW - 70) / DOCK_APPS.length));
  dockBase = Math.min(baseDock, fit);
  refreshDockSize();
}
/* 物理坐标 → 舞台逻辑坐标 */
const toLX = x => x / viewScale;
const toLY = y => y / viewScale;
function applyScale() { applyStage(); }

/* ───────── 联网（在线天气 / 时间 / 测速） ───────── */
const NET = { online: navigator.onLine, lastCheck: 0 };
function netCheck() {
  NET.online = navigator.onLine;
  const wifi = $('#mbWifi');
  if (wifi) wifi.style.opacity = NET.online ? '' : '.4';
  return NET.online;
}
/* XHR 联网（Android WebView file:// 下比 fetch 可靠得多） */
function xhrGet(url, timeout) {
  return new Promise(res => {
    try {
      const x = new XMLHttpRequest();
      x.open('GET', url, true);
      x.timeout = timeout || 12000;
      x.onload = () => res(x.status >= 200 && x.status < 400 ? x.responseText : null);
      x.onerror = x.ontimeout = x.onabort = () => res(null);
      x.send();
    } catch (e) { res(null); }
  });
}
/* Java 原生桥联网（最可靠，异步回调） */
let __netSeq = 0;
const __netPending = {};
window.__netCb = (id, b64) => {
  const p = __netPending[id];
  delete __netPending[id];
  if (!p) return;
  if (b64 === null) return p(null);
  try { p(decodeURIComponent(escape(atob(b64)))); } catch (e) { p(null); }
};
function bridgeText(url, timeout) {
  return new Promise(res => {
    if (!window.AndroidBridge || !AndroidBridge.fetchText) return res(null);
    const id = 'n' + (++__netSeq);
    __netPending[id] = res;
    setTimeout(() => { if (__netPending[id]) { delete __netPending[id]; res(null); } }, (timeout || 12000) + 2000);
    try { AndroidBridge.fetchText(url, id); } catch (e) { delete __netPending[id]; res(null); }
  });
}
const __binPending = {};
window.__binCb = (id, b64) => {
  const p = __binPending[id];
  delete __binPending[id];
  if (p) p(b64);
};
function bridgeBinary(url, timeout) {
  return new Promise(res => {
    if (!window.AndroidBridge || !AndroidBridge.fetchBinary) return res(null);
    const id = 'b' + (++__netSeq);
    __binPending[id] = res;
    setTimeout(() => { if (__binPending[id]) { delete __binPending[id]; res(null); } }, (timeout || 12000) + 2000);
    try { AndroidBridge.fetchBinary(url, id); } catch (e) { delete __binPending[id]; res(null); }
  });
}
async function fetchJSON(url, timeout) {
  const t = await fetchText(url, timeout);
  if (t === null) return null;
  try { return JSON.parse(t); } catch (e) { return null; }
}
async function fetchText(url, timeout) {
  /* 优先级：Java 原生桥 → XHR → fetch */
  let t = await bridgeText(url, timeout);
  if (t !== null) return t;
  t = await xhrGet(url, timeout);
  if (t !== null) return t;
  if (window.fetch) {
    try {
      const ctrl = new AbortController();
      const tm = setTimeout(() => ctrl.abort(), timeout || 8000);
      const r = await fetch(url, { signal: ctrl.signal });
      clearTimeout(tm);
      if (r.ok) t = await r.text();
    } catch (e) {}
  }
  return t;
}
/* 调起系统浏览器 */
function sysOpen(url) {
  if (window.AndroidBridge) { try { AndroidBridge.open(url); return; } catch (e) {} }
  window.open(url, '_blank');
}
/* 打开内置原生浏览器（完整渲染） */
function openBrowserNative(url) {
  if (!/^https?:\/\//i.test(url)) url = (url.includes('.') && !url.includes(' '))
    ? 'https://' + url : 'https://www.bing.com/search?q=' + encodeURIComponent(url);
  sysOpen(url);
}

/* ═══ 窗口化原生浏览器同步机制 ═══ */
let browserWin = null, browserViewEl = null;
function browserAttach(win, viewEl, url) {
  if (!window.AndroidBridge || !AndroidBridge.browserNewTab) return false;
  browserWin = win; browserViewEl = viewEl;
  const r = viewEl.getBoundingClientRect();
  AndroidBridge.browserNewTab(url, r.left, r.top, r.width, r.height);
  return true;
}
/* 新开标签（Safari 多标签用）：同样登记归属窗口，拖动/最小化才能跟随 */
function browserAttachTab(win, viewEl, url) {
  browserWin = win; browserViewEl = viewEl;
  const r = viewEl.getBoundingClientRect();
  AndroidBridge.browserNewTab(url, r.left, r.top, r.width, r.height);
}
function browserSync() {
  if (!browserWin || !browserViewEl || !window.AndroidBridge) return;
  const r = browserViewEl.getBoundingClientRect();
  AndroidBridge.moveBrowser(r.left, r.top, r.width, r.height);
}
function browserDetach() {
  if (browserWin && window.AndroidBridge) { try { AndroidBridge.browserCloseAll(); } catch (e) {} }
  browserWin = null; browserViewEl = null;
}
function browserVisible(v) {
  if (browserWin && window.AndroidBridge) { try { v ? AndroidBridge.browserShow() : AndroidBridge.browserHide(); } catch (e) {} }
}
/* 原生网页层遮挡检测：被更高层窗口压住 → 隐藏原生层（后台继续加载）；露出 → 实时恢复 */
function browserZCheck() {
  if (!browserWin || !browserViewEl) return;
  if (browserWin.style.display === 'none') { browserVisible(false); return; }
  const br = browserWin.getBoundingClientRect();
  const bz = +browserWin.style.zIndex || 0;
  let covered = false;
  $$('.window').forEach(w => {
    if (w === browserWin || w.style.display === 'none') return;
    const wz = +w.style.zIndex || 0;
    if (wz <= bz) return;
    const r = w.getBoundingClientRect();
    if (r.left < br.right && r.right > br.left && r.top < br.bottom && r.bottom > br.top) covered = true;
  });
  browserVisible(!covered);
}

/* ───────── 桌面小组件 ───────── */
function toggleWidgets(on) {
  const wg = $('#widgets');
  wg.classList.toggle('hidden', !on);
  localStorage.setItem('mac_widgets', on ? '1' : '0');
  if (on) refreshWidgets();
}
async function refreshWidgets() {
  const wg = $('#widgets');
  if (!wg || wg.classList.contains('hidden')) return;
  const d = new Date();
  const wc = $('#wgClock');
  if (wc) wc.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const wb = $('#wgBatt');
  if (wb) wb.textContent = batteryPct + '%';
  const loc = await locate();
  const w = await fetchWeather(loc.lat, loc.lon);
  const ww = $('#wgWeather'), wcnd = $('#wgCond');
  if (w && ww) { ww.textContent = w.cur.temp + '°'; if (wcnd) wcnd.textContent = `${w.cur.icon} ${loc.city}`; }
  else if (ww) { ww.textContent = '--°'; if (wcnd) wcnd.textContent = '离线'; }
}
/* 弹层打开 → 网页层让位；弹层关闭 → 只要宿主窗口没被最小化就恢复 */
function browserYield(on) {
  if (!browserWin) return;
  if (on) browserVisible(false);
  else browserVisible(browserWin.style.display !== 'none');
}
/* 真实在线天气（Open-Meteo，免 key，含体感/气压/日出日落） */
async function fetchWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m,pressure_msl` +
    `&hourly=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&forecast_days=7`;
  const d = await fetchJSON(url);
  if (!d || !d.current) return null;
  const map = c => c === 0 ? '☀️' : c <= 2 ? '🌤' : c <= 3 ? '⛅' : c <= 49 ? '🌫' : c <= 59 ? '🌦' :
    c <= 69 ? '🌧' : c <= 79 ? '🌨' : c <= 84 ? '🌧' : c <= 94 ? '⛈' : '🌩';
  const name = c => c === 0 ? '晴' : c <= 2 ? '晴间多云' : c <= 3 ? '多云' : c <= 49 ? '雾' : c <= 59 ? '小雨' :
    c <= 69 ? '雨' : c <= 79 ? '雪' : c <= 84 ? '阵雨' : c <= 94 ? '雷阵雨' : '雷暴';
  return {
    cur: {
      temp: Math.round(d.current.temperature_2m), feels: Math.round(d.current.apparent_temperature),
      code: d.current.weather_code, icon: map(d.current.weather_code), cond: name(d.current.weather_code),
      hum: d.current.relative_humidity_2m, wind: Math.round(d.current.wind_speed_10m),
      press: Math.round(d.current.pressure_msl),
    },
    hours: (d.hourly.time || []).slice(0, 14).map((t, i) => ({
      t: t.slice(11, 16), temp: Math.round(d.hourly.temperature_2m[i]), ic: map(d.hourly.weather_code[i]),
    })),
    days: (d.daily.time || []).slice(0, 7).map((t, i) => ({
      d: i === 0 ? '今天' : '周' + '日一二三四五六'[new Date(t).getDay()],
      lo: Math.round(d.daily.temperature_2m_min[i]), hi: Math.round(d.daily.temperature_2m_max[i]),
      ic: map(d.daily.weather_code[i]),
      rise: (d.daily.sunrise[i] || '').slice(11, 16), set: (d.daily.sunset[i] || '').slice(11, 16),
    })),
  };
}
/* GPS 精确定位（浏览器地理定位） */
function gpsLocate(timeout) {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    const t = setTimeout(() => res(null), timeout || 8000);
    navigator.geolocation.getCurrentPosition(
      p => { clearTimeout(t); res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }); },
      () => { clearTimeout(t); res(null); },
      { enableHighAccuracy: true, timeout: timeout || 8000, maximumAge: 60000 }
    );
  });
}
async function locate() {
  const saved = localStorage.getItem('mac_loc');
  if (saved) { const s = JSON.parse(saved); if (Date.now() - (s.ts || 0) < 1800000) return s; }
  /* 1. GPS 真定位 → 反解城市名（BigDataCloud 免费） */
  const gps = await gpsLocate(8000);
  if (gps) {
    let city = '我的位置', region = '';
    const g = await fetchJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${gps.lat}&longitude=${gps.lon}&localityLanguage=zh`, 6000);
    if (g) { city = g.city || g.locality || city; region = g.principalSubdivision || ''; }
    const loc = { lat: gps.lat, lon: gps.lon, city, region, src: 'GPS', ts: Date.now() };
    localStorage.setItem('mac_loc', JSON.stringify(loc));
    return loc;
  }
  /* 2. IP 粗定位 */
  const g = await fetchJSON('https://ipapi.co/json/', 5000);
  const loc = g && g.latitude ? { lat: g.latitude, lon: g.longitude, city: g.city || '本地', region: g.region || '', src: 'IP', ts: Date.now() }
    : { lat: 30.2741, lon: 120.1551, city: '杭州', region: '浙江', src: '默认', ts: Date.now() };
  localStorage.setItem('mac_loc', JSON.stringify(loc));
  return loc;
}

/* ───────── 深色模式 ───────── */
let darkMode = localStorage.getItem('mac_dark') === '1';
function applyDark(on) {
  darkMode = on;
  document.body.classList.toggle('dark', on);
  localStorage.setItem('mac_dark', on ? '1' : '0');
}

/* ───────── 墙纸 & 亮度 ───────── */
function setWallpaper(i) {
  wallIdx = i;
  const w = WALLPAPERS[i];
  const bg = w.img ? `url('${w.img}') center/cover no-repeat` : w.css;
  /* 墙纸切换淡入动画 */
  const el = $('#wallpaper');
  const old = el.style.background;
  if (old && old !== bg) {
    const ghost = document.createElement('div');
    ghost.style.cssText = `position:absolute;inset:0;background:${old};z-index:0`;
    el.parentNode.insertBefore(ghost, el);
    el.style.opacity = '0';
    setTimeout(() => { el.style.transition = 'opacity .45s'; el.style.opacity = '1'; }, 30);
    setTimeout(() => ghost.remove(), 700);
  }
  el.style.background = bg;
  $$('.lock-wall').forEach(x => { x.style.background = bg; });
  localStorage.setItem('mac_wall', i);
}
function setBrightness(v) {
  brightnessLevel = Math.max(0, Math.min(0.8, v));
  $('#brightness').style.opacity = brightnessLevel;
}

/* ───────── OTA 在线更新（多源测速 + 防回滚 + 可屏蔽 + 自动重启） ───────── */
const APP_VER = { code: 15, name: '1.0.2_beta_261005(11)' };
const OTA_SOURCES = [
  ['GitHub', 'https://raw.githubusercontent.com/2099742859-lgtm/macos-web-demo/main/ota/'],
  ['jsDelivr', 'https://cdn.jsdelivr.net/gh/2099742859-lgtm/macos-web-demo@main/ota/'],
  ['Ghproxy', 'https://ghproxy.net/https://raw.githubusercontent.com/2099742859-lgtm/macos-web-demo/main/ota/'],
];
/* 源测速 + 防陈旧：以版本号最高的源为准（CDN 缓存可能滞后），下载源在最新源中选最快 */
async function otaSpeedTest() {
  const results = await Promise.all(OTA_SOURCES.map(async ([name, base]) => {
    const t0 = performance.now();
    const d = await fetchJSON(base + 'version.json', 7000);
    return { name, base, ms: Math.round(performance.now() - t0), data: d };
  }));
  return results;
}
function otaPick(res) {
  const ok = res.filter(r => r.data && r.data.code);
  if (!ok.length) return null;
  const maxCode = Math.max(...ok.map(r => r.data.code));
  /* 在拿到最新版本的源里选最快的下载 */
  const fresh = ok.filter(r => r.data.code === maxCode).sort((a, b) => a.ms - b.ms);
  return fresh[0];
}
async function otaCheck(silent) {
  if (!navigator.onLine) return null;
  const res = await otaSpeedTest();
  const best = otaPick(res);
  if (!best) return null;
  const remote = best.data;
  const skip = +(localStorage.getItem('mac_skip_ver') || 0);
  /* 防回滚：只升不降；低于 minCode 强制更新 */
  const force = remote.minCode && APP_VER.code < remote.minCode;
  /* 忽略只屏蔽自动弹窗；手动检查不受忽略影响 */
  const has = remote.code > APP_VER.code && (!silent || remote.code > skip || force);
  return has ? { remote, source: best, all: res, force } : null;
}
/* 差量更新：只下载哈希变化的文件 */
async function otaApply(sourceBase, manifest, onProgress) {
  /* 本地基线：优先 localStorage，其次 APK 出厂清单 */
  let baseline = {};
  try { baseline = JSON.parse(localStorage.getItem('mac_ota_hashes') || '{}'); } catch (e) {}
  if (!Object.keys(baseline).length) {
    try {
      const m = await fetch('ota-manifest.json').then(r => r.json());
      baseline = m || {};
    } catch (e) {}
  }
  const files = manifest.files || {};
  const changed = Object.keys(files).filter(f => baseline[f] !== files[f]);
  if (!changed.length) { onProgress(1, '无需更新'); return 0; }
  let done = 0, bytes = 0;
  for (const f of changed) {
    onProgress(done / changed.length, `下载 ${f}`);
    const b64 = await bridgeBinary(sourceBase + f, 30000);
    if (!b64) throw new Error('下载失败: ' + f);
    bytes += Math.round(b64.length * 3 / 4);
    if (!AndroidBridge.writeWebFile(f, b64)) throw new Error('写入失败: ' + f);
    baseline[f] = files[f];
    done++;
    onProgress(done / changed.length, `${done}/${changed.length} 个文件`);
  }
  localStorage.setItem('mac_ota_hashes', JSON.stringify(baseline));
  localStorage.setItem('mac_ota_applied', '1');
  return { count: changed.length, bytes };
}

/* ───────── IndexedDB 大文件存储（录音/下载/照片，不占 localStorage） ───────── */
const IDB = {
  _db: null,
  open() {
    if (this._db) return Promise.resolve(this._db);
    return new Promise((res, rej) => {
      const r = indexedDB.open('macdb', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files');
      r.onsuccess = () => { this._db = r.result; res(this._db); };
      r.onerror = () => rej(r.error);
    });
  },
  async put(k, v) {
    const db = await this.open();
    return new Promise((res, rej) => {
      const t = db.transaction('files', 'readwrite');
      t.objectStore('files').put(v, k);
      t.oncomplete = res; t.onerror = rej;
    });
  },
  async get(k) {
    const db = await this.open();
    return new Promise(res => {
      const q = db.transaction('files').objectStore('files').get(k);
      q.onsuccess = () => res(q.result); q.onerror = () => res(null);
    });
  },
  async del(k) {
    const db = await this.open();
    return new Promise(res => {
      const t = db.transaction('files', 'readwrite');
      t.objectStore('files').delete(k);
      t.oncomplete = res;
    });
  },
  async clear() {
    const db = await this.open();
    return new Promise(res => {
      const t = db.transaction('files', 'readwrite');
      t.objectStore('files').clear();
      t.oncomplete = res;
    });
  },
};

/* ───────── 通知 ───────── */
const notifHistory = [];
/* 通知来源 → 图标（系统类来源用对应真实图标） */
const NOTIF_ICONS = {
  '无线局域网': GLYPH.wifi, '蓝牙': GLYPH.bt, '网络': GLYPH.globe, '专注模式': GLYPH.moon,
  '隔空投送': GLYPH.airdrop, '屏幕镜像': GLYPH.mirror, '调度中心': GLYPH.stage,
  '声音': GLYPH.speaker, '显示器': GLYPH.sun, '下载': GLYPH.download, '编辑': GLYPH.doc,
  '访达': null, '墙纸': GLYPH.photo, '外观': GLYPH.appearance, '截屏': GLYPH.photo,
};
function notifyIcon(app) {
  if (APPS[app]) return APPS[app].icon();
  const g = NOTIF_ICONS[app];
  if (g) return `<span class="notif-glyph" style="background:#8E8E93">${g}</span>`;
  return ICONS.settings();
}
function notify(app, text) {
  const iconHTML = notifyIcon(app);
  const b = document.createElement('div');
  b.className = 'banner';
  b.innerHTML = `${iconHTML}<div style="flex:1;min-width:0"><div class="bn-t">${app}</div><div class="bn-b">${text}</div></div><span class="bn-x">✕</span>`;
  b.querySelector('.bn-x').addEventListener('pointerdown', e => { e.stopPropagation(); b.remove(); });
  b.addEventListener('pointerdown', () => { b.classList.add('out'); setTimeout(() => b.remove(), 300); });
  $('#banners').appendChild(b);
  setTimeout(() => { if (document.contains(b)) { b.classList.add('out'); setTimeout(() => b.remove(), 400); } }, 3400);
  notifHistory.unshift({ app, text, icon: iconHTML });
  if (notifHistory.length > 8) notifHistory.pop();
  drawNotifList();
}
function drawNotifList() {
  const list = $('#ncList');
  list.innerHTML = (notifHistory.length ? `<div class="nc-clear" id="ncClear">清除全部</div>` : '') +
    (notifHistory.map(n =>
    `<div class="nc-notif">${n.icon}<div><div class="nc-n-t">${n.app}</div><div class="nc-n-b">${n.text}</div></div></div>`
  ).join('') || '<div style="text-align:center;color:#fff;opacity:.7;margin-top:20px;text-shadow:0 1px 4px rgba(0,0,0,.4)">没有新通知</div>');
  const c = $('#ncClear');
  if (c) c.addEventListener('pointerdown', () => { notifHistory.length = 0; drawNotifList(); });
}

/* ───────── 窗口管理器 ───────── */
const TL_SVG = {
  close: '<svg viewBox="0 0 12 12" width="12" height="12"><path d="M3.4 3.4 L8.6 8.6 M8.6 3.4 L3.4 8.6" stroke="rgba(90,0,0,.55)" stroke-width="1.3" stroke-linecap="round"/></svg>',
  min: '<svg viewBox="0 0 12 12" width="12" height="12"><path d="M2.6 6 H9.4" stroke="rgba(90,60,0,.55)" stroke-width="1.3" stroke-linecap="round"/></svg>',
  max: '<svg viewBox="0 0 12 12" width="12" height="12"><path d="M6 2.6 V9.4 M2.6 6 H9.4" stroke="rgba(0,80,0,.5)" stroke-width="1.3" stroke-linecap="round"/></svg>',
};

function openApp(id, arg) {
  if (id === 'launchpad') return toggleLaunchpad(true);
  const app = APPS[id];
  if (!app) return notify('启动台', `「${id}」尚未安装`);

  /* 已打开则聚焦/还原（预览类可复用窗口重载内容） */
  if (winByApp[id]) {
    const w = document.getElementById(winByApp[id]);
    if (w) {
      if (arg !== undefined) { const body = w.querySelector('.win-body'); body.innerHTML = ''; app.render(body, w, arg); }
      if (w.style.display === 'none') restoreWindow(w);
      focusWindow(w);
      return;
    }
  }

  const wid = 'win-' + (++winSeq);
  const W = stageW, H = stageH;
  const w = Math.min(app.w, W - 24), h = Math.min(app.h, H - 100);
  const x = Math.max(8, (W - w) / 2 + (cascade % 6) * 26 - 65);
  const y = Math.max(36, (H - h) / 2.4 + (cascade % 6) * 20 - 30);
  cascade++;

  const win = document.createElement('div');
  win.className = 'window';
  win.id = wid;
  win.dataset.id = wid;
  win.dataset.app = id;
  win.style.cssText = `left:${x}px;top:${y}px;width:${w}px;height:${h}px;z-index:${++zTop}`;
  win.innerHTML = `
    <div class="titlebar ${app.dark ? 'dark' : ''}">
      <div class="tl-group">
        <div class="tl close" data-act="close">${TL_SVG.close}</div>
        <div class="tl min" data-act="min">${TL_SVG.min}</div>
        <div class="tl max" data-act="max">${TL_SVG.max}</div>
      </div>
      <div class="win-title">${app.name}</div>
    </div>
    <div class="win-body"></div>
    ${app.noResize ? '' : '<div class="resize-h"></div>'}`;
  $('#windows').appendChild(win);
  winByApp[id] = wid;

  app.render(win.querySelector('.win-body'), win, arg);
  bindWindow(win);
  focusWindow(win);
  updateDock();
}

function closeWindow(wid) {
  const w = document.getElementById(wid);
  if (!w) return;
  if (w === browserWin) browserDetach();
  /* 音频/清理钩子：关窗即静音 */
  if (w._audio) { try { w._audio.pause(); w._audio.src = ''; } catch (e) {} }
  if (w._cleanup) { try { w._cleanup(); } catch (e) {} }
  delete winByApp[wid ? w.dataset.app : ''];
  w.style.transition = `opacity ${0.18 * animK()}s, transform ${0.18 * animK()}s`;
  w.style.opacity = '0';
  w.style.transform = 'scale(.92) translateY(6px)';
  setTimeout(() => { w.remove(); browserZCheck(); }, 190 * animK());
  if (activeWinId === wid) { activeWinId = null; setActiveApp('访达'); }
  updateDock();
}
/* 动画速度系数（关闭动画时接近 0） */
function animK() { return settings.animOn ? settings.animSpeed / 100 : 0.01; }

function focusWindow(w) {
  $$('.window').forEach(x => x.classList.add('inactive'));
  w.classList.remove('inactive');
  w.style.zIndex = ++zTop;
  activeWinId = w.id;
  setActiveApp(APPS[w.dataset.app].name);
  browserZCheck();
}

function setActiveApp(name) { $('#mbAppName').textContent = name; }

function minimizeWindow(w) {
  if (w === browserWin) browserVisible(false);
  const appId = w.dataset.app;
  const dockIco = document.querySelector(`.dock-item[data-app="${appId}"] .dock-ico`);
  const wr = w.getBoundingClientRect();
  let tx = stageW / 2 * viewScale, ty = stageH * viewScale;
  if (dockIco) { const dr = dockIco.getBoundingClientRect(); tx = dr.left + dr.width / 2; ty = dr.top + dr.height / 2; }
  w.classList.add('minimizing');
  const dx = (tx - (wr.left + wr.width / 2)) / viewScale, dy = (ty - (wr.top + wr.height / 2)) / viewScale;
  /* 精灵效果：横向压缩 + 纵向压扁吸入 Dock */
  w.style.transition = `transform ${0.45 * animK()}s cubic-bezier(.5,0,.8,.4), opacity ${0.45 * animK()}s`;
  w.style.transform = `translate(${dx}px, ${dy}px) scaleX(.34) scaleY(.03)`;
  w.style.opacity = '.2';
  setTimeout(() => { w.style.display = 'none'; w.classList.remove('minimizing'); }, 460 * animK());
  if (activeWinId === w.id) { activeWinId = null; setActiveApp('访达'); }
}
function restoreWindow(w) {
  w.style.display = 'flex';
  if (w === browserWin) { browserVisible(true); setTimeout(browserSync, 500); }
  w.classList.add('minimizing');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    w.style.transform = ''; w.style.opacity = '';
    setTimeout(() => w.classList.remove('minimizing'), 480);
  }));
  browserZCheck();
}

function zoomWindow(w) {
  if (w.dataset.zoomed) {
    const r = JSON.parse(w.dataset.zoomed);
    Object.assign(w.style, { left: r.l, top: r.t, width: r.w, height: r.h });
    delete w.dataset.zoomed;
  } else {
    w.dataset.zoomed = JSON.stringify({ l: w.style.left, t: w.style.top, w: w.style.width, h: w.style.height });
    Object.assign(w.style, { left: '6px', top: 'calc(var(--menu-h) + 6px)', width: 'calc(100% - 12px)', height: 'calc(100% - var(--menu-h) - 96px)' });
  }
  if (w === browserWin) setTimeout(browserSync, 60);
}

function bindWindow(w) {
  w.querySelectorAll('.tl').forEach(t => t.addEventListener('pointerdown', e => {
    e.stopPropagation();
    const act = t.dataset.act;
    if (act === 'close') closeWindow(w.id);
    else if (act === 'min') minimizeWindow(w);
    else zoomWindow(w);
  }));
  w.addEventListener('pointerdown', () => focusWindow(w), true);

  const tb = w.querySelector('.titlebar');
  tb.addEventListener('pointerdown', e => {
    if (e.target.closest('.tl')) return;
    if (w.dataset.zoomed) return;
    const sx = toLX(e.clientX) - w.offsetLeft, sy = toLY(e.clientY) - w.offsetTop;
    let moved = false;
    const move = ev => {
      moved = true;
      const cx = toLX(ev.clientX), cy = toLY(ev.clientY);
      const nx = Math.min(Math.max(cx - sx, -w.offsetWidth + 80), stageW - 80);
      const ny = Math.min(Math.max(cy - sy, 28), stageH - 60);
      w.style.left = nx + 'px'; w.style.top = ny + 'px';
      if (w === browserWin) browserSync();
      if (browserWin) browserZCheck();   /* 拖动中实时检测遮挡 */
      /* Sequoia 风格边缘分屏提示 */
      const th = $('#tileHint');
      let css = null;
      if (cx < 20) css = 'left:6px;top:36px;width:calc(50% - 12px);height:calc(100% - 132px)';
      else if (cx > stageW - 20) css = 'left:calc(50% + 6px);top:36px;width:calc(50% - 12px);height:calc(100% - 132px)';
      else if (cy < 34) css = 'left:6px;top:36px;width:calc(100% - 12px);height:calc(100% - 132px)';
      if (css) { th.classList.remove('hidden'); th.style.cssText = css; }
      else th.classList.add('hidden');
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const th = $('#tileHint');
      if (!th.classList.contains('hidden')) {
        /* 松手吸附分屏 */
        ['left', 'top', 'width', 'height'].forEach(p => w.style[p] = th.style[p]);
        th.classList.add('hidden');
      }
      if (!moved && e.detail === 2) zoomWindow(w);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });

  const rh = w.querySelector('.resize-h');
  if (rh) rh.addEventListener('pointerdown', e => {
    e.stopPropagation(); e.preventDefault();
    const sw = w.offsetWidth, sh = w.offsetHeight, sx = e.clientX, sy = e.clientY;
    const move = ev => {
      w.style.width = Math.max(280, sw + (ev.clientX - sx) / viewScale) + 'px';
      w.style.height = Math.max(180, sh + (ev.clientY - sy) / viewScale) + 'px';
      if (w === browserWin) browserSync();
    };
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

/* ───────── Dock ───────── */
function dockItemHTML(id) {
  const app = APPS[id];
  return `<div class="dock-item" data-app="${id}">
    <div class="dock-tip">${app.name}</div>
    <div class="dock-ico" style="width:${dockBase}px;height:${dockBase}px">${app.icon()}</div>
    <div class="dock-dot"></div></div>`;
}
function bindDockItem(item) {
  /* 点按/长按分离：移动超过 8px 或按住超 450ms 不触发打开 */
  let sx = 0, sy = 0, moved = false, longIv = null, longFired = false;
  item.addEventListener('pointerdown', e => {
    e.stopPropagation();
    sx = e.clientX; sy = e.clientY; moved = false; longFired = false;
    longIv = setTimeout(() => {
      longFired = true;
      /* 长按 → Dock 上下文菜单 */
      const id = item.dataset.app;
      const ctx = $('#ctxMenu');
      const running = !!winByApp[id] && !!document.getElementById(winByApp[id]);
      const pinned = DOCK_APPS.includes(id);
      ctx.innerHTML = `
        <div class="ctx-item" data-a="open">打开</div>
        ${running ? '<div class="ctx-item" data-a="quit">退出</div>' : ''}
        <div class="ctx-sep"></div>
        ${pinned && id !== 'finder' && id !== 'trash' ? '<div class="ctx-item" data-a="unpin">从程序坞中移除</div>' : ''}
        ${!pinned ? '<div class="ctx-item" data-a="pin">在程序坞中保留</div>' : ''}`;
      const r = item.getBoundingClientRect();
      ctx.style.left = Math.min(sx, innerWidth - 180) + 'px';
      ctx.style.top = Math.max(10, r.top - 150) + 'px';
      ctx.classList.remove('hidden');
      ctx.querySelectorAll('.ctx-item').forEach(it => it.addEventListener('pointerdown', ev => {
        ev.stopPropagation();
        ctx.classList.add('hidden');
        const a2 = it.dataset.a;
        if (a2 === 'open') openApp(id);
        else if (a2 === 'quit') closeWindow(winByApp[id]);
        else if (a2 === 'unpin') { DOCK_APPS.splice(DOCK_APPS.indexOf(id), 1); buildDock(); updateDock(); }
        else if (a2 === 'pin') { DOCK_APPS.splice(DOCK_APPS.indexOf('SEP'), 0, id); buildDock(); updateDock(); notify('程序坞', `「${APPS[id].name}」已固定`); }
      }));
    }, 450);
  });
  item.addEventListener('pointermove', e => {
    if (Math.hypot(e.clientX - sx, e.clientY - sy) > 8) { moved = true; clearTimeout(longIv); }
  });
  item.addEventListener('pointerup', () => {
    clearTimeout(longIv);
    if (moved || longFired) return;
    const ico = item.querySelector('.dock-ico');
    ico.classList.remove('bounce'); void ico.offsetWidth; ico.classList.add('bounce');
    openApp(item.dataset.app);
    closeAllPopovers();
  });
  item.addEventListener('pointercancel', () => clearTimeout(longIv));
}
function buildDock() {
  const dock = $('#dock');
  dock.innerHTML = DOCK_APPS.map(id => {
    if (id === 'SEP') return '<div class="dock-sep"></div>';
    return dockItemHTML(id);
  }).join('') + '<div class="dock-sep" id="dockRunSep" style="display:none"></div><span id="dockRunning"></span>';
  dock.querySelectorAll('.dock-item').forEach(bindDockItem);

  /* 放大效果：采用 macos-web 同款分段插值（0→2x, dL/2→1.414x, dL/1.25→1.1x, dL→1x） */
  dock.addEventListener('pointermove', e => {
    if (!settings.magnify) return;
    const limit = dockBase * 6;
    const pts = [[0, 2], [limit / 2, 1.414], [limit / 1.25, 1.1], [limit, 1]];
    dock.querySelectorAll('.dock-ico').forEach(ico => {
      const r = ico.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2)) / viewScale;
      let scale = 1;
      for (let i = 0; i < pts.length - 1 && d < limit; i++) {
        if (d <= pts[i + 1][0]) {
          scale = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * (d - pts[i][0]) / (pts[i + 1][0] - pts[i][0]);
          break;
        }
      }
      const size = dockBase * scale;
      ico.style.width = size + 'px';
      ico.style.height = size + 'px';
    });
  });
  dock.addEventListener('pointerleave', () => {
    dock.querySelectorAll('.dock-ico').forEach(ico => { ico.style.width = dockBase + 'px'; ico.style.height = dockBase + 'px'; });
  });

  /* 自动隐藏：指针靠近屏幕底部时滑出 */
  document.addEventListener('pointermove', e => {
    if (!settings.autohide) return;
    if (e.clientY > window.innerHeight - 24) $('#dockWrap').classList.add('dock-peek');
    else if (!e.target.closest('#dockWrap')) $('#dockWrap').classList.remove('dock-peek');
  });
}
function updateDock() {
  /* 运行中非固定应用 → 显示在 Dock 尾部运行区 */
  const running = Object.keys(winByApp).filter(id =>
    document.getElementById(winByApp[id]) && !DOCK_APPS.includes(id) && APPS[id] && id !== 'trash');
  const zone = $('#dockRunning'), sep = $('#dockRunSep');
  if (zone) {
    const cur = [...zone.querySelectorAll('.dock-item')].map(x => x.dataset.app);
    if (cur.join() !== running.join()) {
      zone.innerHTML = running.map(dockItemHTML).join('');
      zone.querySelectorAll('.dock-item').forEach(bindDockItem);
    }
  }
  if (sep) sep.style.display = running.length ? '' : 'none';
  $$('.dock-item').forEach(item => {
    const id = item.dataset.app;
    item.classList.toggle('running', !!winByApp[id] && !!document.getElementById(winByApp[id]));
  });
}
/* 缩放变化时同步 Dock 图标尺寸 */
function refreshDockSize() {
  $$('.dock-ico').forEach(i => { i.style.width = dockBase + 'px'; i.style.height = dockBase + 'px'; });
}

/* 编辑命令：真实作用于当前聚焦的输入框/选区 */
function editCmd(cmd) {
  const el = document.activeElement;
  const editable = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
  try {
    if (cmd === 'copy' && !editable) {
      const sel = window.getSelection().toString();
      if (sel) { if (navigator.clipboard) navigator.clipboard.writeText(sel).catch(() => {}); notify('编辑', '已拷贝所选内容'); return; }
      notify('编辑', '没有选中内容');
      return;
    }
    if (editable && document.execCommand(cmd)) {
      notify('编辑', { cut: '已剪切', copy: '已拷贝', paste: '已粘贴', undo: '已撤销', redo: '已重做', selectAll: '已全选' }[cmd] || '完成');
    } else {
      notify('编辑', editable ? '该操作在当前位置不可用' : '请先点按一个可编辑的文本框');
    }
  } catch (e) { notify('编辑', '该操作不可用'); }
}

/* ───────── 菜单栏下拉 ───────── */
const MENUS = {
  apple: () => [
    { t: '关于本机', fn: () => openApp('about') },
    { sep: 1 },
    { t: '系统设置…', fn: () => openApp('settings') },
    { t: 'App Store…', fn: () => openApp('appstore') },
    { sep: 1 },
    { t: '强制退出…', fn: () => openApp('forcequit'), k: '⌥⌘⎋' },
    { sep: 1 },
    { t: '睡眠', fn: () => sleep() },
    { t: '重新启动…', fn: () => restart() },
    { t: '关机…', fn: () => shutdown() },
    { sep: 1 },
    { t: '锁定屏幕', fn: () => sleep(), k: '⌃⌘Q' },
    { t: '退出登录「User」…', fn: () => logout(), k: '⇧⌘Q' },
  ],
  app: () => {
    const n = $('#mbAppName').textContent;
    return [
      { t: `关于 ${n}`, fn: () => openApp('about') },
      { sep: 1 },
      { t: '设置…', fn: () => openApp('settings'), k: '⌘,' },
      { sep: 1 },
      { t: `隐藏 ${n}`, fn: () => { const w = document.getElementById(activeWinId); if (w) minimizeWindow(w); }, k: '⌘H' },
      { sep: 1 },
      { t: `退出 ${n}`, fn: () => { const w = document.getElementById(activeWinId); if (w) closeWindow(w.id); }, k: '⌘Q' },
    ];
  },
  file: () => [
    { t: '新建访达窗口', fn: () => openApp('finder'), k: '⌘N' },
    { t: '新建文件夹', fn: () => addDeskIcon('新建文件夹', '📁', 'folder'), k: '⇧⌘N' },
    { sep: 1 },
    { t: '快速查看', fn: () => quickLook('README.txt'), k: '空格' },
    { t: '关闭窗口', fn: () => { const w = document.getElementById(activeWinId); if (w) closeWindow(w.id); }, k: '⌘W' },
  ],
  edit: () => [
    { t: '撤销', fn: () => editCmd('undo'), k: '⌘Z' },
    { t: '重做', fn: () => editCmd('redo'), k: '⇧⌘Z' },
    { sep: 1 },
    { t: '剪切', fn: () => editCmd('cut'), k: '⌘X' },
    { t: '拷贝', fn: () => editCmd('copy'), k: '⌘C' },
    { t: '粘贴', fn: () => editCmd('paste'), k: '⌘V' },
    { t: '全选', fn: () => editCmd('selectAll'), k: '⌘A' },
    { sep: 1 },
    { t: '表情与符号', fn: () => openEmoji(), k: '⌃⌘空格' },
  ],
  view: () => [
    { t: '作为图标', fn: () => { const w = document.getElementById(winByApp.finder); if (w) { const v = w.querySelector('.fs-view[data-v="grid"]'); if (v) v.click(); } else openApp('finder'); }, k: '⌘1' },
    { t: '作为列表', fn: () => { const w = document.getElementById(winByApp.finder); if (w) { const v = w.querySelector('.fs-view[data-v="list"]'); if (v) v.click(); } else openApp('finder'); }, k: '⌘2' },
    { sep: 1 },
    { t: '更换墙纸…', fn: () => openApp('settings') },
    { t: '切换深色模式', fn: () => applyDark(!darkMode) },
    { t: '截屏', fn: () => screenshot(), k: '⇧⌘3' },
    { t: '进入全屏', fn: () => { const w = document.getElementById(activeWinId); if (w) zoomWindow(w); }, k: '⌃⌘F' },
  ],
  go: () => [
    { t: '应用程序', fn: () => openApp('finder', { folder: '应用程序' }), k: '⇧⌘A' },
    { t: '文稿', fn: () => openApp('finder', { folder: '文稿' }), k: '⇧⌘O' },
    { t: '桌面', fn: () => openApp('finder', { folder: '桌面' }), k: '⇧⌘D' },
    { t: '下载', fn: () => openApp('finder', { folder: '下载' }), k: '⌥⌘L' },
    { sep: 1 },
    { t: '前往文件夹…', fn: () => toggleSpotlight(true), k: '⇧⌘G' },
  ],
  window: () => {
    const wins = Object.keys(winByApp).map(id => document.getElementById(winByApp[id])).filter(Boolean);
    return [
      { t: '最小化', fn: () => { const w = document.getElementById(activeWinId); if (w) minimizeWindow(w); }, k: '⌘M' },
      { t: '缩放', fn: () => { const w = document.getElementById(activeWinId); if (w) zoomWindow(w); } },
      { sep: 1 },
      { t: '调度中心', fn: () => openMC(), k: 'F3' },
      { t: 'App 切换器', fn: () => openSwitcher(), k: '⌘⇥' },
      ...(wins.length ? [{ sep: 1 }, ...wins.map(w => ({
        t: (w.id === activeWinId ? '✓ ' : '') + APPS[w.dataset.app].name,
        fn: () => { if (w.style.display === 'none') restoreWindow(w); focusWindow(w); },
      }))] : []),
    ];
  },
  help: () => [
    { t: 'macOS 演示帮助', fn: () => notify('帮助', '点按 Dock 打开应用；拖动标题栏移动窗口；红黄绿按钮分别是关闭、最小化、全屏。') },
    { sep: 1 },
    { t: '关于本演示', fn: () => notify('关于', '由 HTML+CSS+JS 手工还原，仅供学习演示') },
  ],
  wifi: () => {
    let ssid = 'MyHome-5G';
    try {
      if (window.AndroidBridge && AndroidBridge.getWifiInfo) {
        const w = JSON.parse(AndroidBridge.getWifiInfo());
        if (w && w.on && w.ssid && w.ssid !== '<unknown ssid>') ssid = w.ssid;
      }
    } catch (e) {}
    return [
      { t: '无线局域网', dis: 1 },
      { t: `✓ ${ssid}`, fn: () => {} },
      { sep: 1 },
      { t: '网络设置…', fn: () => { openApp('settings'); if (window.AndroidBridge) AndroidBridge.openSysSettings('wifi'); } },
    ];
  },
  batt: () => [
    { t: `电池：${batteryPct}%`, dis: 1 },
    { sep: 1 },
    { t: '低电量模式', fn: () => {
      setBrightness(0.25);
      setAnim(false, undefined);
      notify('电池', '低电量模式已打开：亮度降低、动画减弱');
    } },
    { t: '电池设置…', fn: () => openApp('settings') },
  ],
};
let openMenuKey = null;
function buildMenubar() {
  $$('.mb-item[data-menu]').forEach(item => {
    item.addEventListener('pointerdown', e => {
      e.stopPropagation();
      const key = item.dataset.menu;
      if (openMenuKey === key) return closeMenu();
      openMenu(item, key);
    });
  });
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#menuDrop') && !e.target.closest('.mb-item')) closeMenu();
  });
}
function openMenu(item, key) {
  closeMenu();
  openMenuKey = key;
  item.classList.add('open');
  browserYield(true);   /* 菜单打开时网页层让位 */
  const r = item.getBoundingClientRect();
  const drop = $('#menuDrop');
  drop.innerHTML = MENUS[key]().map(m => m.sep ? '<div class="md-sep"></div>' :
    `<div class="md-item ${m.dis ? 'disabled' : ''}" data-t="${m.t}"><span>${m.t}</span>${m.k ? `<span class="md-key">${m.k}</span>` : ''}</div>`).join('');
  drop.classList.remove('hidden');
  drop.style.left = Math.max(4, Math.min(toLX(r.left) - 4, stageW - 246)) + 'px';
  drop.querySelectorAll('.md-item:not(.disabled)').forEach(el => {
    el.addEventListener('pointerdown', ev => {
      ev.stopPropagation();
      const m = MENUS[key]().find(x => x.t === el.dataset.t);
      closeMenu();
      if (m && m.fn) m.fn();
    });
  });
}
function closeMenu() {
  openMenuKey = null;
  $('#menuDrop').classList.add('hidden');
  $$('.mb-item.open').forEach(x => x.classList.remove('open'));
  browserYield(false);   /* 菜单关闭时恢复 */
}

/* ───────── 启动台 ───────── */
function toggleLaunchpad(show) {
  const lp = $('#launchpad');
  if (show === undefined) show = lp.classList.contains('hidden');
  if (show) {
    lp.classList.remove('hidden');
    drawLaunchpad('');
    $('#lpInput').value = '';
    browserYield(true);
  } else { lp.classList.add('hidden'); browserYield(false); }
}
function drawLaunchpad(filter) {
  $('#lpGrid').innerHTML = LAUNCHPAD_APPS
    .filter(id => APPS[id] && APPS[id].name.toLowerCase().includes(filter.toLowerCase()))
    .map(id => `<div class="lp-app" data-app="${id}">${APPS[id].icon()}<span>${APPS[id].name}</span></div>`).join('');
  $$('#lpGrid .lp-app').forEach(a => a.addEventListener('pointerdown', e => {
    e.stopPropagation();
    toggleLaunchpad(false);
    openApp(a.dataset.app);
  }));
  /* 启动台图标右键/双指轻点：添加到桌面 */
  $$('#lpGrid .lp-app').forEach(a => a.addEventListener('contextmenu', e => {
    e.preventDefault(); e.stopPropagation();
    const id = a.dataset.app;
    const ctx = $('#ctxMenu');
    ctx.innerHTML = `
      <div class="ctx-item" data-a="open">打开</div>
      <div class="ctx-item" data-a="desk">添加到桌面</div>`;
    ctx.style.left = Math.min(e.clientX, innerWidth - 170) + 'px';
    ctx.style.top = Math.min(e.clientY, innerHeight - 110) + 'px';
    ctx.classList.remove('hidden');
    ctx.querySelectorAll('.ctx-item').forEach(it => it.addEventListener('pointerdown', ev => {
      ev.stopPropagation();
      ctx.classList.add('hidden');
      toggleLaunchpad(false);
      if (it.dataset.a === 'open') openApp(id);
      else addAppShortcut(id);
    }));
  }));
}

/* ───────── 聚焦搜索（应用 + 文件 + 计算） ───────── */
function toggleSpotlight(show) {
  const sp = $('#spotlight');
  if (show === undefined) show = sp.classList.contains('hidden');
  if (show) { sp.classList.remove('hidden'); $('#spInput').value = ''; drawSpotlight(''); setTimeout(() => $('#spInput').focus(), 50); browserYield(true); }
  else { sp.classList.add('hidden'); browserYield(false); }
}
function drawSpotlight(q) {
  const res = $('#spResults');
  q = q.trim();
  let rows = '';
  /* 计算 */
  if (q && /^[\d+\-*/.()%\s]+$/.test(q) && /\d/.test(q) && /[+\-*/]/.test(q)) {
    try {
      const v = Function('"use strict";return (' + q.replace(/%/g, '/100') + ')')();
      if (isFinite(v)) rows += `<div class="sp-row" data-calc="1">${ICONS.calculator()}<span>${q} = <b>${Math.round(v * 1e8) / 1e8}</b></span><span class="sp-kind">计算器</span></div>`;
    } catch (e) {}
  }
  /* 应用 */
  rows += Object.keys(APPS)
    .filter(id => !['launchpad', 'forcequit'].includes(id) && APPS[id].name.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 5)
    .map(id => `<div class="sp-row" data-app="${id}">${APPS[id].icon()}<span>${APPS[id].name}</span><span class="sp-kind">应用程序</span></div>`).join('');
  /* 文件 */
  if (q) rows += FILE_INDEX
    .filter(f => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 4)
    .map(f => `<div class="sp-row" data-file="${f.name}"><span style="font-size:22px;width:26px;text-align:center">${fileIcon(f.name)}</span><span>${f.name}</span><span class="sp-kind">${f.folder}</span></div>`).join('');
  res.innerHTML = rows;
  res.querySelectorAll('.sp-row').forEach(r => r.addEventListener('pointerdown', e => {
    e.stopPropagation(); toggleSpotlight(false);
    if (r.dataset.app) openApp(r.dataset.app);
    else if (r.dataset.file) quickLook(r.dataset.file);
  }));
}

/* ───────── Quick Look ───────── */
/* 可编辑文本文件类型 */
window.isTextFile = n => /\.(txt|md|markdown|js|css|html|json|csv|log|xml|sh|py)$/i.test(n) ||
  (FILE_CONTENTS[n] != null && typeof FILE_CONTENTS[n] === 'string' && !FILE_CONTENTS[n].startsWith('@idb:'));

function quickLook(name) {
  const ql = $('#quicklook');
  $('#qlName').textContent = name;
  const body = $('#qlBody');
  let inner = '';
  if (VFS[name]) inner = `<div class="ql-icon-big">📁</div><div class="ql-meta">文件夹 · ${VFS[name].children.length} 个项目</div>`;
  else if (/\.(png|jpg|gif|heic)$/i.test(name)) {
    let hash = 0; for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % 997;
    const g = PHOTOS[hash % PHOTOS.length].css;
    inner = `<div class="ql-img" style="background:${g}"></div><div class="ql-meta">PNG 图像 · 2048 × 1365 · 4.2 MB</div>`;
  } else if (/\.pdf$/i.test(name)) {
    inner = `<div class="ql-pdf"><div class="ql-pdf-page"><b>${QL_TEXT[name] || name.replace('.pdf', '')}</b><br><br>（演示版仅显示封面）</div></div><div class="ql-meta">PDF 文稿 · 第 1 页</div>`;
  } else {
    /* 文本：读真实文件内容，可一键进编辑 */
    const c = FILE_CONTENTS[name] != null && !String(FILE_CONTENTS[name]).startsWith('@idb:')
      ? String(FILE_CONTENTS[name]) : (QL_TEXT[name] || '（空文件）');
    inner = `<pre class="ql-txt">${c.replace(/</g, '&lt;')}</pre>` +
      (window.isTextFile(name) ? `<div style="padding:0 16px 14px;text-align:center"><span class="pill-btn on" id="qlEdit">用文本编辑打开</span></div>` : '');
  }
  body.innerHTML = inner;
  const eb = $('#qlEdit');
  if (eb) eb.addEventListener('click', () => { ql.classList.add('hidden'); openApp('textedit', { file: name }); });
  ql.classList.remove('hidden');
}

/* ───────── Siri（真 AI：LongCat LLM + MiMo TTS/ASR，全权限系统掌控） ───────── */
/* 凭证：base64 + 倒序 + 分片 + 旋转密钥异或 四层混淆，运行时还原 */
const _X = [0x5A, 0x3C, 0x77, 0x19];
const _LC1 = [17,106,13,79,17,80,48,78,59,106,71,120,28,80,51,125,106,79,50,67,107,102,34,75,55,5,48,122,59,102,32,125,34,80];
const _LC2 = [29,105,26,91,30,111,56,113,106,94,58,97,49,111,68,92,104,104,14,44,49,89,69,125,14,95,70,95,30,111,3,106,104,95];
const _MM1 = [54,88,35,125,32,121,35,84,104,106,25,120,107,87,68,84,108,76,47,67,105,87,32,125,41,88,35,64,42,110,13,64,32,13];
const _MM2 = [104,95,71,76,104,114,28,95,32,88,14,122,2,95,30,105,2,102,26,105,2,102,71,95,30,95,15,126,32,101,3,106,104,95];
const _dc = a => a.map((c, i) => String.fromCharCode(c ^ _X[i % 4])).join('');
const _rv = s => s.split('').reverse().join('');
const AI_KEY = atob(_rv(_dc(_LC1) + _dc(_LC2)));
const TTS_KEY = atob(_rv(_dc(_MM1) + _dc(_MM2)));

/* ── 请求保险：速率限制 + 超时 + 单飞 + 重试 ── */
const RATE = { ts: [], inFlight: false };
function rateOK() {
  const now = Date.now();
  RATE.ts = RATE.ts.filter(t => now - t < 60000);
  if (RATE.inFlight) return '我正在处理上一条，稍等一下';
  if (RATE.ts.length >= 8) return '说得太快啦，歇一分钟再问';
  if (RATE.ts.length && now - RATE.ts[RATE.ts.length - 1] < 2500) return '慢一点，我还没缓过来';
  return null;
}
async function apiFetch(url, opts, timeoutMs, retries) {
  for (let i = 0; i <= (retries || 0); i++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs || 25000);
    try {
      const r = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(timer);
      if (r.status === 429 || r.status >= 500) { await new Promise(r2 => setTimeout(r2, 1200 * (i + 1))); continue; }
      return r;
    } catch (e) {
      clearTimeout(timer);
      if (i === (retries || 0)) throw e;
      await new Promise(r2 => setTimeout(r2, 1200 * (i + 1)));
    }
  }
  throw new Error('rate');
}

let siriAudio = null;
const siriHist = [];   /* 上下文记忆（有界：最近 6 轮） */
async function aiChat(userText) {
  const err = rateOK();
  if (err) return '⚠ ' + err;
  RATE.inFlight = true;
  RATE.ts.push(Date.now());
  try {
    const d = new Date();
    let weatherInfo = '';
    try {
      const loc = await locate();
      const w = await fetchWeather(loc.lat, loc.lon);
      if (w) weatherInfo = `当前天气（${loc.city}）：${w.cur.cond} ${w.cur.temp}°C`;
    } catch (e) {}
    const running = Object.keys(winByApp).map(id => APPS[id].name).join('、') || '无';
    const ctx = `当前状态：时间 ${d.toLocaleString('zh-CN')}，电量 ${batteryPct}%，${NET.online ? '在线' : '离线'}，深色${darkMode ? '开' : '关'}，亮度 ${Math.round((1 - brightnessLevel) * 100)}%，正在运行：${running}。${weatherInfo}`;
    const sys = `你是这台 macOS 设备的 Siri。用中文简短回答（一两句话）。${ctx}
你完全掌控这台设备，可以执行动作（回复末尾加标记，正文不要念出标记）：
[OPEN:应用id] 打开应用（safari,mail,maps,photos,notes,music,calendar,weather,calculator,terminal,settings,appstore,voicememo,photobooth,tv,podcast,reminders,facetime,clock,finder,dictionary）
[CLOSE:应用id] 关闭应用  [DARK:on/off] 深色模式  [BRIGHT:0-100] 亮度  [VOL:0-100] 音量
[SHOT] 截屏  [LOCK] 锁屏  [WALL:0-7] 换壁纸  [WIFI:on/off] 无线局域网
[NOTE:内容] 写进备忘录  [REMIND:内容] 加提醒事项  [TIMER:分钟数] 倒计时
[MUSIC:关键词] 搜索播放音乐`;
    const r = await apiFetch('https://api.hcnsec.cn/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + AI_KEY },
      body: JSON.stringify({
        model: 'longcat-2.5',
        messages: [
          { role: 'system', content: sys },
          ...siriHist,
          { role: 'user', content: userText },
        ],
        max_tokens: 300,
      }),
    }, 25000, 1);
    const j = await r.json();
    return j.choices && j.choices[0] ? j.choices[0].message.content : null;
  } catch (e) { return null; }
  finally { RATE.inFlight = false; }
}
async function ttsSpeak(text) {
  if (settings.siriTTS === false) return;   /* 语音播报开关 */
  try {
    const r = await apiFetch('https://api.xiaomimimo.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': TTS_KEY },
      body: JSON.stringify({
        model: 'mimo-v2.5-tts',
        messages: [{ role: 'assistant', content: text.slice(0, 300) }],
        audio: { format: 'mp3', voice: 'mimo_default' },
      }),
    }, 30000, 1);
    const j = await r.json();
    const b64 = j.choices && j.choices[0] && j.choices[0].message.audio ? j.choices[0].message.audio.data : null;
    if (!b64) return;
    if (siriAudio) siriAudio.pause();
    siriAudio = new Audio('data:audio/mpeg;base64,' + b64);
    siriAudio.play().catch(() => {});
  } catch (e) {}
}
/* ── 语音识别：MediaRecorder 录音 → 转 WAV → MiMo ASR ── */
async function blobToWavB64(blob) {
  const ab = await blob.arrayBuffer();
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await ac.decodeAudioData(ab);
  const pcm = buf.getChannelData(0), rate = buf.sampleRate;
  const out = new ArrayBuffer(44 + pcm.length * 2);
  const v = new DataView(out);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); ws(8, 'WAVE'); ws(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  ws(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) { const s = Math.max(-1, Math.min(1, pcm[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true); }
  const bytes = new Uint8Array(out);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return btoa(bin);
}
async function asrListenB64(b64) {
  const r = await apiFetch('https://api.xiaomimimo.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'api-key': TTS_KEY },
    body: JSON.stringify({
      model: 'mimo-v2.5-asr',
      messages: [{ role: 'user', content: [{ type: 'input_audio', input_audio: { data: 'data:audio/wav;base64,' + b64 } }] }],
      asr_options: { language: 'auto' },
    }),
  }, 30000, 1);
  const j = await r.json();
  return j.choices && j.choices[0] ? (j.choices[0].message.content || '').trim() : null;
}
/* ── 动作执行 ── */
function siriExec(reply) {
  let clean = reply;
  const eat = (re, fn) => { const m = clean.match(re); if (m) { clean = clean.replace(re, '').trim(); fn(m); } };
  eat(/\[OPEN:(\w+)\]/, m => { if (APPS[m[1]]) setTimeout(() => openApp(m[1]), 1200); });
  eat(/\[CLOSE:(\w+)\]/, m => { const w = winByApp[m[1]]; if (w) closeWindow(w); });
  eat(/\[DARK:(on|off)\]/, m => applyDark(m[1] === 'on'));
  eat(/\[BRIGHT:(\d+)\]/, m => setBrightness(1 - Math.min(100, +m[1]) / 100 * 0.8));
  eat(/\[VOL:(\d+)\]/, m => { if (window.AndroidBridge && AndroidBridge.setVolumePct) AndroidBridge.setVolumePct(+m[1]); });
  eat(/\[SHOT\]/, () => setTimeout(screenshot, 800));
  eat(/\[LOCK\]/, () => setTimeout(() => lockScreen(), 1000));
  eat(/\[WALL:(\d)\]/, m => setWallpaper(Math.min(7, +m[1])));
  eat(/\[WIFI:(on|off)\]/, m => notify('无线局域网', m[1] === 'on' ? '已打开' : '已关闭'));
  eat(/\[NOTE:([^\]]+)\]/, m => {
    const notes = JSON.parse(localStorage.getItem('mac_notes') || '[]');
    notes.unshift({ t: m[1].slice(0, 12), b: m[1] });
    localStorage.setItem('mac_notes', JSON.stringify(notes));
    notify('备忘录', '已记下');
  });
  eat(/\[REMIND:([^\]]+)\]/, m => {
    const items = JSON.parse(localStorage.getItem('mac_reminders') || '[]');
    items.unshift([m[1], false]);
    localStorage.setItem('mac_reminders', JSON.stringify(items));
    notify('提醒事项', '已添加提醒');
  });
  eat(/\[TIMER:(\d+)\]/, m => notify('时钟', `已设定 ${m[1]} 分钟倒计时`));
  eat(/\[MUSIC:([^\]]+)\]/, m => { openApp('music'); setTimeout(() => { const s = document.querySelector('#muSearch'); if (s) { s.value = m[1]; s.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); } }, 800); });
  return clean;
}
function openSiri() {
  const siri = $('#siri');
  siri.classList.remove('hidden');
  /* 超时 3 分钟重开 = 清空上下文；否则显示上一轮内容 */
  if (window._siriClosedAt && Date.now() - window._siriClosedAt > 180000) siriHist.length = 0;
  if (siriHist.length >= 2) {
    $('#siriText').textContent = siriHist[siriHist.length - 2].content;
    $('#siriSub').textContent = siriHist[siriHist.length - 1].content;
  } else {
    $('#siriText').textContent = '我是 Siri，请讲';
    $('#siriSub').textContent = '正在听…再点一下麦克风停止';
  }
  browserYield(true);
  setTimeout(() => { const m = $('#siriMic'); if (m && !window._siriRec) m.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }, 300);
}
async function siriAsk(text) {
  if (!text.trim()) return;
  $('#siriText').textContent = text;
  $('#siriSub').textContent = '思考中…';
  $('#siriInput').value = '';
  const reply = await aiChat(text);
  if (!reply) {
    $('#siriSub').textContent = reply === null && !NET.online ? '离线了，先连网再聊' : '网络好像有点问题，稍后再试试';
    return;
  }
  const clean = siriExec(reply);
  $('#siriSub').textContent = clean;
  /* 记入上下文（各截断 200 字，最多 6 轮 = 12 条） */
  siriHist.push({ role: 'user', content: text.slice(0, 200) });
  siriHist.push({ role: 'assistant', content: clean.slice(0, 200) });
  while (siriHist.length > 12) siriHist.shift();
  ttsSpeak(clean);
}
function closeSiri() {
  $('#siri').classList.add('hidden');
  browserYield(false);
  if (siriAudio) { siriAudio.pause(); siriAudio = null; }
  if (window._siriRec) { try { window._siriRec.stop(); } catch (e) {} window._siriRec = null; }
  /* 关闭超过 3 分钟再开 = 新对话，清空上下文 */
  window._siriClosedAt = Date.now();
}

/* ───────── 调度中心（Mission Control） ───────── */
function openMC() {
  const wins = Object.keys(winByApp).map(id => document.getElementById(winByApp[id])).filter(Boolean);
  if (!wins.length) return notify('调度中心', '没有打开的窗口');
  const mc = $('#missionControl');
  $('#mcGrid').innerHTML = wins.map(w => {
    const app = APPS[w.dataset.app];
    return `<div class="mc-thumb" data-wid="${w.id}">
      <div class="mc-win"><div class="mc-tb"></div><div class="mc-body">${app.icon()}</div></div>
      <div class="mc-name">${app.name}</div></div>`;
  }).join('');
  mc.classList.remove('hidden');
  $$('#mcGrid .mc-thumb').forEach(t => t.addEventListener('pointerdown', e => {
    e.stopPropagation();
    const w = document.getElementById(t.dataset.wid);
    mc.classList.add('hidden');
    if (w) { if (w.style.display === 'none') restoreWindow(w); focusWindow(w); }
  }));
}

/* ───────── App 切换器（⌘Tab） ───────── */
let asIdx = 0;
function openSwitcher() {
  const running = Object.keys(winByApp).map(id => document.getElementById(winByApp[id])).filter(Boolean);
  if (!running.length) return notify('切换器', '没有运行中的应用');
  asIdx = 0;
  const as = $('#appSwitcher');
  $('#asPanel').innerHTML = running.map(w => {
    const app = APPS[w.dataset.app];
    return `<div class="as-item" data-wid="${w.id}">${app.icon()}<span>${app.name}</span></div>`;
  }).join('');
  as.classList.remove('hidden');
  drawSwitcher();
  $$('#asPanel .as-item').forEach(it => it.addEventListener('pointerdown', e => {
    e.stopPropagation();
    activateSwitcher(it.dataset.wid);
  }));
}
function drawSwitcher() {
  $$('#asPanel .as-item').forEach((it, i) => it.classList.toggle('sel', i === asIdx));
}
function cycleSwitcher(d) {
  const n = $$('#asPanel .as-item').length;
  if (!n) return;
  asIdx = (asIdx + d + n) % n;
  drawSwitcher();
}
function activateSwitcher(wid) {
  $('#appSwitcher').classList.add('hidden');
  const w = document.getElementById(wid || $$('#asPanel .as-item')[asIdx]?.dataset.wid);
  if (w) { if (w.style.display === 'none') restoreWindow(w); focusWindow(w); }
}

/* ───────── OSD（亮度/音量浮层） ───────── */
let osdTimer = null;
function showOSD(icon, ratio) {
  const osd = $('#osd');
  $('#osdIcon').innerHTML = GLYPH[icon] || icon;
  $('#osdMeter').innerHTML = Array.from({ length: 16 }, (_, i) =>
    `<span class="osd-seg ${i < Math.round(ratio * 16) ? 'on' : ''}"></span>`).join('');
  osd.classList.remove('hidden');
  osd.style.opacity = '1';
  clearTimeout(osdTimer);
  osdTimer = setTimeout(() => { osd.style.opacity = '0'; setTimeout(() => osd.classList.add('hidden'), 300); }, 1400);
}

/* ───────── 快速备忘录（右下角热区） ───────── */
function buildQuickNote() {
  const ta = $('#qnText');
  ta.value = localStorage.getItem('mac_quicknote') || '';
  ta.addEventListener('input', () => localStorage.setItem('mac_quicknote', ta.value));
  let cornerTimer = null;
  document.addEventListener('pointermove', e => {
    const inCorner = toLX(e.clientX) > stageW - 60 && toLY(e.clientY) > stageH - 60;
    $('#qnCorner').classList.toggle('peek', inCorner);
    clearTimeout(cornerTimer);
    if (inCorner) cornerTimer = setTimeout(() => $('#quickNote').classList.remove('hidden'), 450);
  });
  $('#qnCorner').addEventListener('pointerdown', () => $('#quickNote').classList.remove('hidden'));
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#quickNote') && !e.target.closest('#qnCorner')) $('#quickNote').classList.add('hidden');
  });
}

/* ───────── 屏幕保护已移除（主人要求） ───────── */
function resetIdle() {}

/* ───────── 虚拟鼠标指针（跟随式：光标跟着触点走，点击全真透传） ───────── */
let cursorOn = false, curX = 0, curY = 0;
function setCursorMode(on) {
  cursorOn = on;
  settings.cursor = on; saveSettings();
  $('#cursor').classList.toggle('hidden', !on);
  const s = $('#ccPtrS');
  if (s) s.textContent = on ? '打开' : '关闭';
  const ico = $('#ccPointer .cc-ico');
  if (ico) ico.classList.toggle('on', on);
}
function drawCursor() {
  const c = $('#cursor');
  c.style.left = curX + 'px';
  c.style.top = curY + 'px';
}
let hoverEl = null;
const HOVER_SEL = 'a, button, input, .dock-item, .fs-item, .set-item, .pill-btn, .mb-item, .fs-file, .desk-icon, .qq-chat, .mail-item, .notes-item, .msg-chat, .sp-row, .ctx-item, .md-item, .c2-day, .cal-mini, .mu-album, .mu-song, .pc-show, .pc-ep, .wx2-city, .set-row, .st-row, .nc-widget, .wg-card, .cc-row, .cc-card, .lp-app, .sf-f, .sf-tab, .sf-nav, .tl, .fs-nav, .st-get, .toggle, .wall-opt, .photo, .fs-view, .map-src-btn, .ck-tab, .seg-ctl span';
let hoverTimer = 0;
function cursorSense() {
  const t = document.elementFromPoint(curX, curY);
  let shape = 'default';
  if (t) {
    if (t.closest('input, textarea, .term, .notes-edit')) shape = 'text';
    else if (t.closest(HOVER_SEL)) shape = 'hand';
  }
  const want = `cursors/${shape}.png`;
  const img = $('#cursorImg');
  if (img && !img.src.endsWith(want)) img.src = want;
  const hit = t && t.closest ? t.closest(HOVER_SEL) : null;
  if (hit !== hoverEl) {
    if (hoverEl) hoverEl.classList.remove('vhover');
    hoverEl = hit;
    if (hoverEl) hoverEl.classList.add('vhover');
  }
}
function buildCursor() {
  /* 纯跟随：不拦截任何事件，点击全部走原生通道，绝不漂移 */
  document.addEventListener('pointermove', e => {
    if (!cursorOn) return;
    curX = Math.max(0, Math.min(window.innerWidth - 22, e.clientX));
    curY = Math.max(0, Math.min(window.innerHeight - 22, e.clientY));
    drawCursor();
    const now = Date.now();
    if (now - hoverTimer > 90) { hoverTimer = now; cursorSense(); }
  }, { passive: true });
  document.addEventListener('pointerdown', e => {
    if (!cursorOn) return;
    curX = Math.max(0, Math.min(window.innerWidth - 22, e.clientX));
    curY = Math.max(0, Math.min(window.innerHeight - 22, e.clientY));
    drawCursor();
    cursorSense();
    $('#cursor').classList.add('press');
  }, { passive: true });
  document.addEventListener('pointerup', () => {
    if (!cursorOn) return;
    $('#cursor').classList.remove('press');
  }, { passive: true });
}

/* ───────── 触控手势：双指轻点 = 右键 ───────── */
function buildTouchGestures() {
  const touches = new Map();
  document.addEventListener('pointerdown', e => {
    if (e.pointerType !== 'touch') return;
    touches.set(e.pointerId, [e.clientX, e.clientY]);
    if (touches.size === 2) {
      const pts = [...touches.values()];
      const d = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
      if (d < 220) {
        const cx = (pts[0][0] + pts[1][0]) / 2, cy = (pts[0][1] + pts[1][1]) / 2;
        const target = document.elementFromPoint(cx, cy);
        if (target && target.dispatchEvent) {
          target.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: cx, clientY: cy }));
        }
      }
    }
  }, true);
  ['pointerup', 'pointercancel'].forEach(ev =>
    document.addEventListener(ev, e => touches.delete(e.pointerId), true));
}

/* ───────── 桌面橡皮筋框选 ───────── */
function buildRubberBand() {
  const wall = $('#wallpaper');
  wall.addEventListener('pointerdown', e => {
    const sx = toLX(e.clientX), sy = toLY(e.clientY);
    const rb = document.createElement('div');
    rb.className = 'rb';
    $('#stage').appendChild(rb);
    const move = ev => {
      const cx = toLX(ev.clientX), cy = toLY(ev.clientY);
      rb.style.left = Math.min(sx, cx) + 'px';
      rb.style.top = Math.min(sy, cy) + 'px';
      rb.style.width = Math.abs(cx - sx) + 'px';
      rb.style.height = Math.abs(cy - sy) + 'px';
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      rb.remove();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });
}

/* ───────── 截屏（真·截图存相册） ───────── */
function screenshot() {
  const f = $('#flash');
  f.classList.remove('hidden');
  f.style.opacity = '1';
  setTimeout(() => f.style.opacity = '0', 120);
  setTimeout(() => f.classList.add('hidden'), 400);
  if (window.AndroidBridge && AndroidBridge.captureScreen) {
    try { AndroidBridge.captureScreen(); } catch (e) {}
  } else {
    const d = new Date();
    addDeskIcon(`屏幕快照 ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}.png`, 'icons/fileimage.png', 'img');
  }
}
window.__shotSaved = () => notify('截屏', '屏幕快照已存储到系统相册 ✓');
window.__dlNotify = fn => notify('下载', `${fn} 已保存到 Download 目录`);

/* ───────── 控制中心 / 通知中心 ───────── */
function toggleCC(show) {
  const cc = $('#controlCenter');
  if (show === undefined) show = cc.classList.contains('hidden');
  cc.classList.toggle('hidden', !show);
  if (show) $('#notifCenter').classList.add('hidden');
}
function toggleNC(show) {
  const nc = $('#notifCenter');
  if (show === undefined) show = nc.classList.contains('hidden');
  nc.classList.toggle('hidden', !show);
  if (show) $('#controlCenter').classList.add('hidden');
}
function closeAllPopovers() {
  $('#controlCenter').classList.add('hidden');
  $('#notifCenter').classList.add('hidden');
  closeMenu();
}
function buildCC() {
  /* 注入 SF Symbols 风格字形 */
  $('#ccWifiIco').innerHTML = GLYPH.wifi;
  $('#ccBtIco').innerHTML = GLYPH.bt;
  $('#ccAdIco').innerHTML = GLYPH.airdrop;
  $('#ccFocusIco').innerHTML = GLYPH.moon;
  $('#ccMCIco').innerHTML = GLYPH.stage;
  $('#ccMirrorIco').innerHTML = GLYPH.mirror;
  $('#ccPtrIco').innerHTML = GLYPH.cursor;
  /* 磁贴/小组件点击跳转对应应用 */
  const ncW = $$('#notifCenter .nc-widget');
  if (ncW[0]) ncW[0].addEventListener('pointerdown', () => { toggleNC(false); openApp('calendar'); });
  if (ncW[1]) ncW[1].addEventListener('pointerdown', () => { toggleNC(false); openApp('weather'); });
  if (ncW[2]) ncW[2].addEventListener('pointerdown', () => { toggleNC(false); openApp('settings'); });
  if (ncW[3]) ncW[3].addEventListener('pointerdown', () => { toggleNC(false); openApp('reminders'); });
  const wg = $$('#widgets .wg-card');
  if (wg[0]) wg[0].addEventListener('pointerdown', () => openApp('clock'));
  if (wg[1]) wg[1].addEventListener('pointerdown', () => openApp('weather'));
  if (wg[2]) wg[2].addEventListener('pointerdown', () => openApp('settings'));
  $('#mbCC').addEventListener('pointerdown', e => { e.stopPropagation(); toggleCC(); });
  $('#mbClock').addEventListener('pointerdown', e => { e.stopPropagation(); toggleNC(); });
  $('#mbSpotlight').addEventListener('pointerdown', e => { e.stopPropagation(); toggleSpotlight(); });
  $('#mbSiri').addEventListener('pointerdown', e => { e.stopPropagation(); openSiri(); });
  /* Siri 弹层：点内部不收起，点外部才关 */
  $('#siri').addEventListener('pointerdown', e => e.stopPropagation());
  document.addEventListener('pointerdown', e => {
    const s = $('#siri');
    if (!s.classList.contains('hidden') && !e.target.closest('#siri')) closeSiri();
  });
  $('#siriInput').addEventListener('keydown', e => {
    e.stopPropagation();
    if (e.key === 'Enter') siriAsk(e.target.value);
  });
  /* 麦克风：原生 AudioRecord 优先（绕过 WebView NotReadableError），回落 getUserMedia */
  const micBtn = $('#siriMic');
  micBtn.innerHTML = GLYPH.mic;
  const ttsBtn = $('#siriTts');
  function drawTts() { ttsBtn.innerHTML = settings.siriTTS === false ? GLYPH.speakerMute : GLYPH.speaker; ttsBtn.classList.toggle('muted', settings.siriTTS === false); }
  drawTts();
  ttsBtn.addEventListener('pointerdown', e => {
    e.stopPropagation();
    settings.siriTTS = settings.siriTTS === false ? true : false;
    saveSettings(); drawTts();
    if (settings.siriTTS === false && siriAudio) { siriAudio.pause(); siriAudio = null; }
    notify('Siri', settings.siriTTS === false ? '语音播报已关闭' : '语音播报已开启');
  });
  micBtn.addEventListener('pointerdown', async e => {
    e.stopPropagation();
    const nativeMic = window.AndroidBridge && AndroidBridge.micStart;
    if (window._siriRec || window._siriNative) {
      /* 停止 → 识别 */
      micBtn.classList.remove('rec');
      $('#siriSub').textContent = '识别中…';
      try {
        let text = null;
        if (window._siriNative) {
          window._siriNative = false;
          const b64 = AndroidBridge.micStop();
          if (b64) text = await asrListenB64(b64);
        } else {
          window._siriRec.stop();
          return;   /* onstop 里继续 */
        }
        if (text) siriAsk(text);
        else $('#siriSub').textContent = '没听清，再说一次？';
      } catch (err) { $('#siriSub').textContent = '识别失败，试试打字'; }
      return;
    }
    /* 开始录音 */
    if (nativeMic) {
      if (AndroidBridge.micStart()) {
        window._siriNative = true;
        micBtn.classList.add('rec');
        $('#siriSub').textContent = '正在听…再点一下停止';
        return;
      }
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = ev => chunks.push(ev.data);
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        window._siriRec = null;
        micBtn.classList.remove('rec');
        $('#siriSub').textContent = '识别中…';
        try {
          const text = await asrListenB64(await blobToWavB64(new Blob(chunks, { type: rec.mimeType })));
          if (text) siriAsk(text);
          else $('#siriSub').textContent = '没听清，再说一次？';
        } catch (err) { $('#siriSub').textContent = '识别失败，试试打字'; }
      };
      window._siriRec = rec;
      rec.start();
      micBtn.classList.add('rec');
      $('#siriSub').textContent = '正在听…再点一下停止';
    } catch (err) {
      /* 权限自检 + 引导 */
      if (window.AndroidBridge && AndroidBridge.hasPermission && !AndroidBridge.hasPermission('RECORD_AUDIO')) {
        $('#siriSub').innerHTML = `没有麦克风权限 <span class="pill-btn on" id="siriPerm" style="padding:3px 12px;font-size:12px">去开启</span>`;
        $('#siriPerm').addEventListener('pointerdown', e2 => {
          e2.stopPropagation();
          AndroidBridge.requestPerms();
          setTimeout(() => { if (!AndroidBridge.hasPermission('RECORD_AUDIO')) AndroidBridge.openAppSettings(); }, 1500);
        });
        return;
      }
      $('#siriSub').textContent = '麦克风不可用：' + (err.name || '未知错误') + '，可尝试关闭其它占用麦克风的应用';
    }
  });
  $('#missionControl').addEventListener('pointerdown', e => { if (e.target.id === 'missionControl') e.currentTarget.classList.add('hidden'); });
  $('#qlClose').addEventListener('pointerdown', () => $('#quicklook').classList.add('hidden'));
  $('#quicklook').addEventListener('pointerdown', e => { if (e.target.id === 'quicklook') e.currentTarget.classList.add('hidden'); });
  $('#ccBright').addEventListener('input', e => {
    setBrightness(1 - e.target.value / 100 * 0.8);
    showOSD('sun', e.target.value / 100);
  });
  $$('#controlCenter input[type=range]').forEach(r => {
    if (r.id !== 'ccBright') r.addEventListener('input', e => {
      showOSD('speaker', e.target.value / 100);
      if (window.AndroidBridge && AndroidBridge.setVolumePct) AndroidBridge.setVolumePct(+e.target.value);
    });
  });
  /* 初始化音量滑块为系统真实音量 */
  if (window.AndroidBridge && AndroidBridge.getVolumePct) {
    try { $$('#controlCenter input[type=range]').forEach(r => { if (r.id !== 'ccBright') r.value = AndroidBridge.getVolumePct(); }); } catch (e) {}
  }
  $('#ccMC').addEventListener('click', () => { toggleCC(false); openMC(); });
  $('#ccFocus').addEventListener('click', () => {
    const s = $('#ccFocusS');
    const on = s.textContent === '关闭';
    s.textContent = on ? '打开' : '关闭';
    $('#ccFocus .cc-ico').classList.toggle('on', on);
    notify('专注模式', on ? '勿扰已打开' : '勿扰已关闭');
  });
  $('#ccMirror').addEventListener('click', () => notify('屏幕镜像', '正在查找 Apple TV…（演示）'));
  $('#ccPointer').addEventListener('click', () => setCursorMode(!cursorOn));
  $$('#controlCenter .cc-row[data-cc]').forEach(row => row.addEventListener('click', () => {
    const ico = row.querySelector('.cc-ico');
    ico.classList.toggle('on');
    const on = ico.classList.contains('on');
    const name = row.querySelector('.cc-t').textContent;
    const s = row.querySelector('.cc-s');
    if (s) s.textContent = on ? (name === '无线局域网' ? 'MyHome-5G' : '打开') : '关闭';
    notify(name, on ? '已打开' : '已关闭');
  }));
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#controlCenter') && !e.target.closest('#mbCC')) $('#controlCenter').classList.add('hidden');
    if (!e.target.closest('#notifCenter') && !e.target.closest('#mbClock')) $('#notifCenter').classList.add('hidden');
    if (e.target.id === 'spotlight') toggleSpotlight(false);
    if (e.target.id === 'launchpad') toggleLaunchpad(false);
  });
  $('#spInput').addEventListener('input', e => drawSpotlight(e.target.value));
  $('#spInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { const r = $('#spResults .sp-row'); if (r) r.dispatchEvent(new Event('pointerdown')); }
    if (e.key === 'Escape') toggleSpotlight(false);
  });
  $('#lpInput').addEventListener('input', e => drawLaunchpad(e.target.value));
}

/* ───────── 桌面图标 ───────── */
const deskIcons = [
  ['Macintosh HD', 'icons/disk.png', 'hd'], ['项目提案.pdf', 'icons/filepdf.png', 'pdf'], ['旅行照片.png', 'icons/fileimage.png', 'img'], ['README.txt', 'icons/filetext.png', 'txt'],
];
function buildDeskIcons() {
  $('#deskIcons').innerHTML = deskIcons.map((d, i) =>
    `<div class="desk-icon" data-i="${i}"><div class="di-img">${d[1].startsWith('<') ? d[1] : `<img src="${d[1]}" draggable="false">`}</div><div class="di-name">${d[0]}</div></div>`).join('');
  $$('.desk-icon').forEach(di => {
    let t = 0;
    di.addEventListener('pointerdown', () => {
      $$('.desk-icon').forEach(x => x.classList.remove('sel'));
      di.classList.add('sel');
      const now = Date.now();
      if (now - t < 350) {
        const [name, , type] = deskIcons[+di.dataset.i];
        if (type && type.startsWith('app:')) openApp(type.slice(4));   /* 应用快捷方式 */
        else if (type === 'hd' || type === 'folder') openApp('finder');
        else if (type === 'img') openApp('preview', { name, css: 'linear-gradient(135deg,#fccb90,#d57eeb)' });
        else quickLook(name);
      }
      t = now;
    });
  });
}
function addDeskIcon(name, ico, type) {
  if (ico === '📁') ico = 'icons/folder.png';
  if (ico === '🖼️') ico = 'icons/fileimage.png';
  deskIcons.push([name, ico, type || 'txt']);
  buildDeskIcons();
  notify('访达', `已创建「${name}」`);
}
/* 应用添加到桌面快捷方式 */
function addAppShortcut(id) {
  if (deskIcons.some(d => d[2] === 'app:' + id)) return notify('桌面', '快捷方式已存在');
  deskIcons.push([APPS[id].name, APPS[id].icon(), 'app:' + id]);
  buildDeskIcons();
  notify('桌面', `已为「${APPS[id].name}」创建快捷方式`);
}

/* ───────── 右键菜单 ───────── */
/* ───────── 右键菜单（分层：面板上不穿透到桌面） ───────── */
function buildCtx() {
  document.addEventListener('contextmenu', e => {
    e.preventDefault();
    /* 面板/弹层/小组件区域不透传 */
    if (e.target.closest('.window, #dock, #controlCenter, #notifCenter, #widgets, .banner, #quickNote, #spotlight, #launchpad, #menuDrop, #ctxMenu, #appSwitcher, #quicklook, #missionControl, #siri')) return;
    const ctx = $('#ctxMenu');
    ctx.innerHTML = `
      <div class="ctx-item" data-a="new">新建文件夹</div>
      <div class="ctx-item" data-a="newtxt">新建文本文件</div>
      <div class="ctx-sep"></div>
      <div class="ctx-item" data-a="wall">更换墙纸…</div>
      <div class="ctx-item" data-a="dark">切换深色模式</div>
      <div class="ctx-sep"></div>
      <div class="ctx-item" data-a="shot">截屏（存到相册）</div>
      <div class="ctx-item" data-a="info">显示简介</div>`;
    ctx.classList.remove('hidden');
    ctx.style.left = Math.min(toLX(e.clientX), stageW - 230) + 'px';
    ctx.style.top = Math.min(toLY(e.clientY), stageH - 250) + 'px';
    ctx.querySelectorAll('.ctx-item').forEach(it => it.addEventListener('pointerdown', ev => {
      ev.stopPropagation();
      ctx.classList.add('hidden');
      const a = it.dataset.a;
      if (a === 'new') addDeskIcon('新建文件夹', 'icons/folder.png', 'folder');
      else if (a === 'newtxt') {
        const n = '未命名.txt';
        FILE_CONTENTS[n] = '';
        saveFiles();
        addDeskIcon(n, 'icons/filetext.png', 'txt');
      }
      else if (a === 'wall') openApp('settings');
      else if (a === 'dark') applyDark(!darkMode);
      else if (a === 'shot') screenshot();
      else if (a === 'info') openApp('about');
    }));
  });
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#ctxMenu')) $('#ctxMenu').classList.add('hidden');
  });
}

/* ───────── 时钟 & 电池 ───────── */
function startClock() {
  const dow = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  tickClock = function tick() {
    const d = new Date();
    const hh = settings.clock24 ? String(d.getHours()).padStart(2, '0') : String(d.getHours() % 12 || 12);
    const ap = settings.clock24 ? '' : (d.getHours() < 12 ? ' 上午' : ' 下午');
    const ss = settings.showSec ? ':' + String(d.getSeconds()).padStart(2, '0') : '';
    const hm = `${hh}:${String(d.getMinutes()).padStart(2, '0')}${ss}${ap}`;
    $('#mbClock').textContent = `${dow[d.getDay()]} ${d.getMonth() + 1}月${d.getDate()}日 ${hm}`;
    const lt = $('#lockTime'); if (lt) lt.textContent = settings.clock24 ? `${hh}:${String(d.getMinutes()).padStart(2, '0')}` : `${hh}:${String(d.getMinutes()).padStart(2, '0')}`;
    const ld = $('#lockDate'); if (ld) ld.textContent = `${d.getMonth() + 1}月${d.getDate()}日 ${dow[d.getDay()]}`;
    const nd = $('#ncDate'); if (nd) nd.textContent = `${d.getMonth() + 1}月${d.getDate()}日 ${dow[d.getDay()]}`;
    const nc = $('#ncCal'); if (nc) nc.innerHTML = `<span style="font-size:30px;font-weight:300">${d.getDate()}</span> 日`;
  };
  tickClock();
  setInterval(() => tickClock(), settings.showSec ? 1000 : 5000);
  netCheck();
  window.addEventListener('online', () => { netCheck(); notify('网络', '已连接到互联网'); });
  window.addEventListener('offline', () => { netCheck(); notify('网络', '网络连接已断开'); });
  if (navigator.getBattery) navigator.getBattery().then(b => {
    const f = () => {
      batteryPct = Math.round(b.level * 100);
      const lv = $('#battLevel'); if (lv) lv.setAttribute('width', 21 * b.level);
      const nb = $('#ncBatt'); if (nb) nb.innerHTML = `MacBook Air<br>${batteryPct}%${b.charging ? ' ⚡充电中' : ''}`;
    };
    f(); b.addEventListener('levelchange', f); b.addEventListener('chargingchange', f);
  }).catch(() => {});
}

/* ───────── Dock 废纸篓图标刷新 ───────── */
function refreshDockTrash() {
  const item = document.querySelector('.dock-item[data-app="trash"] .dock-ico');
  if (item) item.innerHTML = ICONS.trash();
}

/* ───────── 电源操作 ───────── */
function sleep() {
  closeAllPopovers();
  $('#desktop').classList.add('hidden');
  $('#lock').classList.remove('hidden');
  const l = $('#lock');
  l.classList.add('lock-appear');
  setTimeout(() => l.classList.remove('lock-appear'), 600);
}
function logout() {
  closeAllPopovers();
  $('#desktop').classList.add('hidden');
  $('#lock').classList.remove('hidden');
}
function restart() {
  closeAllPopovers();
  $('#desktop').classList.add('hidden');
  boot(1200);
}
function shutdown() {
  closeAllPopovers();
  $('#desktop').classList.add('hidden');
  const b = document.createElement('div');
  b.id = 'poweroff';
  b.style.cssText = 'position:fixed;inset:0;background:#000;z-index:20000';
  document.body.appendChild(b);
  setTimeout(() => notifyPowerOn(b), 600);
}
function notifyPowerOn(b) {
  b.addEventListener('pointerdown', function h() {
    b.removeEventListener('pointerdown', h);
    b.remove();
    boot(1500);
  });
}

/* ───────── 开机流程（朴素版：logo → 进度条 → 锁屏） ───────── */
function boot(dur) {
  dur = dur || 5200;
  const bo = $('#boot'), fill = $('#bootFill');
  bo.classList.remove('hidden');
  fill.style.width = '0%';
  const bar = bo.querySelector('.boot-bar');
  bar.style.opacity = '0';
  setTimeout(() => { bar.style.transition = 'opacity .5s'; bar.style.opacity = '1'; }, Math.min(1400, dur * 0.22));
  const t0 = performance.now();
  const ease = p => p < 0.35 ? p * 1.6 : p < 0.72 ? 0.56 + (p - 0.35) * 0.75 : 0.84 + (p - 0.72) * 0.57;
  function frame(now) {
    const raw = Math.min(1, (now - t0) / dur);
    fill.style.width = (ease(raw) * 100).toFixed(1) + '%';
    if (raw < 1) { requestAnimationFrame(frame); return; }
    setTimeout(() => { bo.classList.add('hidden'); $('#lock').classList.remove('hidden'); }, 400);
  }
  requestAnimationFrame(frame);
}
function buildLockLogin() {
  /* 无登录界面：点按锁屏直接进入桌面 */
  $('#lock').addEventListener('pointerdown', () => {
    $('#lock').classList.add('hidden');
    enterDesktop();
  });
}
function enterDesktop() {
  $('#login').classList.add('hidden');
  $('#lock').classList.add('hidden');
  const d = $('#desktop');
  d.classList.remove('hidden');
  d.classList.add('login-appear');
  setTimeout(() => d.classList.remove('login-appear'), 700);
  setWallpaper(wallIdx);
  setTimeout(() => notify('欢迎使用 macOS', '点按 Dock 图标打开应用，双指点按桌面查看更多选项'), 800);
  /* 开机 3 秒后静默检测更新 */
  setTimeout(async () => {
    try {
      const r = await otaCheck(true);
      if (r) {
        notify('软件更新', `发现新版本 ${r.remote.name}，点我去更新`);
        const b = $('#banners .banner');
        if (b) b.addEventListener('pointerdown', () => {
          openApp('settings');
          setTimeout(() => { const g = document.querySelector('.set-item[data-s="general"]'); if (g) g.click(); setTimeout(() => { const u = document.querySelector('.set-row[data-g="update"]'); if (u) u.click(); }, 200); }, 400);
        });
      }
    } catch (e) {}
  }, 3000);
}

/* ───────── 快捷键 ───────── */
document.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  if (mod && e.code === 'Space') { e.preventDefault(); toggleSpotlight(); return; }
  if (mod && e.code === 'Tab') {
    e.preventDefault();
    if ($('#appSwitcher').classList.contains('hidden')) openSwitcher();
    else cycleSwitcher(e.shiftKey ? -1 : 1);
    return;
  }
  if (e.key === 'F3') { e.preventDefault(); openMC(); return; }
  if (mod && e.altKey && e.key === 'Escape') { e.preventDefault(); openApp('forcequit'); return; }
  if (mod && e.shiftKey && e.code === 'Digit3') { e.preventDefault(); screenshot(); return; }
  if (mod && e.altKey && e.code === 'Space') { e.preventDefault(); openEmoji(); return; }
  if (e.key === 'Enter' && !$('#appSwitcher').classList.contains('hidden')) { activateSwitcher(); return; }
  if (e.key === 'Escape') {
    if (!$('#appSwitcher').classList.contains('hidden')) { $('#appSwitcher').classList.add('hidden'); return; }
    if (!$('#emoji').classList.contains('hidden')) { $('#emoji').classList.add('hidden'); return; }
    closeAllPopovers(); toggleLaunchpad(false); toggleSpotlight(false);
    $('#quicklook').classList.add('hidden'); $('#missionControl').classList.add('hidden');
  }
});
document.addEventListener('keyup', e => {
  if ((e.key === 'Control' || e.key === 'Meta') && !$('#appSwitcher').classList.contains('hidden')) activateSwitcher();
});

/* ───────── 启动 ───────── */
window.onerror = function (msg, src, line) {
  const bo = document.getElementById('boot');
  if (bo && !bo.classList.contains('hidden')) {
    let e = document.getElementById('bootErr');
    if (!e) {
      e = document.createElement('div');
      e.style.cssText = 'color:#ff8080;font-size:11px;max-width:86%;text-align:center;position:absolute;bottom:10%;font-family:monospace';
      bo.appendChild(e);
    }
    e.textContent = 'ERR: ' + msg + ' @' + line;
  } else {
    try { notify('脚本错误', String(msg).slice(0, 60) + ' @' + line); } catch (x) {}
  }
};
window.addEventListener('DOMContentLoaded', () => {
  [() => applyDark(darkMode), () => setWallpaper(wallIdx), buildDock, buildMenubar, buildCC,
   buildDeskIcons, buildCtx, buildLockLogin, startClock, drawNotifList, buildQuickNote, buildRubberBand, buildTouchGestures, buildCursor]
    .forEach(f => { try { f(); } catch (err) { console.error(err); } });
  /* 恢复保存的偏好 */
  try {
    setAnim(settings.animOn, settings.animSpeed);
    setAutohide(settings.autohide);
    setMenubarHide(settings.menubarHide);
    setDockPos(settings.dockPos);
    if (settings.accent) document.documentElement.style.setProperty('--accent', settings.accent);
    applyScale();
    refreshDockTrash();
    initStoreApps();
    /* 在线壁纸恢复 */
    const wallUrl = localStorage.getItem('mac_wall_url');
    if (wallUrl) {
      const bg = `url('${wallUrl}') center/cover no-repeat`;
      $('#wallpaper').style.background = bg;
      $$('.lock-wall').forEach(el => { el.style.background = bg; });
    }
    if (localStorage.getItem('mac_widgets') === '1') toggleWidgets(true);
    setInterval(refreshWidgets, 60000);
    if (settings.cursor) setCursorMode(true);
  } catch (e) { console.error(e); }
  /* 屏幕尺寸变化 → 重新计算缩放 */
  let rzTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(() => { applyScale(); refreshDockSize(); }, 150);
  });
  ['pointerdown', 'keydown', 'pointermove', 'wheel'].forEach(ev =>
    document.addEventListener(ev, resetIdle, { passive: true }));
  resetIdle();
  $('#emoji').addEventListener('pointerdown', e => { if (e.target.id === 'emoji') $('#emoji').classList.add('hidden'); });
  boot(6200);
});
