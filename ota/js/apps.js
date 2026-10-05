/* ═══ 应用注册表与界面逻辑 ═══ */

/* 开机时间戳（uptime 用） */
const BOOT_TS = Date.now();

/* 文件内容库（持久化；QL_TEXT 为内置只读内容） */
const FILE_CONTENTS = JSON.parse(localStorage.getItem('mac_files') || '{}');
function saveFiles() { localStorage.setItem('mac_files', JSON.stringify(FILE_CONTENTS)); }
function fileContent(name) {
  if (FILE_CONTENTS[name] !== undefined) return FILE_CONTENTS[name];
  if (typeof QL_TEXT !== 'undefined' && QL_TEXT[name] !== undefined) return QL_TEXT[name];
  return undefined;
}

/* 虚拟文件系统（访达用，可持久化变更） */
const VFS = {
  'Macintosh HD': { type: 'folder', children: ['应用程序', '用户', '系统', '资源库'] },
  '应用程序': { type: 'folder', children: ['Safari.app', '邮件.app', '信息.app', '照片.app', '终端.app', '计算器.app'] },
  '用户': { type: 'folder', children: ['User'] },
  'User': { type: 'folder', children: ['桌面', '文稿', '下载', '图片', '音乐', '影片'] },
  '桌面': { type: 'folder', children: ['旅行照片.png', '会议纪要.txt'] },
  '文稿': { type: 'folder', children: ['项目提案.pdf', '季度报告.txt', '设计稿.png', '私人'] },
  '私人': { type: 'folder', children: ['密码本.txt'] },
  '下载': { type: 'folder', children: ['产品手册.pdf', 'macOS壁纸.zip'] },
  '图片': { type: 'folder', children: ['城市夜景.png', '周末徒步.png', '云朵.png'] },
  '音乐': { type: 'folder', children: ['Neon Skyline.mp3', 'Lo-Fi 合集.mp3'] },
  '影片': { type: 'folder', children: ['家庭录像.mp4'] },
  '系统': { type: 'folder', children: ['核心服务', '资源库'] },
  '资源库': { type: 'folder', children: ['字体', '偏好设置'] },
};
/* 启动时合并用户改动 */
try {
  const saved = JSON.parse(localStorage.getItem('mac_vfs') || 'null');
  if (saved) Object.keys(saved).forEach(k => VFS[k] = saved[k]);
} catch (e) {}
function saveVFS() {
  const out = {};
  Object.keys(VFS).forEach(k => out[k] = { type: 'folder', children: VFS[k].children });
  localStorage.setItem('mac_vfs', JSON.stringify(out));
}

function fileIcon(name) {
  let p;
  if (VFS[name]) p = FILE_ICONS.folder;
  else if (/\.(png|jpg|gif|heic)$/i.test(name)) p = FILE_ICONS.img;
  else if (/\.pdf$/i.test(name)) p = FILE_ICONS.pdf;
  else if (/\.zip$/i.test(name)) p = FILE_ICONS.zip;
  else if (/\.(mp3|m4a)$/i.test(name)) return '🎵';
  else if (/\.app$/i.test(name)) return '📦';
  else p = FILE_ICONS.txt;
  return `<img class="fic" src="${p}" draggable="false">`;
}

/* 文件索引（聚焦搜索用）：{name, folder} */
const FILE_INDEX = [];
Object.keys(VFS).forEach(folder => VFS[folder].children.forEach(c => {
  if (!VFS[c]) FILE_INDEX.push({ name: c, folder });
}));

/* Quick Look 文本内容 */
const QL_TEXT = {
  'README.txt': 'macOS Web 还原演示\n\n本系统由 HTML + CSS + JavaScript 手工构建，\n还原了 macOS 的桌面、访达、Dock、\n菜单栏、控制中心、调度中心等体验。\n\n仅供学习交流，与 Apple Inc. 无关。',
  '会议纪要.txt': '会议纪要 · 周一例会\n\n1. 项目进度正常，下周进入联调\n2. 设计稿周三前定稿\n3. 周五提交季度报告初稿',
  '季度报告.txt': '季度报告（草稿）\n\n本季度核心指标均有提升，\n详见附件图表。',
  '密码本.txt': '（此文件已加密 🔒）',
  '产品手册.pdf': '产品手册\n\n第 1 页 / 共 24 页\n（演示版仅显示封面）',
  '项目提案.pdf': '项目提案\n\n第 1 页 / 共 12 页\n（演示版仅显示封面）',
};

/* 照片图库（Photo Booth 会往里加） */
const PHOTOS = [
  ['photos/p1.jpg', '山径'], ['photos/p2.jpg', '湖岸'], ['photos/p3.jpg', '晨光'],
  ['photos/p4.jpg', '森林'], ['photos/p5.jpg', '海岸'], ['photos/p6.jpg', '城市'],
  ['photos/p7.jpg', '暮色'], ['photos/p8.jpg', '旷野'], ['photos/p9.jpg', '溪流'],
  ['photos/p10.jpg', '雪原'], ['photos/p11.jpg', '峡谷'], ['photos/p12.jpg', '花海'],
].map(p => ({ name: p[1], img: p[0] }));

/* 废纸篓 */
const TRASH = JSON.parse(localStorage.getItem('mac_trash') || '[]');
function saveTrash() { localStorage.setItem('mac_trash', JSON.stringify(TRASH)); }
function isDirName(name) { return !!VFS[name]; }
/* 移到废纸篓（访达/桌面通用） */
function moveToTrash(name) {
  TRASH.push({ n: name, c: FILE_CONTENTS[name] || null, dir: isDirName(name) ? 1 : 0 });
  saveTrash();
  const i = (VFS['下载'] ? VFS['下载'].children : []).indexOf(name);
  /* 从所有目录移除 */
  Object.keys(VFS).forEach(d => {
    const idx = VFS[d].children.indexOf(name);
    if (idx >= 0) VFS[d].children.splice(idx, 1);
  });
  delete VFS[name]; delete FILE_CONTENTS[name];
  saveVFS(); saveFiles();
  if (typeof refreshDockTrash === 'function') refreshDockTrash();
}
function refreshDockTrash() {
  const di = document.querySelector('.dock-item[data-app="trash"] .dock-ico');
  if (di) di.innerHTML = ICONS.trash();
}

