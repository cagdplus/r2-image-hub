import { FOLDER_CLIENT } from "./folder-ui";
import { I18N_CLIENT } from "./i18n";
export type GalleryDir = {
  name: string;
  path: string;
  href: string;
  cover?: string;
  count?: number;
  capped?: boolean;
  hidden?: boolean;
};

export type GalleryImage = {
  name: string;
  key: string;
  href: string;
  size: number;
  uploaded?: string;
};

export type GalleryFile = {
  name: string;
  key: string;
  href: string;
  size: number;
};

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function niceBytes(x: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let n = Math.max(0, x || 0);
  let i = 0;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function breadcrumbs(path: string): string {
  const parts = path.split("/").filter(Boolean);
  let acc = "";
  let out = `<a class="crumb" href="/">根目录</a>`;
  for (const part of parts) {
    acc += encodeURIComponent(part) + "/";
    out += `<span class="crumb-sep">/</span><a class="crumb" data-user-content href="/${acc}">${escapeHtml(
      part
    )}</a>`;
  }
  return out;
}

// 画廊专属 Favicon（圆角印章 + 画框山月线条）
const FAVICON_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">` +
      `<rect width="512" height="512" rx="112" fill="#edf2e3"/>` +
      `<rect x="86" y="102" width="340" height="308" rx="44" fill="none" stroke="#5c732b" stroke-width="30"/>` +
      `<circle cx="192" cy="204" r="30" fill="#859f3d"/>` +
      `<path d="M116 368 220 256l78 78 54-56 64 90" fill="none" stroke="#5c732b" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/>` +
      `</svg>`
  );

// 顶栏与界面图标（含品牌图形 Logo 与管理员模式入口图标）
const ICONS = {
  brandLogo: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4.2"/><circle cx="8.8" cy="8.8" r="1.65" fill="currentColor" stroke="none"/><path d="m20.5 15.5-4.4-4.4a1.4 1.4 0 0 0-2 0L5.5 19.7"/></svg>`,
  palette: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  moon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  // 专门设计的「管理员模式入口」盾牌星徽图标
  adminPortal: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></svg>`,
  languages: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6m-7 0 6-6 2-3M2 5h12M7 2h1m14 20-5-10-5 10m2-4h6"/></svg>`,
  more: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>`,
  logout: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>`,
  folderPlus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
  share: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
  sliders: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="4" y1="21" y2="14"/><line x1="4" x2="4" y1="10" y2="3"/><line x1="12" x2="12" y1="21" y2="12"/><line x1="12" x2="12" y1="8" y2="3"/><line x1="20" x2="20" y1="21" y2="16"/><line x1="20" x2="20" y1="12" y2="3"/><line x1="2" x2="6" y1="14" y2="14"/><line x1="10" x2="14" y1="8" y2="8"/><line x1="18" x2="22" y1="16" y2="16"/></svg>`,
  folder: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
  eyeOff: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>`,
  arrowUp: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`,
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
};

export function galleryHtml(opts: {
  path: string;
  dirs: GalleryDir[];
  images: GalleryImage[];
  files: GalleryFile[];
  hasMore: boolean;
  moreHref: string;
  parentHref: string | null;
  totalBytes: number;
  isAdmin: boolean;
  adminUsername: string;
  hiddenDirs: string[];
  currentDirHidden: boolean;
}): string {
  const {
    path,
    dirs,
    images,
    files,
    hasMore,
    moreHref,
    parentHref,
    totalBytes,
    isAdmin,
    adminUsername,
    hiddenDirs,
    currentDirHidden,
  } = opts;
  const cleanPath = path.replace(/^\/+|\/+$/g, "");
  const displayPath = cleanPath ? `/${cleanPath}/` : "/";
  const stats = [
    dirs.length ? `${dirs.length} 个文件夹` : "",
    images.length ? `${images.length} 张图片` : "",
    files.length ? `${files.length} 个文件` : "",
    totalBytes ? niceBytes(totalBytes) : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const dirCards = dirs
    .map((d) => {
      const cover = d.cover
        ? `<img class="dir-cover" loading="lazy" decoding="async" src="${d.cover}" alt="">`
        : `<span class="dir-cover dir-cover-empty" aria-hidden="true">${ICONS.folder}</span>`;
      const badge = d.hidden
        ? `<span class="dir-hidden-tag" title="不在公开画廊展示">${ICONS.eyeOff} 隐藏</span>`
        : "";
      const countText =
        d.count === undefined
          ? "文件夹"
          : `${d.capped ? "999+" : d.count} 张`;
      return `<div class="dir-item"><a class="dir-card" href="${d.href}" data-dir="${escapeHtml(d.path)}">${cover}${badge}<span class="dir-meta"><span class="dir-name" data-user-content>${escapeHtml(d.name)}</span><span class="dir-count">${countText}</span></span></a>${isAdmin ? `<button class="folder-manage" type="button" data-folder-manage="${escapeHtml(d.path)}" aria-label="管理文件夹" title="管理文件夹">${ICONS.more}</button>` : ""}</div>`;
    })
    .join("");

  const imgCells = images
    .map(
      (im, i) => `<a class="img-cell" href="${im.href}" data-key="${escapeHtml(
        im.key
      )}" data-name="${escapeHtml(im.name)}" data-size="${im.size}" title="${escapeHtml(
        im.name
      )}"><img ${
        i < 8 ? 'loading="eager" fetchpriority="high"' : 'loading="lazy"'
      } decoding="async" src="${im.href}" alt="${escapeHtml(
        im.name
      )}"><span class="img-label" data-user-content>${escapeHtml(
        im.name.replace(/\.(webp|jpe?g|png|gif|avif|bmp|svg|ico)$/i, "")
      )}</span>${
        isAdmin
          ? `<button class="select-mark" type="button" title="勾选/取消勾选" aria-label="勾选 ${escapeHtml(
              im.name
            )}">✓</button><button class="quick-share" type="button" title="生成短链分享" aria-label="分享 ${escapeHtml(
              im.name
            )}" data-share="${escapeHtml(im.key)}">${ICONS.share}</button>`
          : ""
      }</a>`
    )
    .join("");

  const fileRows = files
    .map(
      (f) => `<tr><td><a href="${f.href}">${escapeHtml(
        f.name
      )}</a></td><td>${niceBytes(f.size)}</td>${
        isAdmin
          ? `<td class="file-act"><button class="text-action" data-share="${escapeHtml(
              f.key
            )}" type="button">分享</button></td>`
          : ""
      }</tr>`
    )
    .join("");

  // 右上角图标栏：需要用的图标直接简洁摆出，管理员入口使用专属星徽盾章图标
  const topbarAdminControls = isAdmin
    ? `<button type="button" class="theme-trigger" id="topUploadBtn" title="上传文件到当前目录" aria-label="上传文件">${ICONS.upload}</button>` +
      `<button type="button" class="theme-trigger" id="newFolderBtn" title="新建文件夹" aria-label="新建文件夹">${ICONS.folderPlus}</button>` +
      `<button type="button" class="theme-trigger" id="sharesBtn" title="分享短链管理" aria-label="分享短链管理">${ICONS.share}</button>` +
      `<button type="button" class="theme-trigger" id="settingsBtn" title="目录展示设置（隐藏/公开）" aria-label="目录展示设置">${ICONS.sliders}</button>` +
      `<input id="fileInput" type="file" multiple hidden>`
    : "";

  const adminPortalButton = isAdmin
    ? `<button type="button" class="theme-trigger admin-portal-btn is-logged" id="logoutBtn" title="管理员模式已开启 (${escapeHtml(
        adminUsername
      )}) · 点击退出" aria-label="退出管理员模式">${ICONS.adminPortal}</button>`
    : `<button type="button" class="theme-trigger admin-portal-btn" id="loginOpen" title="管理员模式入口" aria-label="管理员模式入口">${ICONS.adminPortal}</button>`;

  const pathJson = JSON.stringify(cleanPath).replace(/</g, "\\u003c");
  const hiddenJson = JSON.stringify(hiddenDirs).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="zh-CN" data-theme="light" data-skin="classic">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#edf0f2">
