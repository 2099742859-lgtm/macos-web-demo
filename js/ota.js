/* ───────── OTA 在线更新（多源测速 + 防回滚 + 可屏蔽 + 自动重启） ───────── */
const APP_VER = { code: 29, name: '1.1.4_beta_261005(2)' };
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
/* 差量更新：只下载哈希变化的文件，写入前逐个校验 SHA-256 */
async function sha16B64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const h = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}
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
  let changed = Object.keys(files).filter(f => baseline[f] !== files[f]);
  /* 基线说最新但版本号没跟上 = 之前没落盘成功，强制全量重下 */
  if (!changed.length && manifest.code > APP_VER.code) {
    changed = Object.keys(files);
  }
  if (!changed.length) { onProgress(1, '无需更新'); return 0; }
  const canVerify = !!(crypto && crypto.subtle);
  let done = 0, bytes = 0;
  for (const f of changed) {
    onProgress(done / changed.length, `下载 ${f}`);
    const b64 = await bridgeBinary(sourceBase + f, 30000);
    if (!b64) throw new Error('下载失败: ' + f);
    /* 哈希校验：与清单不符 = 源被污染/缓存陈旧，中止 */
    if (canVerify) {
      const hv = await sha16B64(b64);
      if (hv !== files[f]) throw new Error(`校验失败: ${f}（请换个时间重试）`);
    }
    bytes += Math.round(b64.length * 3 / 4);
    if (!AndroidBridge.writeWebFile(f, b64)) throw new Error('写入失败: ' + f);
    baseline[f] = files[f];
    done++;
    onProgress(done / changed.length, `${done}/${changed.length} 个文件（已校验）`);
  }
  localStorage.setItem('mac_ota_hashes', JSON.stringify(baseline));
  localStorage.setItem('mac_ota_applied', '1');
  /* 更新日志留存：重启后仍可在更新页查看 */
  localStorage.setItem('mac_last_update', JSON.stringify({
    name: manifest.name, notes: manifest.notes || [], at: Date.now(),
  }));
  return { count: changed.length, bytes };
}