const APPS = {
  launchpad: { name: '启动台', icon: () => ICONS.launchpad(), w: 10, h: 10, render() {} },

  /* ─── 访达 ─── */
  finder: {
    name: '访达', icon: () => ICONS.finder(), w: 780, h: 500,
    render(el, win, arg) {
      let path = ['Macintosh HD', '用户', 'User'];
      if (arg && arg.folder) { path = ['Macintosh HD', '用户', 'User', arg.folder].filter((v, i, a) => i < 3 || VFS[v]); }
      let hist = [path.slice()], hi = 0;
      let view = 'grid', selected = null;
      const cur = () => path[path.length - 1];
      el.innerHTML = `<div class="finder">
        <div class="fs-side">
          <div class="fs-sec">个人收藏</div>
          ${['隔空投送|airdrop', '最近使用|recents', '应用程序|apps', '桌面|desktop', '文稿|doc', '下载|download'].map(s => {
            const [n, i] = s.split('|');
            return `<div class="fs-item" data-go="${n}"><span class="fs-glyph">${GLYPH[i]}</span>${n}</div>`;
          }).join('')}
          <div class="fs-sec">位置</div>
          <div class="fs-item" data-go="Macintosh HD"><span class="fs-glyph">${GLYPH.disk}</span>Macintosh HD</div>
          <div class="fs-item" data-go="User"><span class="fs-glyph">${GLYPH.home}</span>User</div>
        </div>
        <div style="flex:1;display:flex;flex-direction:column;min-width:0">
          <div class="fs-toolbar">
            <span class="fs-nav" id="fsBack">‹</span><span class="fs-nav" id="fsFwd">›</span>
            <b id="fsPathName"></b>
            <span class="fs-view" data-v="grid" title="图标视图">▦</span>
            <span class="fs-view" data-v="list" title="列表视图">☰</span>
          </div>
          <div class="fs-main" id="fsMain"></div>
        </div></div>`;
      const main = el.querySelector('#fsMain');
      function draw() {
        el.querySelector('#fsPathName').textContent = cur();
        el.querySelectorAll('.fs-view').forEach(v => v.classList.toggle('sel', v.dataset.v === view));
        const kids = (VFS[cur()] && VFS[cur()].children) || [];
        main.className = view === 'grid' ? 'fs-main' : 'fs-main list';
        main.innerHTML = kids.map(k =>
          `<div class="fs-file" data-name="${k}"><div class="ff-ico">${fileIcon(k)}</div><span>${k}</span></div>`
        ).join('') || `<div class="fs-empty">文件夹是空的</div>`;
        main.querySelectorAll('.fs-file').forEach(f => {
          f.addEventListener('pointerdown', () => {
            if (selected === f.dataset.name) { openFile(f.dataset.name); selected = null; return; }
            selected = f.dataset.name;
            main.querySelectorAll('.fs-file').forEach(x => x.classList.remove('sel'));
            f.classList.add('sel');
          });
          /* 文件右键/双指轻点：上下文菜单 */
          f.addEventListener('contextmenu', e => {
            e.preventDefault(); e.stopPropagation();
            const name = f.dataset.name;
            const ctx = $('#ctxMenu');
            ctx.innerHTML = `
              <div class="ctx-item" data-a="open">打开</div>
              <div class="ctx-item" data-a="ql">快速查看</div>
              <div class="ctx-sep"></div>
              <div class="ctx-item" data-a="trash" style="color:#ff3b30">移到废纸篓</div>`;
            ctx.style.left = Math.min(e.clientX, innerWidth - 190) + 'px';
            ctx.style.top = Math.min(e.clientY, innerHeight - 140) + 'px';
            ctx.classList.remove('hidden');
            ctx.querySelectorAll('.ctx-item').forEach(it => it.addEventListener('pointerdown', ev => {
              ev.stopPropagation();
              ctx.classList.add('hidden');
              if (it.dataset.a === 'open') openFile(name);
              else if (it.dataset.a === 'ql') quickLook(name);
              else if (it.dataset.a === 'trash') { moveToTrash(name); selected = null; draw(); notify('访达', `「${name}」已移到废纸篓`); }
            }));
          });
        });
      }
      function openFile(name) {
        if (VFS[name]) { path.push(name); pushHist(); draw(); }
        else if (window.isTextFile && isTextFile(name)) openApp('textedit', { file: name });
        else quickLook(name);
      }
      function pushHist() { hist = hist.slice(0, hi + 1); hist.push(path.slice()); hi = hist.length - 1; }
      el.querySelector('#fsBack').addEventListener('click', () => {
        if (hi > 0) { hi--; path = hist[hi].slice(); selected = null; draw(); }
      });
      el.querySelector('#fsFwd').addEventListener('click', () => {
        if (hi < hist.length - 1) { hi++; path = hist[hi].slice(); selected = null; draw(); }
      });
      el.querySelectorAll('.fs-view').forEach(v => v.addEventListener('click', () => { view = v.dataset.v; draw(); }));
      el.querySelectorAll('.fs-item').forEach(it => it.addEventListener('click', () => {
        el.querySelectorAll('.fs-item').forEach(x => x.classList.remove('sel'));
        it.classList.add('sel');
        const n = it.dataset.go;
        if (n === '隔空投送') { openApp('airdrop'); return; }
        if (n === '最近使用') {
          const recents = JSON.parse(localStorage.getItem('mac_recents') || '[]');
          if (!recents.length) { notify('访达', '还没有最近使用的项目'); return; }
          path = ['__最近使用__']; selected = null;
          main.innerHTML = recents.map(r =>
            `<div class="fs-file" data-name="${r}"><div class="ff-ico">${fileIcon(r)}</div><span>${r}</span></div>`).join('');
          main.querySelectorAll('.fs-file').forEach(f => f.addEventListener('pointerdown', () => quickLook(f.dataset.name)));
          return;
        }
        path = n === 'Macintosh HD' ? ['Macintosh HD'] : ['Macintosh HD', '用户', 'User'];
        if (['应用程序', '桌面', '文稿', '下载'].includes(n)) path.push(n);
        pushHist(); selected = null; draw();
      }));
      draw();
    }
  },

  /* ─── Safari（窗口化原生浏览器 + 真多标签页） ─── */
  safari: {
    name: 'Safari 浏览器', icon: () => ICONS.safari(), w: 880, h: 580,
    render(el, win) {
      const FAVS = [['🍎', 'Apple', 'apple.com.cn'], ['📖', '维基百科', 'zh.wikipedia.org'], ['🐙', 'GitHub', 'github.com'], ['📺', '哔哩哔哩', 'bilibili.com'],
        ['🗞', '少数派', 'sspai.com'], ['🔧', 'MDN', 'developer.mozilla.org'], ['💬', '知乎', 'zhihu.com'], ['🛒', '淘宝', 'taobao.com']];
      let tabs = [], active = -1;
      el.innerHTML = `<div class="safari">
        <div class="sf-tabs hidden" id="sfTabs"></div>
        <div class="sf-bar">
          <span class="sf-nav" id="sfB">‹</span><span class="sf-nav" id="sfF">›</span><span class="sf-nav" id="sfR">⟳</span>
          <input class="sf-url" id="sfUrl" placeholder="搜索或输入网址" autocomplete="off">
          <span class="sf-nav" id="sfNew">＋</span><span class="sf-nav" id="sfHome">⌂</span>
        </div>
        <div class="sf-view" id="sfView"></div></div>`;
      const view = el.querySelector('#sfView'), urlInp = el.querySelector('#sfUrl');
      function startPage() {
        view.innerHTML = `<div class="sf-body"><div class="sf-h">个人收藏</div>
          <div class="sf-fav">${FAVS.map(f =>
            `<div class="sf-f" data-u="${f[2]}"><div class="ic">${f[0]}</div>${f[1]}</div>`).join('')}</div>
          <div class="sf-h" style="margin-top:26px">隐私报告</div>
          <div style="color:#666;font-size:13.5px;line-height:1.7">过去七天中，已阻止 23 个跟踪器对您进行画像。</div></div>`;
        view.querySelectorAll('.sf-f').forEach(f => f.addEventListener('click', () => go(f.dataset.u)));
      }
      function drawTabs() {
        const bar = el.querySelector('#sfTabs');
        bar.classList.toggle('hidden', !tabs.length);
        bar.innerHTML = tabs.map((t, i) =>
          `<div class="sf-tab ${i === active ? 'on' : ''}" data-i="${i}">
            <span class="sf-tab-t">${(t.title || t.url || '新标签页').replace(/</g, '&lt;').slice(0, 18)}</span>
            <span class="sf-tab-x" data-x="${i}">✕</span></div>`).join('') +
          `<span class="sf-tab-plus" id="sfTabPlus">＋</span>`;
        bar.querySelectorAll('.sf-tab').forEach(tb => tb.addEventListener('pointerdown', e => {
          if (e.target.classList.contains('sf-tab-x')) return;
          switchTab(+tb.dataset.i);
        }));
        bar.querySelectorAll('.sf-tab-x').forEach(x => x.addEventListener('pointerdown', e => {
          e.stopPropagation();
          closeTab(+x.dataset.x);
        }));
        bar.querySelector('#sfTabPlus').addEventListener('pointerdown', () => newTab('https://www.bing.com'));
      }
      function newTab(url) {
        /* 总是创建新的原生 WebView 标签 */
        view.innerHTML = `<div class="sf-cover">网页已加载到此区域<br><span style="font-size:12px;color:#999">原生引擎 · 电脑模式</span></div>`;
        browserAttachTab(win, view, url);
        tabs.push({ title: '', url });
        active = tabs.length - 1;
        drawTabs();
      }
      function go(url) {
        if (!/^https?:\/\//i.test(url)) url = (url.includes('.') && !url.includes(' '))
          ? 'https://' + url : 'https://www.bing.com/search?q=' + encodeURIComponent(url);
        urlInp.value = url;
        if (!navigator.onLine) { view.innerHTML = `<div class="sf-err">🔴 离线状态</div>`; return; }
        if (active < 0 || !tabs.length) newTab(url);
        else {
          tabs[active].url = url;
          tabs[active].title = '';
          AndroidBridge.browserLoadActive(url);
          drawTabs();
        }
      }
      function switchTab(i) {
        active = i;
        AndroidBridge.browserSwitchTab(i);
        urlInp.value = tabs[i].url || '';
        drawTabs();
      }
      function closeTab(i) {
        AndroidBridge.browserCloseTab(i);
        tabs.splice(i, 1);
        if (active >= tabs.length) active = tabs.length - 1;
        if (!tabs.length) { active = -1; startPage(); urlInp.value = ''; }
        else { AndroidBridge.browserSwitchTab(active); urlInp.value = tabs[active].url; }
        drawTabs();
      }
      /* Java 侧页面标题回调 */
      window.__tabState = (i, title, url) => {
        if (tabs[i]) { tabs[i].title = title; tabs[i].url = url; drawTabs(); if (i === active) urlInp.value = url; }
      };
      startPage();
      window.__safariGo = go;
      urlInp.addEventListener('keydown', e => { if (e.key === 'Enter' && urlInp.value.trim()) go(urlInp.value.trim()); });
      el.querySelector('#sfB').addEventListener('click', () => window.AndroidBridge && AndroidBridge.browserBack());
      el.querySelector('#sfF').addEventListener('click', () => window.AndroidBridge && AndroidBridge.browserForward());
      el.querySelector('#sfR').addEventListener('click', () => window.AndroidBridge && AndroidBridge.browserReload());
      el.querySelector('#sfNew').addEventListener('click', () => newTab('https://www.bing.com'));
      el.querySelector('#sfHome').addEventListener('click', () => {
        browserDetach(); tabs = []; active = -1; startPage(); urlInp.value = ''; drawTabs();
      });
    }
  },
  /* ─── 终端（真·文件系统 + zip/unzip + 真下载） ─── */
  terminal: {
    name: '终端', icon: () => ICONS.terminal(), w: 680, h: 460, dark: true,
    render(el, win) {
      el.innerHTML = `<div class="term"><div id="termOut"></div>
        <div class="term-in"><span class="tp">user@MacBook-Air</span><span id="termPath">&nbsp;~ %&nbsp;</span>
        <input id="termIn" autocomplete="off" spellcheck="false"></div></div>`;
      const out = el.querySelector('#termOut'), inp = el.querySelector('#termIn');
      const term = el.querySelector('.term');
      const print = s => { const d = document.createElement('div'); d.innerHTML = s; out.appendChild(d); term.scrollTop = term.scrollHeight; };
      const esc = s => String(s).replace(/</g, '&lt;');
      let cwd = 'User';
      const cmdHist = [];
      const kids = () => (VFS[cwd] ? VFS[cwd].children : []);
      const isDir = n => !!VFS[n];

      print(`Last login: ${new Date().toDateString()} on ttys000`);
      print(`<span class="tc">type "help" — 真文件系统已接入（与访达互通，改动会保存）</span>`);

      function loadJSZip() {
        if (window.JSZip) return Promise.resolve();
        return new Promise((res, rej) => {
          const s = document.createElement('script');
          s.src = 'jszip.min.js';
          s.onload = res; s.onerror = rej;
          document.head.appendChild(s);
        });
      }
      const CMDS = {
        help: () => print(`commands:
  ls cd pwd cat touch mkdir rm mv tree find grep open  file ops
  zip unzip wget                         archive & net
  whoami hostname date uname sw_vers cal  system
  top htop ps uptime vm_stat df ifconfig    status
  ping ip curl dig traceroute            network
  bc man which git brew history clear    misc
  neofetch matrix cowsay fortune sl      fun`),
        ls: a => {
          const items = kids();
          if (a.includes('-l')) {
            print('total ' + items.length * 8);
            items.forEach(f => {
              const dir = isDir(f);
              const size = dir ? 128 : (fileContent(f) || '').length || 1024;
              print(`${dir ? 'd' : '-'}rw-r--r--  1 user  staff  ${String(size).padStart(6)} ${new Date().toDateString().slice(4)} ${f}`);
            });
          } else print(items.map(f => isDir(f) ? `<span class="tc">${f}/</span>` : esc(f)).join('&nbsp;&nbsp;') || '(空目录)');
        },
        pwd: () => print('/Users/' + (cwd === 'User' ? 'user' : cwd)),
        whoami: () => print('user'),
        hostname: () => print('MacBook-Air.local'),
        date: () => print(new Date().toString()),
        uname: a => print(a.includes('-a') ? 'Darwin MacBook-Air.local 24.2.0 Darwin Kernel Version 24.2.0 arm64' : 'Darwin'),
        sw_vers: () => print(`ProductName:	macOS<br>ProductVersion:	15.2<br>BuildVersion:	24C101`),
        uptime: () => {
          const s = Math.floor((Date.now() - BOOT_TS) / 1000);
          print(` up ${Math.floor(s / 60)} mins, load averages: 1.${Math.floor(Math.random() * 9)} 1.${Math.floor(Math.random() * 9)} 1.${Math.floor(Math.random() * 9)}`);
        },
        vm_stat: () => print(`Pages free: 124816.<br>Pages active: 892134.<br>Pages wired: 198433.`),
        df: () => print(`Filesystem   Size   Used  Avail  Mounted on<br>/dev/disk1   256G   162G    94G   /`),
        top: () => print(`Processes: 412 total<br>CPU usage: ${(Math.random() * 8 + 3).toFixed(2)}% user<br>PhysMem: 9.2G used<br><br>PID &nbsp;COMMAND &nbsp;&nbsp;&nbsp;%CPU<br>318 &nbsp;kernel_task &nbsp;${(Math.random() * 8 + 2).toFixed(1)}`),
        htop: () => {
          let n = 0;
          const iv = setInterval(() => {
            if (++n > 5 || !document.contains(out)) return clearInterval(iv);
            const bar = () => '█'.repeat(Math.floor(Math.random() * 20)).padEnd(20, ' ');
            print(`CPU0 [${bar()}] ${(Math.random() * 90).toFixed(0)}%`);
          }, 300);
        },
        ps: () => print(`  PID TTY       CMD<br>  666 ttys000   zsh<br>  892 ttys000   top`),
        ifconfig: () => print(`en0: flags=8863&lt;UP,BROADCAST&gt;<br>&nbsp;&nbsp;inet 192.168.1.42 netmask 0xffffff00`),
        cal: () => {
          const now = new Date(), y = now.getFullYear(), m = now.getMonth();
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
          let o = `     ${months[m]} ${y}\nSu Mo Tu We Th Fr Sa\n`;
          let row = '   '.repeat(first);
          for (let d = 1; d <= days; d++) { row += String(d).padStart(2, ' ') + ' '; if ((first + d) % 7 === 0) { o += row.trimEnd() + '\n'; row = ''; } }
          print('<pre style="margin:0;font:inherit;line-height:1.4">' + o + row.trimEnd() + '</pre>');
        },
        tree: () => {
          const walk = (dir, prefix) => {
            (VFS[dir] ? VFS[dir].children : []).forEach((f, i, arr) => {
              const last = i === arr.length - 1;
              print(esc(prefix + (last ? '└── ' : '├── ') + f));
              if (isDir(f) && prefix.length < 12) walk(f, prefix + (last ? '    ' : '│   '));
            });
          };
          print(cwd); walk(cwd, '');
        },
        which: a => print(['ls', 'cd', 'echo', 'zsh'].includes(a) ? `/bin/${a}` : (a ? `/usr/bin/${a}` : 'usage: which <command>')),
        man: a => print(a ? `${a.toUpperCase()}(1)\n\nNAME\n  ${a} -- command\n\nSYNOPSIS\n  ${a} [options]` : 'What manual page do you want?'),
        history: () => print(cmdHist.map((c, i) => `  ${i + 1}  ${esc(c)}`).join('<br>') || ''),
        neofetch: () => print(`<span class="tp">                    'c.        </span>  <span class="tc">user@MacBook-Air</span>
<span class="tp">                 ,xNMM.       </span>  ─────────────────
<span class="tp">               .OMMMMo        </span>  OS: macOS Sequoia 15.2 arm64
<span class="tp">               OMMM0,         </span>  Host: MacBook Air 13" M4
<span class="tp">     .;loddo:' loolloddol;.   </span>  Kernel: Darwin 24.2.0
<span class="tp">   cKMMMMMMMMMMNWMMMMMMMMMM0: </span>  Shell: zsh 5.9
<span class="tp"> .KMMMMMMMMMMMMMMMMMMMMMMMWd. </span>  Resolution: ${screen.width}×${screen.height}
<span class="tp"> XMMMMMMMMMMMMMMMMMMMMMMMX.   </span>  DE: Aqua
<span class="tp">;MMMMMMMMMMMMMMMMMMMMMMMM:    </span>  CPU: ${navigator.hardwareConcurrency || 8} cores`),
        weather: () => {
          locate().then(l => fetchWeather(l.lat, l.lon)).then(w => {
            if (!w) return print('weather: network unavailable');
            locate().then(l2 => print(`${l2.city}: ${w.cur.icon} ${w.cur.temp}°C, ${w.cur.cond}, humidity ${w.cur.hum}%, wind ${w.cur.wind} km/h`));
          });
        },
        fortune: () => print(['Stay hungry, stay foolish.', 'Details matter.', 'Simplicity is the ultimate sophistication.', 'Design is how it works.', 'Think different.'][Math.floor(Math.random() * 5)]),
        matrix: () => {
          const chars = 'アイウエオカキクケコサシスセソ0123456789';
          let n = 0;
          const iv = setInterval(() => {
            if (++n > 14 || !document.contains(out)) return clearInterval(iv);
            let line = '';
            for (let i = 0; i < 62; i++) line += Math.random() < .45 ? chars[Math.floor(Math.random() * chars.length)] : ' ';
            print(`<span class="tp">${esc(line)}</span>`);
          }, 110);
        },
        sl: () => {
          const frames = [`      ====        ________<br>  _D _|  |_______/        \\__<br> |__________|_____________|<br>  / \\_/   \\_/   \\_/   \\_/`, `         ====        ________<br>     _D _|  |_______/        \\__<br>    |__________|_____________|<br>     / \\_/   \\_/   \\_/   \\_/`];
          let f = 0;
          const iv = setInterval(() => {
            if (++f > 4 || !document.contains(out)) return clearInterval(iv);
            print(`<span class="tp">${frames[f % 2]}</span>`);
          }, 250);
        },
        git: a => print(a.includes('log') ? `<span class="tw">a1b2c3d</span> feat: real fs + zip<br><span class="tw">e4f5g6h</span> init` : 'On branch main<br>nothing to commit, working tree clean'),
        battery: () => {
          if (navigator.getBattery) navigator.getBattery().then(b => print(`battery: ${Math.round(b.level * 100)}% ${b.charging ? '(charging)' : '(discharging)'}`));
          else print('battery: unavailable');
        },
        clear: () => out.innerHTML = '',
        exit: () => closeWindow(win.dataset.id),
      };
      inp.addEventListener('keydown', async e => {
        if (e.key !== 'Enter') return;
        const raw = inp.value.trim(); inp.value = '';
        print(`<span class="tp">user@MacBook-Air</span> ${cwd === 'User' ? '~' : cwd} % ${esc(raw)}`);
        if (!raw) return;
        cmdHist.push(raw);
        /* 长命令链：&& 和 ; 顺序执行 */
        const chain = raw.split(/\s*(?:&&|;)\s*/).filter(Boolean);
        for (const piece of chain) {
          await runOne(piece);
        }
        return;

        async function runOne(raw) {
        const [cmd, ...args] = raw.split(/\s+/);
        const rest = args.join(' ');
        /* nano / vim → 真·打开文本编辑器 */
        if (cmd === 'nano' || cmd === 'vim' || cmd === 'vi') {
          if (!rest) return print(`${cmd}: 需要文件名`);
          if (!FILE_CONTENTS[rest]) { FILE_CONTENTS[rest] = ''; if (!kids().includes(rest)) kids().push(rest); saveFiles(); saveVFS(); }
          openApp('textedit', { file: rest });
          return print(`[${cmd}] 已在文本编辑器中打开 ${esc(rest)}`);
        }
        if (cmd === 'cp') {
          const [a2, b2] = args;
          if (!a2 || !b2) return print('usage: cp <源> <目标>');
          if (!FILE_CONTENTS[a2] && !VFS[a2]) return print(`cp: ${esc(a2)}: No such file or directory`);
          if (VFS[a2]) VFS[b2] = { children: [...VFS[a2].children] };
          else FILE_CONTENTS[b2] = FILE_CONTENTS[a2];
          if (!kids().includes(b2)) kids().push(b2);
          saveFiles(); saveVFS();
          return;
        }
        if (cmd === 'head' || cmd === 'tail') {
          const f = fileContent(args[args.length - 1]);
          if (f === undefined) return print(`${cmd}: ${esc(args[args.length - 1] || '')}: No such file or directory`);
          const lines = String(f).split('\n');
          const n = (() => { const m = raw.match(/-n\s*(\d+)/); return m ? +m[1] : 10; })();
          const part = cmd === 'head' ? lines.slice(0, n) : lines.slice(-n);
          return print(part.map(esc).join('<br>'));
        }
        if (cmd === 'wc') {
          const f = fileContent(rest);
          if (f === undefined) return print(`wc: ${esc(rest)}: No such file or directory`);
          const s = String(f);
          return print(`${s.split('\n').length} ${s.split(/\s+/).filter(Boolean).length} ${s.length} ${esc(rest)}`);
        }
        if (cmd === 'grep') {
          const pat = args[0], fn2 = args[1];
          if (!pat || !fn2) return print('usage: grep <模式> <文件>');
          const f = fileContent(fn2);
          if (f === undefined) return print(`grep: ${esc(fn2)}: No such file or directory`);
          const hits = String(f).split('\n').filter(l => l.includes(pat));
          return print(hits.length ? hits.map(l => esc(l).replace(esc(pat), `<span style="color:#f66">${esc(pat)}</span>`)).join('<br>') : '(无匹配)');
        }
        if (cmd === 'find') {
          const q = rest.replace(/^\./, '').trim();
          const all = [];
          Object.keys(VFS).forEach(d => (VFS[d].children || []).forEach(f => all.push(f)));
          Object.keys(FILE_CONTENTS).forEach(f => all.push(f));
          const hits = [...new Set(all)].filter(f => !q || f.toLowerCase().includes(q.toLowerCase()));
          return print(hits.slice(0, 20).map(esc).join('<br>') || '(无结果)');
        }
        if (cmd === 'stat') {
          const isD = !!VFS[rest], c = FILE_CONTENTS[rest];
          if (!isD && c === undefined) return print(`stat: ${esc(rest)}: No such file or directory`);
          const size = isD ? (VFS[rest].children.length + ' 项') : String(c).length + ' B';
          return print(`  File: ${esc(rest)}<br>  Size: ${size}<br>Type: ${isD ? 'directory' : 'regular file'}`);
        }
        if (cmd === 'base64') {
          const f = fileContent(rest);
          if (f === undefined) return print(`base64: ${esc(rest)}: No such file or directory`);
          return print(btoa(unescape(encodeURIComponent(String(f)))).slice(0, 200));
        }
        if (cmd === 'echo' && rest.includes('>')) {
          const m2 = rest.match(/^(.*?)\s*>\s*(\S+)$/);
          if (m2) {
            FILE_CONTENTS[m2[2]] = m2[1];
            if (!kids().includes(m2[2])) kids().push(m2[2]);
            saveFiles(); saveVFS();
            return;
          }
        }
        if (cmd === 'echo') return print(esc(rest) || '');
        if (cmd === 'say') return notify('终端', `🔊 ${rest || '……'}`);
        if (cmd === 'cd') {
          if (!rest || rest === '~' || rest === '..') { cwd = 'User'; }
          else if (isDir(rest)) cwd = rest;
          else return print(`cd: no such file or directory: ${esc(rest)}`);
          el.querySelector('#termPath').innerHTML = `&nbsp;${cwd === 'User' ? '~' : cwd} %&nbsp;`;
          return;
        }
        if (cmd === 'cat') {
          const f = fileContent(rest);
          return print(f !== undefined ? esc(f).replace(/\n/g, '<br>') : `cat: ${esc(rest)}: No such file or directory`);
        }
        if (cmd === 'touch' || cmd === 'mkdir') {
          if (!rest) return print(`${cmd}: missing operand`);
          const n = rest.split(' ')[0];
          if (cmd === 'mkdir') VFS[n] = { type: 'folder', children: [] };
          if (!kids().includes(n)) kids().push(n);
          saveVFS();
          return;
        }
        if (cmd === 'rm') {
          const items = kids();
          const i = items.indexOf(rest);
          if (i >= 0) { items.splice(i, 1); delete VFS[rest]; delete FILE_CONTENTS[rest]; saveVFS(); saveFiles(); return; }
          return print(`rm: ${esc(rest)}: No such file or directory`);
        }
        if (cmd === 'mv') {
          const [a, b] = rest.split(/\s+/);
          const items = kids();
          const i = items.indexOf(a);
          if (i < 0 || !b) return print('usage: mv <from> <to>');
          items[i] = b;
          if (FILE_CONTENTS[a] !== undefined) { FILE_CONTENTS[b] = FILE_CONTENTS[a]; delete FILE_CONTENTS[a]; }
          saveVFS(); saveFiles();
          return;
        }
        /* ── 真·压缩/解压（JSZip） ── */
        if (cmd === 'zip') {
          const m = rest.split(/\s+/);
          if (m.length < 2) return print('usage: zip out.zip file1 [file2...]');
          const zn = m[0].endsWith('.zip') ? m[0] : m[0] + '.zip';
          loadJSZip().then(async () => {
            const zip = new JSZip();
            let added = 0;
            m.slice(1).forEach(f => {
              const c = fileContent(f);
              if (c !== undefined) { zip.file(f, c); added++; }
            });
            if (!added) return print('zip: no readable files');
            const b64 = await zip.generateAsync({ type: 'base64' });
            await IDB.put('file_' + zn, 'data:application/zip;base64,' + b64);
            FILE_CONTENTS[zn] = '@idb:file_' + zn;
            if (!kids().includes(zn)) kids().push(zn);
            saveFiles(); saveVFS();
            print(`  adding: ${m.slice(1).join(', ')}<br>created ${zn} (${Math.round(b64.length * 3 / 4)} bytes)`);
          }).catch(() => print('zip: JSZip 加载失败'));
          return;
        }
        if (cmd === 'unzip') {
          let zf = FILE_CONTENTS[rest];
          if (zf && zf.startsWith('@idb:')) zf = await IDB.get(zf.slice(5));
          if (zf && zf.startsWith('data:')) zf = zf.split(',')[1];
          if (!zf) return print(`unzip: ${esc(rest)}: 不是 zip 文件`);
          loadJSZip().then(async () => {
            const zip = await JSZip.loadAsync(zf, { base64: true });
            const names = Object.keys(zip.files);
            for (const n of names) {
              const f = zip.files[n];
              if (f.dir) { VFS[n.replace(/\/$/, '')] = { type: 'folder', children: [] }; continue; }
              FILE_CONTENTS[n] = await f.async('string');
              if (!kids().includes(n)) kids().push(n);
            }
            saveFiles(); saveVFS();
            print(`Archive: ${esc(rest)}<br>  extracting: ${names.join(', ')}`);
          }).catch(() => print('unzip: 解压失败'));
          return;
        }
        if (cmd === 'wget') {
          if (!rest) return print('usage: wget <url>');
          const u = /^https?:\/\//i.test(rest) ? rest : 'https://' + rest;
          print(`-- fetching ${esc(u)}`);
          bridgeBinary(u, 20000).then(async b64 => {
            if (!b64) return print('wget: download failed');
            const fn = u.split('/').pop() || 'index.html';
            await IDB.put('file_' + fn, 'data:application/octet-stream;base64,' + b64);   /* 大文件入 IndexedDB */
            FILE_CONTENTS[fn] = '@idb:file_' + fn;
            if (!kids().includes(fn)) kids().push(fn);
            saveFiles(); saveVFS();
            print(`saved ${fn} (${Math.round(b64.length * 3 / 4)} bytes)`);
          });
          return;
        }
        if (cmd === 'open') {
          const target = args[0];
          if (isDir(target)) { openApp('finder'); return; }
          if (FILE_CONTENTS[target]) { quickLook(target); return; }
          let app = rest.replace(/^-a\s*/, '').replace(/\.app$/i, '').toLowerCase();
          const hit = Object.keys(APPS).find(k => APPS[k].name.replace(/\s/g, '').toLowerCase().includes(app) || k === app);
          if (hit && hit !== 'launchpad') { openApp(hit); return; }
          return print(`The application ${esc(rest)} does not exist.`);
        }
        if (cmd === 'browse') { if (!rest) return print('usage: browse <url>'); openApp('safari'); setTimeout(() => window.__safariGo && window.__safariGo(rest), 400); return; }
        if (cmd === 'curl') {
          if (!rest) return print('usage: curl <url>');
          print(`fetching ${esc(rest)} ...`);
          fetchText('https://r.jina.ai/' + (/^https?:\/\//i.test(rest) ? rest : 'https://' + rest), 12000)
            .then(t => print(t === null ? 'curl: (7) Failed to connect' : esc(t.slice(0, 700)).replace(/\n/g, '<br>') + (t.length > 700 ? '<br>...' : '')));
          return;
        }
        if (cmd === 'ping') {
          const host = (args[0] || '').replace(/[^a-z0-9.\-]/gi, '');
          if (!host) return print('usage: ping <host>');
          print(`PING ${host}:`);
          (async () => {
            for (let i = 0; i < 4; i++) {
              const t0 = performance.now();
              const ok = await fetchText('https://' + host + '/', 6000);
              print(ok !== null ? `64 bytes from ${host}: icmp_seq=${i} time=${Math.round(performance.now() - t0)} ms` : `Request timeout for icmp_seq ${i}`);
            }
          })();
          return;
        }
        if (cmd === 'ip') {
          fetchJSON('https://ipapi.co/json/', 6000).then(g => {
            print(g && g.ip ? `inet ${g.ip}<br>city ${g.city || '-'}, ${g.country_name || '-'}<br>org ${g.org || '-'}` : 'ip: network unavailable');
          });
          return;
        }
        if (cmd === 'dig' || cmd === 'nslookup') return print(`;; ANSWER SECTION:<br>${rest || 'apple.com'}.  3600  IN  A  17.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`);
        if (cmd === 'traceroute') {
          const h = rest || 'apple.com';
          print(`traceroute to ${h}, 30 hops max:`);
          let i = 0;
          const iv = setInterval(() => {
            if (++i > 7 || !document.contains(out)) return clearInterval(iv);
            print(` ${i}  192.168.${i}.1  ${(Math.random() * 30 + 1).toFixed(1)} ms`);
          }, 400);
          return;
        }
        if (cmd === 'bc') {
          if (!/^[\d+\-*/.()%\s]+$/.test(rest)) return print('bc: syntax error');
          try { return print(String(Function('"use strict";return (' + rest.replace(/%/g, '/100') + ')')())); }
          catch (err) { return print('bc: syntax error'); }
        }
        if (cmd === 'cowsay') {
          const t = rest || 'Moo';
          return print(` ${'_'.repeat(t.length + 2)}\n< ${esc(t)} >\n ${'-'.repeat(t.length + 2)}\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||`);
        }
        if (cmd === 'brew') {
          const pkg = args[1] || 'cask';
          if (args[0] !== 'install') return print('usage: brew install <pkg>');
          print(`==> Downloading ${pkg}...`);
          let p = 0;
          const iv = setInterval(() => {
            if (!document.contains(out)) return clearInterval(iv);
            p += 25;
            if (p >= 100) { clearInterval(iv); print(`🍺 ${pkg} was successfully installed!`); return; }
            print(`==> Installing ${pkg}... ${p}%`);
          }, 450);
          return;
        }
        if (cmd === 'sudo') return print('user is not in the sudoers file. This incident will be reported.');
        if (CMDS[cmd]) return CMDS[cmd](rest);
        /* 错误纠正：找最相近的命令 */
        const KNOWN = ['ls','cd','pwd','cat','echo','mkdir','touch','rm','mv','cp','grep','find','wc','head','tail','stat','base64','open','ping','curl','wget','zip','unzip','nano','vim','clear','exit','history','whoami','hostname','date','uname','uptime','df','top','ps','tree','which','man','neofetch','weather','fortune','say','browse','ip','dig','nslookup','traceroute','battery','bc','brew','matrix','cowsay','sudo','cal','vm_stat','htop', ...Object.keys(CMDS)];
        const dist = (a, b) => {
          const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
          for (let j = 1; j <= b.length; j++) dp[0][j] = j;
          for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
            dp[i][j] = Math.min(dp[i-1][j] + 1, dp[i][j-1] + 1, dp[i-1][j-1] + (a[i-1] === b[j-1] ? 0 : 1));
          return dp[a.length][b.length];
        };
        const near = KNOWN.filter(k => dist(cmd, k) <= 2).sort((a, b) => dist(cmd, a) - dist(cmd, b))[0];
        print(`zsh: command not found: ${esc(cmd)}` + (near ? `<br><span class="tc">zsh: 你是不是想输入「${near}」？</span>` : ''));
        }
      });
      /* Siri/外部程序执行接口 */
      window.__termExec = cmd => { inp.value = cmd; inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); };
      el.querySelector('.term').addEventListener('click', () => inp.focus());
    }
  },

  /* ─── 计算器（尺寸参照 macos-web：250 × 250√2，不可缩放） ─── */
  calculator: {
    name: '计算器', icon: () => ICONS.calculator(), w: 250, h: 354, noResize: true,
    render(el) {
      el.innerHTML = `<div class="calc"><div class="calc-disp" id="cDisp">0</div>
        <div class="calc-grid">${['AC|fn', '±|fn', '%|fn', '÷|op', '7', '8', '9', '×|op', '4', '5', '6', '−|op', '1', '2', '3', '+|op', '0|zero', '.', '=|op'].map(k => {
          const [t, c] = k.split('|');
          return `<div class="calc-key ${c || ''}" data-k="${t}">${t}</div>`;
        }).join('')}</div></div>`;
      const disp = el.querySelector('#cDisp');
      let cur = '0', prev = null, op = null, fresh = true;
      const calc = (a, b, o) => ({ '+': a + b, '−': a - b, '×': a * b, '÷': b === 0 ? NaN : a / b })[o];
      el.querySelectorAll('.calc-key').forEach(k => k.addEventListener('click', () => {
        const t = k.dataset.k;
        if (/^[0-9.]$/.test(t)) {
          if (fresh) { cur = t === '.' ? '0.' : t; fresh = false; }
          else if (t !== '.' || !cur.includes('.')) cur += t;
        } else if (t === 'AC') { cur = '0'; prev = null; op = null; fresh = true; }
        else if (t === '±') cur = String(-parseFloat(cur));
        else if (t === '%') cur = String(parseFloat(cur) / 100);
        else if (t === '=') {
          if (op && prev !== null) { cur = String(calc(prev, parseFloat(cur), op)); prev = null; op = null; fresh = true; }
        } else {
          if (op && !fresh) { prev = calc(prev, parseFloat(cur), op); cur = String(prev); }
          else prev = parseFloat(cur);
          op = t; fresh = true;
        }
        if (String(cur).includes('NaN')) cur = '错误';
        disp.textContent = String(cur).length > 11 ? parseFloat(cur).toExponential(5) : cur;
      }));
    }
  },

  /* ─── 备忘录 ─── */
  notes: {
    name: '备忘录', icon: () => ICONS.notes(), w: 720, h: 460,
    render(el) {
      const store = JSON.parse(localStorage.getItem('mac_notes') || 'null') || [
        { t: '购物清单', b: '购物清单\n\n· 牛奶\n· 鸡蛋\n· 面包\n· 咖啡豆' },
        { t: '读书笔记', b: '读书笔记\n\n「设计中的设计」——\n再设计，就是把日常事物陌生化。' },
      ];
      let sel = 0;
      const save = () => localStorage.setItem('mac_notes', JSON.stringify(store));
      el.innerHTML = `<div class="notes"><div class="notes-side" id="nSide"></div>
        <div class="notes-edit"><textarea id="nText" placeholder="开始记录…"></textarea></div></div>`;
      const side = el.querySelector('#nSide'), ta = el.querySelector('#nText');
      function drawSide() {
        side.innerHTML = store.map((n, i) =>
          `<div class="notes-item ${i === sel ? 'sel' : ''}" data-i="${i}">
            <div class="ni-t">${(n.b.split('\n')[0] || '新备忘录').replace(/</g, '&lt;').slice(0, 14)}</div>
            <div class="ni-d">${new Date().toLocaleDateString('zh-CN')}</div></div>`).join('');
        side.querySelectorAll('.notes-item').forEach(it => it.addEventListener('click', () => {
          sel = +it.dataset.i; ta.value = store[sel].b; drawSide();
        }));
      }
      ta.value = store[sel].b;
      ta.addEventListener('input', () => { store[sel].b = ta.value; save(); drawSide(); });
      drawSide();
    }
  },

  /* ─── 日历（重做版：月/年/日三视图 + 日程） ─── */
  calendar: {
    name: '日历', icon: () => ICONS.calendar(), w: 680, h: 540,
    render(el) {
      const now = new Date();
      let vy = now.getFullYear(), vm = now.getMonth(), vd = now.getDate();
      let mode = '月';
      const EVENTS = JSON.parse(localStorage.getItem('mac_events') || '{}');
      const saveEvents = () => localStorage.setItem('mac_events', JSON.stringify(EVENTS));
      const key = (y, m, d) => `${y}-${m + 1}-${d}`;

      function monthCells(y, m, mini) {
        const first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate();
        let cells = '';
        ['日', '一', '二', '三', '四', '五', '六'].forEach(d => cells += `<div class="c2-dow">${mini ? d : d + '曜日'}</div>`);
        for (let i = 0; i < first; i++) cells += `<div class="c2-day"></div>`;
        for (let d = 1; d <= days; d++) {
          const isToday = y === now.getFullYear() && m === now.getMonth() && d === now.getDate();
          const hasEv = (EVENTS[key(y, m, d)] || []).length;
          cells += `<div class="c2-day ${isToday ? 'today' : ''}" ${mini ? '' : `data-d="${d}"`}>
            <span>${d}</span>${hasEv && !mini ? '<i class="c2-dot"></i>' : ''}</div>`;
        }
        return cells;
      }
      function draw() {
        let body = '';
        if (mode === '月') {
          body = `<div class="c2-title">${vy}年 ${vm + 1}月</div>
            <div class="c2-grid">${monthCells(vy, vm, false)}</div>`;
        } else if (mode === '年') {
          body = `<div class="c2-title">${vy}年</div>
            <div class="c2-year">${Array.from({ length: 12 }, (_, i) =>
              `<div class="c2-mini" data-m="${i}"><div class="c2-mini-t">${i + 1}月</div>
               <div class="c2-grid mini">${monthCells(vy, i, true)}</div></div>`).join('')}</div>`;
        } else {
          const evs = (EVENTS[key(vy, vm, vd)] || []).slice().sort((a, b) => a.h.localeCompare(b.h));
          body = `<div class="c2-title">${vm + 1}月${vd}日 ${['周日','周一','周二','周三','周四','周五','周六'][new Date(vy,vm,vd).getDay()]}</div>
            <div class="c2-daybody">
              ${evs.length ? evs.map((e, i) => `<div class="c2-ev"><span class="c2-ev-h">${e.h}</span>${e.t}
                <span class="c2-ev-x" data-i="${i}">✕</span></div>`).join('')
                : '<div style="color:#aaa;font-size:13px;padding:24px 0;text-align:center">这一天没有日程</div>'}
            </div>
            <div class="c2-add"><input id="c2T" placeholder="日程内容"><input id="c2H" type="time" value="10:00">
            <span class="pill-btn on" id="c2Add">添加</span></div>`;
        }
        el.innerHTML = `<div class="cal2">
          <div class="c2-bar">
            <span class="c2-today" id="c2Today">今天</span>
            <span class="c2-nav" id="c2Prev">‹</span><span class="c2-nav" id="c2Next">›</span>
            <div class="seg-ctl">${['日', '月', '年'].map(v => `<span class="${v === mode ? 'on' : ''}" data-m="${v}">${v}</span>`).join('')}</div>
          </div>${body}</div>`;
        el.querySelector('#c2Today').addEventListener('click', () => { vy = now.getFullYear(); vm = now.getMonth(); vd = now.getDate(); draw(); });
        el.querySelector('#c2Prev').addEventListener('click', () => {
          if (mode === '年') vy--;
          else if (mode === '月') { vm--; if (vm < 0) { vm = 11; vy--; } }
          else { const d = new Date(vy, vm, vd - 1); vy = d.getFullYear(); vm = d.getMonth(); vd = d.getDate(); }
          draw();
        });
        el.querySelector('#c2Next').addEventListener('click', () => {
          if (mode === '年') vy++;
          else if (mode === '月') { vm++; if (vm > 11) { vm = 0; vy++; } }
          else { const d = new Date(vy, vm, vd + 1); vy = d.getFullYear(); vm = d.getMonth(); vd = d.getDate(); }
          draw();
        });
        el.querySelectorAll('.seg-ctl span').forEach(s => s.addEventListener('click', () => { mode = s.dataset.m; draw(); }));
        el.querySelectorAll('.c2-mini').forEach(mm => mm.addEventListener('click', () => { vm = +mm.dataset.m; mode = '月'; draw(); }));
        el.querySelectorAll('.c2-day[data-d]').forEach(d => d.addEventListener('click', () => { vd = +d.dataset.d; mode = '日'; draw(); }));
        const addBtn = el.querySelector('#c2Add');
        if (addBtn) addBtn.addEventListener('click', () => {
          const t = el.querySelector('#c2T').value.trim(), h = el.querySelector('#c2H').value;
          if (!t) return;
          const k = key(vy, vm, vd);
          (EVENTS[k] = EVENTS[k] || []).push({ t, h });
          saveEvents(); draw();
          notify('日历', `已添加：${h} ${t}`);
        });
        el.querySelectorAll('.c2-ev-x').forEach(x => x.addEventListener('click', () => {
          const k = key(vy, vm, vd);
          EVENTS[k].splice(+x.dataset.i, 1);
          if (!EVENTS[k].length) delete EVENTS[k];
          saveEvents(); draw();
        }));
      }
      draw();
    }
  },
  /* ─── 照片（带侧边栏） ─── */
  photos: {
    name: '照片', icon: () => ICONS.photos(), w: 760, h: 500,
    render(el) {
      el.innerHTML = `<div class="ph-app">
        <div class="fs-side">
          <div class="fs-sec">图库</div>
          ${['时刻', '精选照片', '相簿'].map((s, i) =>
            `<div class="fs-item ${i === 0 ? 'sel' : ''}"><span class="fs-glyph">${GLYPH.apps}</span>${s}</div>`).join('')}
          <div class="fs-sec">媒体类型</div>
          ${['照片', '视频', '自拍'].map(s =>
            `<div class="fs-item"><span class="fs-glyph">${GLYPH.doc}</span>${s}</div>`).join('')}
        </div>
        <div class="ph-main">
          <div class="ph-head"><b>时刻</b><span style="display:flex;gap:10px;align-items:center">
            <span class="pill-btn on" id="phImport" style="font-size:11.5px">＋ 从相册导入</span>
            <span>${PHOTOS.length} 张照片</span></span></div>
          <div class="photos">${PHOTOS.map((p, i) =>
            `<div class="photo" data-i="${i}">
              ${p.img ? `<img src="${p.img}" style="width:100%;height:100%;object-fit:cover">` : `<div style="width:100%;height:100%;background:${p.css}"></div>`}
            </div>`).join('')}</div>
        </div></div>`;
      const draw = () => render(el);
      el.querySelectorAll('.photo').forEach(p => p.addEventListener('click', () => {
        const ph = PHOTOS[+p.dataset.i];
        openApp('preview', { name: ph.name + (ph.img ? '.jpg' : '.png'), css: ph.css, img: ph.img });
      }));
      el.querySelectorAll('.fs-item').forEach(it => it.addEventListener('click', () => {
        el.querySelectorAll('.fs-item').forEach(x => x.classList.remove('sel'));
        it.classList.add('sel');
      }));
      /* 调起安卓系统相册选择器 */
      el.querySelector('#phImport').addEventListener('click', () => {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
        inp.onchange = () => {
          let loaded = 0;
          [...inp.files].forEach(f => {
            const rd = new FileReader();
            rd.onload = () => {
              const k = 'photo_' + Date.now() + '_' + loaded;
              IDB.put(k, rd.result);
              PHOTOS.unshift({ name: f.name.replace(/\.[^.]+$/, ''), idb: k, img: rd.result });
              if (++loaded === inp.files.length) { notify('照片', `已导入 ${loaded} 张`); draw(); }
            };
            rd.readAsDataURL(f);
          });
        };
        inp.click();
      });
    }
  },

  /* ─── 音乐（iTunes API 真实曲库搜索 + 30s 试听） ─── */
  music: {
    name: '音乐', icon: () => ICONS.music(), w: 780, h: 540,
    render(el, win) {
      let audio = null, curTrack = null;
      el.innerHTML = `<div class="mu-app">
        <div class="mu-side">
          <div class="mu-search"><input id="muSearch" placeholder="搜索歌曲/艺人（真实曲库）"></div>
          <div class="fs-sec">资料库</div>
          ${['搜索', '热门推荐'].map((s, i) =>
            `<div class="fs-item ${i === 0 ? 'sel' : ''}"><span class="fs-glyph mu-red">${GLYPH.apps}</span>${s}</div>`).join('')}
        </div>
        <div class="mu-main">
          <div class="mu-list" id="muList"><div class="sf-loading" style="padding-top:70px"><div class="sf-spinner"></div>载入热门…</div></div>
          <div class="mu-player">
            <img class="mu-mini-cover" id="muMini" src="covers/m1.jpg">
            <div class="mu-track"><b id="muT">未播放</b><span id="muA">—</span>
              <span class="mu-time" id="muTime">0:00 / 0:30</span></div>
            <div class="mu-prog" id="muProg"><div class="mu-prog-fill" id="muFill"></div></div>
            <div class="mu-ctl"><span class="mu-play" id="muPlay">▶</span></div>
          </div>
        </div></div>`;
      const list = el.querySelector('#muList'), btn = el.querySelector('#muPlay'), fill = el.querySelector('#muFill');
      const fmt = s => isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00';
      async function search(q) {
        list.innerHTML = `<div class="sf-loading" style="padding-top:70px"><div class="sf-spinner"></div>搜索中…</div>`;
        const d = await fetchJSON(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=20`, 10000);
        if (!d || !d.results || !d.results.length) {
          list.innerHTML = '<div style="color:#999;text-align:center;padding:60px 0;font-size:13px">没有找到相关歌曲</div>';
          return;
        }
        list.innerHTML = d.results.map((t, i) => `<div class="mu-song" data-i="${i}">
          <img class="mu-song-cv" src="${t.artworkUrl60}" loading="lazy">
          <div class="mu-song-info"><div class="mu-song-t">${t.trackName}</div>
          <div class="mu-song-a">${t.artistName} · ${t.collectionName || ''}</div></div>
          <span class="mu-song-play">▶</span></div>`).join('');
        list.querySelectorAll('.mu-song').forEach(s => s.addEventListener('click', () => {
          const t = d.results[+s.dataset.i];
          playTrack(t);
        }));
      }
      function playTrack(t) {
        curTrack = t;
        el.querySelector('#muT').textContent = t.trackName;
        el.querySelector('#muA').textContent = t.artistName;
        el.querySelector('#muMini').src = t.artworkUrl100 || 'covers/m1.jpg';
        if (!audio) {
          audio = new Audio();
          if (win) win._audio = audio;
          audio.addEventListener('timeupdate', () => {
            if (!audio.duration || !document.contains(fill)) return;
            fill.style.width = (audio.currentTime / audio.duration * 100) + '%';
            el.querySelector('#muTime').textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
          });
          audio.addEventListener('ended', () => btn.textContent = '▶');
          audio.addEventListener('error', () => { btn.textContent = '▶'; notify('音乐', '试听加载失败'); });
        }
        audio.src = t.previewUrl;
        audio.play().catch(() => notify('音乐', '需要联网播放'));
        btn.textContent = '⏸';
      }
      btn.addEventListener('click', () => {
        if (!audio || !curTrack) return;
        if (audio.paused) { audio.play(); btn.textContent = '⏸'; }
        else { audio.pause(); btn.textContent = '▶'; }
      });
      el.querySelector('#muProg').addEventListener('pointerdown', e => {
        if (!audio || !audio.duration) return;
        const r = e.currentTarget.getBoundingClientRect();
        audio.currentTime = (e.clientX - r.left) / r.width * audio.duration;
      });
      el.querySelector('#muSearch').addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.value.trim()) search(e.target.value.trim());
      });
      /* 默认：苹果官方排行榜 RSS（真实数据） */
      (async () => {
        list.innerHTML = `<div class="sf-loading" style="padding-top:70px"><div class="sf-spinner"></div>载入排行榜…</div>`;
        const d = await fetchJSON('https://itunes.apple.com/cn/rss/topsongs/limit=30/json', 10000);
        const entries = d && d.feed && d.feed.entry ? d.feed.entry : [];
        if (!entries.length) { search('Taylor Swift'); return; }
        const tracks = entries.map(en => ({
          trackName: en['im:name'].label, artistName: en['im:artist'].label,
          artworkUrl60: en['im:image'][1] ? en['im:image'][1].label : en['im:image'][0].label,
          artworkUrl100: en['im:image'][2] ? en['im:image'][2].label : en['im:image'][0].label,
        }));
        list.innerHTML = `<div style="padding:10px 14px 4px;font-size:13px;font-weight:700">🔥 热门排行榜（实时）</div>` +
          tracks.map((t, i) => `<div class="mu-song" data-i="${i}">
            <span class="mu-rank">${i + 1}</span>
            <img class="mu-song-cv" src="${t.artworkUrl60}" loading="lazy">
            <div class="mu-song-info"><div class="mu-song-t">${t.trackName}</div>
            <div class="mu-song-a">${t.artistName}</div></div>
            <span class="mu-song-play">▶</span></div>`).join('');
        list.querySelectorAll('.mu-song').forEach(s => s.addEventListener('click', async () => {
          const t = tracks[+s.dataset.i];
          s.querySelector('.mu-song-play').textContent = '…';
          /* 排行榜没有试听地址，实时查一次 */
          const r = await fetchJSON(`https://itunes.apple.com/search?term=${encodeURIComponent(t.trackName + ' ' + t.artistName)}&media=music&entity=song&limit=1`, 8000);
          if (r && r.results && r.results[0] && r.results[0].previewUrl) {
            playTrack({ ...t, previewUrl: r.results[0].previewUrl });
          } else {
            s.querySelector('.mu-song-play').textContent = '▶';
            notify('音乐', '该歌曲暂无试听');
          }
        }));
      })();
    }
  },
  /* ─── 照片（带侧边栏） ─── */
  appstore: {
    name: 'App Store', icon: () => ICONS.appstore(), w: 820, h: 560,
    render(el) {
      el.innerHTML = `<div style="display:flex;height:100%">
        <div class="fs-side" style="flex-basis:170px;width:170px">
          ${[['Today', 'sun'], ['游戏', 'apps'], ['App', 'apps'], ['更新', 'download']].map((s, i) =>
            `<div class="fs-item ${i === 0 ? 'sel' : ''}" data-p="${s[0]}"><span class="fs-glyph" style="color:#0A82FF">${GLYPH[s[1]]}</span>${s[0]}</div>`).join('')}
        </div>
        <div class="store" id="storeMain"></div></div>`;
      const main = el.querySelector('#storeMain');
      function isInstalled(id) { return !!APPS[id]; }
      function appRow(a) {
        const inst = isInstalled(a.id);
        return `<div class="st-row">
          <div class="st-ico" style="background:${a.bg}">${a.icon}</div>
          <div><div class="st-name">${a.name}</div><div class="st-cat">${a.desc} · ${a.cat}</div></div>
          <div class="st-get ${inst ? 'installed' : ''}" data-id="${a.id}">${inst ? '打开' : '获取'}</div></div>`;
      }
      function page(name) {
        if (name === 'Today') {
          main.innerHTML = `<div class="st-hero"><div class="sh-k">今日推荐</div><h2>能装能用的小游戏</h2>
            <div>2048 · 贪吃蛇 · 扫雷 · 白噪音，点「获取」立即安装到启动台 ✨</div></div>
            ${STORE_APPS.slice(0, 3).map(appRow).join('')}`;
        } else if (name === '游戏') {
          main.innerHTML = `<div class="st-h2">游戏</div>` + STORE_APPS.filter(a => a.cat === '游戏').map(appRow).join('');
        } else if (name === 'App') {
          main.innerHTML = `<div class="st-h2">App</div>` + STORE_APPS.filter(a => a.cat !== '游戏').map(appRow).join('');
        } else {
          main.innerHTML = `<div class="st-h2">更新</div><div class="fs-empty" style="padding-top:60px">全部应用都是最新版本 ✓</div>`;
        }
        bindRows();
      }
      function bindRows() {
        main.querySelectorAll('.st-get').forEach(b => b.addEventListener('click', () => {
          const id = b.dataset.id;
          if (isInstalled(id)) { openApp(id); return; }
          b.textContent = '';
          b.classList.add('st-loading');
          setTimeout(() => {
            installApp(id);
            b.classList.remove('st-loading');
            b.textContent = '打开';
            b.classList.add('installed');
          }, 1300);
        }));
      }
      el.querySelectorAll('.fs-item').forEach(it => it.addEventListener('click', () => {
        el.querySelectorAll('.fs-item').forEach(x => x.classList.remove('sel'));
        it.classList.add('sel');
        page(it.dataset.p);
      }));
      page('Today');
    }
  },

  /* ─── 系统设置（Ventura 风格：搜索 + Apple 账户横幅 + 彩色圆标侧栏 + 灰底白卡） ─── */
  settings: {
    name: '系统设置', icon: () => ICONS.settings(), w: 840, h: 580,
    render(el) {
      const secs = [
        ['appearance', '外观', '#8E8E93', 'appearance'],
        ['wall', '墙纸', '#30B0C7', 'photo'],
        ['dock', '桌面与程序坞', '#5E5CE6', 'dockg'],
        ['menu', '菜单栏', '#0A84FF', 'menubar'],
        ['display', '显示器', '#0A84FF', 'sun'],
        ['datetime', '日期与时间', '#5E5CE6', 'recents'],
        ['net', '网络', '#30B0C7', 'globe'],
        ['wifi', '无线局域网', '#0A84FF', 'wifi'],
        ['bt', '蓝牙', '#0A84FF', 'bt'],
        ['sound', '声音', '#FF6482', 'speaker'],
        ['noti', '通知', '#FF3B30', 'bell'],
        ['focus', '专注模式', '#5E5CE6', 'moon'],
        ['access', '辅助功能', '#0A84FF', 'person'],
        ['general', '通用', '#8E8E93', 'gear'],
      ];
      el.innerHTML = `<div class="settings">
        <div class="set-side">
          <div class="set-search"><input id="setSearch" placeholder="搜索"></div>
          <div class="set-profile">
            <div class="set-avatar"><svg viewBox="0 0 64 64" width="100%" height="100%"><circle cx="32" cy="32" r="32" fill="#e8eaee"/><circle cx="32" cy="24" r="11" fill="#9aa0a8"/><path d="M10 57c3-13 12-18 22-18s19 5 22 18" fill="#9aa0a8"/></svg></div>
            <div><div style="font-weight:700;font-size:14px">User</div><div style="font-size:11px;color:#888">Apple 账户</div></div>
          </div>
          <div id="setList">${secs.map(s =>
            `<div class="set-item" data-s="${s[0]}" data-n="${s[1]}"><div class="set-ico2" style="background:${s[2]}">${GLYPH[s[3]]}</div>${s[1]}</div>`).join('')}
          </div>
        </div><div class="set-main set-main2" id="setMain"></div></div>`;
      const main = el.querySelector('#setMain');
      el.querySelector('#setSearch').addEventListener('input', e => {
        const q = e.target.value.trim();
        el.querySelectorAll('.set-item').forEach(it => {
          it.style.display = it.dataset.n.includes(q) ? '' : 'none';
        });
      });
      function bindToggles() {
        main.querySelectorAll('.toggle').forEach(t => t.addEventListener('click', () => t.classList.toggle('on')));
      }
      const card = inner => `<div class="set-card">${inner}</div>`;
      const row = (l, r) => `<div class="set-row"><span>${l}</span>${r}</div>`;
      const tog = (on, id) => `<div class="toggle ${on ? 'on' : ''}"${id ? ` id="${id}"` : ''}></div>`;
      const rng = (min, max, v, id) => `<span class="range-wrap"><input type="range" min="${min}" max="${max}" value="${v}" id="${id}"></span>`;
      const chev = '<span style="color:#c7c7cc;font-size:17px">›</span>';

      const pages = {
        appearance: () => {
          const cur = document.body.classList.contains('dark') ? 'dark' : 'light';
          main.innerHTML = `<h2>外观</h2>` + card(`
            <div class="set-row" data-m="light"><span>浅色</span><span class="ap-check">${cur === 'light' ? '✓' : ''}</span></div>
            <div class="set-row" data-m="dark"><span>深色</span><span class="ap-check">${cur === 'dark' ? '✓' : ''}</span></div>`) +
          card(row('界面缩放', `<span class="range-wrap"><input type="range" min="80" max="130" step="5" value="${settings.scale}" id="scScale"><b id="scVal">${settings.scale}%</b></span>`) +
               row('菜单栏字号', `<span class="range-wrap"><input type="range" min="11" max="17" step="0.5" value="${settings.fontSize}" id="scFont"><b id="scFontVal">${settings.fontSize}px</b></span>`)) +
          card(row('动画效果', tog(settings.animOn, 'animTg')) +
               row('动画速度', `<span class="range-wrap"><input type="range" min="50" max="200" step="10" value="${settings.animSpeed}" id="animSp"><b id="animSpVal">${settings.animSpeed}%</b></span>`) +
               row('降低透明度', tog(settings.reduceTransparency, 'rtTg'))) +
          card(row('强调色', `<span>${['#0A82FF', '#BF5AF2', '#FF6482', '#FF9F0A', '#30D158', '#8E8E93'].map(c =>
               `<span class="accent-dot" style="background:${c}" data-c="${c}"></span>`).join('')}</span>`));
          main.querySelectorAll('.set-row[data-m]').forEach(r => r.addEventListener('click', () => {
            applyDark(r.dataset.m === 'dark'); pages.appearance();
          }));
          main.querySelectorAll('.accent-dot').forEach(d => d.addEventListener('click', () => {
            document.documentElement.style.setProperty('--accent', d.dataset.c);
            settings.accent = d.dataset.c; saveSettings();
            notify('外观', '强调色已更改');
          }));
          main.querySelector('#scScale').addEventListener('input', e => {
            main.querySelector('#scVal').textContent = e.target.value + '%'; setScale(+e.target.value);
          });
          main.querySelector('#scFont').addEventListener('input', e => {
            main.querySelector('#scFontVal').textContent = e.target.value + 'px';
            settings.fontSize = +e.target.value; saveSettings(); applyScale();
          });
          main.querySelector('#animTg').addEventListener('click', e => {
            setAnim(e.currentTarget.classList.contains('on'), undefined);
          });
          main.querySelector('#animSp').addEventListener('input', e => {
            main.querySelector('#animSpVal').textContent = e.target.value + '%'; setAnim(undefined, +e.target.value);
          });
          main.querySelector('#rtTg').addEventListener('click', e => {
            setExtra('reduceTransparency', e.currentTarget.classList.contains('on'));
          });
        },
        wall: () => {
          const online = ['海洋', '山川', '城市', '森林', '星空', '沙漠'].map((t, i) =>
            `https://picsum.photos/seed/mac${t}/1920/1080`);
          main.innerHTML = `<h2>墙纸</h2>
          <div style="font-size:13px;color:#888;margin-bottom:8px">macOS 内置</div>
          <div class="wall-grid">${WALLPAPERS.map((w, i) =>
            `<div class="wall-opt ${i === wallIdx ? 'sel' : ''}" data-i="${i}" title="${w.name}"
              style="background:url('${w.thumb || w.img}') center/cover"></div>`).join('')}</div>
          <div style="font-size:13px;color:#888;margin:16px 0 8px">在线壁纸（Picsum 免费源）</div>
          <div class="wall-grid" id="wallOnline">${online.map((u, i) =>
            `<div class="wall-opt" data-u="${u}" style="background:url('https://picsum.photos/seed/mac${['海洋', '山川', '城市', '森林', '星空', '沙漠'][i]}') center/cover"></div>`).join('')}</div>
          <p style="color:#888;font-size:12.5px;margin-top:12px">点按即可更换桌面墙纸（自动保存）</p>`;
          main.querySelectorAll('.wall-opt[data-i]').forEach(w => w.addEventListener('click', () => {
            setWallpaper(+w.dataset.i); pages.wall();
          }));
          main.querySelectorAll('.wall-opt[data-u]').forEach(w => w.addEventListener('click', () => {
            const u = w.dataset.u;
            $('#wallpaper').style.background = `url('${u}') center/cover no-repeat`;
            $$('.lock-wall').forEach(el => { el.style.background = `url('${u}') center/cover no-repeat`; });
            localStorage.setItem('mac_wall_url', u);
            notify('墙纸', '在线壁纸已应用');
          }));
        },
        dock: () => {
          main.innerHTML = `<h2>桌面与程序坞</h2>` + card(
            row('图标大小', `<span class="range-wrap"><input type="range" min="32" max="70" value="${baseDock}" id="dockSize"><b id="dockSizeVal">${baseDock}px</b></span>`) +
            row('放大效果', tog(settings.magnify, 'dockMag')) +
            row('自动显示和隐藏', tog(settings.autohide, 'dockHide')) +
            row('在屏幕上的位置', `<span>${[['bottom', '底部'], ['left', '左侧'], ['right', '右侧']].map(p =>
              `<span class="pill-btn ${settings.dockPos === p[0] ? 'on' : ''}" data-pos="${p[0]}">${p[1]}</span>`).join('')}</span>`)) +
          card(row('桌面小组件', tog(localStorage.getItem('mac_widgets') === '1', 'wgTg'))) +
          `<p style="color:#888;font-size:12.5px">Dock 放到左右两侧时会自动关闭放大效果</p>`;
          main.querySelector('#dockSize').addEventListener('input', e => {
            main.querySelector('#dockSizeVal').textContent = e.target.value + 'px'; setDockSize(+e.target.value);
          });
          main.querySelector('#dockMag').addEventListener('click', e => {
            setMagnify(e.currentTarget.classList.contains('on'));
          });
          main.querySelector('#dockHide').addEventListener('click', e => {
            setAutohide(e.currentTarget.classList.contains('on'));
          });
          main.querySelectorAll('.pill-btn[data-pos]').forEach(b => b.addEventListener('click', () => {
            main.querySelectorAll('.pill-btn[data-pos]').forEach(x => x.classList.remove('on'));
            b.classList.add('on'); setDockPos(b.dataset.pos);
          }));
          main.querySelector('#wgTg').addEventListener('click', e => {
            toggleWidgets(e.currentTarget.classList.contains('on'));
          });
        },
        menu: () => {
          main.innerHTML = `<h2>菜单栏</h2>` + card(
            row('自动隐藏菜单栏', tog(settings.menubarHide, 'mbTg')) +
            row('24 小时制', tog(settings.clock24, 'h24Tg')) +
            row('显示秒', tog(settings.showSec, 'secTg'))) +
          card(row('显示电池百分比', tog(settings.showBattPct !== false, 'mbBattPct')) +
               row('显示 Siri', tog(settings.showSiri !== false, 'mbSiriTg')) +
               row('显示聚焦搜索', tog(settings.showSpot !== false, 'mbSpotTg')));
          bindToggles();
          main.querySelector('#mbTg').addEventListener('click', e => {
            setMenubarHide(e.currentTarget.classList.contains('on'));
          });
          main.querySelector('#h24Tg').addEventListener('click', e => {
            setClockOpts(e.currentTarget.classList.contains('on'), undefined);
          });
          main.querySelector('#secTg').addEventListener('click', e => {
            setClockOpts(undefined, e.currentTarget.classList.contains('on'));
          });
          /* 电池百分比 / Siri / 聚焦 显隐（真） */
          const mbVis = (id, key) => {
            const t = main.querySelector('#' + id);
            if (t) t.addEventListener('click', e => {
              /* bindToggles 已经切换过 class，这里只读取结果（防双重切换） */
              settings[key] = e.currentTarget.classList.contains('on');
              saveSettings(); applyMenubarVis();
            });
          };
          mbVis('mbBattPct', 'showBattPct');
          mbVis('mbSiriTg', 'showSiri');
          mbVis('mbSpotTg', 'showSpot');
        },
        display: () => {
          const resOpts = [[140, '更大文本'], [100, '默认'], [80, '更多空间']];
          main.innerHTML = `<h2>显示器</h2>` + card(
            row('物理分辨率', `<span style="color:#888">${screen.width} × ${screen.height}</span>`) +
            row('缩放', `<div class="seg-ctl" id="resSeg">${resOpts.map(([v, n]) =>
              `<span class="${(settings.scale || 100) === v ? 'sel' : ''}" data-v="${v}">${n}</span>`).join('')}</div>`) +
            row('亮度', `<span class="range-wrap"><input type="range" min="20" max="100" value="${100 - brightnessLevel * 100}" id="setBright"></span>`) +
            row('原彩显示', tog(settings.trueTone === true, 'ttTg')) + row('夜览', tog(!!settings.nightShift, 'nsTg'))) +
            `<p style="color:#888;font-size:12.5px">缩放实时改变界面元素大小；亮度条实时压暗整个桌面</p>`;
          bindToggles();
          main.querySelectorAll('#resSeg span').forEach(s => s.addEventListener('click', () => {
            main.querySelectorAll('#resSeg span').forEach(x => x.classList.remove('sel'));
            s.classList.add('sel');
            settings.scale = +s.dataset.v; saveSettings(); applyStage();
          }));
          main.querySelector('#setBright').addEventListener('input', e => setBrightness(1 - e.target.value / 100 * 0.8));
          const ttT = main.querySelector('#ttTg'), nsT = main.querySelector('#nsTg');
          const applyTint = () => {
            let lay = document.getElementById('nightShift');
            const level = (settings.nightShift ? 0.22 : 0) + (settings.trueTone === true ? 0.05 : 0);
            if (!level) { if (lay) lay.remove(); return; }
            if (!lay) {
              lay = document.createElement('div');
              lay.id = 'nightShift';
              lay.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:8900;background:#ff9500;mix-blend-mode:multiply';
              document.body.appendChild(lay);
            }
            lay.style.opacity = level;
          };
          if (ttT) ttT.addEventListener('click', e => { settings.trueTone = e.currentTarget.classList.contains('on'); saveSettings(); applyTint(); });
          if (nsT) nsT.addEventListener('click', e => { settings.nightShift = e.currentTarget.classList.contains('on'); saveSettings(); applyTint(); });
        },
        datetime: () => {
          const now = new Date();
          main.innerHTML = `<h2>日期与时间</h2>
            <div class="set-dt-clock">${now.toLocaleTimeString('zh-CN', { hour12: !settings.clock24 })}</div>` +
            card(row('24 小时制', tog(settings.clock24, 'dt24')) +
                 row('显示秒', tog(settings.showSec, 'dtSec')) +
                 row('时区', `<span style="color:#888">${Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai'}</span>`) +
                 row('网络时间', `<span style="color:${navigator.onLine ? '#34c759' : '#ff3b30'}">${navigator.onLine ? '已同步 ✓' : '离线'}</span>`));
          main.querySelector('#dt24').addEventListener('click', e => {
            setClockOpts(e.currentTarget.classList.contains('on'), undefined); pages.datetime();
          });
          main.querySelector('#dtSec').addEventListener('click', e => {
            setClockOpts(undefined, e.currentTarget.classList.contains('on'));
          });
        },
        net: () => {
          main.innerHTML = `<h2>网络</h2>` + card(
            row('状态', `<span id="netStat" style="color:${navigator.onLine ? '#34c759' : '#ff3b30'}">${navigator.onLine ? '在线 ●' : '离线 ○'}</span>`) +
            row('IP 地址', `<span id="netIP" style="color:#888">检测中…</span>`) +
            row('DNS', '<span style="color:#888">自动</span>')) +
          card(row('网络测速', '<span class="pill-btn on" id="speedBtn">开始测速</span>') +
               row('延迟', '<b id="netPing">—</b>'));
          (async () => {
            const g = await fetchJSON('https://ipapi.co/json/', 6000);
            const ip = main.querySelector('#netIP');
            if (ip) ip.textContent = g && g.ip ? `${g.ip}（${g.city || ''}）` : '不可用（离线）';
          })();
          main.querySelector('#speedBtn').addEventListener('click', async () => {
            const p = main.querySelector('#netPing');
            p.textContent = '测试中…';
            const t0 = performance.now();
            const r = await fetchText('https://api.open-meteo.com/v1/forecast?latitude=30&longitude=120&current=temperature_2m', 8000);
            const ms = Math.round(performance.now() - t0);
            p.textContent = r ? `${ms} ms` : '失败';
            notify('网络', r ? `连接正常 · 延迟 ${ms} ms` : '网络不可用');
          });
        },
        wifi: () => {
          main.innerHTML = `<h2>无线局域网</h2>` + card(
            row('无线局域网', tog(true, 'wifiTg')) +
            `<div id="wifiReal"><div class="set-row"><span style="color:#888">正在读取真实 WiFi 信息…</span></div></div>`) +
            card(`<div class="set-row" id="openWifiSys"><span>打开系统 WiFi 设置</span>${chev}</div>`);
          const info = window.AndroidBridge && AndroidBridge.getWifiInfo ? AndroidBridge.getWifiInfo() : null;
          const w = info ? JSON.parse(info) : null;
          const box = main.querySelector('#wifiReal');
          if (w && w.on) {
            box.innerHTML = row(`${w.ssid || '当前网络'}`, '<span style="color:#0A84FF">✓ 已连接</span>') +
              row('IP 地址', `<span style="color:#888">${w.ip}</span>`) +
              row('链路速度', `<span style="color:#888">${w.speed} Mbps</span>`) +
              row('信号强度', `<span style="color:#888">${w.rssi} dBm</span>`);
          } else box.innerHTML = `<div class="set-row"><span style="color:#888">WiFi 已关闭或无权限读取</span></div>`;
          main.querySelector('#openWifiSys').addEventListener('click', () => {
            if (window.AndroidBridge) AndroidBridge.openSysSettings('wifi');
          });
        },
        bt: () => {
          main.innerHTML = `<h2>蓝牙</h2>` + card(
            row('蓝牙', tog(settings.btOn !== false, 'btTg')) +
            `<div id="btReal"><div class="set-row"><span style="color:#888">正在读取已配对设备…</span></div></div>`) +
            card(`<div class="set-row" id="openBtSys"><span>打开系统蓝牙设置</span>${chev}</div>`);
          const info = window.AndroidBridge && AndroidBridge.getBtInfo ? AndroidBridge.getBtInfo() : null;
          const b = info ? JSON.parse(info) : null;
          const box = main.querySelector('#btReal');
          if (b && b.on && b.devices.length) {
            box.innerHTML = b.devices.map(d =>
              row(`🎧 ${d}`, '<span style="color:#0A84FF">已配对</span>')).join('');
          } else box.innerHTML = `<div class="set-row"><span style="color:#888">${b && b.on ? '没有已配对设备' : '蓝牙已关闭或无权限'}</span></div>`;
          main.querySelector('#openBtSys').addEventListener('click', () => {
            if (window.AndroidBridge) AndroidBridge.openSysSettings('bt');
          });
          /* 蓝牙开关（绑定在本页） */
          const btT = main.querySelector('#btTg');
          if (btT) btT.addEventListener('click', e => {
            settings.btOn = e.currentTarget.classList.contains('on'); saveSettings();
            const bI = document.querySelector('#ccBt .cc-ico');
            if (bI) bI.classList.toggle('on', settings.btOn);
            notify('蓝牙', settings.btOn ? '蓝牙已打开' : '蓝牙已关闭');
          });
        },
        sound: () => {
          const realVol = window.AndroidBridge && AndroidBridge.getVolumePct ? AndroidBridge.getVolumePct() : 60;
          main.innerHTML = `<h2>声音</h2>` + card(
            row('输出音量', `<span class="range-wrap"><input type="range" min="0" max="100" value="${realVol}" id="sysVol"></span>`) + row('提示音量', rng(0, 100, 80))) +
          card(['玻璃 (Glass)', '英雄 (Hero)', 'Ping', '潜艇 (Submarine)'].map((s, i) =>
            `<div class="set-row snd" data-s="${s}"><span>${s}</span><span class="snd-check" style="color:#0A84FF">${i === 0 ? '✓' : ''}</span></div>`).join(''));
          const sv = main.querySelector('#sysVol');
          if (sv) sv.addEventListener('input', e => {
            if (window.AndroidBridge && AndroidBridge.setVolumePct) AndroidBridge.setVolumePct(+e.target.value);
          });
          main.querySelectorAll('.snd').forEach(r => r.addEventListener('click', () => {
            main.querySelectorAll('.snd-check').forEach(c => c.textContent = '');
            r.querySelector('.snd-check').textContent = '✓';
            notify('声音', `提示音已设为「${r.dataset.s}」`);
          }));
        },
        noti: () => {
          main.innerHTML = `<h2>通知</h2>` + card(
            row('允许通知', tog(settings.allowNotif !== false, 'notifTg')) + row('通知摘要', tog(!!settings.notifSummary, 'ns2Tg')) + row('锁定屏幕上显示', tog(settings.lockNotif !== false, 'lnTg')));
          bindToggles();
          const nTg = main.querySelector('#notifTg');
          if (nTg) nTg.addEventListener('click', e => { settings.allowNotif = e.currentTarget.classList.contains('on'); saveSettings(); });
          const ns2 = main.querySelector('#ns2Tg');
          if (ns2) ns2.addEventListener('click', e => { settings.notifSummary = e.currentTarget.classList.contains('on'); saveSettings(); });
          const lnT = main.querySelector('#lnTg');
          if (lnT) lnT.addEventListener('click', e => { settings.lockNotif = e.currentTarget.classList.contains('on'); saveSettings(); });
        },
        focus: () => {
          const modes = [['勿扰模式', 'moon', '#5E5CE6'], ['工作', 'doc', '#0A84FF'], ['个人', 'person', '#30B0C7'], ['睡眠', 'moon', '#30D158']];
          main.innerHTML = `<h2>专注模式</h2>` + card(modes.map(m =>
            `<div class="set-row focus-row" data-f="${m[0]}"><span class="focus-name"><span class="set-ico2 sm" style="background:${m[2]}">${GLYPH[m[1]]}</span>${m[0]}</span>
            <span class="focus-st" style="color:#888">关闭</span></div>`).join('')) +
            `<p style="color:#888;font-size:12.5px">打开后，通知将静音并隐藏横幅</p>`;
          main.querySelectorAll('.focus-row').forEach(r => r.addEventListener('click', () => {
            const st = r.querySelector('.focus-st');
            const on = st.textContent === '关闭';
            main.querySelectorAll('.focus-st').forEach(x => x.textContent = '关闭');
            st.textContent = on ? '打开' : '关闭';
            st.style.color = on ? '#0A84FF' : '#888';
            notify('专注模式', `${r.dataset.f}已${on ? '打开' : '关闭'}`);
          }));
        },
        access: () => {
          main.innerHTML = `<h2>辅助功能</h2>` + card(
            row('降低透明度', tog(settings.reduceTransparency, 'acRt')) +
            row('减弱动态效果', tog(!settings.animOn, 'acAnim')) +
            row('台前调度', tog(settings.stageLight, 'acStage')));
          main.querySelector('#acRt').addEventListener('click', e => {
            setExtra('reduceTransparency', e.currentTarget.classList.contains('on'));
          });
          main.querySelector('#acAnim').addEventListener('click', e => {
            setAnim(!e.currentTarget.classList.contains('on'), undefined);
          });
          main.querySelector('#acStage').addEventListener('click', e => {
            setExtra('stageLight', e.currentTarget.classList.contains('on'));
          });
        },
        general: () => {
          main.innerHTML = `<h2>通用</h2>` + card(
            `<div class="set-row" data-g="about"><span>关于本机</span>${chev}</div>
             <div class="set-row" data-g="update"><span>软件更新</span>${chev}</div>
             <div class="set-row" data-g="storage"><span>储存空间</span>${chev}</div>`) +
            card(row('隔空投送与接力', chev) + row('日期与时间', chev));
          main.querySelectorAll('.set-row[data-g]').forEach(r => r.addEventListener('click', () => {
            const g = r.dataset.g;
            if (g === 'about') openApp('about');
            if (g === 'update') pages.update();
            if (g === 'storage') pages.storage();
          }));
          main.querySelectorAll('.set-row:not([data-g])').forEach(r => {
            if (r.querySelector('.set-row')) return;
          });
        },
        update: () => {
          /* 上次更新记录（重启后仍显示） */
          let lastUpd = null;
          try { lastUpd = JSON.parse(localStorage.getItem('mac_last_update') || 'null'); } catch (e) {}
          const lastCard = lastUpd && lastUpd.name === APP_VER.name
            ? `<div class="upd-card" style="margin-top:12px;text-align:left">
                <div class="upd-new" style="font-size:15px">已更新至 ${lastUpd.name}</div>
                <div class="upd-notes">${lastUpd.notes.map(n => `· ${n}`).join('<br>')}</div>
                <div style="font-size:11.5px;color:#888;margin-top:8px">${new Date(lastUpd.at).toLocaleString('zh-CN')}</div>
              </div>`
            : '';
          main.innerHTML = `<h2>软件更新</h2>
          <div class="upd-hero" id="updGlass">
            <div class="upd-gear-big">${GLYPH.gearBig}</div>
            <div class="upd-title">macOS Sequoia</div>
            <div class="upd-ver">当前版本 ${APP_VER.name}${window.AndroidBridge && AndroidBridge.isUpdated && AndroidBridge.isUpdated() ? ' · <span style="color:#30d158">OTA 增强版</span>' : ''}</div>
            <div class="upd-btn" id="updCheck">检查更新</div>
            <div class="upd-status" id="updStatus"></div>
            <div class="upd-hint">提示：更新完成后，请删除后台重新打开 App</div>
          </div>
          ${lastCard}
          <div id="updDetail"></div>`;
          const status = main.querySelector('#updStatus'), detail = main.querySelector('#updDetail');
          main.querySelector('#updCheck').addEventListener('click', async () => {
            status.innerHTML = `<div class="sf-spinner" style="margin:14px auto 6px"></div><div style="color:#888;font-size:12.5px">正在测速更新源…</div>`;
            detail.innerHTML = '';
            const res = await otaSpeedTest();
            const best = otaPick(res);
            /* 测速报告 */
            const report = `<div class="upd-sources">${res.map(r =>
              `<div class="upd-src"><span>${r.name}</span><span class="${r.data ? 'ok' : 'fail'}">${r.data ? r.ms + ' ms' : '超时 ✗'}</span></div>`).join('')}</div>`;
            if (!best) {
              status.innerHTML = `<div class="upd-fail"><span class="upd-ico">${GLYPH.globe}</span>所有更新源均不可达</div>` + report;
              return;
            }
            const remote = best.data;
            const force = remote.minCode && APP_VER.code < remote.minCode;
            /* 手动检查不受"忽略版本"影响 */
            const has = remote.code > APP_VER.code;
            if (!has) {
              status.innerHTML = `<div style="color:#30d158;font-size:15px;margin-top:10px">✓ 已是最新版本</div>` + report;
              return;
            }
            status.innerHTML = `<div style="color:#ff9f0a;font-size:14px;margin-top:10px">发现新版本</div>` + report;
            detail.innerHTML = `<div class="upd-card" style="margin-top:12px">
              <div class="upd-new">${remote.name}${force ? ' <span style="color:#ff3b30;font-size:12px">（必须更新）</span>' : ''}</div>
              <div class="upd-notes">${(remote.notes || []).map(n => `· ${n}`).join('<br>')}</div>
              <div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
                <div class="upd-btn" id="updGo">立即更新</div>
                ${force ? '' : '<div class="upd-btn ghost" id="updSkip">忽略此版本</div>'}
              </div>
              <div class="upd-prog hidden" id="updProg"><div class="upd-prog-fill" id="updFill"></div></div>
              <div class="upd-pct hidden" id="updPct"></div></div>`;
            const go = detail.querySelector('#updGo');
            const sk = detail.querySelector('#updSkip');
            if (sk) sk.addEventListener('click', () => {
              localStorage.setItem('mac_skip_ver', remote.code);
              detail.innerHTML = '';
              status.innerHTML = `<div style="color:#888;font-size:13px;margin-top:10px">已忽略版本 ${remote.name}</div>`;
            });
            go.addEventListener('click', async () => {
              go.style.display = 'none';
              if (sk) sk.style.display = 'none';
              const prog = detail.querySelector('#updProg'), pct = detail.querySelector('#updPct'), fill = detail.querySelector('#updFill');
              prog.classList.remove('hidden'); pct.classList.remove('hidden');
              try {
                const r = await otaApply(best.base, remote, (p, label) => {
                  fill.style.width = (p * 100).toFixed(0) + '%';
                  pct.textContent = label + ' · ' + (p * 100).toFixed(0) + '%';
                });
                const sizeTxt = r && r.bytes ? `增量 ${(r.bytes / 1024).toFixed(0)} KB / ${r.count} 个文件` : '';
                /* 更新完成 → 主人手动点重启 */
                prog.style.display = 'none';
                pct.classList.add('hidden');
                detail.querySelector('.upd-new').innerHTML = `✓ ${remote.name} 已就绪`;
                detail.querySelector('.upd-notes').innerHTML = `<span style="color:#888;font-size:12.5px">${sizeTxt}，删除后台重新打开 App 生效</span>`;
                const btnWrap = detail.querySelector('.upd-card div[style*="display:flex"]');
                btnWrap.innerHTML = `<div class="upd-btn restart" id="updRestart">我知道了</div>`;
                detail.querySelector('#updRestart').addEventListener('click', () => {
                  /* 尝试软重启；不成功就由用户删后台 */
                  if (window.AndroidBridge && AndroidBridge.restartApp) AndroidBridge.restartApp();
                  else location.reload();
                });
              } catch (e) {
                pct.textContent = '✗ 更新失败：' + e.message;
                go.style.display = ''; go.textContent = '重试';
              }
            });
          });
        },
        storage: () => {
          const segs = [['系统', 38, '#8E8E93'], ['App', 52, '#0A84FF'], ['文稿', 26, '#30B0C7'], ['照片', 31, '#FF9F0A'], ['其他', 15, '#BF5AF2']];
          const total = segs.reduce((s, x) => s + x[1], 0);
          main.innerHTML = `<h2>储存空间</h2><div style="color:#888;font-size:13px;margin-bottom:10px">256 GB · 可用 ${256 - total} GB</div>
            <div class="stg-bar">${segs.map(s => `<div style="width:${s[1] / 256 * 100}%;background:${s[2]}"></div>`).join('')}</div>` +
            card(segs.map(s => row(`<span><span class="stg-dot" style="background:${s[2]}"></span>${s[0]}</span>`,
              `<span style="color:#888">${s[1]} GB</span>`)).join('')) +
            card(`<div class="set-row"><span>本演示数据占用</span><b id="realUsage" style="color:#888">计算中…</b></div>
              <div class="set-row" id="clearData"><span style="color:#ff3b30">清除演示缓存数据…</span><span style="color:#c7c7cc">›</span></div>`);
          if (navigator.storage && navigator.storage.estimate) {
            navigator.storage.estimate().then(s => {
              const el2 = main.querySelector('#realUsage');
              if (el2) el2.textContent = `${(s.usage / 1024 / 1024).toFixed(1)} MB（含 IndexedDB）`;
            }).catch(() => { const el2 = main.querySelector('#realUsage'); if (el2) el2.textContent = '未知'; });
          }
          main.querySelector('#clearData').addEventListener('click', async () => {
            localStorage.clear();
            try { await IDB.clear(); } catch (e) {}
            notify('储存空间', '缓存已清空，即将重新启动…');
            setTimeout(() => restart(), 1200);
          });
        },
      };
      el.querySelectorAll('.set-item').forEach(it => it.addEventListener('click', () => {
        el.querySelectorAll('.set-item').forEach(x => x.classList.remove('sel'));
        it.classList.add('sel');
        (pages[it.dataset.s] || pages.general)();
      }));
      el.querySelector('.set-item[data-s="appearance"]').classList.add('sel');
      pages.appearance();
    }
  },

  /* ─── 信息 ─── */
  messages: {
    name: '信息', icon: () => ICONS.messages(), w: 700, h: 470,
    render(el) {
      const chats = [
        ['🧑', 'Alex', ['周六的球赛别忘了', '老地方，下午三点']],
        ['👩', '妈妈', ['天冷了记得加衣服', '周末回家吃饭吗？']],
        ['👥', '项目群', ['设计稿已更新到群文件', '收到，我下午看']],
      ];
      let sel = 0;
      el.innerHTML = `<div class="msg">
        <div class="msg-side">${chats.map((c, i) =>
          `<div class="msg-chat ${i === 0 ? 'sel' : ''}" data-i="${i}">
            <div class="msg-av">${c[0]}</div>
            <div style="min-width:0"><div style="font-weight:600;font-size:13.5px">${c[1]}</div>
            <div style="font-size:12px;opacity:.7;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c[2][c[2].length - 1]}</div></div>
          </div>`).join('')}</div>
        <div class="msg-main"><div class="msg-body" id="msgBody"></div>
        <div class="msg-input"><input id="msgIn" placeholder="iMessage 信息"><span style="color:#0A82FF;font-size:20px" id="msgSend">↑</span></div></div></div>`;
      const body = el.querySelector('#msgBody'), inp = el.querySelector('#msgIn');
      function draw() {
        body.innerHTML = chats[sel][2].map(m => `<div class="bubble other">${m}</div>`).join('');
        body.scrollTop = body.scrollHeight;
      }
      function send() {
        const v = inp.value.trim(); if (!v) return;
        chats[sel][2].push(v);
        body.insertAdjacentHTML('beforeend', `<div class="bubble me">${v.replace(/</g, '&lt;')}</div>`);
        inp.value = ''; body.scrollTop = body.scrollHeight;
        setTimeout(() => {
          if (!document.contains(body)) return;
          const reply = ['收到！', '好的👌', '哈哈哈哈', '在忙，稍后回你', '没问题'][Math.floor(Math.random() * 5)];
          chats[sel][2].push(reply);
          body.insertAdjacentHTML('beforeend', `<div class="bubble other">${reply}</div>`);
          body.scrollTop = body.scrollHeight;
        }, 900);
      }
      inp.addEventListener('keydown', e => e.key === 'Enter' && send());
      el.querySelector('#msgSend').addEventListener('click', send);
      el.querySelectorAll('.msg-chat').forEach(c => c.addEventListener('click', () => {
        el.querySelectorAll('.msg-chat').forEach(x => x.classList.remove('sel'));
        c.classList.add('sel'); sel = +c.dataset.i; draw();
      }));
      draw();
    }
  },

  /* ─── 地图（用户的高德 JS API Key + 网页版降级） ─── */
  maps: {
    name: '地图', icon: () => ICONS.maps(), w: 820, h: 560,
    render(el, win) {
      /* 运行时还原地图凭证（拆片异或存储） */
      const _k1 = [104,109,110,98,63,57,108,98,111,110,106];
      const _k3 = [106,111,57,109,107,60,111,63,99,109];
      const _k2 = [62,63,99,63,99,59,104,60,111,63,63];
      const _s1 = [98,98,105,57,108,108,109,99,105,56,109];
      const _s2 = [110,104,109,59,105,63,60,60,104,104,99];
      const _s3 = [59,105,60,108,106,109,60,104,107,60];
      const _d = a => a.map(x => String.fromCharCode(x ^ 0x5A)).join('');
      const AMAP_KEY = _d(_k1) + _d(_k2) + _d(_k3);
      const AMAP_SEC = _d(_s1) + _d(_s2) + _d(_s3);
      el.innerHTML = `<div class="safari">
        <div class="sf-bar">
          <input class="sf-url" id="mapSearch" placeholder="搜索地点（高德官方数据）">
          <span class="map-src-btn on" data-m="std">标准</span>
          <span class="map-src-btn" data-m="sat">卫星</span>
        </div>
        <div class="sf-view" id="amapBox" style="background:#e8e8ea"></div></div>`;
      const box = el.querySelector('#amapBox');
      function fallbackWeb() {
        box.innerHTML = `<div class="sf-cover">正在切换高德网页版…</div>`;
        browserAttach(win, box, 'https://ditu.amap.com/');
      }
      function bootAMap() {
        let sat = null;
        const map = new AMap.Map(box, { zoom: 12, center: [120.1551, 30.2741], resizeEnable: true });
        el.querySelectorAll('.map-src-btn').forEach(b => b.addEventListener('click', () => {
          el.querySelectorAll('.map-src-btn').forEach(x => x.classList.remove('on'));
          b.classList.add('on');
          if (b.dataset.m === 'sat') { if (!sat) sat = new AMap.TileLayer.Satellite(); map.add(sat); }
          else if (sat) map.remove(sat);
        }));
        AMap.plugin(['AMap.ToolBar', 'AMap.Scale', 'AMap.Geolocation'], () => {
          map.addControl(new AMap.ToolBar({ position: 'RB' }));
          map.addControl(new AMap.Scale());
          const geo = new AMap.Geolocation({ showButton: true, showMarker: true, enableHighAccuracy: true, extensions: 'all' });
          map.addControl(geo);
          geo.getCurrentPosition((st, r) => {
            if (st === 'complete') {
              map.setZoomAndCenter(15, [r.position.lng, r.position.lat]);
              const a = r.addressComponent;
              if (a && a.city) notify('地图', `📍 已定位：${a.city}${a.district || ''}`);
            }
          });
        });
        el.querySelector('#mapSearch').addEventListener('keydown', e => {
          if (e.key !== 'Enter') return;
          const q = e.target.value.trim();
          if (!q) return;
          AMap.plugin('AMap.PlaceSearch', () => {
            new AMap.PlaceSearch({ pageSize: 1 }).search(q, (st, r) => {
              if (st === 'complete' && r.poiList && r.poiList.pois.length) {
                const p = r.poiList.pois[0];
                map.setZoomAndCenter(16, [p.location.lng, p.location.lat]);
                new AMap.Marker({ position: [p.location.lng, p.location.lat], map, title: p.name });
                notify('地图', `📍 ${p.name}`);
              } else notify('地图', '未找到该地点');
            });
          });
        });
      }
      /* 官方异步加载姿势：安全密钥 + callback 参数 */
      if (window.AMap) { try { bootAMap(); } catch (e) { fallbackWeb(); } return; }
      if (!navigator.onLine) {
        box.innerHTML = `<div class="sf-err">🔴 离线状态<br><span style="font-size:13px;color:#999">地图需要网络连接</span></div>`;
        return;
      }
      box.innerHTML = `<div class="sf-cover"><div class="sf-spinner"></div>正在加载高德地图…</div>`;
      window._AMapSecurityConfig = { securityJsCode: AMAP_SEC };
      const cbName = '__amapCb' + Date.now();
      let done = false;
      const fail = () => { if (!done) { done = true; fallbackWeb(); } };
      window[cbName] = () => { done = true; try { bootAMap(); } catch (e) { fallbackWeb(); } };
      const s = document.createElement('script');
      s.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&callback=${cbName}`;
      s.onerror = fail;
      setTimeout(fail, 9000);
      document.head.appendChild(s);
    }
  },
  /* ─── 邮件（带邮箱侧边栏） ─── */
  mail: {
    name: '邮件', icon: () => ICONS.mail(), w: 820, h: 520,
    render(el) {
      const mails = [
        ['Apple', '您的收据', '感谢您从 App Store 购买……', '尊敬的客户：\n\n感谢您从 App Store 购买「GoodNotes 6」。\n订单号：M824013570\n金额：¥0.00（演示）\n\n—— Apple'],
        ['iCloud', '储存空间将满', '您的 iCloud 储存空间已使用 90%……', '您好：\n\n您的 5GB iCloud 储存空间已使用 4.5GB。\n升级方案可获得更多空间。\n\n—— iCloud 团队'],
        ['GitHub', '[user/macos-demo] 新的 Star', '您的仓库获得了新的关注', 'Hello,\n\nYour repository user/macos-demo just got a new star.\nTotal stars: 1,024 ⭐'],
        ['少数派', '本周编辑推荐', '这些效率工具值得一试……', '亲爱的读者：\n\n本周我们为你精选了 5 款效率工具，\n涵盖笔记、日历与自动化。\n\n点击查看全文 →'],
      ];
      let sel = 0;
      el.innerHTML = `<div class="mail" style="flex-direction:row">
        <div class="fs-side" style="flex-basis:150px;width:150px">
          <div class="fs-sec">邮箱</div>
          ${[['收件箱', 'download', 4], ['已发送', 'speaker', 0], ['草稿', 'doc', 1], ['废纸篓', 'disk', 0]].map((m, i) =>
            `<div class="fs-item ${i === 0 ? 'sel' : ''}"><span class="fs-glyph">${GLYPH[m[1]]}</span>${m[0]}
              ${m[2] ? `<span class="mail-badge">${m[2]}</span>` : ''}</div>`).join('')}
        </div>
        <div class="mail-list">${mails.map((m, i) =>
          `<div class="mail-item ${i === 0 ? 'sel' : ''}" data-i="${i}">
            <div class="mi-from">${m[0]}</div><div class="mi-sub">${m[1]}</div><div class="mi-prev">${m[2]}</div></div>`).join('')}
        </div><div class="mail-body" id="mailBody"></div></div>`;
      const body = el.querySelector('#mailBody');
      function draw() {
        const m = mails[sel];
        body.innerHTML = `<h3 style="margin-bottom:4px">${m[1]}</h3>
          <div style="color:#888;font-size:12.5px;margin-bottom:14px">${m[0]} · 今天 ${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}</div>
          <div style="white-space:pre-line">${m[3]}</div>`;
      }
      el.querySelectorAll('.mail-item').forEach(it => it.addEventListener('click', () => {
        el.querySelectorAll('.mail-item').forEach(x => x.classList.remove('sel'));
        it.classList.add('sel'); sel = +it.dataset.i; draw();
      }));
      draw();
    }
  },

  /* ─── 提醒事项 ─── */
  reminders: {
    name: '提醒事项', icon: () => ICONS.reminders(), w: 460, h: 420,
    render(el) {
      const items = JSON.parse(localStorage.getItem('mac_reminders') || 'null') || [
        ['买牛奶', false], ['给妈妈打电话', false], ['周五提交报告', true],
        ['健身 30 分钟', false], ['还图书馆的书', true],
      ];
      const saveRem = () => localStorage.setItem('mac_reminders', JSON.stringify(items));
      el.innerHTML = `<div class="rem"><h1>今天</h1>
        <div class="rem-count" id="remCnt"></div>
        ${items.map((it, i) => `<div class="rem-row ${it[1] ? 'done' : ''}" data-i="${i}">
          <div class="rem-c">${it[1] ? '✓' : ''}</div><span>${it[0]}</span></div>`).join('')}</div>`;
      const cnt = el.querySelector('#remCnt');
      const update = () => {
        cnt.textContent = `已完成 ${el.querySelectorAll('.rem-row.done').length} / ${items.length} 项`;
      };
      el.querySelectorAll('.rem-row').forEach(r => r.addEventListener('click', () => {
        r.classList.toggle('done');
        r.querySelector('.rem-c').textContent = r.classList.contains('done') ? '✓' : '';
        items[+r.dataset.i][1] = r.classList.contains('done');
        saveRem();
        update();
      }));
      update();
    }
  },

  /* ─── FaceTime ─── */
  facetime: {
    name: 'FaceTime 通话', icon: () => ICONS.facetime(), w: 480, h: 380,
    render(el) {
      el.innerHTML = `<div style="flex:1;background:#1c1c1e;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#fff">
        <div style="width:96px;height:96px;border-radius:50%;background:#3a5a8c;display:flex;align-items:center;justify-content:center;font-size:52px">🧑</div>
        <div style="font-size:20px;font-weight:600">Alex</div>
        <div style="color:#999;font-size:14px" id="ftStat">正在呼叫…</div>
        <div style="display:flex;gap:20px;margin-top:10px">
          <div style="width:56px;height:56px;border-radius:50%;background:#3a3a3c;display:flex;align-items:center;justify-content:center;font-size:24px">🎤</div>
          <div style="width:56px;height:56px;border-radius:50%;background:#FF3B30;display:flex;align-items:center;justify-content:center;font-size:24px" id="ftEnd">📵</div>
        </div></div>`;
      const stat = el.querySelector('#ftStat');
      const timer = setTimeout(() => { if (document.contains(stat)) stat.textContent = '对方忙，请稍后再拨'; }, 2500);
      el.querySelector('#ftEnd').addEventListener('click', () => {
        clearTimeout(timer);
        closeWindow(el.closest('.window').dataset.id);
      });
    }
  },

  /* ─── 播客（真实 RSS + 可播放单集） ─── */
  podcast: {
    name: '播客', icon: () => ICONS.podcast(), w: 780, h: 540,
    render(el, win) {
      const SHOWS = [
        { n: 'Planet Money', h: 'NPR', c: 'covers/pc1.jpg', rss: 'https://feeds.npr.org/510289/podcast.xml' },
        { n: 'BBC Global News', h: 'BBC', c: 'covers/pc2.jpg', rss: 'https://podcasts.files.bbci.co.uk/p02nq0gn.rss' },
        { n: 'TED Talks Daily', h: 'TED', c: 'covers/pc3.jpg', rss: 'https://feeds.acast.com/public/shows/tedtalksdaily' },
        { n: '深海电台', h: 'Demo FM', c: 'covers/pc4.jpg', demo: true },
      ];
      const DEMO_EPS = [1, 2, 3, 4, 5, 6].map(i => ({
        t: `深海之声 · 第 ${i} 期`, d: '12:0' + i,
        url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${i}.mp3`,
      }));
      let audio = null, curEp = null;
      el.innerHTML = `<div class="pc-app">
        <div class="pc-side">
          <div class="wx2-search" style="padding:8px"><input id="pcSearch" placeholder="搜索播客"></div>
          <div class="fs-sec">资料库</div>
          <div class="fs-item sel"><span class="fs-glyph" style="color:#8e44ad">${GLYPH.speaker}</span>节目</div>
          <div class="fs-item"><span class="fs-glyph" style="color:#8e44ad">${GLYPH.recents}</span>最新单集</div>
        </div>
        <div class="pc-main">
          <div class="pc-grid" id="pcGrid">${SHOWS.map((s, i) =>
            `<div class="pc-show" data-i="${i}"><img class="pc-cover" src="${s.c}" draggable="false">
            <div class="pc-n">${s.n}</div><div class="pc-h">${s.h}</div></div>`).join('')}</div>
          <div class="pc-eps hidden" id="pcEps"></div>
          <div class="pc-player hidden" id="pcPlayer">
            <div class="pc-p-title" id="pcPT">—</div>
            <div class="pc-p-bar" id="pcPBar"><div class="pc-p-fill" id="pcPFill"></div></div>
            <div class="pc-p-ctl"><span id="pcBack">⏪ 15</span><span id="pcPlay" class="pc-p-play">▶</span><span id="pcFwd">30 ⏩</span></div>
          </div>
        </div></div>`;
      const grid = el.querySelector('#pcGrid'), epsBox = el.querySelector('#pcEps');
      const player = el.querySelector('#pcPlayer');
      function parseRSS(xml) {
        const doc = new DOMParser().parseFromString(xml, 'text/xml');
        return [...doc.querySelectorAll('item')].slice(0, 10).map(it => ({
          t: (it.querySelector('title') || {}).textContent || '未命名单集',
          d: ((it.querySelector('pubDate') || {}).textContent || '').slice(5, 16),
          url: (it.querySelector('enclosure') || {}).getAttribute ? it.querySelector('enclosure').getAttribute('url') : null,
        })).filter(e => e.url);
      }
      async function openShow(s) {
        grid.classList.add('hidden');
        epsBox.classList.remove('hidden');
        epsBox.innerHTML = `<div class="pc-eps-head"><span class="pc-back" id="pcBack2">‹ 节目</span><b>${s.n}</b></div>
          <div class="sf-loading"><div class="sf-spinner"></div>正在获取单集…</div>`;
        epsBox.querySelector('#pcBack2').addEventListener('click', () => {
          epsBox.classList.add('hidden'); grid.classList.remove('hidden');
        });
        let eps = [];
        if (s.demo) eps = DEMO_EPS;
        else {
          /* 热门榜节目需要先 lookup 出 RSS 地址 */
          if (!s.rss && s.lookupId) {
            const lr = await fetchJSON(`https://itunes.apple.com/lookup?id=${s.lookupId}`, 8000);
            if (lr && lr.results && lr.results[0]) s.rss = lr.results[0].feedUrl;
          }
          const xml = s.rss ? await fetchText(s.rss, 14000) : null;
          if (xml) try { eps = parseRSS(xml); } catch (e) {}
          if (!eps.length) eps = DEMO_EPS;
        }
        epsBox.innerHTML = `<div class="pc-eps-head"><span class="pc-back" id="pcBack2">‹ 节目</span><b>${s.n}</b></div>` +
          eps.map((e, i) => `<div class="pc-ep" data-i="${i}">
            <div class="pc-ep-info"><div class="pc-ep-t">${e.t.replace(/</g, '&lt;')}</div>
            <div class="pc-ep-d">${e.d}</div></div>
            <span class="pc-ep-play">▶</span></div>`).join('');
        epsBox.querySelector('#pcBack2').addEventListener('click', () => {
          epsBox.classList.add('hidden'); grid.classList.remove('hidden');
        });
        epsBox.querySelectorAll('.pc-ep').forEach(row => row.addEventListener('click', () => play(eps[+row.dataset.i], row)));
      }
      function play(ep, row) {
        epsBox.querySelectorAll('.pc-ep').forEach(x => x.classList.remove('playing'));
        if (row) row.classList.add('playing');
        if (!audio) audio = new Audio();
        if (win) win._audio = audio;   /* 关窗自动静音 */
        audio.src = ep.url;
        audio.play().catch(() => notify('播客', '音频加载失败（可能离线）'));
        curEp = ep;
        player.classList.remove('hidden');
        el.querySelector('#pcPT').textContent = ep.t;
        el.querySelector('#pcPlay').textContent = '⏸';
        audio.ontimeupdate = () => {
          if (audio.duration) el.querySelector('#pcPFill').style.width = (audio.currentTime / audio.duration * 100) + '%';
        };
        audio.onended = () => { el.querySelector('#pcPlay').textContent = '▶'; };
      }
      function bindShows() {
        grid.querySelectorAll('.pc-show').forEach(s => s.addEventListener('click', () => openShow(SHOWS[+s.dataset.i])));
      }
      bindShows();
      /* 载入苹果官方播客热门榜 */
      (async () => {
        const d = await fetchJSON('https://itunes.apple.com/cn/rss/toppodcasts/limit=12/json', 10000);
        const entries = d && d.feed && d.feed.entry ? d.feed.entry : [];
        entries.forEach(en => {
          const id = en.id && en.id.attributes ? en.id.attributes['im:id'] : null;
          const img = en['im:image'];
          SHOWS.push({
            n: en['im:name'].label, h: en['im:artist'] ? en['im:artist'].label : '',
            c: img && img[2] ? img[2].label : 'covers/pc1.jpg',
            lookupId: id,
          });
        });
        grid.innerHTML = SHOWS.map((s, i) =>
          `<div class="pc-show" data-i="${i}"><img class="pc-cover" src="${s.c}" draggable="false" loading="lazy">
          <div class="pc-n">${s.n}</div><div class="pc-h">${s.h}</div></div>`).join('');
        bindShows();
      })();
      /* iTunes 播客搜索 */
      el.querySelector('#pcSearch').addEventListener('keydown', async e => {
        if (e.key !== 'Enter') return;
        const q = e.target.value.trim();
        if (!q) return;
        notify('播客', `正在搜索「${q}」…`);
        const d = await fetchJSON(`https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=podcast&limit=8`, 10000);
        if (!d || !d.results || !d.results.length) return notify('播客', '没有找到相关播客');
        d.results.forEach(r => SHOWS.push({ n: r.collectionName, h: r.artistName, c: r.artworkUrl100 || 'covers/pc1.jpg', rss: r.feedUrl }));
        grid.innerHTML = SHOWS.map((s, i) =>
          `<div class="pc-show" data-i="${i}"><img class="pc-cover" src="${s.c}" draggable="false" loading="lazy">
          <div class="pc-n">${s.n}</div><div class="pc-h">${s.h}</div></div>`).join('');
        grid.querySelectorAll('.pc-show').forEach(s => s.addEventListener('click', () => openShow(SHOWS[+s.dataset.i])));
      });
      el.querySelector('#pcPlay').addEventListener('click', () => {
        if (!audio || !curEp) return;
        if (audio.paused) { audio.play(); el.querySelector('#pcPlay').textContent = '⏸'; }
        else { audio.pause(); el.querySelector('#pcPlay').textContent = '▶'; }
      });
      el.querySelector('#pcBack').addEventListener('click', () => { if (audio) audio.currentTime = Math.max(0, audio.currentTime - 15); });
      el.querySelector('#pcFwd').addEventListener('click', () => { if (audio) audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 30); });
      el.querySelector('#pcPBar').addEventListener('pointerdown', e => {
        if (!audio || !audio.duration) return;
        const r = e.currentTarget.getBoundingClientRect();
        audio.currentTime = (e.clientX - r.left) / r.width * audio.duration;
      });
    }
  },
  /* ─── TV（真实视频流） ─── */
  tv: {
    name: 'TV', icon: () => ICONS.tv(), w: 720, h: 460,
    render(el, win) {
      const CHANNELS = [
        { n: 'Big Buck Bunny', u: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4', d: '开源电影 · 10 分钟' },
        { n: 'Sintel', u: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4', d: '开源电影 · 15 分钟' },
        { n: 'Tears of Steel', u: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4', d: '开源科幻短片' },
        { n: 'Elephants Dream', u: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4', d: '第一部开源电影' },
      ];
      el.innerHTML = `<div class="tv-app">
        <div class="tv-main">
          <video id="tvVideo" controls playsinline poster="" style="width:100%;background:#000;border-radius:0"></video>
          <div class="tv-title" id="tvTitle">选择频道开始观看</div>
        </div>
        <div class="tv-side">${CHANNELS.map((c, i) => `
          <div class="tv-ch" data-i="${i}"><b>${c.n}</b><span>${c.d}</span></div>`).join('')}
        </div></div>`;
      const video = el.querySelector('#tvVideo');
      el.querySelectorAll('.tv-ch').forEach(ch => ch.addEventListener('click', () => {
        el.querySelectorAll('.tv-ch').forEach(x => x.classList.remove('sel'));
        ch.classList.add('sel');
        const c = CHANNELS[+ch.dataset.i];
        video.src = c.u;
        video.play().catch(() => {});
        el.querySelector('#tvTitle').textContent = c.n;
        notify('TV', `正在播放「${c.n}」`);
      }));
      if (win) win._cleanup = () => { try { video.pause(); video.src = ''; } catch (e) {} };
    }
  },

  /* ─── 文本编辑 ─── */
  /* ─── 文本编辑（真·文件编辑：可打开/编辑/保存） ─── */
  textedit: {
    name: '文本编辑', icon: () => ICONS.textedit(), w: 560, h: 420,
    render(el, win, arg) {
      let file = arg && arg.file || null;
      el.innerHTML = `<div style="flex:1;display:flex;flex-direction:column">
        <div class="te-bar">
          <span class="te-file" id="teFile">${file || '未命名'}</span>
          <span style="flex:1"></span>
          <span class="pill-btn" id="teOpen">打开…</span>
          <span class="pill-btn" id="teSaveAs">另存为</span>
          <span class="pill-btn on" id="teSave">保存</span>
        </div>
        <textarea class="te-area" id="teArea" placeholder="随手写点什么…" spellcheck="false"></textarea></div>`;
      const ta = el.querySelector('#teArea');
      const fileEl = el.querySelector('#teFile');
      ta.value = file ? (FILE_CONTENTS[file] || '') : (localStorage.getItem('mac_textedit') || '');
      const isText = n => /\.(txt|md|markdown|js|css|html|json|csv|log|xml|sh|py)$/i.test(n) || (FILE_CONTENTS[n] != null && typeof FILE_CONTENTS[n] === 'string' && !FILE_CONTENTS[n].startsWith('@idb:'));
      function save() {
        if (file) {
          FILE_CONTENTS[file] = ta.value;
          saveFiles();
          notify('文本编辑', `「${file}」已存储`);
        } else {
          localStorage.setItem('mac_textedit', ta.value);
          notify('文本编辑', '草稿已存储（未关联文件，可另存为）');
        }
      }
      el.querySelector('#teSave').addEventListener('click', save);
      el.querySelector('#teSaveAs').addEventListener('click', () => {
        const name = prompt('存储为文件名：', file || '未命名.txt');
        if (!name) return;
        file = name;
        FILE_CONTENTS[file] = ta.value;
        const doc = VFS['文稿'] ? VFS['文稿'].children : null;
        if (doc && !doc.includes(file)) doc.push(file);
        saveFiles(); saveVFS();
        fileEl.textContent = file;
        notify('文本编辑', `已存储到 文稿/${file}`);
      });
      el.querySelector('#teOpen').addEventListener('click', () => {
        const texts = [];
        Object.keys(FILE_CONTENTS).forEach(n => { if (isText(n)) texts.push(n); });
        if (!texts.length) return notify('文本编辑', '没有可编辑的文本文件');
        const ctx = $('#ctxMenu');
        ctx.innerHTML = texts.slice(0, 12).map(n => `<div class="ctx-item" data-n="${n}">${n}</div>`).join('');
        const r = el.getBoundingClientRect();
        ctx.style.left = (r.left + 90) + 'px';
        ctx.style.top = (r.top + 60) + 'px';
        ctx.classList.remove('hidden');
        ctx.querySelectorAll('.ctx-item').forEach(it => it.addEventListener('pointerdown', ev => {
          ev.stopPropagation();
          ctx.classList.add('hidden');
          file = it.dataset.n;
          ta.value = FILE_CONTENTS[file] || '';
          fileEl.textContent = file;
        }));
      });
      /* ⌘S 保存 */
      el.addEventListener('keydown', e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); save(); }
      });
      ta.addEventListener('input', () => { if (!file) localStorage.setItem('mac_textedit', ta.value); });
    }
  },

  /* ─── 时钟 ─── */
  clock: {
    name: '时钟', icon: () => ICONS.clock(), w: 560, h: 420,
    render(el) {
      el.innerHTML = `<div class="ck">
        <div class="ck-tabs">${['世界时钟', '闹钟', '秒表', '计时器'].map((t, i) =>
          `<div class="ck-tab ${i === 0 ? 'sel' : ''}" data-t="${i}">${t}</div>`).join('')}</div>
        <div class="ck-body" id="ckBody"></div></div>`;
      const body = el.querySelector('#ckBody');
      const cities = [['北京', 'Asia/Shanghai'], ['东京', 'Asia/Tokyo'], ['伦敦', 'Europe/London'], ['纽约', 'America/New_York'], ['悉尼', 'Australia/Sydney']];
      let swT = 0, swRun = false, swIv = null, tmLeft = 0, tmIv = null;
      function world() {
        body.innerHTML = cities.map(c => {
          const t = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: c[1] }).format(new Date());
          const day = new Intl.DateTimeFormat('zh-CN', { weekday: 'short', timeZone: c[1] }).format(new Date());
          return `<div class="ck-row"><div><div class="ck-city">${c[0]}</div><div class="ck-sub">${day}</div></div><div class="ck-time">${t}</div></div>`;
        }).join('');
      }
      function stopwatch() {
        const fmt = t => `${String(Math.floor(t / 6000)).padStart(2, '0')}:${String(Math.floor(t / 100) % 60).padStart(2, '0')}.${String(t % 100).padStart(2, '0')}`;
        body.innerHTML = `<div class="ck-sw">${fmt(swT)}</div>
          <div class="ck-btns"><span class="ck-btn" id="swReset">复位</span><span class="ck-btn pri" id="swGo">${swRun ? '停止' : '启动'}</span></div>`;
        body.querySelector('#swGo').addEventListener('click', () => {
          swRun = !swRun;
          if (swRun) swIv = setInterval(() => { swT++; const s = body.querySelector('.ck-sw'); if (!document.contains(s)) return clearInterval(swIv); s.textContent = fmt(swT); }, 10);
          else clearInterval(swIv);
          stopwatch();
        });
        body.querySelector('#swReset').addEventListener('click', () => { swRun = false; clearInterval(swIv); swT = 0; stopwatch(); });
      }
      function timerP() {
        const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
        body.innerHTML = `<div class="ck-sw">${fmt(tmLeft)}</div>
          <div class="ck-chips">${[1, 5, 10, 20].map(m => `<span class="ck-chip" data-m="${m * 60}">${m} 分钟</span>`).join('')}</div>
          <div class="ck-btns"><span class="ck-btn" id="tmStop">取消</span></div>`;
        body.querySelectorAll('.ck-chip').forEach(c => c.addEventListener('click', () => {
          clearInterval(tmIv); tmLeft = +c.dataset.m; timerP();
          tmIv = setInterval(() => {
            if (!document.contains(body)) return clearInterval(tmIv);
            tmLeft--;
            const s = body.querySelector('.ck-sw'); if (s) s.textContent = fmt(tmLeft);
            if (tmLeft <= 0) { clearInterval(tmIv); notify('计时器', '⏰ 时间到！'); timerP(); }
          }, 1000);
        }));
        body.querySelector('#tmStop').addEventListener('click', () => { clearInterval(tmIv); tmLeft = 0; timerP(); });
      }
      function alarm() {
        const alarms = [['07:30', '起床', true], ['09:00', '晨会', false], ['13:00', '午休', false], ['22:30', '睡觉', true]];
        body.innerHTML = alarms.map(a =>
          `<div class="ck-row"><div><div class="ck-time" style="font-size:32px">${a[0]}</div>
          <div class="ck-sub">${a[1]}</div></div><div class="toggle ${a[2] ? 'on' : ''}"></div></div>`).join('');
        body.querySelectorAll('.toggle').forEach(t => t.addEventListener('click', () => {
          t.classList.toggle('on');
          if (t.classList.contains('on')) notify('时钟', '闹钟已打开 ⏰');
        }));
      }
      const pages = [world, alarm, stopwatch, timerP];
      el.querySelectorAll('.ck-tab').forEach(t => t.addEventListener('click', () => {
        el.querySelectorAll('.ck-tab').forEach(x => x.classList.remove('sel'));
        t.classList.add('sel'); pages[+t.dataset.t]();
      }));
      world();
      const wIv = setInterval(() => {
        if (!document.contains(body)) return clearInterval(wIv);
        if (el.querySelector('.ck-tab.sel').dataset.t === '0') world();
      }, 10000);
    }
  },

  /* ─── 天气（macOS 原生风 + 城市搜索 + 完整详情） ─── */
  weather: {
    name: '天气', icon: () => ICONS.weather(), w: 780, h: 580,
    render(el) {
      let cities = JSON.parse(localStorage.getItem('mac_wx_cities') || 'null') || [];
      let cur = null;   /* null = 我的位置 */
      const saveCities = () => localStorage.setItem('mac_wx_cities', JSON.stringify(cities));

      el.innerHTML = `<div class="wx2">
        <div class="wx2-side">
          <div class="wx2-search"><input id="wxSearch" placeholder="搜索城市"></div>
          <div class="wx2-list" id="wxList"></div>
        </div>
        <div class="wx2-main" id="wxMain"></div>
      </div>`;
      const listEl = el.querySelector('#wxList'), main = el.querySelector('#wxMain');

      function drawList() {
        listEl.innerHTML = `<div class="wx2-city ${cur === null ? 'sel' : ''}" data-i="-1">📍 我的位置</div>` +
          cities.map((c, i) => `<div class="wx2-city ${cur === i ? 'sel' : ''}" data-i="${i}">
            ${c.name}<span class="wx2-del" data-del="${i}">✕</span></div>`).join('');
        listEl.querySelectorAll('.wx2-city').forEach(c => c.addEventListener('click', e => {
          if (e.target.classList.contains('wx2-del')) return;
          const i = +c.dataset.i;
          cur = i < 0 ? null : i;
          drawList(); loadMain();
        }));
        listEl.querySelectorAll('.wx2-del').forEach(d => d.addEventListener('click', () => {
          cities.splice(+d.dataset.del, 1);
          saveCities(); cur = null; drawList(); loadMain();
        }));
      }
      /* 城市搜索：Open-Meteo 地理编码（免费） */
      el.querySelector('#wxSearch').addEventListener('keydown', async e => {
        if (e.key !== 'Enter') return;
        const q = e.target.value.trim();
        if (!q) return;
        const r = await fetchJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=zh&format=json`, 8000);
        if (!r || !r.results || !r.results.length) return notify('天气', '未找到该城市');
        const g = r.results[0];
        cities.push({ name: g.name + (g.admin1 ? ' · ' + g.admin1 : ''), lat: g.latitude, lon: g.longitude });
        saveCities();
        e.target.value = '';
        cur = cities.length - 1;
        drawList(); loadMain();
        notify('天气', `已添加 ${g.name}`);
      });

      async function loadMain() {
        main.innerHTML = `<div class="sf-loading" style="padding-top:90px"><div class="sf-spinner"></div>载入中…</div>`;
        let name = '我的位置', lat, lon;
        if (cur === null) {
          const l = await locate();
          name = l.city; lat = l.lat; lon = l.lon;
        } else { name = cities[cur].name; lat = cities[cur].lat; lon = cities[cur].lon; }
        const w = await fetchWeather(lat, lon);
        if (!w) {
          main.innerHTML = `<div class="sf-err" style="padding-top:80px">⚠️ 无法获取天气<br>
            <span style="font-size:13px;color:#999;font-weight:400">检查网络后点城市重试</span></div>`;
          return;
        }
        /* 按天气代码选主题渐变 */
        const code = w.cur.code;
        const theme = code === 0 ? ['#FF9F0A', '#FF6B00'] : code <= 2 ? ['#5BA4E6', '#1668C7'] :
          code <= 49 ? ['#8E9EAB', '#5D6D7E'] : ['#4A5A6A', '#2C3E50'];
        main.innerHTML = `<div class="wx2-hero" style="background:linear-gradient(160deg,${theme[0]},${theme[1]})">
          <div class="wx2-city-n">${name}</div>
          <div class="wx2-temp">${w.cur.temp}°</div>
          <div class="wx2-cond">${w.cur.icon} ${w.cur.cond}</div>
          <div class="wx2-hl">最高 ${w.days[0].hi}° 最低 ${w.days[0].lo}°</div></div>
        <div class="wx2-scroll">
          <div class="wx2-card"><div class="wx2-ct">逐小时</div>
            <div class="wx2-hours">${w.hours.map(h => `<div class="wx2-h"><div>${h.t}</div>
              <div style="font-size:19px">${h.ic}</div><div>${h.temp}°</div></div>`).join('')}</div></div>
          <div class="wx2-card"><div class="wx2-ct">7 日预报</div>
            ${w.days.map(d => `<div class="wx2-d"><span>${d.d}</span><span style="font-size:15px">${d.ic}</span>
              <span class="wx2-lo">${d.lo}°</span>
              <span class="wx2-range"><span class="wx2-fill" style="left:${(d.lo + 15) * 2.2}%;width:${(d.hi - d.lo) * 2.2}%"></span></span>
              <span>${d.hi}°</span></div>`).join('')}</div>
          <div class="wx2-cards">
            <div class="wx2-c"><div class="wx2-ct">🌡 体感</div><div class="wx2-cv">${w.cur.feels}°</div></div>
            <div class="wx2-c"><div class="wx2-ct">💧 湿度</div><div class="wx2-cv">${w.cur.hum}%</div></div>
            <div class="wx2-c"><div class="wx2-ct">💨 风速</div><div class="wx2-cv">${w.cur.wind}<span style="font-size:11px"> km/h</span></div></div>
            <div class="wx2-c"><div class="wx2-ct">🧭 气压</div><div class="wx2-cv">${w.cur.press}<span style="font-size:11px"> hPa</span></div></div>
            <div class="wx2-c"><div class="wx2-ct">🌅 日出</div><div class="wx2-cv">${w.days[0].rise}</div></div>
            <div class="wx2-c"><div class="wx2-ct">🌇 日落</div><div class="wx2-cv">${w.days[0].set}</div></div>
          </div></div>`;
      }
      drawList();
      loadMain();
    }
  },
  /* ─── 活动监视器（浅色 macOS 原生风格） ─── */
  activity: {
    name: '活动监视器', icon: () => ICONS.activity(), w: 620, h: 440,
    render(el) {
      const procs = ['kernel_task', 'WindowServer', 'Safari', '访达', '音乐', 'terminald', 'mds_stores', 'cfprefsd', 'dock', 'spotlightd'].map(n => ({ n, cpu: Math.random() * 8 }));
      el.innerHTML = `<div class="am">
        <div class="am-head"><span>进程名称</span><span>% CPU</span></div>
        <div class="am-table" id="amTable"></div>
        <div class="am-graph-wrap"><div class="am-label">CPU 负载</div><canvas id="amCanvas" width="560" height="70"></canvas></div></div>`;
      const cv = el.querySelector('#amCanvas'), ctx = cv.getContext('2d');
      const histArr = new Array(70).fill(8);
      const table = el.querySelector('#amTable');
      function draw() {
        const total = procs.reduce((s, p) => s + p.cpu, 0);
        histArr.push(total); histArr.shift();
        table.innerHTML = procs.slice().sort((a, b) => b.cpu - a.cpu).map(p =>
          `<div class="am-row"><span>${p.n}</span><span>${p.cpu.toFixed(1)}</span></div>`).join('');
        ctx.clearRect(0, 0, 560, 70);
        ctx.fillStyle = '#f5f5f7'; ctx.fillRect(0, 0, 560, 70);
        ctx.strokeStyle = '#d5d5da'; ctx.lineWidth = 1;
        for (let y = 0; y < 70; y += 17) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(560, y); ctx.stroke(); }
        ctx.strokeStyle = '#28c840'; ctx.lineWidth = 1.8; ctx.beginPath();
        histArr.forEach((v, i) => { const y = 68 - Math.min(v, 40) / 40 * 64; i ? ctx.lineTo(i * 8, y) : ctx.moveTo(0, y); });
        ctx.stroke();
        procs.forEach(p => p.cpu = Math.max(0.1, Math.min(25, p.cpu + (Math.random() - 0.5) * 3)));
      }
      draw();
      const iv = setInterval(() => { if (!document.contains(cv)) return clearInterval(iv); draw(); }, 1000);
    }
  },

  /* ─── Photo Booth（真实摄像头 + 前后切换） ─── */
  photobooth: {
    name: 'Photo Booth', icon: () => ICONS.photobooth(), w: 640, h: 540,
    render(el, win) {
      el.innerHTML = `<div class="pb">
        <div class="pb-view"><video id="pbVideo" autoplay playsinline muted></video>
          <div class="pb-fallback" id="pbFallback" style="display:none">📷<br>无法访问摄像头<br>
          <span style="font-size:12px;opacity:.7">快门将生成模拟照片</span></div></div>
        <div class="pb-bar">
          <div class="pb-fx-row">
            <div class="pb-fx sel" data-f="none">正常</div>
            <div class="pb-fx" data-f="grayscale(1)">黑白</div>
            <div class="pb-fx" data-f="sepia(.8)">怀旧</div>
            <div class="pb-fx" data-f="hue-rotate(120deg)">迷幻</div>
            <div class="pb-fx" id="pbFlip">🔄 翻转</div>
          </div>
          <div class="pb-shutter" id="pbShutter"></div>
        </div></div>`;
      const video = el.querySelector('#pbVideo');
      let filter = 'none', facing = 'user', stream = null;
      function openCam() {
        if (stream) stream.getTracks().forEach(t => t.stop());
        navigator.mediaDevices.getUserMedia({ video: { facingMode: facing } })
          .then(st => { stream = st; video.srcObject = st; video.style.display = ''; el.querySelector('#pbFallback').style.display = 'none'; })
          .catch(() => { video.style.display = 'none'; el.querySelector('#pbFallback').style.display = 'flex'; });
      }
      el.querySelectorAll('.pb-fx[data-f]').forEach(f => f.addEventListener('click', () => {
        el.querySelectorAll('.pb-fx[data-f]').forEach(x => x.classList.remove('sel'));
        f.classList.add('sel'); filter = f.dataset.f;
        video.style.filter = filter === 'none' ? '' : filter;
      }));
      el.querySelector('#pbFlip').addEventListener('click', () => { facing = facing === 'user' ? 'environment' : 'user'; openCam(); });
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) openCam();
      else { video.style.display = 'none'; el.querySelector('#pbFallback').style.display = 'flex'; }
      if (win) win._cleanup = () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
      el.querySelector('#pbShutter').addEventListener('click', () => {
        const flash = document.createElement('div');
        flash.style.cssText = 'position:absolute;inset:0;background:#fff;z-index:5;transition:opacity .4s';
        el.querySelector('.pb-view').appendChild(flash);
        setTimeout(() => flash.style.opacity = '0', 60);
        setTimeout(() => flash.remove(), 500);
        if (stream && video.videoWidth) {
          const c = document.createElement('canvas');
          c.width = video.videoWidth; c.height = video.videoHeight;
          const cx = c.getContext('2d');
          if (filter !== 'none') cx.filter = filter;
          cx.drawImage(video, 0, 0);
          const dataUrl = c.toDataURL('image/jpeg', 0.82);
          const k = 'photo_' + Date.now();
          IDB.put(k, dataUrl);
          PHOTOS.unshift({ name: '快照', idb: k, img: dataUrl });
        } else {
          PHOTOS.unshift({ name: '快照', css: `linear-gradient(135deg,hsl(${Math.random() * 360},70%,60%),hsl(${Math.random() * 360},70%,45%))` });
        }
        notify('Photo Booth', '已存储到「照片」');
      });
    }
  },
  /* ─── 预览 ─── */
  preview: {
    name: '预览', icon: () => ICONS.preview(), w: 560, h: 460,
    render(el, win, arg) {
      arg = arg || { name: '未命名.png', css: 'linear-gradient(135deg,#a18cd1,#fbc2eb)' };
      win.querySelector('.win-title').textContent = arg.name;
      el.innerHTML = `<div class="pv">
        ${arg.img ? `<img src="${arg.img}" style="max-width:100%;max-height:100%;object-fit:contain">` : `<div class="pv-img" style="background:${arg.css}"></div>`}
      </div>`;
    }
  },

  /* ─── 语音备忘录（真录音） ─── */
  voicememo: {
    name: '语音备忘录', icon: () => ICONS.voicememo(), w: 560, h: 480,
    render(el, win) {
      const recs = JSON.parse(localStorage.getItem('mac_memos') || '[]');
      let mediaRec = null, stream = null, startTs = 0;
      el.innerHTML = `<div class="vmemo">
        <div class="vmemo-list" id="vmList"></div>
        <div class="vmemo-foot">
          <div class="vmemo-time" id="vmTime">00:00</div>
          <div class="vmemo-rec" id="vmRec"></div>
          <div style="font-size:11.5px;color:#999">点击红点开始录音</div>
        </div></div>`;
      const list = el.querySelector('#vmList');
      function saveMemos() { try { localStorage.setItem('mac_memos', JSON.stringify(recs)); } catch (e) {} }
      function fmt(s) { return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; }
      function draw() {
        list.innerHTML = recs.map((r, i) => `<div class="vmemo-item">
          <span class="vmemo-play" data-i="${i}">▶</span>
          <div><div class="vmemo-n">${r.name}</div><div class="vmemo-d">${r.dur}s · ${r.date}</div></div>
          <span class="vmemo-del" data-i="${i}">🗑</span></div>`).join('') ||
          '<div style="color:#aaa;text-align:center;padding:40px 0;font-size:13px">还没有录音</div>';
        list.querySelectorAll('.vmemo-play').forEach(b => b.addEventListener('click', async () => {
          const r = recs[+b.dataset.i];
          const data = r.key ? await IDB.get(r.key) : r.data;
          if (!data) return notify('语音备忘录', '录音数据不存在');
          const a = new Audio(data);
          a.play().catch(() => notify('语音备忘录', '播放失败'));
        }));
        list.querySelectorAll('.vmemo-del').forEach(b => b.addEventListener('click', () => {
          const r = recs[+b.dataset.i];
          if (r.key) IDB.del(r.key);
          recs.splice(+b.dataset.i, 1); saveMemos(); draw();
        }));
      }
      let tickIv = null, nativeRec = false;
      el.querySelector('#vmRec').addEventListener('click', async () => {
        /* 原生录音停止 */
        if (nativeRec) {
          nativeRec = false;
          clearInterval(tickIv);
          el.querySelector('#vmRec').classList.remove('rec');
          const b64 = AndroidBridge.micStop();
          if (b64) {
            const key = 'memo_' + Date.now();
            await IDB.put(key, 'data:audio/wav;base64,' + b64);
            recs.unshift({ name: '录音 ' + (recs.length + 1), dur: Math.round((Date.now() - startTs) / 1000), date: new Date().toLocaleDateString('zh-CN'), key });
            saveMemos(); draw();
            notify('语音备忘录', '录音已保存');
          }
          return;
        }
        if (mediaRec && mediaRec.state === 'recording') {
          mediaRec.stop();
          return;
        }
        /* 原生录音优先 */
        if (window.AndroidBridge && AndroidBridge.micStart && AndroidBridge.micStart()) {
          nativeRec = true;
          startTs = Date.now();
          el.querySelector('#vmRec').classList.add('rec');
          tickIv = setInterval(() => {
            if (!document.contains(el)) return clearInterval(tickIv);
            el.querySelector('#vmTime').textContent = fmt(Math.floor((Date.now() - startTs) / 1000));
          }, 500);
          return;
        }
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const chunks = [];
          mediaRec = new MediaRecorder(stream);
          mediaRec.ondataavailable = e => chunks.push(e.data);
          mediaRec.onstop = () => {
            stream.getTracks().forEach(t => t.stop());
            clearInterval(tickIv);
            el.querySelector('#vmRec').classList.remove('rec');
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const rd = new FileReader();
            rd.onload = async () => {
              const key = 'memo_' + Date.now();
              await IDB.put(key, rd.result);   /* 音频数据存 IndexedDB */
              recs.unshift({ name: '录音 ' + (recs.length + 1), dur: Math.round((Date.now() - startTs) / 1000), date: new Date().toLocaleDateString('zh-CN'), key });
              saveMemos(); draw();
              notify('语音备忘录', '录音已保存');
            };
            rd.readAsDataURL(blob);
          };
          startTs = Date.now();
          mediaRec.start();
          el.querySelector('#vmRec').classList.add('rec');
          tickIv = setInterval(() => {
            if (!document.contains(el)) return clearInterval(tickIv);
            el.querySelector('#vmTime').textContent = fmt(Math.floor((Date.now() - startTs) / 1000));
          }, 500);
        } catch (err) {
          notify('语音备忘录', '无法访问麦克风');
          if (window.AndroidBridge && AndroidBridge.hasPermission && !AndroidBridge.hasPermission('RECORD_AUDIO')) {
            notify('语音备忘录', '没有麦克风权限，点我去开启');
            setTimeout(() => {
              const b = document.querySelector('#banners .banner');
              if (b) b.addEventListener('pointerdown', () => {
                AndroidBridge.requestPerms();
                setTimeout(() => { if (!AndroidBridge.hasPermission('RECORD_AUDIO')) AndroidBridge.openAppSettings(); }, 1500);
              });
            }, 100);
          }
        }
      });
      if (win) win._cleanup = () => { if (stream) stream.getTracks().forEach(t => t.stop()); clearInterval(tickIv); };
      draw();
    }
  },

  /* ─── 隔空投送（显示真实蓝牙设备） ─── */
  airdrop: {
    name: '隔空投送', icon: () => '<img src="icons/airdrop.png" draggable="false">', w: 420, h: 340,
    render(el) {
      el.innerHTML = `<div class="ad">
        <div class="ad-radar"><div class="ad-ring"></div><div class="ad-ring r2"></div><div class="ad-ring r3"></div>
          <img src="icons/airdrop.png" class="ad-me"></div>
        <div class="ad-devices" id="adDevs"></div>
        <div class="ad-hint" id="adHint">正在搜索附近的设备…</div></div>`;
      const box = el.querySelector('#adDevs');
      /* 读真实已配对蓝牙设备 */
      let realDevs = [];
      try {
        if (window.AndroidBridge && AndroidBridge.getBtInfo) {
          const b = JSON.parse(AndroidBridge.getBtInfo());
          if (b && b.devices) realDevs = b.devices;
        }
      } catch (e) {}
      if (realDevs.length) {
        el.querySelector('#adHint').textContent = `发现 ${realDevs.length} 个已配对设备`;
        realDevs.forEach((d, i) => setTimeout(() => {
          if (!document.contains(box)) return;
          box.insertAdjacentHTML('beforeend', `<div class="ad-dev" style="animation-delay:0s">
            <div class="ad-av">🎧</div><div class="ad-name">${d}</div></div>`);
          box.lastElementChild.addEventListener('click', () => notify('隔空投送', `「${d}」是蓝牙设备，传输需要 Apple 设备`));
        }, 500 + i * 450));
      } else {
        el.querySelector('#adHint').textContent = '没有发现设备（可在系统蓝牙中先配对）';
      }
    }
  },

  /* ─── 便笺 ─── */
  stickies: {
    name: '便笺', icon: () => ICONS.stickies(), w: 300, h: 270,
    render(el) {
      el.innerHTML = `<textarea class="stk" placeholder="随手记…"></textarea>`;
      const ta = el.querySelector('.stk');
      ta.value = localStorage.getItem('mac_sticky') || '';
      ta.addEventListener('input', () => localStorage.setItem('mac_sticky', ta.value));
    }
  },

  /* ─── 词典 ─── */
  trash: {
    name: '废纸篓', icon: () => ICONS.trash(), w: 560, h: 380,
    render(el) {
      function draw() {
        el.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;background:inherit">
          <div class="fs-toolbar"><b>废纸篓</b><span style="color:#888;font-size:12px;margin-left:8px">${TRASH.length} 个项目</span><span style="flex:1"></span>
          ${TRASH.length ? '<span class="fs-empty-btn" id="trEmpty">清空</span>' : ''}</div>
          <div class="fs-main" style="flex:1">${TRASH.map((t, i) =>
            `<div class="fs-file"><div class="ff-ico">${fileIcon(t.n)}</div><span>${t.n}</span>
            <span class="fs-putback" data-i="${i}">放回原处</span></div>`).join('') ||
            '<div class="fs-empty">废纸篓是空的</div>'}</div></div>`;
        const b = el.querySelector('#trEmpty');
        if (b) b.addEventListener('click', () => {
          TRASH.length = 0; saveTrash();
          notify('废纸篓', '废纸篓已清空');
          refreshDockTrash(); draw();
        });
        el.querySelectorAll('.fs-putback').forEach(b => b.addEventListener('click', () => {
          const t = TRASH[+b.dataset.i];
          TRASH.splice(+b.dataset.i, 1);
          if (t.dir) VFS[t.n] = VFS[t.n] || { children: [] };
          if (t.c !== null) FILE_CONTENTS[t.n] = t.c;
          (VFS['文稿'] ? VFS['文稿'].children : VFS['Macintosh HD'].children).push(t.n);
          saveTrash(); saveVFS(); saveFiles();
          notify('废纸篓', `「${t.n}」已放回文稿`);
          refreshDockTrash(); draw();
        }));
      }
      draw();
    }
  },

  /* ─── 词典（dictionaryapi.dev 英文 + LongCat 中文） ─── */
  dictionary: {
    name: '词典', icon: () => ICONS.dictionary(), w: 560, h: 440,
    render(el) {
      el.innerHTML = `<div class="dict-app">
        <div class="dict-bar"><input id="dictIn" placeholder="输入单词或词语…" autocomplete="off"></div>
        <div class="dict-body" id="dictBody"><div class="fs-empty" style="padding-top:80px">查个词试试<br><span style="font-size:12px;color:#999">英文走词典 API · 中文走 AI 释义</span></div></div></div>`;
      const body = el.querySelector('#dictBody');
      async function lookup(word) {
        if (!word.trim()) return;
        body.innerHTML = '<div class="sf-loading" style="padding-top:60px"><div class="sf-spinner"></div>查询中…</div>';
        const isCN = /[一-鿿]/.test(word);
        if (!isCN) {
          const d = await fetchJSON(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`, 10000);
          if (d && d[0]) {
            const e = d[0];
            const ph = (e.phonetics.find(p => p.text) || {}).text || '';
            body.innerHTML = `<div class="dict-word">${e.word}</div><div class="dict-ph">${ph}</div>` +
              e.meanings.map(m => `<div class="dict-pos">${m.partOfSpeech}</div>` +
                m.definitions.slice(0, 3).map((df, i) =>
                  `<div class="dict-def"><b>${i + 1}.</b> ${df.definition}${df.example ? `<div class="dict-ex">"${df.example}"</div>` : ''}</div>`).join('')).join('');
            return;
          }
          body.innerHTML = '<div class="fs-empty" style="padding-top:60px">未找到该单词</div>';
          return;
        }
        /* 中文词语 → AI 释义 */
        const r = await aiChat(`请用词典格式解释中文词语「${word}」：拼音（如有）、词性、释义（分条）、一个例句。排版紧凑。`);
        body.innerHTML = r
          ? `<div class="dict-word">${word}</div><div class="dict-def" style="white-space:pre-wrap">${r.replace(/\[.*?\]/g, '')}</div>`
          : '<div class="fs-empty" style="padding-top:60px">查询失败，检查网络</div>';
      }
      el.querySelector('#dictIn').addEventListener('keydown', e => { if (e.key === 'Enter') lookup(e.target.value); });
    }
  },

  /* ─── 强制退出 ─── */
  forcequit: {
    name: '强制退出应用程序', icon: () => ICONS.settings(), w: 380, h: 330, noResize: true,
    render(el, win) {
      function draw() {
        const running = Object.keys(winByApp).filter(id => id !== 'forcequit' && document.getElementById(winByApp[id]));
        el.innerHTML = `<div class="fq">
          <div class="fq-list">
            <div class="fq-row" data-id=""><span>访达</span></div>
            ${running.map(id => `<div class="fq-row" data-id="${id}"><span>${APPS[id].name}</span></div>`).join('')}
          </div>
          <div class="fq-foot"><span class="fq-btn pri" id="fqGo">强制退出</span></div></div>`;
        let selId = null;
        el.querySelectorAll('.fq-row').forEach(r => r.addEventListener('click', () => {
          el.querySelectorAll('.fq-row').forEach(x => x.classList.remove('sel'));
          r.classList.add('sel'); selId = r.dataset.id;
        }));
        el.querySelector('#fqGo').addEventListener('click', () => {
          if (selId === '') return notify('强制退出', '「访达」不能强制退出（会自动重新打开）');
          if (selId) { closeWindow(selId); notify('强制退出', '已强制退出'); draw(); }
        });
      }
      draw();
    }
  },

  /* ─── 关于本机（真实设备信息：GPU/存储/网络/Android 版本） ─── */
  about: {
    name: '关于本机', icon: () => ICONS.settings(), w: 340, h: 560, noResize: true,
    render(el) {
      const sw = screen.width, sh = screen.height;
      const dpr = window.devicePixelRatio || 1;
      const short = Math.min(sw, sh);
      const devType = short < 600 ? '手机' : short < 1024 ? '平板' : '桌面';
      const diag = (Math.sqrt(sw * sw + sh * sh) / 160 / dpr).toFixed(1);
      const ua = navigator.userAgent;
      const model = (ua.match(/\(([^)]+)\)/) || ['', '未知设备'])[1].split(';')[1] || 'Android 设备';
      const andVer = (ua.match(/Android ([\d.]+)/) || [])[1] || '未知';
      /* 真实 GPU */
      let gpu = '未知';
      try {
        const gl = document.createElement('canvas').getContext('webgl');
        const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
        if (ext) gpu = gl.getParameter(ext.UNMASKED_RENDERER_WEBGL).replace(/ANGLE \((.*)\)/, '$1').split(',')[0];
      } catch (e) {}
      el.innerHTML = `<div class="about">
        ${ICONS.apple(document.body.classList.contains('dark') ? '#ececee' : '#333').replace('<svg', '<svg width="70" height="86"')}
        <h1>MacBook Air <span style="font-size:13px;color:#888">（${devType}模拟）</span></h1>
        <div class="ab-sub">macOS Sequoia 15.2 · 演示版</div>
        <div class="ab-grid">
          <b>设备型号</b><span>${model.trim()}</span>
          <b>系统底层</b><span>Android ${andVer} · WebView</span>
          <b>显示屏</b><span>${sw} × ${sh} · ${diag}" · ${dpr}x</span>
          <b>虚拟分辨率</b><span>${stageW} × ${stageH}</span>
          <b>处理器</b><span>${navigator.hardwareConcurrency || 8} 核</span>
          <b>GPU</b><span id="abGpu">${gpu}</span>
          <b>内存</b><span>${navigator.deviceMemory ? navigator.deviceMemory + ' GB' : '未知'}</span>
          <b>储存空间</b><span id="abStor">检测中…</span>
          <b>网络</b><span>${navigator.onLine ? (navigator.connection ? navigator.connection.effectiveType.toUpperCase() : '在线') : '离线'}</span>
          <b>触控点</b><span>${navigator.maxTouchPoints || 0} 点</span>
        </div>
        <div class="ab-btns"><span class="ab-btn" id="abUpdate">软件更新…</span></div>
        <div style="font-size:11px;color:#aaa;margin-top:14px">HTML/CSS/JS 还原 · 仅供学习演示</div></div>`;
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then(s => {
          const el2 = el.querySelector('#abStor');
          if (el2) el2.textContent = s.quota ? `${(s.quota / 1e9).toFixed(0)} GB（已用 ${(s.usage / 1e6).toFixed(0)} MB）` : '未知';
        }).catch(() => {});
      } else el.querySelector('#abStor').textContent = '未知';
      el.querySelector('#abUpdate').addEventListener('click', () => notify('软件更新', 'macOS 已是最新版本 ✓'));
    }
  },










};

/* Dock 中的应用顺序 */
const DOCK_APPS = ['finder', 'launchpad', 'safari', 'mail', 'maps', 'photos', 'messages', 'facetime', 'music', 'podcast', 'tv', 'appstore', 'settings', 'terminal', 'calculator', 'notes', 'reminders', 'calendar', 'SEP', 'trash'];
/* 启动台 */
const LAUNCHPAD_APPS = ['safari', 'voicememo', 'mail', 'maps', 'photos', 'messages', 'facetime', 'music', 'podcast', 'tv', 'appstore', 'settings', 'terminal', 'calculator', 'notes', 'reminders', 'calendar', 'clock', 'weather', 'activity', 'photobooth', 'textedit', 'stickies', 'dictionary', 'finder'];

/* 墙纸库（正版 macOS 壁纸，搬运自 macos-web） */
const WALLPAPERS = [
  { name: 'Ventura', img: 'wall/ventura.jpg', thumb: 'wall/ventura_t.jpg' },
  { name: 'Monterey', img: 'wall/monterey.jpg', thumb: 'wall/monterey_t.jpg' },
  { name: 'Big Sur', img: 'wall/bigsur.jpg', thumb: 'wall/bigsur_t.jpg' },
  { name: 'Catalina', img: 'wall/catalina.jpg', thumb: 'wall/catalina_t.jpg' },
  { name: 'Lake', img: 'wall/lake.jpg', thumb: 'wall/lake_t.jpg' },
  { name: 'Desert', img: 'wall/desert.jpg', thumb: 'wall/desert_t.jpg' },
  { name: 'Solar', img: 'wall/solar.jpg', thumb: 'wall/solar_t.jpg' },
  { name: 'Mojave', img: 'wall/mojave.jpg', thumb: 'wall/mojave_t.jpg' },
];

/* ═══════════ 可安装应用（App Store 生态） ═══════════ */
const STORE_APPS = [
  { id: 'g2048', name: '2048', cat: '游戏', icon: '🔢', bg: '#edc22e', desc: '滑动合成 2048', playable: true },
  { id: 'snake', name: '贪吃蛇', cat: '游戏', icon: '🐍', bg: '#30d158', desc: '经典贪吃蛇', playable: true },
  { id: 'mines', name: '扫雷', cat: '游戏', icon: '💣', bg: '#ff6482', desc: '9×9 经典扫雷', playable: true },
  { id: 'rain', name: '白噪音', cat: '生活', icon: '🌧️', bg: '#0a84ff', desc: '雨声专注助眠', playable: true },
  { id: 'compass', name: '指南针', cat: '工具', icon: '🧭', bg: '#5e5ce6', desc: '指明方向（演示）' },
  { id: 'pomodoro', name: '番茄钟', cat: '效率', icon: '🍅', bg: '#ff453a', desc: '25 分钟专注法', playable: true },
  { id: 'tetris', name: '俄罗斯方块', cat: '游戏', icon: '🧱', bg: '#5e5ce6', desc: '经典方块消除', playable: true },
  { id: 'tictactoe', name: '井字棋', cat: '游戏', icon: '⭕', bg: '#ff9f0a', desc: '挑战不败 AI', playable: true },
  { id: 'memory', name: '记忆翻牌', cat: '游戏', icon: '🃏', bg: '#30b0c7', desc: '考验记忆力', playable: true },
  { id: 'paint', name: '画板', cat: '创作', icon: '🎨', bg: '#ff375f', desc: '随手涂鸦创作', playable: true },
  { id: 'translate', name: '翻译', cat: '工具', icon: '🌐', bg: '#0a84ff', desc: '多语言互译', playable: true },
  { id: 'qrcode', name: '二维码', cat: '工具', icon: '▦', bg: '#8e8e93', desc: '文字网址转二维码', playable: true },
  { id: 'poem', name: '每日诗词', cat: '生活', icon: '📜', bg: '#a2845e', desc: '今日诗词一首', playable: true },
  { id: 'metronome', name: '节拍器', cat: '音乐', icon: '🎼', bg: '#af52de', desc: '练习节拍好帮手', playable: true },
  { id: 'coin', name: '抛硬币', cat: '生活', icon: '🪙', bg: '#ffd60a', desc: '选择困难救星', playable: true },
  { id: 'jokes', name: '冷笑话', cat: '娱乐', icon: '😄', bg: '#64d2ff', desc: 'AI 生成冷笑话', playable: true },
];

/* ── 2048 ── */
function render2048(el) {
  let g, score;
  const COLORS = { 2: '#eee4da', 4: '#ede0c8', 8: '#f2b179', 16: '#f59563', 32: '#f67c5f', 64: '#f65e3b', 128: '#edcf72', 256: '#edcc61', 512: '#edc850', 1024: '#edc53f', 2048: '#edc22e' };
  el.innerHTML = `<div class="g2048"><div class="g2-head"><b>2048</b><span>得分 <b id="g2Score">0</b></span>
    <span class="pill-btn on" id="g2New">新游戏</span></div>
    <div class="g2-board" id="g2Board"></div>
    <div class="g2-hint">滑动屏幕或使用方向键</div></div>`;
  const board = el.querySelector('#g2Board');
  function reset() { g = Array(16).fill(0); score = 0; add(); add(); draw(); }
  function add() {
    const empty = g.map((v, i) => v ? null : i).filter(v => v !== null);
    if (!empty.length) return;
    g[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4;
  }
  function draw() {
    el.querySelector('#g2Score').textContent = score;
    board.innerHTML = g.map(v => `<div class="g2-cell" style="background:${v ? COLORS[v] || '#3c3a32' : 'rgba(0,0,0,.08)'};
      color:${v && v <= 4 ? '#776e65' : '#fff'}">${v || ''}</div>`).join('');
  }
  function slide(row) {
    let arr = row.filter(v => v), gained = 0;
    for (let i = 0; i < arr.length - 1; i++) if (arr[i] === arr[i + 1]) { arr[i] *= 2; gained += arr[i]; arr.splice(i + 1, 1); }
    while (arr.length < 4) arr.push(0);
    return [arr, gained];
  }
  function move(dir) {  /* 0左 1右 2上 3下 */
    const old = g.join();
    let totalGain = 0;
    for (let i = 0; i < 4; i++) {
      let line = [];
      for (let j = 0; j < 4; j++) line.push(dir < 2 ? g[i * 4 + j] : g[j * 4 + i]);
      if (dir === 1 || dir === 3) line.reverse();
      const [merged, gained] = slide(line);
      totalGain += gained;
      if (dir === 1 || dir === 3) merged.reverse();
      for (let j = 0; j < 4; j++) { if (dir < 2) g[i * 4 + j] = merged[j]; else g[j * 4 + i] = merged[j]; }
    }
    score += totalGain;
    if (g.join() !== old) { add(); draw(); }
    if (g.every(v => v)) notify('2048', `游戏结束！得分 ${score}`);
    if (g.includes(2048)) notify('2048', '🎉 合成 2048！');
  }
  let sx, sy;
  board.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  board.addEventListener('pointerup', e => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 0) : (dy > 0 ? 3 : 2));
  });
  const keyH = e => {
    if (!document.contains(board)) return window.removeEventListener('keydown', keyH);
    const map = { ArrowLeft: 0, ArrowRight: 1, ArrowUp: 2, ArrowDown: 3 };
    if (map[e.key] !== undefined) { e.preventDefault(); move(map[e.key]); }
  };
  window.addEventListener('keydown', keyH);
  el.querySelector('#g2New').addEventListener('click', reset);
  reset();
}

/* ── 贪吃蛇 ── */
function renderSnake(el) {
  el.innerHTML = `<div class="gsnake"><div class="g2-head"><b>贪吃蛇</b><span>得分 <b id="gsScore">0</b></span>
    <span class="pill-btn on" id="gsNew">重新开始</span></div>
    <canvas id="gsCv" width="288" height="288"></canvas>
    <div class="gs-pad"><span data-d="2">↑</span><div><span data-d="0">←</span><span data-d="3">↓</span><span data-d="1">→</span></div></div></div>`;
  const cv = el.querySelector('#gsCv'), ctx = cv.getContext('2d');
  const N = 16, C = 18;
  let snake, dir, food, score, iv;
  function reset() {
    snake = [[8, 8]]; dir = 1; score = 0; place();
    clearInterval(iv);
    iv = setInterval(tick, 140);
  }
  function place() { food = [Math.floor(Math.random() * N), Math.floor(Math.random() * N)]; }
  function tick() {
    if (!document.contains(cv)) return clearInterval(iv);
    let [hx, hy] = snake[0];
    const D = [[-1, 0], [1, 0], [0, -1], [0, 1]][dir];
    hx += D[0]; hy += D[1];
    if (hx < 0 || hy < 0 || hx >= N || hy >= N || snake.some(s => s[0] === hx && s[1] === hy)) {
      notify('贪吃蛇', `游戏结束！得分 ${score}`);
      return reset();
    }
    snake.unshift([hx, hy]);
    if (hx === food[0] && hy === food[1]) { score += 10; place(); } else snake.pop();
    el.querySelector('#gsScore').textContent = score;
    ctx.fillStyle = document.body.classList.contains('dark') ? '#1c1c1e' : '#f5f5f7';
    ctx.fillRect(0, 0, 288, 288);
    ctx.fillStyle = '#ff453a';
    ctx.fillRect(food[0] * C + 2, food[1] * C + 2, C - 4, C - 4);
    snake.forEach((s, i) => {
      ctx.fillStyle = i ? '#30d158' : '#28a745';
      ctx.fillRect(s[0] * C + 1, s[1] * C + 1, C - 2, C - 2);
    });
  }
  el.querySelectorAll('.gs-pad span').forEach(b => b.addEventListener('pointerdown', () => {
    const d = +b.dataset.d;
    if ((dir + d) % 2 !== 0 || dir === d) dir = d;   /* 禁止 180° 掉头 */
  }));
  let sx, sy;
  cv.addEventListener('pointerdown', e => { sx = e.clientX; sy = e.clientY; });
  cv.addEventListener('pointerup', e => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) return;
    const d = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 0) : (dy > 0 ? 3 : 2);
    if ((dir + d) % 2 !== 0 || dir === d) dir = d;
  });
  el.querySelector('#gsNew').addEventListener('click', reset);
  reset();
}