<link rel="icon" href="${FAVICON_SVG}" type="image/svg+xml">
<title>R2 画廊 — ${escapeHtml(displayPath)}</title>
<script>
(function(){
  try {
    var m = localStorage.getItem("r2-gallery-theme") || "classic";
    if (m === "olive") m = "classic";
    if (m !== "classic" && m !== "light" && m !== "dark") m = "classic";
    var root = document.documentElement;
    root.dataset.themeMode = m;
    root.dataset.theme = m === "dark" ? "dark" : "light";
    root.dataset.skin = m === "classic" ? "classic" : "plus";
    root.style.colorScheme = m === "dark" ? "dark" : "light";
  } catch (e) {}
})();
</script>
<style>
:root {
  --app-side-padding-desktop: clamp(1rem, 3vw, 2.3rem);
  --app-side-padding-mobile: 0.8rem;
  --shell-max-width: 1180px;
  --bg: #f4f4f5;
  --bg-shade: #f4f4f5;
  --surface: #ffffff;
  --surface-soft: #fbfbfb;
  --surface-hover: #f5f5f4;
  --line: #d8d6ce;
  --line-hover: #c7c4ba;
  --line-strong: #99968b;
  --text: #23231f;
  --text-soft: #66645c;
  --text-faint: #8b897f;
  --focus-shadow: 0 0 0 3px rgba(35, 35, 31, 0.12);
  --accent-bg: #161615;
  --accent-bg-hover: #272725;
  --accent-text: #ffffff;
  --brand-accent: #161615;
  --brand-tint: #f1efe8;
  --logo-bg: linear-gradient(150deg, #32322d, #161615);
  --logo-text: #fbfaf7;
  --logo-title-grad: linear-gradient(96deg, #161615 8%, #43423b 54%, #6e6c63 96%);
  --danger: #b42318;
  --danger-soft: #fff0ef;
  --panel-bg: #ffffff;
  --panel-line: rgba(26, 26, 21, 0.1);
  --menu-bg: rgba(255, 255, 255, 0.97);
  --menu-line: rgba(30, 30, 24, 0.13);
  --menu-hover-bg: #f1efe8;
  --menu-active-bg: #161615;
  --menu-active-text: #ffffff;
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 16px;
  --shadow-panel: 0 1px 2px rgba(22, 22, 17, 0.05), 0 12px 28px -24px rgba(22, 22, 17, 0.23);
  --shadow-compose-panel: 0 10px 20px -18px rgba(22, 22, 17, 0.2);
}

html[data-theme="dark"] {
  --bg: #1a1a17;
  --bg-shade: #1a1a17;
  --surface: #252520;
  --surface-soft: #2a2a24;
  --surface-hover: #32322b;
  --line: #55554d;
  --line-hover: #68685e;
  --line-strong: #8c8a7f;
  --text: #ffffff;
  --text-soft: #afafaf;
  --text-faint: #96968e;
  --focus-shadow: 0 0 0 3px rgba(236, 233, 223, 0.18);
  --accent-bg: #eceff8;
  --accent-bg-hover: #d8dce8;
  --accent-text: #15161a;
  --brand-accent: #9bbd52;
  --brand-tint: #313528;
  --logo-bg: linear-gradient(150deg, #8ca843, #556b25);
  --logo-text: #f7faef;
  --logo-title-grad: linear-gradient(96deg, #e4eed0 8%, #b3cf72 52%, #859f3d 96%);
  --danger: #f18181;
  --danger-soft: #492b33;
  --panel-bg: #1f1f1c;
  --panel-line: rgba(255, 255, 255, 0.15);
  --menu-bg: rgba(38, 38, 33, 0.97);
  --menu-line: rgba(255, 255, 255, 0.13);
  --menu-hover-bg: #313129;
  --menu-active-bg: #ece9df;
  --menu-active-text: #15161a;
  --shadow-panel: 0 1px 2px rgba(0, 0, 0, 0.24), 0 12px 26px -24px rgba(0, 0, 0, 0.52);
  --shadow-compose-panel: 0 10px 20px -16px rgba(0, 0, 0, 0.42);
}

/* Classic Olive Skin */
html[data-skin="classic"] {
  --classic-brand: #859f3d;
  --classic-ink: #5c732b;
  --classic-tint: #edf2e3;
  --classic-blue: #486d8c;
  --classic-blue-tint: #edf3f8;
  --classic-warm: #886b51;
  --classic-warm-tint: #f6f0e9;
  --bg: #edf0f2;
  --bg-shade: #edf0f2;
  --surface: #ffffff;
  --surface-soft: #f7f8f9;
  --surface-hover: #f1f4f6;
  --line: #dce2e6;
  --line-hover: #bcc9d1;
  --line-strong: #859f3d;
  --text: #30393f;
  --text-soft: #6c7880;
  --text-faint: #85919a;
  --focus-shadow: 0 0 0 3px rgba(133, 159, 61, 0.18);
  --accent-bg: #5c732b;
  --accent-bg-hover: #4c6222;
  --accent-text: #ffffff;
  --brand-accent: #859f3d;
  --brand-tint: #edf2e3;
  --logo-bg: linear-gradient(150deg, #859f3d, #566c27);
  --logo-text: #f9fbf4;
  --logo-title-grad: linear-gradient(96deg, #4b6020 6%, #68822e 50%, #8ea844 96%);
  --panel-bg: #ffffff;
  --panel-line: rgba(83, 105, 43, 0.12);
  --menu-bg: rgba(255, 255, 255, 0.98);
  --menu-line: rgba(30, 30, 24, 0.13);
  --menu-hover-bg: #f0f3f5;
  --menu-active-bg: #5c732b;
  --menu-active-text: #ffffff;
  --radius-lg: 16px;
  --shadow-panel: 0 2px 8px rgba(50, 65, 33, 0.035), 0 8px 24px -18px rgba(50, 65, 33, 0.18);
  --shadow-compose-panel: 0 4px 20px -14px rgba(50, 65, 33, 0.22);
}

* { box-sizing: border-box; }
html, body {
  min-height: 100%;
  margin: 0;
  padding: 0;
  color: var(--text);
  background: var(--bg);
  font-family: "Avenir Next", "Segoe UI Variable Text", "PingFang SC", "Noto Sans SC", -apple-system, BlinkMacSystemFont, sans-serif;
  -webkit-font-smoothing: antialiased;
}
button, input, select, textarea { font: inherit; }
a, button { -webkit-tap-highlight-color: transparent; }

button, .btn {
  appearance: none;
  border: 1px solid var(--line);
  background: var(--surface-soft);
  color: var(--text);
  border-radius: var(--radius-sm);
  cursor: pointer;
  user-select: none;
  padding: 0.5rem 0.88rem;
  font-size: 0.86rem;
  line-height: 1.15;
  transition: background-color 0.16s, border-color 0.16s, color 0.16s, transform 0.16s;
}
button:hover:not(:disabled), .btn:hover:not(:disabled) {
  background: var(--surface-hover);
  border-color: var(--line-hover);
}
button:active:not(:disabled), .btn:active:not(:disabled) {
  transform: translateY(1px);
}
.btn-primary {
  background: var(--accent-bg);
  border-color: var(--accent-bg);
  color: var(--accent-text);
}
.btn-primary:hover:not(:disabled) {
  background: var(--accent-bg-hover);
  border-color: var(--accent-bg-hover);
  color: var(--accent-text);
}
.btn-danger {
  color: var(--danger);
  background: var(--danger-soft);
  border-color: #efcbc8;
}

/* Fixed topbar + brandmark logo */
.app-topbar {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 44;
  width: 100%;
  min-height: 54px;
  border-bottom: 1px solid var(--panel-line);
  background: var(--surface);
}
html[data-skin="classic"] .app-topbar {
  box-shadow: 0 1px 8px rgba(50, 65, 33, 0.035);
}
.app-topbar-content {
  width: min(var(--shell-max-width), calc(100% - var(--app-side-padding-desktop) * 2));
  min-height: 54px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.app-topbar-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.72rem;
  min-width: 0;
}
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  min-width: 0;
}
.brandmark {
  flex: 0 0 auto;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 9.5px;
  background: var(--logo-bg);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.24), var(--shadow-panel);
  color: var(--logo-text);
  line-height: 1;
}
.brandmark svg {
  width: 20px;
  height: 20px;
  display: block;
}
.brandtext {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.brandname {
  font-size: 16.5px;
  font-weight: 740;
  letter-spacing: 0.02em;
  line-height: 1.18;
  white-space: nowrap;
  background: var(--logo-title-grad);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: var(--text);
}
.brandsub {
  font-size: 9.5px;
  font-weight: 640;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--text-faint);
  line-height: 1.1;
}
.admin-badge {
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.14rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--surface-soft);
  color: var(--text-soft);
}
html[data-skin="classic"] .admin-badge {
  background: var(--classic-tint);
  color: var(--classic-ink);
  border-color: #dce6c9;
}

.app-controls {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}
.topbar-option-wrap { position: relative; }
.theme-trigger {
  width: 34px;
  min-width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-soft);
  box-shadow: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.theme-trigger svg {
  width: 1rem;
  height: 1rem;
}
.theme-trigger:hover, .theme-trigger.is-open {
  background: color-mix(in srgb, var(--text) 7%, transparent);
  color: var(--text);
  border: 0;
}
html[data-skin="classic"] .theme-trigger:hover,
html[data-skin="classic"] .theme-trigger.is-open {
  background: var(--classic-tint);
  color: var(--classic-ink);
}
.admin-portal-btn.is-logged {
  color: var(--brand-accent);
  background: var(--brand-tint);
}
html[data-skin="classic"] .admin-portal-btn.is-logged {
  color: var(--classic-ink);
  background: var(--classic-tint);
  box-shadow: inset 0 0 0 1px #dce6c9;
}
.topbar-option-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 56;
  min-width: 156px;
  padding: 0.3rem;
  border: 1px solid var(--menu-line);
  border-radius: 12px;
  background: var(--menu-bg);
  box-shadow: 0 22px 28px -24px rgba(0, 0, 0, 0.65);
  display: none;
  gap: 0.18rem;
}
.topbar-option-menu.open { display: grid; }
.topbar-option-item {
  width: 100%;
  min-height: 34px;
  padding: 0.42rem 0.6rem;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-soft);
  font-size: 0.84rem;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 0.55rem;
}
.topbar-option-item svg { width: 0.92rem; height: 0.92rem; flex-shrink: 0; }
.topbar-option-item:hover {
  background: var(--menu-hover-bg);
  color: var(--text);
}
.topbar-option-item.is-active {
  background: var(--menu-active-bg);
  color: var(--menu-active-text);
}

/* Main workspace shell */
.app-root {
  min-height: 100vh;
  padding: calc(54px + 1.5rem) var(--app-side-padding-desktop) 2.6rem;
}
.app-shell {
  width: min(var(--shell-max-width), 100%);
  margin: 0 auto;
  display: grid;
  gap: 1rem;
}
.workspace-panel {
  background: var(--panel-bg);
  border: 1px solid var(--panel-line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-compose-panel);
  padding: 0.82rem 1.05rem;
}
html[data-skin="classic"] .workspace-panel {
  border-top: 3px solid var(--classic-brand);
}
.toolbar-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
}
.up-btn {
  width: 30px;
  min-width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: var(--surface-soft);
  color: var(--text-soft);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.up-btn svg { width: 0.95rem; height: 0.95rem; }
.up-btn:hover {
  border-color: var(--line-hover);
  color: var(--text);
  background: var(--surface-hover);
}
.crumbs {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.22rem;
  font-size: 0.9rem;
  min-width: 0;
}
.crumb {
  color: var(--text-soft);
  text-decoration: none;
  padding: 0.18rem 0.42rem;
  border-radius: 7px;
  max-width: 32vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.crumb:hover { background: var(--surface-hover); color: var(--text); }
.crumb:last-child {
  color: var(--text);
  font-weight: 640;
}
html[data-skin="classic"] .crumb:last-child {
  color: var(--classic-ink);
  background: var(--classic-tint);
}
.crumb-sep { color: var(--text-faint); font-size: 0.82rem; }
.toolbar-meta {
  flex-wrap: wrap;
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
.stats-pill {
  color: var(--text-faint);
  font-size: 0.8rem;
  white-space: nowrap;
}
.hide-dir-chip {
  height: 28px;
  padding: 0 0.62rem;
  font-size: 0.76rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  white-space: nowrap;
}
.hide-dir-chip svg {
  width: 0.85rem;
  height: 0.85rem;
  flex-shrink: 0;
}
.hide-dir-chip.is-hidden {
  color: var(--danger);
  border-color: #efcbc8;
  background: var(--danger-soft);
}
.filter-box {
  position: relative;
  display: inline-flex;
  align-items: center;
}
.filter-box svg {
  position: absolute;
  left: 9px;
  width: 0.85rem;
  height: 0.85rem;
  color: var(--text-faint);
  pointer-events: none;
}
.filter-input {
  height: 31px;
  width: 185px;
  padding: 0 0.65rem 0 1.85rem;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 0.83rem;
  outline: none;
}
.filter-input:focus {
  border-color: var(--line-strong);
  background: var(--surface);
  box-shadow: var(--focus-shadow);
}

/* Content cards */
.content-card {
  background: var(--panel-bg);
  border: 1px solid var(--panel-line);
  border-radius: 14px;
  box-shadow: var(--shadow-panel);
  padding: 1rem 1.05rem 1.1rem;
}
.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 0 0.78rem;
  padding-bottom: 0.48rem;
  border-bottom: 1px solid var(--panel-line);
  font-size: 0.86rem;
  font-weight: 650;
  color: var(--text-soft);
}
.section-count {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-faint);
  background: var(--surface-soft);
  border: 1px solid var(--line);
  padding: 0.08rem 0.48rem;
  border-radius: 999px;
}

.dirs {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(176px, 1fr));
  gap: 0.78rem;
}
.dir-card {
  position: relative;
  display: block;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-soft);
  text-decoration: none;
  transition: border-color 0.16s, transform 0.16s, box-shadow 0.16s;
}
.dir-card:hover {
  border-color: var(--line-strong);
  transform: translateY(-2px);
  box-shadow: var(--shadow-panel);
}
.dir-cover {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  object-position: 50% 25%;
  background: var(--bg);
}
.dir-cover-empty {
  display: grid;
  place-items: center;
  color: var(--text-faint);
}
.dir-cover-empty svg { width: 2rem; height: 2rem; }
.dir-hidden-tag {
  position: absolute;
  top: 7px;
  right: 7px;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(25, 25, 24, 0.78);
  color: #ffd7d3;
  font-size: 0.68rem;
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.dir-hidden-tag svg { width: 0.72rem; height: 0.72rem; }
.dir-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  padding: 0.56rem 0.7rem;
  border-top: 1px solid var(--panel-line);
  background: var(--surface);
}
.dir-name {
  font-size: 0.86rem;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dir-count {
  font-size: 0.72rem;
  color: var(--text-faint);
  white-space: nowrap;
}
html[data-skin="classic"] .dir-count {
  color: var(--classic-ink);
  background: var(--classic-tint);
  padding: 0.06rem 0.42rem;
  border-radius: 999px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 0.75rem;
}
.img-cell {
  position: relative;
  display: block;
  aspect-ratio: 3 / 4;
  border: 1px solid var(--line);
  border-radius: 12px;
  overflow: hidden;
  background: var(--surface-soft);
  transition: border-color 0.16s, transform 0.16s, box-shadow 0.16s;
}
.img-cell:hover {
  border-color: var(--line-strong);
  transform: translateY(-2px);
  box-shadow: var(--shadow-panel);
}
.img-cell > img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 22%;
  transition: transform 0.22s ease;
}
.img-cell:hover > img { transform: scale(1.025); }
.img-label {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  padding: 20px 9px 7px;
  color: #ffffff;
  background: linear-gradient(transparent, rgba(16, 18, 16, 0.78));
  font-size: 0.76rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.15s;
  pointer-events: none;
}
.img-cell:hover .img-label { opacity: 1; }
.select-mark {
  position: absolute;
  top: 7px; left: 7px;
  width: 24px; min-width: 24px; height: 24px;
  padding: 0;
  border: 1.5px solid rgba(255, 255, 255, 0.88);
  border-radius: 7px;
  background: rgba(18, 20, 18, 0.48);
  color: transparent;
  font-size: 13px;
  font-weight: 700;
  display: grid;
  place-items: center;
  z-index: 3;
}
.select-mark:hover {
  background: rgba(18, 20, 18, 0.72);
  color: rgba(255, 255, 255, 0.55);
}
.img-cell.selected {
  outline: 2.5px solid var(--brand-accent);
  outline-offset: -2px;
}
.img-cell.selected .select-mark {
  background: var(--accent-bg);
  border-color: #ffffff;
  color: #ffffff;
}
.quick-share {
  position: absolute;
  top: 7px; right: 7px;
  width: 26px; min-width: 26px; height: 26px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.7);
  border-radius: 7px;
  background: rgba(18, 20, 18, 0.58);
  color: #ffffff;
  display: grid;
  place-items: center;
  opacity: 0;
  transition: opacity 0.15s;
  z-index: 3;
}
.quick-share svg { width: 0.82rem; height: 0.82rem; }
.img-cell:hover .quick-share { opacity: 1; }

