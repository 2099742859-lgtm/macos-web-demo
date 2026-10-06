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

const siriHist = [];   /* 上下文记忆（有界：最近 24 轮） */
const SIRI_CTX_TTL = 30 * 60 * 1000;   /* 30 分钟无交互才算新对话 */
async function aiChat(userText, internal) {
  /* internal=true 表示 Agent 循环内部调用，跳过限流 */
  if (!internal) {
    const err = rateOK();
    if (err) return '⚠ ' + err;
    RATE.inFlight = true;
    RATE.ts.push(Date.now());
  }
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
【极其重要】你的一切操作都必须通过回复中的动作标记执行，系统只认标记，不认文字描述！
如果你只在文字里说"已打开/已创建"而不输出标记，什么都不会发生，用户会看到一个没有执行任何操作的骗子。
规则：文字回复给用户看，标记负责执行，两者必须同时有。可用标记：
[OPEN:应用id] 打开应用（safari,mail,maps,photos,notes,music,calendar,weather,calculator,terminal,settings,appstore,voicememo,photobooth,tv,podcast,reminders,facetime,clock,finder,dictionary）
[CLOSE:应用id] 关闭应用  [CLOSEALL] 关闭全部窗口  [SHOWDESKTOP] 显示桌面
[DARK:on/off] 深色模式  [BRIGHT:0-100] 亮度  [VOL:0-100] 音量
[SHOT] 截屏  [LOCK] 锁屏  [WALL:0-7] 换壁纸  [WIFI:on/off] 无线局域网
[FOCUS:on/off] 专注模式  [WIDGETS:on/off] 桌面小组件  [MC] 调度中心
[NOTE:内容] 写进备忘录  [REMIND:内容] 加提醒事项  [TIMER:分钟数] 倒计时
[MUSIC:关键词] 搜索播放音乐  [TRASH] 清空废纸篓  [LAUNCHPAD] 启动台
[SLEEP] 睡眠  [RESTART] 重启  [SHUTDOWN] 关机  [SWITCHER] App切换器
[SPOTLIGHT:关键词] 聚焦搜索  [NOTIFY:内容] 发系统通知  [SCALE:80-140] 界面缩放
[SEARCH:关键词] 联网搜索最新信息（天气、新闻、实事、汇率等你不知道的都【必须】先搜，不许凭记忆编造）
[SHELL:命令] 在终端执行 shell 命令（如 SHELL:ls -l、SHELL:mkdir 项目）
[CREATE:文件名|内容] 创建文件到桌面（如 CREATE:购物清单.txt|牛奶、鸡蛋）
回复中不要用 ** 等 Markdown 符号，直接写纯文本。`;
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
/* ── 语音识别：MediaRecorder 录音 → 转 WAV → MiMo ASR ── */
/* Siri 全局接口：任何应用/终端都可以调起 */
window.Siri = {
  ask: text => { openSiri(); setTimeout(() => siriAsk(text), 300); },
  exec: text => siriAsk(text),   /* 不开界面直接执行 */
  history: siriHist,
};

/* ── Exa 联网搜索（MCP，免 Key） ── */
async function webSearch(q) {
  try {
    const r = await apiFetch('https://mcp.exa.ai/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'web_search_exa', arguments: { query: q, numResults: 3 } },
      }),
    }, 20000, 1);
    const text = await r.text();
    const m = text.match(/data: (\{.*\})/);
    if (!m) return null;
    const j = JSON.parse(m[1]);
    const c = j.result && j.result.content && j.result.content[0];
    return c ? c.text.slice(0, 1500) : null;
  } catch (e) { return null; }
}

/* ── 动作执行（支持一次回复多个动作，返回执行记录供 Agent 循环） ── */
function siriExec(reply) {
  let clean = reply;
  const done = [];
  const eat = (re, fn, label) => {
    const ms = [...clean.matchAll(new RegExp(re, 'g'))];
    ms.forEach(m => { fn(m); done.push(label(m)); });
    clean = clean.replace(new RegExp(re, 'g'), '').trim();
  };
  eat(/\[OPEN:(\w+)\]/, m => { if (APPS[m[1]]) setTimeout(() => openApp(m[1]), 1200); }, m => `打开了${APPS[m[1]] ? APPS[m[1]].name : m[1]}`);
  eat(/\[CLOSE:(\w+)\]/, m => { const w = winByApp[m[1]]; if (w) closeWindow(w); }, m => `关闭了${APPS[m[1]] ? APPS[m[1]].name : m[1]}`);
  eat(/\[CLOSEALL\]/, () => Object.keys(winByApp).forEach(id => { const w = winByApp[id]; if (w && document.getElementById(w)) closeWindow(w); }), () => '关闭了全部窗口');
  eat(/\[SHOWDESKTOP\]/, () => { $$('.window').forEach(w => minimizeWindow(w.id)); }, () => '已显示桌面');
  eat(/\[DARK:(on|off)\]/, m => applyDark(m[1] === 'on'), m => `深色模式已${m[1] === 'on' ? '开' : '关'}`);
  eat(/\[BRIGHT:(\d+)\]/, m => setBrightness(1 - Math.min(100, +m[1]) / 100 * 0.8), m => `亮度调到${m[1]}%`);
  eat(/\[VOL:(\d+)\]/, m => { if (window.AndroidBridge && AndroidBridge.setVolumePct) AndroidBridge.setVolumePct(+m[1]); }, m => `音量调到${m[1]}%`);
  eat(/\[SHOT\]/, () => setTimeout(screenshot, 800), () => '已截屏');
  eat(/\[LOCK\]/, () => setTimeout(() => lockScreen(), 1000), () => '已锁屏');
  eat(/\[WALL:(\d)\]/, m => setWallpaper(Math.min(7, +m[1])), m => `换了第${+m[1] + 1}张壁纸`);
  eat(/\[WIFI:(on|off)\]/, m => notify('无线局域网', m[1] === 'on' ? '已打开' : '已关闭'), m => `WiFi已${m[1] === 'on' ? '开' : '关'}`);
  eat(/\[FOCUS:(on|off)\]/, m => { settings.focusOn = m[1] === 'on'; saveSettings(); notify('专注模式', settings.focusOn ? '已开启' : '已关闭'); }, m => `专注模式已${m[1] === 'on' ? '开' : '关'}`);
  eat(/\[WIDGETS:(on|off)\]/, m => toggleWidgets(m[1] === 'on'), m => `小组件已${m[1] === 'on' ? '开' : '关'}`);
  eat(/\[MC\]/, () => setTimeout(openMC, 900), () => '打开了调度中心');
  eat(/\[LAUNCHPAD\]/, () => setTimeout(() => toggleLaunchpad(true), 900), () => '打开了启动台');
  eat(/\[TRASH\]/, () => { TRASH.length = 0; saveTrash(); refreshDockTrash(); notify('废纸篓', '已清空'); }, () => '清空了废纸篓');
  /* 底层电源级控制 */
  eat(/\[SLEEP\]/, () => setTimeout(sleep, 900), () => '已睡眠');
  eat(/\[RESTART\]/, () => setTimeout(restart, 900), () => '正在重启');
  eat(/\[SHUTDOWN\]/, () => setTimeout(shutdown, 900), () => '正在关机');
  eat(/\[SWITCHER\]/, () => setTimeout(openSwitcher, 900), () => '打开了 App 切换器');
  eat(/\[SPOTLIGHT:([^\]]+)\]/, m => setTimeout(() => { toggleSpotlight(true); const i = $('#spInput'); if (i) { i.value = m[1]; drawSpotlight(m[1]); } }, 900), m => `聚焦搜索「${m[1]}」`);
  eat(/\[NOTIFY:([^\]]+)\]/, m => notify('Siri', m[1]), m => `发了通知「${m[1]}」`);
  eat(/\[SCALE:(\d+)\]/, m => { settings.scale = Math.max(80, Math.min(140, +m[1])); saveSettings(); applyStage(); }, m => `界面缩放到${m[1]}%`);
  eat(/\[SHELL:([^\]]+)\]/, m => {
    openApp('terminal');
    setTimeout(() => {
      const w = document.getElementById(winByApp.terminal);
      if (w && w.__termExec) w.__termExec(m[1]);
    }, 700);
  }, m => `终端执行「${m[1]}」`);
  /* 创建文件：桌面/文稿（宽容匹配：竖线可省略，内容可空） */
  eat(/\[CREATE:([^|\]]+?)(?:\|([^\]]*))?\]/, m => {
    const name = m[1].trim(), content = m[2] || '';
    FILE_CONTENTS[name] = content;
    const doc = VFS['文稿'] ? VFS['文稿'].children : null;
    if (doc && !doc.includes(name)) doc.push(name);
    saveFiles(); saveVFS();
    if (/^桌面|desktop/i.test(name) || m[1].includes('桌面')) {
      const realName = name.replace(/桌面\/?/i, '');
      FILE_CONTENTS[realName] = content;
      if (doc) { const i2 = doc.indexOf(name); if (i2 >= 0) doc.splice(i2, 1); if (!doc.includes(realName)) doc.push(realName); }
      addDeskIcon(realName, 'icons/filetext.png', 'txt');
      saveFiles(); saveVFS();
    } else {
      addDeskIcon(name, 'icons/filetext.png', 'txt');
    }
    notify('访达', `已创建「${name}」`);
  }, m => `创建了文件「${m[1].trim()}」`);
  eat(/\[NOTE:([^\]]+)\]/, m => {
    const notes = JSON.parse(localStorage.getItem('mac_notes') || '[]');
    notes.unshift({ t: m[1].slice(0, 12), b: m[1] });
    localStorage.setItem('mac_notes', JSON.stringify(notes));
    notify('备忘录', '已记下');
  }, () => '记到备忘录了');
  eat(/\[REMIND:([^\]]+)\]/, m => {
    const items = JSON.parse(localStorage.getItem('mac_reminders') || '[]');
    items.unshift([m[1], false]);
    localStorage.setItem('mac_reminders', JSON.stringify(items));
    notify('提醒事项', '已添加提醒');
  }, () => '加了提醒');
  eat(/\[TIMER:(\d+)\]/, m => notify('时钟', `已设定 ${m[1]} 分钟倒计时`), m => `定了${m[1]}分钟倒计时`);
  eat(/\[MUSIC:([^\]]+)\]/, m => { openApp('music'); setTimeout(() => { const s = document.querySelector('#muSearch'); if (s) { s.value = m[1]; s.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); } }, 800); }, m => `搜索播放「${m[1]}」`);
  return { clean, done };
}
function openSiri() {
  const siri = $('#siri');
  siri.classList.remove('hidden');
  /* 超时 30 分钟重开 = 清空上下文；否则显示上一轮内容 */
  if (window._siriClosedAt && Date.now() - window._siriClosedAt > SIRI_CTX_TTL) siriHist.length = 0;
  if (siriHist.length >= 2) {
    $('#siriText').textContent = siriHist[siriHist.length - 2].content;
    $('#siriSub').textContent = siriHist[siriHist.length - 1].content;
  } else {
    $('#siriText').textContent = '我是 Siri';
    $('#siriSub').textContent = '有什么可以帮你？';
  }
  browserYield(true);
  /* 不自动聚焦：点击输入框才弹键盘 */
}
async function siriAsk(text) {
  if (!text.trim()) return;
  $('#siriText').textContent = text;
  $('#siriSub').textContent = '思考中…';
  $('#siriInput').value = '';
  /* Agent 循环：执行动作 → 回报结果 → 允许继续规划，最多 3 轮 */
  let userMsg = text, finalReply = '', round = 0;
  while (round < 3) {
    const reply = await aiChat(userMsg, round > 0);
    if (!reply) {
      $('#siriSub').textContent = !NET.online ? '离线了，先连网再聊' : '网络好像有点问题，稍后再试试';
      return;
    }
    /* 联网搜索：先执行同回复里的其它动作，再搜索，继续循环 */
    const sm = reply.match(/\[SEARCH:([^\]]+)\]/);
    if (sm) {
      const { clean: preClean, done: preDone } = siriExec(reply.replace(sm[0], ''));
      if (preDone.length) {
        if (!document.querySelector('#siri.hidden')) $('#siriSub').textContent = preClean + `\n⚙ ${preDone.join('、')}`;
        else notify('Siri', preDone.join('、'));
        finalReply = preClean || finalReply;
      }
      $('#siriSub').textContent = '正在联网搜索…';
      const results = await webSearch(sm[1]);
      siriHist.push({ role: 'assistant', content: preClean.slice(0, 400) });
      userMsg = `（搜索「${sm[1]}」的结果：\n${results || '没有结果，凭已有知识回答'}\n）根据结果回答用户「${text}」，简明扼要`;
      round++;
      continue;
    }
    const { clean, done } = siriExec(reply);
    finalReply = clean || finalReply;
    /* 嘴炮检测：声称做了事但没输出标记 → 打回去重做 */
    const claims = /已(打开|创建|关闭|完成|设定|切换|调整|删除|记下|添加)/.test(clean);
    if (!done.length && claims && round < 2) {
      userMsg = '（系统：你的回复声称执行了操作，但没有任何动作标记，实际上什么都没发生！请重新回复，必须用 [OPEN:] [CREATE:] [SEARCH:] 等标记真正执行。）';
      siriHist.push({ role: 'assistant', content: clean.slice(0, 400) });
      round++;
      continue;
    }
    /* 后台执行：面板关了也继续，结果走通知 */
    if (!document.querySelector('#siri.hidden')) {
      $('#siriSub').textContent = clean + (done.length ? `\n⚙ ${done.join('、')}` : '');
    } else if (done.length) {
      notify('Siri', done.join('、'));
    }
    if (!done.length) break;   /* 没动作 = 对话结束 */
    /* 回报执行结果，让模型决定是否继续 */
    siriHist.push({ role: 'assistant', content: clean.slice(0, 400) });
    userMsg = `（系统回报：已执行 ${done.join('、')}。如果任务已完成就直接总结回复用户，不要重复动作；如果还有后续步骤，继续输出动作标记。）`;
    round++;
  }
  siriHist.push({ role: 'user', content: text.slice(0, 400) });
  if (finalReply) { siriHist.push({ role: 'assistant', content: finalReply.slice(0, 400) }); }
  while (siriHist.length > 48) siriHist.shift();
  /* 面板已关 = 后台任务完成，发通知 */
  if (document.querySelector('#siri.hidden') && finalReply) notify('Siri', finalReply.slice(0, 80));
}
function closeSiri() {
  $('#siri').classList.add('hidden');
  browserYield(false);
  /* 后台继续执行：不打断进行中的 Agent 任务 */
  window._siriClosedAt = Date.now();
}