/* ── 扫雷 ── */
function renderMines(el) {
  const N = 9, M = 10;
  el.innerHTML = `<div class="gmines"><div class="g2-head"><span id="gmFace">🙂</span><span>剩余 <b id="gmMines">${M}</b></span>
    <span class="pill-btn on" id="gmNew">新游戏</span></div>
    <div class="gm-board" id="gmBoard"></div>
    <div class="g2-hint">轻点翻开 · 长按插旗</div></div>`;
  const board = el.querySelector('#gmBoard');
  let mine, open, flag, over;
  function reset() {
    mine = Array(N * N).fill(0); open = Array(N * N).fill(false); flag = Array(N * N).fill(false); over = false;
    let placed = 0;
    while (placed < M) { const i = Math.floor(Math.random() * N * N); if (!mine[i]) { mine[i] = 1; placed++; } }
    el.querySelector('#gmFace').textContent = '🙂';
    el.querySelector('#gmMines').textContent = M;
    draw();
  }
  function count(i) {
    const x = i % N, y = Math.floor(i / N); let c = 0;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < N && ny >= 0 && ny < N && mine[ny * N + nx]) c++;
    }
    return c;
  }
  function flood(i) {
    if (open[i] || flag[i] || mine[i]) return;
    open[i] = true;
    if (count(i) === 0) {
      const x = i % N, y = Math.floor(i / N);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < N && ny >= 0 && ny < N) flood(ny * N + nx);
      }
    }
  }
  function draw() {
    board.innerHTML = mine.map((m, i) => {
      const isOpen = open[i];
      const c = count(i);
      return `<div class="gm-cell ${isOpen ? 'open' : ''}" data-i="${i}">${isOpen ? (m ? '💥' : (c || '')) : (flag[i] ? '🚩' : '')}</div>`;
    }).join('');
    board.querySelectorAll('.gm-cell').forEach(cell => {
      let lp = null;
      cell.addEventListener('pointerdown', () => {
        lp = setTimeout(() => {   /* 长按插旗 */
          if (over) return;
          const i = +cell.dataset.i;
          flag[i] = !flag[i];
          el.querySelector('#gmMines').textContent = M - flag.filter(Boolean).length;
          draw();
          lp = null;
        }, 420);
      });
      cell.addEventListener('pointerup', () => {
        if (lp) { clearTimeout(lp); lp = null; reveal(+cell.dataset.i); }
      });
      cell.addEventListener('pointerleave', () => { if (lp) { clearTimeout(lp); lp = null; } });
    });
  }
  function reveal(i) {
    if (over || flag[i]) return;
    if (mine[i]) {
      over = true;
      open = open.map(() => true);
      el.querySelector('#gmFace').textContent = '😵';
      notify('扫雷', '踩到雷了！');
      draw();
      return;
    }
    flood(i);
    draw();
    if (open.filter(Boolean).length === N * N - M) {
      over = true;
      el.querySelector('#gmFace').textContent = '😎';
      notify('扫雷', '🎉 你赢了！');
    }
  }
  el.querySelector('#gmNew').addEventListener('click', reset);
  reset();
}