.files {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
}
.files td {
  padding: 0.58rem 0.65rem;
  border-bottom: 1px solid var(--panel-line);
}
.files tr:last-child td { border-bottom: 0; }
.files td:nth-child(2) {
  width: 96px;
  text-align: right;
  color: var(--text-faint);
  white-space: nowrap;
}
.files td.file-act { width: 64px; text-align: right; }
.files a { color: var(--text); text-decoration: none; }
html[data-skin="classic"] .files a { color: var(--classic-blue); }
.files a:hover { text-decoration: underline; }
.text-action {
  padding: 0.2rem 0.45rem;
  border: 0;
  background: transparent;
  color: var(--accent-bg);
  font-size: 0.8rem;
}

.empty {
  padding: 2.8rem 1rem;
  text-align: center;
  color: var(--text-soft);
  font-size: 0.9rem;
}
.more { text-align: center; margin-top: 0.4rem; }
footer {
  text-align: center;
  color: var(--text-faint);
  font-size: 0.78rem;
  padding: 0.6rem 0 0.2rem;
}

/* Floating multi-select bar */
.selection-bar {
  display: none;
  position: fixed;
  z-index: 48;
  bottom: max(18px, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
  gap: 0.42rem;
  max-width: calc(100vw - 20px);
  padding: 0.48rem 0.62rem;
  border: 1px solid var(--panel-line);
  border-radius: 13px;
  background: var(--panel-bg);
  box-shadow: var(--shadow-compose-panel);
}
html[data-skin="classic"] .selection-bar {
  border-top: 2px solid var(--classic-brand);
}
.selection-bar.on { display: flex; }
.selection-count {
  padding: 0 0.45rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-soft);
  white-space: nowrap;
}
.btn-quiet {
  padding: 0.38rem 0.68rem;
  font-size: 0.8rem;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 65;
  display: none;
  place-items: center;
  background: rgba(16, 16, 15, 0.56);
  backdrop-filter: blur(3px);
  padding: 1rem;
}
.modal-backdrop.open { display: grid; }
.modal {
  width: min(460px, 100%);
  max-height: min(84vh, 720px);
  overflow: auto;
  border: 1px solid var(--panel-line);
  border-radius: 16px;
  background: var(--panel-bg);
  box-shadow: 0 22px 48px -32px rgba(0, 0, 0, 0.55);
}
html[data-skin="classic"] .modal {
  border-top: 3px solid var(--classic-brand);
}
.modal.wide { width: min(760px, 100%); }
.modal-head {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.82rem 1rem;
  border-bottom: 1px solid var(--panel-line);
  background: var(--panel-bg);
}
.modal-title { font-size: 0.98rem; font-weight: 680; }
.modal-x {
  width: 28px; min-width: 28px; height: 28px;
  padding: 0;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--text-soft);
  font-size: 1.15rem;
}
.modal-body { padding: 1rem; }
.form-stack { display: grid; gap: 0.78rem; }
.form-label {
  display: block;
  margin-bottom: 0.32rem;
  color: var(--text-soft);
  font-size: 0.8rem;
}
.field {
  width: 100%;
  height: 36px;
  padding: 0 0.65rem;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface-soft);
  color: var(--text);
  font-size: 0.86rem;
  outline: none;
}
.field:focus {
  border-color: var(--line-strong);
  background: var(--surface);
  box-shadow: var(--focus-shadow);
}
.form-row { display: flex; align-items: center; gap: 0.5rem; }
.share-list { display: grid; gap: 0.56rem; }
.share-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.65rem;
  align-items: center;
  padding: 0.65rem 0.75rem;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface-soft);
}
.share-info { min-width: 0; }
.share-name {
  font-weight: 640;
  font-size: 0.84rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.share-url {
  display: block;
  color: var(--accent-bg);
  font-size: 0.78rem;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}
.share-url:hover { text-decoration: underline; }
.share-meta { margin-top: 3px; color: var(--text-faint); font-size: 0.73rem; }
.share-tools {
  display: flex;
  align-items: center;
  gap: 0.38rem;
  flex-wrap: wrap;
}
.share-tools select {
  height: 29px;
  padding: 0 0.45rem;
  border: 1px solid var(--line);
  border-radius: 8px;
  background: var(--surface);
  color: var(--text);
  font-size: 0.76rem;
}
.status { font-size: 0.72rem; color: var(--accent-bg); }
.status.expired { color: var(--danger); }
.folder-list {
  display: grid;
  gap: 0.38rem;
  max-height: 44vh;
  overflow: auto;
}
.folder-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  padding: 0.48rem 0.65rem;
  border: 1px solid var(--line);
  border-radius: 9px;
  background: var(--surface-soft);
}
.folder-row input[type="checkbox"] {
  accent-color: var(--accent-bg);
  width: 16px;
  height: 16px;
}

