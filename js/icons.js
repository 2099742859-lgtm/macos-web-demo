/* ═══ macOS 风格 SVG 图标库（手工绘制） ═══ */
let __iconUID = 0;
function _uid(p) { return p + (++__iconUID); }

const ICONS = {
  finder() {
    const g = _uid('fd');
    return `<svg viewBox="0 0 64 64"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5AC8FA"/><stop offset="1" stop-color="#1D7FF0"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#${g})"/>
      <path d="M16 2h16v60H16c-7.7 0-14-6.3-14-14V16C2 8.3 8.3 2 16 2z" fill="#A9E4FF"/>
      <path d="M32 2 Q41 32 32 62" stroke="#fff" stroke-width="2.4" fill="none"/>
      <path d="M21.5 19v9.5" stroke="#0B4F9E" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M44.5 19v9.5" stroke="#0B4F9E" stroke-width="3.6" stroke-linecap="round"/>
      <path d="M17 41 Q32 53.5 48 39.5" stroke="#0B4F9E" stroke-width="3.6" stroke-linecap="round" fill="none"/>
    </svg>`;
  },

  launchpad() {
    const g = _uid('lp');
    let cells = '';
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++)
      cells += `<rect x="${13 + c * 14}" y="${13 + r * 14}" width="10" height="10" rx="2.5" fill="#fff" opacity=".92"/>`;
    return `<svg viewBox="0 0 64 64"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8E9EB5"/><stop offset="1" stop-color="#556074"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#${g})"/>${cells}</svg>`;
  },

  safari() {
    let ticks = '';
    for (let a = 0; a < 360; a += 30) {
      const r1 = 21, r2 = 23.5, rad = a * Math.PI / 180;
      ticks += `<line x1="${32 + r1 * Math.sin(rad)}" y1="${32 - r1 * Math.cos(rad)}" x2="${32 + r2 * Math.sin(rad)}" y2="${32 - r2 * Math.cos(rad)}" stroke="#B9C4D6" stroke-width="1.4"/>`;
    }
    return `<svg viewBox="0 0 64 64">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#F4F7FB"/>
      <circle cx="32" cy="32" r="24.5" fill="#fff" stroke="#E1E7F0" stroke-width="1.5"/>${ticks}
      <g transform="rotate(45 32 32)">
        <path d="M32 11 L37.5 32 H26.5 Z" fill="#FF3B30"/>
        <path d="M32 53 L37.5 32 H26.5 Z" fill="#F2F2F7"/>
        <path d="M32 11 L37.5 32 H26.5 Z" fill="#FF3B30"/>
      </g>
      <circle cx="32" cy="32" r="2.4" fill="#C7CEDA"/></svg>`;
  },

  mail() {
    const g = _uid('ml');
    return `<svg viewBox="0 0 64 64"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4EA8F5"/><stop offset="1" stop-color="#1C69E8"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#${g})"/>
      <rect x="11" y="17" width="42" height="30" rx="4" fill="#fff"/>
      <path d="M12 19 L32 36 L52 19" fill="none" stroke="#C9D4E2" stroke-width="2.6"/>
      <path d="M12 46 L26 32 M52 46 L38 32" stroke="#C9D4E2" stroke-width="2.2" fill="none"/></svg>`;
  },

  maps() {
    return `<svg viewBox="0 0 64 64">
      <defs><clipPath id="${_uid('mc')}"><rect x="2" y="2" width="60" height="60" rx="14"/></clipPath></defs>
      <g clip-path="url(#${'mc' + __iconUID})">
        <rect width="64" height="64" fill="#F5EFD8"/>
        <path d="M-5 20 Q20 12 34 26 T70 40 L70 -5 L-5 -5 Z" fill="#B5E3A8"/>
        <path d="M-5 64 L30 64 Q36 44 70 46 L70 64 Z" fill="#A8D9F5"/>
        <path d="M20 64 Q26 36 18 -5" stroke="#fff" stroke-width="5" fill="none"/>
        <path d="M-5 38 Q30 34 70 24" stroke="#fff" stroke-width="4" fill="none"/>
        <path d="M38 8 c-6 0-10 4.6-10 10 0 7.5 10 17 10 17 s10-9.5 10-17 c0-5.4-4-10-10-10z" fill="#FF3B30"/>
        <circle cx="38" cy="18" r="4" fill="#fff"/>
      </g></svg>`;
  },

  photos() {
    const colors = ['#FF5F58', '#FF9F0A', '#FFD60A', '#32D74B', '#64D2FF', '#0A84FF', '#BF5AF2', '#FF375F'];
    let petals = '';
    colors.forEach((c, i) => {
      petals += `<ellipse cx="32" cy="15" rx="6.4" ry="11.5" fill="${c}" opacity=".78"
        transform="rotate(${i * 45} 32 32)"/>`;
    });
    return `<svg viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="14" fill="#fff"/>${petals}</svg>`;
  },

  messages() {
    const g = _uid('ms');
    return `<svg viewBox="0 0 64 64"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#67E077"/><stop offset="1" stop-color="#1FCB30"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#${g})"/>
      <path d="M32 13c-11 0-19.5 7-19.5 16.4 0 5 2.7 9.5 7 12.6-.4 2.7-2 5.7-4.5 7.4 3.6-.3 7.3-1.9 9.6-3.7 2.3.7 4.8 1 7.4 1 11 0 19.5-7.2 19.5-16.3S43 13 32 13z" fill="#fff"/></svg>`;
  },

  facetime() {
    const g = _uid('ft');
    return `<svg viewBox="0 0 64 64"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#7CE98A"/><stop offset="1" stop-color="#2ECC40"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#${g})"/>
      <rect x="10" y="20" width="28" height="24" rx="5" fill="#fff"/>
      <path d="M40 28 l12-7 v22 l-12-7z" fill="#fff"/></svg>`;
  },

  music() {
    const g = _uid('mu');
    return `<svg viewBox="0 0 64 64"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FC5C7D"/><stop offset="1" stop-color="#F5314E"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#${g})"/>
      <path d="M26 44 V20.5 c0-1.2.8-2.3 2-2.7 l17-4.4 c1.5-.4 3 .8 3 2.4 V39" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="21.5" cy="44" r="5" fill="#fff"/><circle cx="43.5" cy="39" r="5" fill="#fff"/></svg>`;
  },

  podcast() {
    const g = _uid('pd');
    return `<svg viewBox="0 0 64 64"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#C86DD7"/><stop offset="1" stop-color="#7D2AE8"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#${g})"/>
      <circle cx="32" cy="24" r="7" fill="#fff"/>
      <path d="M22 27 a10 10 0 0 0 20 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".9"/>
      <path d="M17.5 31 a15 15 0 0 0 29 0" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      <path d="M28 38 h8 l3 14 c.3 1.6-1 3-2.6 3 h-8.8 c-1.6 0-2.9-1.4-2.6-3z" fill="#fff"/></svg>`;
  },

  tv() {
    return `<svg viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="14" fill="#17171B"/>
      <path d="M24 20 v24 l21-12z" fill="#fff"/></svg>`;
  },

  appstore() {
    const g = _uid('as');
    return `<svg viewBox="0 0 64 64"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#21C3FC"/><stop offset="1" stop-color="#0A62F6"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#${g})"/>
      <g stroke="#fff" stroke-width="4.6" stroke-linecap="round">
      <path d="M32 13 L18 45"/><path d="M32 13 L46 45"/><path d="M13 45 h38"/><path d="M25 32.5 h14" stroke-width="4.6"/>
      </g></svg>`;
  },

  settings() {
    const g = _uid('st');
    let teeth = '';
    for (let a = 0; a < 360; a += 45)
      teeth += `<rect x="27.5" y="6" width="9" height="11" rx="2.5" fill="#C9CCD4" transform="rotate(${a} 32 32)"/>`;
    return `<svg viewBox="0 0 64 64"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#F2F3F6"/><stop offset="1" stop-color="#D8DBE2"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#${g})"/>
      ${teeth}<circle cx="32" cy="32" r="18" fill="#C9CCD4"/>
      <circle cx="32" cy="32" r="9.5" fill="url(#${g})"/>
      <circle cx="32" cy="32" r="18" fill="none" stroke="#AFB3BD" stroke-width="1"/></svg>`;
  },

  terminal() {
    const g = _uid('tm');
    return `<svg viewBox="0 0 64 64"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4A4D55"/><stop offset="1" stop-color="#1B1D22"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#${g})"/>
      <path d="M13 19 l11 9 -11 9" fill="none" stroke="#fff" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="29" y="40" width="16" height="4.4" rx="2.2" fill="#fff"/></svg>`;
  },

  calculator() {
    const g = _uid('ca');
    return `<svg viewBox="0 0 64 64"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFB340"/><stop offset="1" stop-color="#FF9500"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#${g})"/>
      <rect x="13" y="11" width="38" height="11" rx="2.5" fill="#fff"/>
      <g fill="#fff">
      <rect x="13" y="28" width="10" height="8" rx="2"/><rect x="27" y="28" width="10" height="8" rx="2"/><rect x="41" y="28" width="10" height="8" rx="2"/>
      <rect x="13" y="41" width="10" height="8" rx="2"/><rect x="27" y="41" width="10" height="8" rx="2"/><rect x="41" y="41" width="10" height="12" rx="2"/>
      </g></svg>`;
  },

  notes() {
    return `<svg viewBox="0 0 64 64">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#fff"/>
      <path d="M2 16 a14 14 0 0 1 14-14 h32 a14 14 0 0 1 14 14 v4 H2z" fill="#FFD60A"/>
      <g stroke="#D8D8DE" stroke-width="2.6" stroke-linecap="round">
      <path d="M13 31 h38"/><path d="M13 41 h38"/><path d="M13 51 h26"/></g></svg>`;
  },

  reminders() {
    return `<svg viewBox="0 0 64 64">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#fff"/>
      <circle cx="15" cy="19" r="6" fill="#FF9F0A"/><rect x="27" y="16" width="24" height="5.5" rx="2.7" fill="#E4E4E9"/>
      <circle cx="15" cy="33" r="6" fill="#0A84FF"/><rect x="27" y="30" width="24" height="5.5" rx="2.7" fill="#E4E4E9"/>
      <circle cx="15" cy="47" r="6" fill="#30D158"/><rect x="27" y="44" width="24" height="5.5" rx="2.7" fill="#E4E4E9"/></svg>`;
  },

  calendar() {
    const d = new Date();
    const dow = ['周日','周一','周二','周三','周四','周五','周六'][d.getDay()];
    return `<svg viewBox="0 0 64 64">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#fff"/>
      <text x="32" y="22" text-anchor="middle" font-size="12.5" font-weight="600" fill="#FF3B30" font-family="inherit">${dow}</text>
      <text x="32" y="51" text-anchor="middle" font-size="30" font-weight="300" fill="#1d1d1f" font-family="inherit">${d.getDate()}</text></svg>`;
  },

  trash() {
    const g = _uid('tr');
    let lines = '';
    for (let i = 0; i < 6; i++)
      lines += `<path d="M${17 + i * 6} 17 L${19 + i * 5} 54" stroke="#B9BEC8" stroke-width="1.6" fill="none"/>`;
    return `<svg viewBox="0 0 64 64"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#EDEEF2"/><stop offset="1" stop-color="#C9CCD4"/></linearGradient></defs>
      <rect x="16" y="10" width="32" height="4.6" rx="2.3" fill="#D5D8DF"/>
      <path d="M15 17 h34 l-4 38 a5 5 0 0 1 -5 4.4 H24 a5 5 0 0 1 -5-4.4z" fill="url(#${g})" opacity=".92"/>
      ${lines}</svg>`;
  },

  textedit() {
    return `<svg viewBox="0 0 64 64">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#fff"/>
      <g stroke="#D8D8DE" stroke-width="2.4" stroke-linecap="round">
      <path d="M12 16 h40"/><path d="M12 26 h40"/><path d="M12 36 h40"/><path d="M12 46 h24"/></g>
      <path d="M40 40 l12 12 m-3-13.5 4.5 4.5 -9.5 9.5 -5.5 1z" fill="#FF9F0A"/></svg>`;
  },

  /* 时钟：黑底白表盘，指针指向 9:41（苹果经典时间） */
  clock() {
    let ticks = '';
    for (let a = 0; a < 360; a += 30) {
      const rad = a * Math.PI / 180;
      ticks += `<line x1="${32 + 21 * Math.sin(rad)}" y1="${32 - 21 * Math.cos(rad)}" x2="${32 + 24 * Math.sin(rad)}" y2="${32 - 24 * Math.cos(rad)}" stroke="#B9BEC8" stroke-width="1.6"/>`;
    }
    return `<svg viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="14" fill="#17171B"/>
      <circle cx="32" cy="32" r="25" fill="#F5F5F7"/>${ticks}
      <line x1="32" y1="32" x2="20.5" y2="32" stroke="#1d1d1f" stroke-width="3.4" stroke-linecap="round"/>
      <line x1="32" y1="32" x2="39" y2="16.5" stroke="#1d1d1f" stroke-width="2.6" stroke-linecap="round"/>
      <line x1="32" y1="36" x2="44" y2="22" stroke="#FF9500" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="32" cy="32" r="2.2" fill="#FF9500"/></svg>`;
  },

  /* 天气 */
  weather() {
    const g = _uid('we');
    return `<svg viewBox="0 0 64 64"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3D9BEF"/><stop offset="1" stop-color="#1668C7"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#${g})"/>
      <circle cx="25" cy="22" r="10" fill="#FFD60A"/>
      <path d="M18 44a9 9 0 0 1 1.5-17.9A12 12 0 0 1 43 29a8.5 8.5 0 0 1 1 17z" fill="#fff" opacity=".95"/></svg>`;
  },

  /* 活动监视器：黑底绿色心电波 */
  activity() {
    return `<svg viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="14" fill="#17171B"/>
      <path d="M8 40 h10 l5-18 7 30 6-22 4 10 h16" fill="none" stroke="#30D158" stroke-width="3.2"
        stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  },

  /* Photo Booth：紫底相机 */
  photobooth() {
    const g = _uid('pb');
    return `<svg viewBox="0 0 64 64"><defs>
      <linearGradient id="${g}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#B16BFF"/><stop offset="1" stop-color="#5E3AE8"/></linearGradient></defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="url(#${g})"/>
      <rect x="10" y="20" width="44" height="28" rx="6" fill="#fff"/>
      <rect x="24" y="15" width="16" height="8" rx="3" fill="#fff"/>
      <circle cx="32" cy="34" r="9.5" fill="#5E3AE8"/>
      <circle cx="32" cy="34" r="5.5" fill="#17171B"/>
      <circle cx="34" cy="32" r="1.8" fill="#fff" opacity=".8"/></svg>`;
  },

  /* 预览：白底文档 + 放大镜 */
  preview() {
    return `<svg viewBox="0 0 64 64">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#fff"/>
      <rect x="14" y="10" width="28" height="34" rx="3" fill="#EAF3FE" stroke="#C6DCF5" stroke-width="1.5"/>
      <rect x="18" y="15" width="20" height="12" rx="1.5" fill="#8FC3F5"/>
      <rect x="18" y="31" width="20" height="2.6" rx="1.3" fill="#C6DCF5"/>
      <rect x="18" y="37" width="14" height="2.6" rx="1.3" fill="#C6DCF5"/>
      <circle cx="38" cy="36" r="11" fill="rgba(255,255,255,.35)" stroke="#0A84FF" stroke-width="3"/>
      <line x1="46" y1="44" x2="54" y2="52" stroke="#0A84FF" stroke-width="4" stroke-linecap="round"/></svg>`;
  },

  /* 菜单栏等用到的苹果 logo */
  apple(color) {
    return `<svg viewBox="0 0 384 512"><path fill="${color || '#fff'}" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>`;
  }
};

/* 文件类型图标（真实 macOS 图标） */
const FILE_ICONS = {
  folder: 'icons/folder.png', txt: 'icons/filetext.png', img: 'icons/fileimage.png',
  pdf: 'icons/filepdf.png', zip: 'icons/filetext.png', music: null, app: null,
};

/* ═══ 正版 macOS 图标覆盖（搬运自 macos-web / ryOS，MIT License） ═══ */
['finder', 'launchpad', 'safari', 'mail', 'maps', 'messages', 'facetime', 'music',
 'podcast', 'tv', 'appstore', 'settings', 'terminal', 'calculator', 'notes',
 'reminders', 'calendar', 'photos', 'photobooth', 'preview', 'textedit', 'stickies',
 'dictionary'].forEach(n => {
  ICONS[n] = () => `<img src="icons/${n}.png" draggable="false" alt="${n}">`;
});
/* 废纸篓：空/满双状态（经典金属网桶） */
ICONS.trash = () => `<img src="icons/${(typeof TRASH !== 'undefined' && TRASH.length) ? 'trashfull' : 'trashempty'}.png" draggable="false" alt="trash">`;

/* 虚拟机：显示器 + 终端光标 */
ICONS.v86 = () => `<svg viewBox="0 0 64 64">
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#3A4A5A"/>
  <rect x="9" y="10" width="46" height="32" rx="3.5" fill="#101418"/>
  <path d="M15 18 l8 6 -8 6" fill="none" stroke="#4ADE80" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="27" y="31" width="12" height="3.4" rx="1.7" fill="#4ADE80"/>
  <rect x="24" y="45" width="16" height="3" rx="1.5" fill="#5A6A7A"/>
  <rect x="17" y="50" width="30" height="4" rx="2" fill="#5A6A7A"/>
</svg>`;

/* QQ：腾讯蓝底 + 白企鹅 */
ICONS.qq = () => `<svg viewBox="0 0 64 64">
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#12B7F5"/>
  <ellipse cx="32" cy="35" rx="14.5" ry="17.5" fill="#fff"/>
  <ellipse cx="32" cy="26" rx="13" ry="11" fill="#1B1B1F"/>
  <ellipse cx="32" cy="33" rx="10" ry="12" fill="#fff"/>
  <circle cx="27.5" cy="24" r="2.2" fill="#fff"/><circle cx="36.5" cy="24" r="2.2" fill="#fff"/>
  <circle cx="27.5" cy="24.4" r="1.1" fill="#1B1B1F"/><circle cx="36.5" cy="24.4" r="1.1" fill="#1B1B1F"/>
  <path d="M29 28.5 Q32 31.5 35 28.5 Q32 33 29 28.5z" fill="#FF9500"/>
  <path d="M18 33 Q15 44 21 49" stroke="#E64545" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M46 33 Q49 44 43 49" stroke="#E64545" stroke-width="5" fill="none" stroke-linecap="round"/>
  <ellipse cx="27" cy="51" rx="4.5" ry="2.2" fill="#FF9500"/>
  <ellipse cx="37" cy="51" rx="4.5" ry="2.2" fill="#FF9500"/>
</svg>`;

/* 微信：绿底双气泡 */
ICONS.wechat = () => `<svg viewBox="0 0 64 64">
  <rect x="2" y="2" width="60" height="60" rx="14" fill="#07C160"/>
  <path d="M25 13c-8.3 0-15 5.4-15 12.2 0 4 2.2 7.5 5.7 9.8l-1.5 4.5 5.2-2.7c1.7.5 3.5.8 5.6.8 8.3 0 15-5.4 15-12.2S33.3 13 25 13z" fill="#fff"/>
  <circle cx="20.5" cy="23.5" r="1.8" fill="#07C160"/><circle cx="29.5" cy="23.5" r="1.8" fill="#07C160"/>
  <path d="M42 28c-6.9 0-12.5 4.5-12.5 10.2 0 3.3 1.9 6.3 4.8 8.2l-1.2 3.7 4.3-2.2c1.4.4 2.9.6 4.6.6 6.9 0 12.5-4.5 12.5-10.2S48.9 28 42 28z" fill="#fff" opacity=".92"/>
  <circle cx="38.5" cy="36.8" r="1.5" fill="#07C160"/><circle cx="45.5" cy="36.8" r="1.5" fill="#07C160"/>
</svg>`;

/* 语音备忘录：粉底白波形 */
ICONS.voicememo = () => {
  let bars = '';
  [8, 16, 26, 36, 22, 30, 14, 20, 10].forEach((h, i) => {
    bars += `<rect x="${13 + i * 4.4}" y="${32 - h / 2}" width="2.6" height="${h}" rx="1.3" fill="#fff"/>`;
  });
  return `<svg viewBox="0 0 64 64"><rect x="2" y="2" width="60" height="60" rx="14" fill="#FF453A"/>${bars}</svg>`;
};


/* ═══ SF Symbols 风格单色字形（替代 emoji，更像真 macOS） ═══ */
const _G = (inner, vb) => `<svg viewBox="${vb || '0 0 24 24'}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
const GLYPH = {
  wifi: _G('<path d="M2.5 8.8a15 15 0 0119 0M5.3 12a10.5 10.5 0 0113.4 0M8.2 15.2a6 6 0 017.6 0"/><circle cx="12" cy="18.4" r="1.5" fill="currentColor" stroke="none"/>'),
  bt: _G('<path d="M7 7.5l10 9-5 4.5v-18l5 4.5-10 9"/>'),
  airdrop: _G('<circle cx="12" cy="15" r="1.6" fill="currentColor" stroke="none"/><path d="M8.8 11.8a4.6 4.6 0 016.4 0M6.3 9.3a8.2 8.2 0 0111.4 0M3.8 6.8a11.8 11.8 0 0116.4 0"/>'),
  moon: _G('<path d="M20 14.2A8.2 8.2 0 119.8 4a6.8 6.8 0 0010.2 10.2z" fill="currentColor" stroke="none"/>'),
  stage: _G('<rect x="3.5" y="6" width="9" height="12" rx="2"/><path d="M16.5 8.5h4M16.5 12h4M16.5 15.5h4"/>'),
  mirror: _G('<rect x="3" y="4.5" width="18" height="12.5" rx="2"/><path d="M12 13.5l-3.5 4h7z" fill="currentColor" stroke="none"/>'),
  cursor: _G('<path d="M6.5 3.5 L19 11.5 13.6 13.2 17.2 19.6 14.8 21 11.2 14.7 6.8 17.8 Z" fill="currentColor" stroke="none"/>'),
  mic: _G('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M8.5 21h7"/>'),
  speakerMute: _G('<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor" stroke="none"/><path d="M15 9l6 6M21 9l-6 6"/>'),
  /* macOS 系统设置风格双齿轮 */
  gearBig: (() => {
    const teeth = (cx, cy, r1, r2, n, color) => {
      let s = '';
      for (let i = 0; i < n; i++) {
        const a = (360 / n) * i;
        s += `<rect x="${cx - r2 * 0.18}" y="${cy - r2}" width="${r2 * 0.36}" height="${r2 - r1 + r2 * 0.18}" rx="${r2 * 0.14}" fill="${color}" transform="rotate(${a} ${cx} ${cy})"/>`;
      }
      return s;
    };
    const gear = (cx, cy, rOut, rIn, rHole, n, color) =>
      `${teeth(cx, cy, rIn, rOut, n, color)}<circle cx="${cx}" cy="${cy}" r="${rIn}" fill="${color}"/><circle cx="${cx}" cy="${cy}" r="${rHole}" fill="#ececf1"/>`;
    return `<svg viewBox="0 0 100 100" width="76" height="76">
      <defs><linearGradient id="gg1" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#fdfdff"/><stop offset="1" stop-color="#d4d4dc"/>
      </linearGradient></defs>
      <circle cx="50" cy="50" r="47" fill="url(#gg1)"/>
      <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(0,0,0,.08)" stroke-width="1"/>
      ${gear(40, 42, 26, 19, 8, 8, '#9d9da5')}
      ${gear(66, 68, 17, 12, 5, 8, '#7c7c86')}
    </svg>`;
  })(),
  sun: _G('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/>'),
  speaker: _G('<path d="M4 9.5v5h3.5l5 4v-13l-5 4z" fill="currentColor" stroke="none"/><path d="M15.5 9.2a4 4 0 010 5.6M18 6.5a8 8 0 010 11"/>'),
  recents: _G('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.2v4.8l3.4 2"/>'),
  apps: _G('<rect x="4" y="4" width="7" height="7" rx="1.8"/><rect x="13" y="4" width="7" height="7" rx="1.8"/><rect x="4" y="13" width="7" height="7" rx="1.8"/><rect x="13" y="13" width="7" height="7" rx="1.8"/>'),
  desktop: _G('<rect x="3" y="4" width="18" height="12.5" rx="2"/><path d="M9 20.5h6M12 16.5v4"/>'),
  doc: _G('<path d="M7 3.5h6.5L18 8v12.5H7z"/><path d="M13.5 3.5V8H18"/>'),
  download: _G('<path d="M12 4v9.5M12 13.5l-3.8-3.8M12 13.5l3.8-3.8"/><path d="M4.5 19.5h15"/>'),
  home: _G('<path d="M4 11l8-6.8L20 11v8.5a1.5 1.5 0 01-1.5 1.5H14v-6h-4v6H5.5A1.5 1.5 0 014 19.5z"/>'),
  disk: _G('<rect x="3" y="7.5" width="18" height="9.5" rx="2.2"/><circle cx="16.5" cy="12.2" r="1.2" fill="currentColor" stroke="none"/>'),
  appearance: _G('<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 010 17z" fill="currentColor" stroke="none"/>'),
  photo: _G('<rect x="3.5" y="5" width="17" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M4.5 17l4-4 3 3 3.5-3.5 4 4.5"/>'),
  dockg: _G('<rect x="3" y="15" width="18" height="5" rx="2.5"/><rect x="6" y="4" width="4" height="4" rx="1"/><rect x="11" y="6" width="4" height="4" rx="1"/><rect x="16" y="3" width="4" height="4" rx="1"/>'),
  menubar: _G('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 8.5h18"/>'),
  globe: _G('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c-5 5-5 12 0 17M12 3.5c5 5 5 12 0 17"/>'),
  bell: _G('<path d="M12 4a5.5 5.5 0 00-5.5 5.5c0 4-1.5 5.5-2.5 6.5h16c-1-1-2.5-2.5-2.5-6.5A5.5 5.5 0 0012 4z"/><path d="M10 19.5a2 2 0 004 0"/>'),
  gear: _G('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1"/>'),
  person: _G('<circle cx="12" cy="7" r="3"/><path d="M12 11v5M12 12.5l-5 1.5M12 12.5l5 1.5M12 16l-3 5.5M12 16l3 5.5"/>'),
};