/* ── 白噪音（Web Audio 合成雨声，关窗即停） ── */
function renderRain(el, win) {
  let ctxA = null, playing = false;
  const stopRain = () => {
    if (el._rainSrc) { try { el._rainSrc.stop(); } catch (e) {} el._rainSrc = null; }
    if (ctxA) { try { ctxA.close(); } catch (e) {} ctxA = null; }
    playing = false;
    const b = el.querySelector('#rainBtn');
    if (b) b.textContent = '▶ 播放';
  };
  if (win) win._cleanup = stopRain;
  el.innerHTML = `<div class="rain-app"><div class="rain-ico">🌧️</div><h2>白噪音 · 雨声</h2>
    <div class="rain-desc">Web Audio 实时合成，无需联网</div>
    <div class="rain-btn" id="rainBtn">▶ 播放</div></div>`;
  el.querySelector('#rainBtn').addEventListener('click', () => {
    if (playing) { stopRain(); return; }
    playing = true;
    ctxA = new (window.AudioContext || window.webkitAudioContext)();
    const len = ctxA.sampleRate * 2;
    const buf = ctxA.createBuffer(1, len, ctxA.sampleRate);
    const d = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.997 * b0 + 0.029 * w; b1 = 0.985 * b1 + 0.032 * w; b2 = 0.95 * b2 + 0.048 * w;
      d[i] = (b0 + b1 + b2 + w * 0.05) * 0.5;
    }
    const src = ctxA.createBufferSource();
    src.buffer = buf; src.loop = true;
    const filt = ctxA.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 900;
    const gain = ctxA.createGain(); gain.gain.value = 0.5;
    src.connect(filt).connect(gain).connect(ctxA.destination);
    src.start();
    el._rainSrc = src;
    el.querySelector('#rainBtn').textContent = '⏸ 停止';
  });
}