/* Lightbox preview */
#lightbox {
  background: rgba(10, 12, 10, 0.88);
  backdrop-filter: blur(5px);
}
.lb-wrap {
  position: relative;
  width: min(96vw, 1260px);
  height: min(90vh, 920px);
  display: grid;
  place-items: center;
}
#lightboxImage {
  max-width: calc(100vw - 2.6rem);
  max-height: calc(100vh - 5.4rem);
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 18px 46px rgba(0, 0, 0, 0.55);
}
.lb-btn {
  position: fixed;
  z-index: 70;
  width: 38px;
  min-width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(28, 30, 28, 0.78);
  color: #ffffff;
  font-size: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.lb-btn:hover { background: rgba(48, 52, 48, 0.92); color: #ffffff; }
#lightboxClose { top: max(0.85rem, env(safe-area-inset-top)); right: max(0.85rem, env(safe-area-inset-right)); }
#lightboxPrev { left: max(0.85rem, env(safe-area-inset-left)); top: 50%; transform: translateY(-50%); }
#lightboxNext { right: max(0.85rem, env(safe-area-inset-right)); top: 50%; transform: translateY(-50%); }
.lb-bar {
  position: fixed;
  bottom: max(1rem, env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  padding: 0.38rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(22, 24, 22, 0.78);
  color: #e8ece9;
  font-size: 0.8rem;
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  max-width: 92vw;
}
.lb-bar span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lb-bar a { color: #b8dc72; text-decoration: none; white-space: nowrap; }
.lb-bar a:hover { text-decoration: underline; }

/* Toast message */
.flash {
  position: fixed;
  top: max(0.9rem, env(safe-area-inset-top));
  right: 1rem;
  z-index: 90;
  max-width: min(380px, calc(100vw - 2rem));
  padding: 0.56rem 0.85rem;
  border: 1px solid var(--panel-line);
  border-left: 3px solid var(--brand-accent);
  border-radius: 12px;
  background: var(--panel-bg);
  color: var(--text);
  box-shadow: var(--shadow-panel);
  font-size: 0.84rem;
}
.flash.error { border-left-color: var(--danger); color: var(--danger); }

@media (max-width: 720px) {
  .app-root { padding: calc(52px + 0.95rem) var(--app-side-padding-mobile) 2.2rem; }
  .app-topbar-content { width: calc(100% - var(--app-side-padding-mobile) * 2); gap: 0.4rem; }
  .brandmark { width: 32px; height: 32px; font-size: 18px; border-radius: 8.5px; }
  .brandname { font-size: 15px; }
  .brandsub { font-size: 8.5px; letter-spacing: 0.14em; }
  .workspace-panel, .content-card { padding: 0.78rem; border-radius: 13px; }
  .toolbar-meta { width: 100%; justify-content: space-between; margin-left: 0; }
  .filter-box, .filter-input { width: 100%; }
  .dirs { grid-template-columns: repeat(auto-fill, minmax(136px, 1fr)); gap: 0.58rem; }
  .grid { grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 0.52rem; }
  .img-label, .quick-share { opacity: 1; }
  .share-row { grid-template-columns: 1fr; }
  .selection-bar { flex-wrap: wrap; justify-content: center; width: calc(100vw - 16px); }
}

.app-root { display: flex; flex-direction: column; min-height: 100dvh; }
.app-shell { flex: 1 0 auto; align-content: start; }
.gallery-footer { flex: 0 0 auto; margin-top: auto; padding-top: 2rem; text-align: center; }
.dir-item { position: relative; min-width: 0; }
.folder-manage { position: absolute; right: 8px; top: 8px; z-index: 4; width: 30px; height: 28px; padding: 5px; color: #fff; background: #20251de0; border: 1px solid #ffffff66; border-radius: 8px; }
.folder-manage svg { display: block; width: 18px; height: 16px; }
.folder-actions { display: grid; gap: .5rem; }
.folder-actions .btn { text-align: left; padding: .72rem; }
@media(max-width:600px) {
  .admin-mode-header .brandname { font-size: 13px; }
  .admin-mode-header .admin-badge { display: none; }
  .admin-mode-header .app-topbar-content { flex-wrap: wrap; padding-block: 6px; gap: 3px; }
  .admin-mode-header .brandmark { width: 28px; height: 28px; font-size: 17px; }
  .admin-mode-header .app-controls { gap: 0; }
  .admin-mode-header .theme-trigger { width: 30px; min-width: 30px; }
}
@media(max-width:390px) {
  .admin-mode-header .app-controls { flex: 1 0 100%; justify-content: flex-end; }
  body:has(.admin-mode-header) .app-root { padding-top: 108px; }
}
</style>
</head>
<body>
<header class="app-topbar ${isAdmin ? "admin-mode-header" : ""}">
  <div class="app-topbar-content">
    <div class="app-topbar-inner">
      <a class="brand" href="/">
        <span class="brandmark" aria-hidden="true">${ICONS.brandLogo}</span>
        <span class="brandtext">
          <strong class="brandname"><span class="brand-full">R2 画廊</span></strong>
          <span class="brandsub">Gallery</span>
        </span>
      </a>
      ${isAdmin ? `<span class="admin-badge" data-user-content>${escapeHtml(adminUsername)}</span>` : ""}
    </div>
    <div class="app-controls" aria-label="快捷操作">
      ${topbarAdminControls}
      <div class="topbar-option-wrap" id="languageMenuWrap">
        <button type="button" class="theme-trigger" id="languageTrigger" aria-label="切换语言" title="切换语言" aria-haspopup="menu" aria-expanded="false">${ICONS.languages}</button>
        <div class="topbar-option-menu" id="languageMenu" role="menu">
          <button class="topbar-option-item" type="button" data-language="zh-CN" lang="zh-CN">简体中文</button>
          <button class="topbar-option-item" type="button" data-language="en" lang="en">English</button>
        </div>
      </div>
      <div class="topbar-option-wrap" id="themeMenuWrap">
        <button type="button" class="theme-trigger" id="themeTrigger" title="切换皮肤" aria-label="切换皮肤" aria-haspopup="menu">${ICONS.palette}</button>
        <div class="topbar-option-menu" id="themeMenu" role="menu">
          <button type="button" class="topbar-option-item" data-theme-choice="classic">${ICONS.palette}<span>经典榄绿</span></button>
          <button type="button" class="topbar-option-item" data-theme-choice="light">${ICONS.sun}<span>简约浅色</span></button>
          <button type="button" class="topbar-option-item" data-theme-choice="dark">${ICONS.moon}<span>深色模式</span></button>
        </div>
      </div>
      ${adminPortalButton}
    </div>
  </div>
</header>

<div class="app-root">
  <main class="app-shell ${isAdmin ? "admin-mode" : ""}" id="gallery">
    <section class="workspace-panel">
      <div class="toolbar-row">
        ${
          parentHref
            ? `<a class="up-btn" href="${parentHref}" title="返回上一级" aria-label="返回上一级">${ICONS.arrowUp}</a>`
            : ""
        }
        <nav class="crumbs" aria-label="当前路径">${breadcrumbs(cleanPath)}</nav>
        <div class="toolbar-meta">
          <span class="stats-pill">${escapeHtml(stats || "空目录")}</span>
          ${
            isAdmin && cleanPath
              ? `<button class="btn hide-dir-chip ${
                  currentDirHidden ? "is-hidden" : ""
                }" id="hideCurrentBtn" type="button" title="控制该文件夹是否在访客画廊展示">${
                  ICONS.eyeOff
                }<span>${
                  currentDirHidden ? "已隐藏 · 点击恢复" : "隐藏此目录"
                }</span></button>`
              : ""
          }
          ${
            dirs.length + images.length + files.length > 6
              ? `<div class="filter-box">${ICONS.search}<input class="filter-input" id="filter" type="search" placeholder="筛选本目录…" autocomplete="off"></div>`
              : ""
          }
        </div>
      </div>
    </section>

    ${
      dirs.length
        ? `<section class="content-card"><div class="section-head"><span>文件夹</span><span class="section-count">${dirs.length}</span></div><div class="dirs">${dirCards}</div></section>`
        : ""
    }
    ${
      images.length
        ? `<section class="content-card"><div class="section-head"><span>图片</span><span class="section-count">${images.length}</span></div><div class="grid">${imgCells}</div></section>`
        : ""
    }
    ${
      files.length
        ? `<section class="content-card"><div class="section-head"><span>其他文件</span><span class="section-count">${files.length}</span></div><table class="files"><tbody>${fileRows}</tbody></table></section>`
        : ""
    }
    ${
      !dirs.length && !images.length && !files.length
        ? `<section class="content-card"><div class="empty">这个文件夹还没有内容</div></section>`
        : ""
    }
    ${
      hasMore
        ? `<div class="more"><a class="btn" href="${moreHref}">加载更多 ↓</a></div>`
        : ""
    }
  </main>
  <footer class="gallery-footer">R2 画廊 · 图片直链仅供个人收藏欣赏</footer>
</div>

${
  isAdmin
    ? `<div class="selection-bar" id="selectionBar"><span class="selection-count" id="selectionCount">0 项已选</span><button class="btn btn-quiet" id="selectAllBtn" type="button">全选</button><button class="btn btn-quiet" id="downloadBtn" type="button">下载 ZIP</button><button class="btn btn-quiet" id="copyBtn" type="button">复制到</button><button class="btn btn-quiet" id="moveBtn" type="button">移动到</button><button class="btn btn-danger btn-quiet" id="deleteBtn" type="button">删除</button><button class="btn btn-primary btn-quiet" id="shareSelectedBtn" type="button">生成短链</button></div>`
    : ""
}

<div class="modal-backdrop" id="modal"><div class="modal" role="dialog" aria-modal="true"><div class="modal-head"><span class="modal-title" id="modalTitle"></span><button class="modal-x" id="modalClose" type="button" aria-label="关闭">×</button></div><div class="modal-body" id="modalBody"></div></div></div>

<div id="lightbox" class="modal-backdrop" role="dialog" aria-modal="true">
  <div class="lb-wrap">
    <button class="lb-btn" id="lightboxClose" type="button" aria-label="关闭">×</button>
    <button class="lb-btn" id="lightboxPrev" type="button" aria-label="上一张">‹</button>
    <img id="lightboxImage" alt="">
    <button class="lb-btn" id="lightboxNext" type="button" aria-label="下一张">›</button>
    <div class="lb-bar"><span id="lightboxCaption"></span><a id="lightboxRaw" target="_blank" rel="noopener">查看原图 ↗</a></div>
  </div>
</div>

<script>
(function(){
  var API="/_gallery/api/", DIR=${pathJson}, HIDDEN=${hiddenJson};
  ${I18N_CLIENT}
  var $=function(s,r){return (r||document).querySelector(s)}, $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};

  // 封面图报错时优雅回退文件夹图标
  $$("img.dir-cover").forEach(function(im){
    im.addEventListener("error",function(){
      var s=document.createElement("span");
      s.className="dir-cover dir-cover-empty";
      s.innerHTML=${JSON.stringify(ICONS.folder)};
      if(im.parentNode)im.parentNode.replaceChild(s,im);
    });
  });

  // 皮肤切换（下拉菜单：经典榄绿 / 简约浅色 / 深色模式）
  var themeIcons={
    classic:${JSON.stringify(ICONS.palette)},
    light:${JSON.stringify(ICONS.sun)},
    dark:${JSON.stringify(ICONS.moon)}
  };
  var themeTrigger=$("#themeTrigger"), themeMenu=$("#themeMenu"), themeWrap=$("#themeMenuWrap");
  function applyTheme(m){
    if(m==="olive")m="classic";
    if(["classic","light","dark"].indexOf(m)<0)m="classic";
    var root=document.documentElement;
    root.dataset.themeMode=m;
    root.dataset.theme=m==="dark"?"dark":"light";
    root.dataset.skin=m==="classic"?"classic":"plus";
    root.style.colorScheme=m==="dark"?"dark":"light";
    try{localStorage.setItem("r2-gallery-theme",m)}catch(e){}
    if(themeTrigger)themeTrigger.innerHTML=themeIcons[m]||themeIcons.classic;
    $$("[data-theme-choice]").forEach(function(b){
      b.classList.toggle("is-active",b.dataset.themeChoice===m);
    });
  }
  applyTheme(document.documentElement.dataset.themeMode||"classic");
  if(themeTrigger){
    themeTrigger.onclick=function(e){
      e.stopPropagation();
      var open=themeMenu.classList.toggle("open");
      themeTrigger.classList.toggle("is-open",open);
    };
  }
  $$("[data-theme-choice]").forEach(function(b){
    b.onclick=function(){
      applyTheme(b.dataset.themeChoice);
      themeMenu.classList.remove("open");
      themeTrigger.classList.remove("is-open");
    };
  });
  document.addEventListener("click",function(e){
    if(themeWrap&&!themeWrap.contains(e.target)){
      themeMenu.classList.remove("open");
      if(themeTrigger)themeTrigger.classList.remove("is-open");
    }
  });

  function toast(msg,error){
    var el=document.createElement("div");
    el.className="flash"+(error?" error":"");
    el.textContent=tr(msg);
    document.body.appendChild(el);
    setTimeout(function(){el.remove()},3200);
  }
  function api(path,opts){
    opts=opts||{};
    opts.credentials="same-origin";
    opts.headers=Object.assign({"content-type":"application/json"},opts.headers||{});
    return fetch(API+path,opts).then(function(r){
      return r.json().then(function(d){
        if(!r.ok)throw new Error(d.error||("HTTP "+r.status));
        return d;
      });
    });
  }
  function modal(title,html,wide){
    $("#modalTitle").textContent=title;
    $("#modalBody").innerHTML=html;
    $("#modal .modal").classList.toggle("wide",!!wide);
    $("#modal").classList.add("open");
    return $("#modalBody");
  }
  function closeModal(){$("#modal").classList.remove("open")}
  $("#modalClose").onclick=closeModal;
  $("#modal").addEventListener("click",function(e){if(e.target===$("#modal")&&!$("#modalClose").disabled)closeModal()});
  function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}

  var isAdmin=${isAdmin ? "true" : "false"}, selected=[];
  var tiles=$$(".img-cell");

  function setSelected(tile,on){
    if(!tile)return;
    tile.classList.toggle("selected",on);
    var key=tile.dataset.key;
    if(on&&selected.indexOf(key)<0)selected.push(key);
    if(!on)selected=selected.filter(function(k){return k!==key});
    var bar=$("#selectionBar");
    if(bar){
      bar.classList.toggle("on",selected.length>0);
      $("#selectionCount").textContent=selected.length+" 项已选";
    }
  }

  $$(".select-mark").forEach(function(btn){
    btn.addEventListener("click",function(e){
      e.preventDefault();
      e.stopPropagation();
      var cell=btn.closest(".img-cell");
      setSelected(cell,!cell.classList.contains("selected"));
    });
  });

  function doDownload(keys){
    if(!keys.length)return;
    fetch(API+"download",{
      method:"POST",
      credentials:"same-origin",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({keys:keys})
    }).then(function(r){
      if(!r.ok)return r.json().then(function(d){throw new Error(d.error||"下载失败")});
      return r.blob();
    }).then(function(blob){
      var a=document.createElement("a");
      a.href=URL.createObjectURL(blob);
      a.download="gallery-"+new Date().toISOString().slice(0,10)+".zip";
      a.click();
      setTimeout(function(){URL.revokeObjectURL(a.href)},30000);
    }).catch(function(e){toast(e.message,true)});
  }

  function folderPicker(title,action){
    api("dirs?prefix=").then(function(data){
      modal(title,'<div class="form-stack"><div class="folder-list" id="folderList"></div><label><span class="form-label">目标文件夹路径（可直接输入新路径）</span><input class="field" id="targetPath" value="'+esc(DIR)+'" placeholder="根目录可留空"></label><div class="form-row" style="justify-content:flex-end"><button class="btn" id="cancelAction" type="button">取消</button><button class="btn btn-primary" id="confirmAction" type="button">确认</button></div></div>');
      data.dirs.forEach(function(d){
        var row=document.createElement("button");
        row.className="folder-row";
        row.type="button";
        row.innerHTML='<span>'+esc(d.name)+'</span><small style="color:var(--text-faint)">/'+esc(d.path)+'</small>';
        row.onclick=function(){$("#targetPath").value=d.path};
        $("#folderList").appendChild(row);
      });
      $("#cancelAction").onclick=closeModal;
      $("#confirmAction").onclick=function(){
        var target=$("#targetPath").value.trim().replace(/^\\/+|\\/+$/g,"");
        api(action,{method:"POST",body:JSON.stringify({keys:selected,targetDir:target})}).then(function(d){
          toast((action==="move"?"移动":"复制")+"完成："+d.count+" 项");
          closeModal();
          setTimeout(function(){location.reload()},450);
        }).catch(function(e){toast(e.message,true)});
      };
    }).catch(function(e){toast(e.message,true)});
  }

  function createFolder(path){
    if(!path)return toast("请填写文件夹路径",true);
    api("mkdir",{method:"POST",body:JSON.stringify({path:path})}).then(function(){
      toast("文件夹已创建");
      closeModal();
      location.reload();
    }).catch(function(e){toast(e.message,true)});
  }

  function createShare(key){
    modal("生成图片分享短链",'<div class="form-stack"><div><span class="form-label">目标文件</span><div style="font-size:.82rem;overflow-wrap:anywhere">'+esc(key)+'</div></div><label><span class="form-label">有效期</span><select class="field" id="shareExpiry"><option value="3600">1 小时</option><option value="86400" selected>1 天</option><option value="604800">7 天</option><option value="2592000">30 天</option><option value="0">永久有效</option></select></label><div class="form-row" style="justify-content:flex-end"><button class="btn" id="cancelShare" type="button">取消</button><button class="btn btn-primary" id="makeShare" type="button">生成短链</button></div></div>');
    $("#cancelShare").onclick=closeModal;
    $("#makeShare").onclick=function(){
      var n=parseInt($("#shareExpiry").value,10);
      api("shares",{method:"POST",body:JSON.stringify({key:key,expiresIn:n||null})}).then(function(d){
        modal("分享短链已生成",'<div class="form-stack"><div class="share-row"><div class="share-info"><div class="share-name">'+esc(key.split("/").pop())+'</div><a class="share-url" id="newUrl" href="'+esc(d.shortUrl)+'" target="_blank">'+esc(d.shortUrl)+'</a></div><button class="btn btn-primary btn-quiet" id="copyNew" type="button">复制链接</button></div><div class="share-meta">'+(d.expiresAt?"有效期至："+new Date(d.expiresAt).toLocaleString(galleryLanguage):"长期有效（可在后台随时调整或撤销）")+'</div></div>');
        $("#copyNew").onclick=function(){
          navigator.clipboard.writeText(d.shortUrl).then(function(){toast("短链已复制")});
        };
      }).catch(function(e){toast(e.message,true)});
    };
  }

  function showShares(){
    api("shares").then(function(data){
      var html=data.shares.length
        ? '<div class="share-list">'+data.shares.map(function(s){
            var expired=s.status==="expired";
            return '<div class="share-row"><div class="share-info"><div class="share-name">'+esc(s.key.split("/").pop())+' · <span class="status '+(expired?"expired":"")+'">'+(expired?"已过期":"有效")+'</span></div><a class="share-url" target="_blank" href="'+esc(s.shortUrl)+'">'+esc(s.shortUrl)+'</a><div class="share-meta">创建 '+new Date(s.createdAt).toLocaleString(galleryLanguage)+' · 已访问 '+(s.currentDownloads||0)+' 次'+(s.expiresAt?' · 到期 '+new Date(s.expiresAt).toLocaleString(galleryLanguage):" · 永久有效")+'</div></div><div class="share-tools"><select data-expiry="'+esc(s.shareId)+'"><option value="keep">调整有效期…</option><option value="3600">设为 1 小时后到期</option><option value="86400">设为 1 天后到期</option><option value="604800">设为 7 天后到期</option><option value="2592000">设为 30 天后到期</option><option value="0">设为永久有效</option></select><button class="btn btn-quiet" data-copy="'+esc(s.shortUrl)+'" type="button">复制</button><button class="btn btn-danger btn-quiet" data-revoke="'+esc(s.shareId)+'" type="button">撤销</button></div></div>';
          }).join("")+'</div>'
        : '<div class="empty">暂无分享链接</div>';
      var body=modal("分享链接状态与有效期管理",html,true);
      $$("[data-copy]",body).forEach(function(b){
        b.onclick=function(){navigator.clipboard.writeText(b.dataset.copy).then(function(){toast("链接已复制")})};
      });
      $$("[data-expiry]",body).forEach(function(sel){
        sel.onchange=function(){
          if(sel.value==="keep")return;
          var sec=parseInt(sel.value,10);
          api("shares",{method:"PATCH",body:JSON.stringify({shareId:sel.dataset.expiry,expiresIn:sec||null})}).then(function(){
            toast("有效期已更新");
            showShares();
          }).catch(function(e){toast(e.message,true)});
        };
      });
      $$("[data-revoke]",body).forEach(function(b){
        b.onclick=function(){
          if(!confirm(tr("确定撤销这条分享链接？")))return;
          api("shares?shareId="+encodeURIComponent(b.dataset.revoke),{method:"DELETE"}).then(function(){
            toast("已撤销");
            showShares();
          }).catch(function(e){toast(e.message,true)});
        };
      });
    }).catch(function(e){toast(e.message,true)});
  }

  function showSettings(){
    api("dirs?prefix="+encodeURIComponent(DIR)).then(function(data){
      var hidden=new Set(data.hiddenDirs||[]);
      var listHtml=data.dirs.length
        ? data.dirs.map(function(d){
            return '<label class="folder-row"><span>'+esc(d.name)+' <small style="color:var(--text-faint)">(/'+esc(d.path)+')</small></span><input type="checkbox" data-dir-toggle="'+esc(d.path)+'" '+(hidden.has(d.path)?"":"checked")+'></label>';
          }).join("")
        : '<div class="share-meta">当前层级没有子文件夹</div>';
      var body=modal("画廊目录展示设置",'<div class="form-stack"><div class="share-meta">勾选表示在公开画廊展示；取消勾选则对访客隐藏（知道原图直链仍可正常通过 render 分发）。</div><div class="folder-list">'+listHtml+'</div><div class="form-row" style="justify-content:flex-end"><button class="btn" id="closeSettings" type="button">关闭</button><button class="btn btn-primary" id="saveHidden" type="button">保存设置</button></div></div>');
      $("#closeSettings").onclick=closeModal;
      $("#saveHidden").onclick=function(){
        var next=new Set(data.hiddenDirs||[]);
        $$("[data-dir-toggle]",body).forEach(function(cb){
          if(cb.checked)next.delete(cb.dataset.dirToggle);
          else next.add(cb.dataset.dirToggle);
        });
        api("hidden-dirs",{method:"POST",body:JSON.stringify({hiddenDirs:Array.from(next)})}).then(function(){
          toast("目录展示设置已保存");
          closeModal();
          location.reload();
        }).catch(function(e){toast(e.message,true)});
      };
    }).catch(function(e){toast(e.message,true)});
  }

  if(isAdmin){
    if($("#logoutBtn"))$("#logoutBtn").onclick=function(){
      if(!confirm(tr("要退出管理员模式吗？")))return;
      api("logout",{method:"POST",body:"{}"}).then(function(){location.reload()});
    };
    if($("#sharesBtn"))$("#sharesBtn").onclick=showShares;
    if($("#settingsBtn"))$("#settingsBtn").onclick=showSettings;
    if($("#topUploadBtn"))$("#topUploadBtn").onclick=function(){$("#fileInput").click()};
    if($("#fileInput"))$("#fileInput").onchange=function(){
      var fs=Array.prototype.slice.call(this.files||[]);
      if(!fs.length)return;
      Promise.all(fs.map(function(f){
        var targetKey=(DIR?DIR+"/":"")+f.name;
        var uploadUrl=API+"upload?"+new URLSearchParams({key:targetKey}).toString();
        return fetch(uploadUrl,{method:"PUT",credentials:"same-origin",headers:{"content-type":f.type||"application/octet-stream"},body:f});
      })).then(function(rs){
        var bad=rs.filter(function(r){return !r.ok});
        if(bad.length)throw new Error("有 "+bad.length+" 个文件上传失败（可能同名已存在）");
        toast("已上传 "+fs.length+" 个文件");
        location.reload();
      }).catch(function(e){toast(e.message,true)});
    };
    if($("#newFolderBtn"))$("#newFolderBtn").onclick=function(){
      modal("新建文件夹",'<div class="form-stack"><label><span class="form-label">文件夹名称</span><input class="field" id="folderName" placeholder="例如：2026-相册"></label><div class="form-row" style="justify-content:flex-end"><button class="btn" id="cancelFolder" type="button">取消</button><button class="btn btn-primary" id="saveFolder" type="button">创建</button></div></div>');
      $("#cancelFolder").onclick=closeModal;
      $("#saveFolder").onclick=function(){
        var n=$("#folderName").value.trim();
        if(!n||n.indexOf("/")>=0)return toast("请输入有效的单级文件夹名称",true);
        createFolder((DIR?DIR+"/":"")+n);
      };
    };
    if($("#hideCurrentBtn"))$("#hideCurrentBtn").onclick=function(){
      api("hidden-dirs",{method:"POST",body:JSON.stringify({toggleDir:DIR,hide:${
        currentDirHidden ? "false" : "true"
      }})}).then(function(){
        toast("目录展示状态已更新");
        location.reload();
      }).catch(function(e){toast(e.message,true)});
    };
    if($("#selectAllBtn"))$("#selectAllBtn").onclick=function(){
      var all=tiles.every(function(t){return t.classList.contains("selected")});
      tiles.forEach(function(t){setSelected(t,!all)});
    };
    if($("#downloadBtn"))$("#downloadBtn").onclick=function(){doDownload(selected)};
    if($("#copyBtn"))$("#copyBtn").onclick=function(){folderPicker("复制到文件夹","copy")};
    if($("#moveBtn"))$("#moveBtn").onclick=function(){folderPicker("移动到文件夹","move")};
    if($("#deleteBtn"))$("#deleteBtn").onclick=function(){
      if(!selected.length)return;
      if(!confirm(tr("确定删除选中的 "+selected.length+" 个文件？此操作不可撤销。")))return;
      api("delete",{method:"POST",body:JSON.stringify({keys:selected})}).then(function(d){
        toast("已删除 "+d.deletedCount+" 项");
        location.reload();
      }).catch(function(e){toast(e.message,true)});
    };
    if($("#shareSelectedBtn"))$("#shareSelectedBtn").onclick=function(){
      if(selected.length!==1)return toast("请勾选 1 张图片生成分享短链",true);
      createShare(selected[0]);
    };
    $$("[data-share]").forEach(function(b){
      b.addEventListener("click",function(e){
        e.preventDefault();
        e.stopPropagation();
        createShare(b.dataset.share);
      });
    });
  }

  ${FOLDER_CLIENT}

  if(!isAdmin&&$("#loginOpen")){
    $("#loginOpen").onclick=function(){
      modal("开启管理员模式",'<div class="form-stack"><label><span class="form-label">管理员账号</span><input class="field" id="loginUser" value="${escapeHtml(adminUsername || "admin")}" autocomplete="username"></label><label><span class="form-label">密码</span><input class="field" id="loginPass" type="password" autocomplete="current-password" placeholder="请输入管理员密码"></label><div class="form-row" style="justify-content:flex-end"><button class="btn" id="cancelLogin" type="button">取消</button><button class="btn btn-primary" id="doLogin" type="button">进入管理模式</button></div></div>');
      $("#cancelLogin").onclick=closeModal;
      $("#doLogin").onclick=function(){
        api("login",{method:"POST",body:JSON.stringify({username:$("#loginUser").value,password:$("#loginPass").value})}).then(function(){
          location.reload();
        }).catch(function(e){toast(e.message,true)});
      };
      $("#loginPass").onkeydown=function(e){if(e.key==="Enter")$("#doLogin").click()};
      $("#loginPass").focus();
    };
  }

  var filter=$("#filter");
  if(filter){
    filter.oninput=function(){
      var q=filter.value.trim().toLowerCase();
      $$(".dir-card,.img-cell,.files tr").forEach(function(e){
        var name=(e.getAttribute("data-name")||e.textContent||"").toLowerCase();
        var visibleTarget=e.closest(".dir-item")||e;
        visibleTarget.style.display=!q||name.indexOf(q)>=0?"":"none";
      });
    };
  }

  var lb=$("#lightbox"),lbImg=$("#lightboxImage"),lbCap=$("#lightboxCaption"),lbRaw=$("#lightboxRaw"),idx=0;
  function visibleTiles(){return tiles.filter(function(t){return t.style.display!=="none"})}
  function showImage(n){
    var list=visibleTiles();
    if(!list.length)return;
    idx=(n+list.length)%list.length;
    var a=list[idx];
    lbImg.src=a.href;
    lbImg.alt=a.dataset.name||"";
    lbCap.textContent=(idx+1)+" / "+list.length+" · "+(a.dataset.name||"");
    lbCap.setAttribute("data-user-content","");
    if(lbRaw)lbRaw.href=a.href;
  }
  tiles.forEach(function(a){
    a.addEventListener("click",function(e){
      if(e.target.closest("button"))return;
      if(e.metaKey||e.ctrlKey||e.shiftKey||e.button!==0)return;
      e.preventDefault();
      if(isAdmin&&selected.length>0){
        setSelected(a,!a.classList.contains("selected"));
        return;
      }
      idx=visibleTiles().indexOf(a);
      showImage(idx<0?0:idx);
      lb.classList.add("open");
    });
  });
  $("#lightboxClose").onclick=function(){lb.classList.remove("open");lbImg.src=""};
  $("#lightboxPrev").onclick=function(e){e.stopPropagation();showImage(idx-1)};
  $("#lightboxNext").onclick=function(e){e.stopPropagation();showImage(idx+1)};
  lb.addEventListener("click",function(e){
    if(e.target===lb||e.target.classList.contains("lb-wrap")){
      lb.classList.remove("open");
      lbImg.src="";
    }
  });
  document.addEventListener("keydown",function(e){
    if(!lb.classList.contains("open"))return;
    if(e.key==="Escape")$("#lightboxClose").click();
    if(e.key==="ArrowLeft")showImage(idx-1);
    if(e.key==="ArrowRight")showImage(idx+1);
  });
})();
</script>
</body></html>`;
}