/* ── 番茄钟 ── */
function renderPomodoro(el) {
  let left = 25 * 60, run = false, iv = null;
  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  el.innerHTML = `<div class="rain-app"><div class="rain-ico">🍅</div>
    <div class="pm-time" id="pmTime">${fmt(left)}</div>
    <div style="display:flex;gap:12px"><div class="rain-btn" id="pmGo">开始专注</div>
    <div class="rain-btn ghost" id="pmReset">重置</div></div></div>`;
  const t = el.querySelector('#pmTime');
  el.querySelector('#pmGo').addEventListener('click', () => {
    run = !run;
    el.querySelector('#pmGo').textContent = run ? '暂停' : '继续';
    if (run) iv = setInterval(() => {
      if (!document.contains(t)) return clearInterval(iv);
      left--;
      t.textContent = fmt(left);
      if (left <= 0) { clearInterval(iv); run = false; left = 25 * 60; t.textContent = fmt(left); notify('番茄钟', '🍅 25 分钟到了，休息一下！'); }
    }, 1000);
    else clearInterval(iv);
  });
  el.querySelector('#pmReset').addEventListener('click', () => {
    clearInterval(iv); run = false; left = 25 * 60; t.textContent = fmt(left);
    el.querySelector('#pmGo').textContent = '开始专注';
  });
}

/* ── 指南针 ── */
function renderCompass(el) {
  el.innerHTML = `<div class="rain-app"><div class="compass-dial" id="cpDial">
    ${['北', '东', '南', '西'].map((d, i) => `<span class="cp-dir" style="transform:rotate(${i * 90}deg) translateY(-86px)">${d}</span>`).join('')}
    <div class="cp-needle"></div></div>
    <div class="cp-deg" id="cpDeg">---°</div>
    <div class="rain-desc" id="cpDesc">正在读取罗盘传感器…</div></div>`;
  const dial = el.querySelector('#cpDial'), degEl = el.querySelector('#cpDeg'), desc = el.querySelector('#cpDesc');
  let live = false;
  /* 真·罗盘：设备方向传感器 */
  const onOrient = e => {
    let heading = null;
    if (e.webkitCompassHeading != null) heading = e.webkitCompassHeading;       /* iOS */
    else if (e.alpha != null) heading = 360 - e.alpha;                          /* Android */
    if (heading == null) return;
    live = true;
    dial.style.transform = `rotate(${-heading}deg)`;
    degEl.textContent = String(Math.round(heading)).padStart(3, '0') + '°';
    desc.textContent = '真实罗盘 · 转动设备试试';
  };
  window.addEventListener('deviceorientationabsolute', onOrient, true);
  window.addEventListener('deviceorientation', onOrient, true);
  el.closest('.window')._cleanup = () => {
    window.removeEventListener('deviceorientationabsolute', onOrient, true);
    window.removeEventListener('deviceorientation', onOrient, true);
  };
  /* 3 秒无传感器数据 → 演示动画 */
  setTimeout(() => {
    if (live || !document.contains(el)) return;
    desc.textContent = '无罗盘传感器，演示模式';
    let deg = 0;
    const iv = setInterval(() => {
      if (!document.contains(el) || live) return clearInterval(iv);
      deg = (deg + (Math.random() - 0.5) * 6 + 0.3) % 360;
      const d = (deg + 360) % 360;
      dial.style.transform = `rotate(${-d}deg)`;
      degEl.textContent = String(Math.round(d)).padStart(3, '0') + '°';
    }, 120);
  }, 3000);
}


/* ── 俄罗斯方块 ── */
function renderTetris(el) {
  const COLS = 10, ROWS = 20, CS = 19;
  const SHAPES = [
    [[1,1,1,1]], [[1,1],[1,1]], [[0,1,0],[1,1,1]],
    [[1,0,0],[1,1,1]], [[0,0,1],[1,1,1]], [[1,1,0],[0,1,1]], [[0,1,1],[1,1,0]],
  ];
  const COLORS = ['#0ff','#ff0','#a0f','#00f','#f80','#0f0','#f00'];
  let grid, piece, px, py, pi, score, over, iv;
  el.innerHTML = `<div class="tt-app"><canvas id="ttCv" width="${COLS*CS}" height="${ROWS*CS}"></canvas>
    <div class="tt-side"><b>俄罗斯方块</b><span>得分 <b id="ttScore">0</b></span>
    <span class="pill-btn on" id="ttNew">新游戏</span>
    <div class="tt-keys">◀ ▶ 移动<br>▲ 旋转<br>▼ 加速</div></div></div>`;
  const cv = el.querySelector('#ttCv'), cx = cv.getContext('2d');
  function spawn() { pi = Math.floor(Math.random()*SHAPES.length); piece = SHAPES[pi].map(r=>r.slice()); px = 3; py = 0;
    if (hit(px, py, piece)) { over = true; clearInterval(iv); } }
  function hit(nx, ny, sh) {
    return sh.some((row, y) => row.some((v, x) => v && (nx+x < 0 || nx+x >= COLS || ny+y >= ROWS || (ny+y >= 0 && grid[ny+y][nx+x]))));
  }
  function merge() { piece.forEach((row,y)=>row.forEach((v,x)=>{ if(v && py+y>=0) grid[py+y][px+x]=pi+1; })); }
  function clearLines() {
    let n = 0;
    for (let y = ROWS-1; y >= 0; y--) if (grid[y].every(v=>v)) { grid.splice(y,1); grid.unshift(Array(COLS).fill(0)); n++; y++; }
    if (n) { score += [0,40,100,300,1200][n]; el.querySelector('#ttScore').textContent = score; }
  }
  function rotate() { const r = piece[0].map((_,i)=>piece.map(row=>row[i]).reverse()); if (!hit(px,py,r)) piece = r; }
  function draw() {
    cx.fillStyle = '#111'; cx.fillRect(0,0,cv.width,cv.height);
    for (let y=0;y<ROWS;y++) for (let x=0;x<COLS;x++) if (grid[y][x]) { cx.fillStyle = COLORS[grid[y][x]-1]; cx.fillRect(x*CS+1,y*CS+1,CS-2,CS-2); }
    if (!over) piece.forEach((row,y)=>row.forEach((v,x)=>{ if(v){ cx.fillStyle = COLORS[pi]; cx.fillRect((px+x)*CS+1,(py+y)*CS+1,CS-2,CS-2);} }));
    if (over) { cx.fillStyle = 'rgba(0,0,0,.6)'; cx.fillRect(0,0,cv.width,cv.height); cx.fillStyle = '#fff'; cx.font = '16px sans-serif'; cx.textAlign = 'center'; cx.fillText('游戏结束', cv.width/2, cv.height/2); }
  }
  function tick() { if (over) return; if (!hit(px, py+1, piece)) py++; else { merge(); clearLines(); spawn(); } draw(); }
  function start() { grid = Array.from({length:ROWS},()=>Array(COLS).fill(0)); score = 0; over = false; el.querySelector('#ttScore').textContent = 0; spawn(); clearInterval(iv); iv = setInterval(tick, 450); draw(); }
  const keyH = e => {
    if (over) return;
    if (e.key === 'ArrowLeft' && !hit(px-1,py,piece)) px--;
    else if (e.key === 'ArrowRight' && !hit(px+1,py,piece)) px++;
    else if (e.key === 'ArrowUp') rotate();
    else if (e.key === 'ArrowDown') tick();
    draw();
  };
  el.tabIndex = 0; el.addEventListener('keydown', keyH);
  el.querySelector('#ttNew').addEventListener('click', start);
  el.closest('.window')._cleanup = () => clearInterval(iv);
  start();
}

/* ── 井字棋（Minimax AI） ── */
function renderTicTacToe(el) {
  let board, over;
  el.innerHTML = `<div class="ttt-app"><b>井字棋 · 你执 ❌</b><div class="ttt-board" id="tttBoard"></div>
    <div id="tttMsg" style="font-size:13px;color:#888"></div>
    <span class="pill-btn on" id="tttNew">再来一局</span></div>`;
  const bd = el.querySelector('#tttBoard');
  function winner(b) {
    const L = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
    for (const [a,x,c] of L) if (b[a] && b[a]===b[x] && b[a]===b[c]) return b[a];
    return b.every(v=>v) ? 'draw' : null;
  }
  function minimax(b, isMax) {
    const w = winner(b);
    if (w === 'O') return 1; if (w === 'X') return -1; if (w === 'draw') return 0;
    let best = isMax ? -2 : 2;
    for (let i = 0; i < 9; i++) if (!b[i]) {
      b[i] = isMax ? 'O' : 'X';
      best = isMax ? Math.max(best, minimax(b, false)) : Math.min(best, minimax(b, true));
      b[i] = null;
    }
    return best;
  }
  function aiMove() {
    let best = -2, move = -1;
    for (let i = 0; i < 9; i++) if (!board[i]) {
      board[i] = 'O';
      const s = minimax(board, false);
      board[i] = null;
      if (s > best) { best = s; move = i; }
    }
    if (move >= 0) board[move] = 'O';
  }
  function draw() {
    bd.innerHTML = board.map((v,i)=>`<div class="ttt-cell" data-i="${i}">${v==='X'?'❌':v==='O'?'⭕':''}</div>`).join('');
    bd.querySelectorAll('.ttt-cell').forEach(c => c.addEventListener('click', () => {
      if (over || board[+c.dataset.i]) return;
      board[+c.dataset.i] = 'X';
      if (!winner(board)) aiMove();
      const w = winner(board);
      if (w) { over = true; el.querySelector('#tttMsg').textContent = w==='draw'?'平局！':w==='X'?'你赢了！🎉':'AI 赢了～'; }
      draw();
    }));
  }
  function start() { board = Array(9).fill(null); over = false; el.querySelector('#tttMsg').textContent = ''; draw(); }
  el.querySelector('#tttNew').addEventListener('click', start);
  start();
}

/* ── 记忆翻牌 ── */
function renderMemory(el) {
  const EMO = ['🐳','🍎','🌙','⭐','🎵','🌸','🚀','🎨'];
  let cards, open, matched, moves;
  el.innerHTML = `<div class="mem-app"><b>记忆翻牌</b><span id="memInfo" style="font-size:13px;color:#888">步数 0</span>
    <div class="mem-grid" id="memGrid"></div><span class="pill-btn on" id="memNew">新游戏</span></div>`;
  const grid = el.querySelector('#memGrid');
  function start() {
    cards = [...EMO, ...EMO].sort(() => Math.random() - .5);
    open = []; matched = 0; moves = 0;
    el.querySelector('#memInfo').textContent = '步数 0';
    grid.innerHTML = cards.map((c,i)=>`<div class="mem-card" data-i="${i}"><span class="mem-face">${c}</span></div>`).join('');
    grid.querySelectorAll('.mem-card').forEach(card => card.addEventListener('click', () => {
      const i = +card.dataset.i;
      if (card.classList.contains('open') || card.classList.contains('done') || open.length === 2) return;
      card.classList.add('open'); open.push({ card, i });
      if (open.length === 2) {
        moves++; el.querySelector('#memInfo').textContent = '步数 ' + moves;
        const [a, b] = open;
        if (cards[a.i] === cards[b.i]) {
          a.card.classList.add('done'); b.card.classList.add('done'); matched += 2; open = [];
          if (matched === 16) el.querySelector('#memInfo').textContent = `完成！共 ${moves} 步 🎉`;
        } else setTimeout(() => { a.card.classList.remove('open'); b.card.classList.remove('open'); open = []; }, 650);
      }
    }));
  }
  el.querySelector('#memNew').addEventListener('click', start);
  start();
}

/* ── 画板 ── */
function renderPaint(el) {
  el.innerHTML = `<div class="pt-app"><div class="pt-tools">
    ${['#000','#ff3b30','#ff9500','#ffcc00','#34c759','#0a84ff','#af52de'].map((c,i)=>`<span class="pt-color ${i===0?'sel':''}" data-c="${c}" style="background:${c}"></span>`).join('')}
    <input type="range" min="2" max="20" value="4" id="ptSize">
    <span class="pill-btn" id="ptClear">清空</span></div>
    <canvas id="ptCv" style="flex:1;cursor:crosshair;touch-action:none"></canvas></div>`;
  const cv = el.querySelector('#ptCv'), cx = cv.getContext('2d');
  setTimeout(() => { cv.width = cv.clientWidth; cv.height = cv.clientHeight; cx.fillStyle = '#fff'; cx.fillRect(0,0,cv.width,cv.height); }, 50);
  let drawing = false, color = '#000', size = 4;
  function pos(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  cv.addEventListener('pointerdown', e => { drawing = true; const [x,y] = pos(e); cx.beginPath(); cx.moveTo(x,y); cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (!drawing) return; const [x,y] = pos(e); cx.strokeStyle = color; cx.lineWidth = size; cx.lineCap = 'round'; cx.lineTo(x,y); cx.stroke(); });
  cv.addEventListener('pointerup', () => drawing = false);
  el.querySelectorAll('.pt-color').forEach(c => c.addEventListener('click', () => {
    el.querySelectorAll('.pt-color').forEach(x=>x.classList.remove('sel')); c.classList.add('sel'); color = c.dataset.c;
  }));
  el.querySelector('#ptSize').addEventListener('input', e => size = +e.target.value);
  el.querySelector('#ptClear').addEventListener('click', () => { cx.fillStyle = '#fff'; cx.fillRect(0,0,cv.width,cv.height); });
}

/* ── 翻译（MyMemory 免费 API） ── */
function renderTranslate(el) {
  el.innerHTML = `<div class="tl-app"><b>翻译</b>
    <textarea id="tlIn" placeholder="输入要翻译的文字…" rows="3"></textarea>
    <div style="display:flex;gap:8px;align-items:center">
      <select id="tlFrom"><option value="zh-CN">中文</option><option value="en">English</option><option value="ja">日本語</option></select>
      <span>→</span>
      <select id="tlTo"><option value="en">English</option><option value="zh-CN">中文</option><option value="ja">日本語</option><option value="ko">한국어</option><option value="fr">Français</option></select>
      <span class="pill-btn on" id="tlGo">翻译</span></div>
    <div class="tl-out" id="tlOut">译文会显示在这里</div></div>`;
  el.querySelector('#tlGo').addEventListener('click', async () => {
    const t = el.querySelector('#tlIn').value.trim();
    if (!t) return;
    el.querySelector('#tlOut').textContent = '翻译中…';
    const d = await fetchJSON(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(t)}&langpair=${el.querySelector('#tlFrom').value}|${el.querySelector('#tlTo').value}`, 10000);
    el.querySelector('#tlOut').textContent = d && d.responseData ? d.responseData.translatedText : '翻译失败，检查网络';
  });
}

/* ── 二维码生成（qrserver 免费 API） ── */
function renderQRCode(el) {
  el.innerHTML = `<div class="qr-app"><b>二维码生成</b>
    <input id="qrIn" placeholder="输入文字或网址…">
    <span class="pill-btn on" id="qrGo">生成</span>
    <div class="qr-box" id="qrBox"><span style="color:#888;font-size:13px">二维码预览</span></div></div>`;
  el.querySelector('#qrGo').addEventListener('click', () => {
    const t = el.querySelector('#qrIn').value.trim();
    if (!t) return;
    el.querySelector('#qrBox').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(t)}" width="180" height="180">`;
  });
}

/* ── 每日诗词（今日诗词免费 API） ── */
function renderPoem(el) {
  el.innerHTML = `<div class="poem-app"><b>每日诗词</b><div class="poem-body" id="poemBody"><div class="sf-spinner"></div></div>
    <span class="pill-btn on" id="poemNew">换一首</span></div>`;
  async function load() {
    el.querySelector('#poemBody').innerHTML = '<div class="sf-spinner"></div>';
    const d = await fetchJSON('https://v2.jinrishici.com/one.json', 8000);
    const b = el.querySelector('#poemBody');
    if (d && d.data) b.innerHTML = `<div class="poem-content">${d.data.content}</div><div class="poem-from">—— ${d.data.origin.dynasty} · ${d.data.origin.author}《${d.data.origin.title}》</div>`;
    else b.innerHTML = '<div style="color:#888">获取失败，检查网络</div>';
  }
  el.querySelector('#poemNew').addEventListener('click', load);
  load();
}

/* ── 节拍器（Web Audio 真发声） ── */
function renderMetronome(el) {
  el.innerHTML = `<div class="met-app"><b>节拍器</b>
    <div class="met-bpm"><span id="metBpm">100</span> BPM</div>
    <input type="range" min="40" max="208" value="100" id="metSlider" style="width:220px">
    <span class="pill-btn on" id="metBtn">开始</span></div>`;
  let ac = null, iv = null;
  function tick() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    const o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.frequency.value = 1000;
    g.gain.setValueAtTime(0.5, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.08);
    o.start(); o.stop(ac.currentTime + 0.08);
  }
  el.querySelector('#metSlider').addEventListener('input', e => {
    el.querySelector('#metBpm').textContent = e.target.value;
    if (iv) { clearInterval(iv); iv = setInterval(tick, 60000 / +e.target.value); }
  });
  el.querySelector('#metBtn').addEventListener('click', () => {
    if (iv) { clearInterval(iv); iv = null; el.querySelector('#metBtn').textContent = '开始'; }
    else { tick(); iv = setInterval(tick, 60000 / +el.querySelector('#metSlider').value); el.querySelector('#metBtn').textContent = '停止'; }
  });
  el.closest('.window')._cleanup = () => { clearInterval(iv); if (ac) ac.close(); };
}

/* ── 抛硬币 ── */
function renderCoin(el) {
  el.innerHTML = `<div class="coin-app"><b>抛硬币</b><div class="coin" id="coinFace">🪙</div>
    <span class="pill-btn on" id="coinGo">抛！</span><div id="coinRes" style="font-size:15px;font-weight:600"></div></div>`;
  el.querySelector('#coinGo').addEventListener('click', () => {
    const coin = el.querySelector('#coinFace');
    coin.classList.add('flipping');
    el.querySelector('#coinRes').textContent = '';
    setTimeout(() => {
      coin.classList.remove('flipping');
      el.querySelector('#coinRes').textContent = Math.random() < 0.5 ? '正面！' : '反面！';
    }, 900);
  });
}

/* ── 冷笑话（LongCat AI 真生成） ── */
function renderJokes(el) {
  el.innerHTML = `<div class="joke-app"><b>冷笑话</b><div class="joke-body" id="jokeBody">点按钮来一个…</div>
    <span class="pill-btn on" id="jokeNew">再来一个</span></div>`;
  el.querySelector('#jokeNew').addEventListener('click', async () => {
    const b = el.querySelector('#jokeBody');
    b.textContent = '想梗中…';
    const r = await aiChat('讲一个简短的中文冷笑话，只要笑话本身');
    b.textContent = r ? r.replace(/\[.*?\]/g, '').trim() : '网络开小差了，待会儿再笑';
  });
}

const GAME_RENDERERS = { g2048: render2048, snake: renderSnake, mines: renderMines, rain: renderRain, pomodoro: renderPomodoro, compass: renderCompass, tetris: renderTetris, tictactoe: renderTicTacToe, memory: renderMemory, paint: renderPaint, translate: renderTranslate, qrcode: renderQRCode, poem: renderPoem, metronome: renderMetronome, coin: renderCoin, jokes: renderJokes };
const GAME_SIZES = { g2048: [380, 560], snake: [400, 560], mines: [400, 540], rain: [420, 340], pomodoro: [420, 340], compass: [420, 420], tetris: [420, 480], tictactoe: [340, 420], memory: [420, 480], paint: [560, 440], translate: [440, 400], qrcode: [360, 420], poem: [420, 360], metronome: [360, 340], coin: [320, 360], jokes: [400, 300] };

/* 安装应用到系统（启动台 + 可选 Dock） */
function installApp(id, silent) {
  const def = STORE_APPS.find(a => a.id === id);
  if (!def || APPS[id]) return;
  APPS[id] = {
    name: def.name,
    icon: () => `<div class="store-app-ico" style="background:${def.bg}">${def.icon}</div>`,
    w: GAME_SIZES[id] ? GAME_SIZES[id][0] : 420,
    h: GAME_SIZES[id] ? GAME_SIZES[id][1] : 380,
    noResize: true,
    render(el) { (GAME_RENDERERS[id] || (e => e.innerHTML = '<div class="fs-empty">建设中</div>'))(el); },
  };
  if (!LAUNCHPAD_APPS.includes(id)) LAUNCHPAD_APPS.splice(LAUNCHPAD_APPS.length - 1, 0, id);
  const inst = JSON.parse(localStorage.getItem('mac_installed') || '[]');
  if (!inst.includes(id)) { inst.push(id); localStorage.setItem('mac_installed', JSON.stringify(inst)); }
  if (!silent) notify('App Store', `「${def.name}」已安装到启动台`);
}
/* 启动时恢复已安装应用 */
function initStoreApps() {
  try { JSON.parse(localStorage.getItem('mac_installed') || '[]').forEach(id => installApp(id, true)); } catch (e) {}
}
