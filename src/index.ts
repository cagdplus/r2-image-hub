import parseRange from "range-parser";
import { galleryHtml } from "./ui";
import { folderApi } from "./folder-ops";

export interface Env {
  R2_BUCKET: R2Bucket;
  BUCKET_NAME?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SECRET?: string;
  ALLOWED_ORIGINS?: string;
  CACHE_CONTROL?: string;
  PATH_PREFIX?: string;
  INDEX_FILE?: string;
  NOTFOUND_FILE?: string;
  DIRECTORY_LISTING?: boolean | string;
  ITEMS_PER_PAGE?: number | string;
  HIDE_HIDDEN_FILES?: boolean | string;
  DIRECTORY_CACHE_CONTROL?: string;
  LOGGING?: boolean | string;
  R2_RETRIES?: number | string;
}

export interface GalleryConfig {
  hiddenDirs: string[];
  adminUsername?: string;
  passwordSalt?: string;
  passwordHash?: string;
  jwtSecret?: string;
  updatedAt?: number;
}

export interface ShareMetadata {
  bucket: string;
  key: string;
  expiresAt?: number | null;
  currentDownloads: number;
  createdBy: string;
  createdAt: number;
  note?: string;
}

const IMAGE_EXT = /\.(webp|jpe?g|png|gif|avif|bmp|svg|ico)$/i;
const CONFIG_KEY = ".r2-explorer/gallery-config.json";
const SHARE_PREFIX = ".r2-explorer/sharable-links/";
const COOKIE_NAME = "r2_gallery_session";

// 自然排序：让 photo2 排在 photo10 前面（R2 默认按字典序返回）
const NAT_COLLATOR = new Intl.Collator("zh-Hans-CN", {
  numeric: true,
  sensitivity: "base",
});

export function natCompare(a: string, b: string): number {
  return NAT_COLLATOR.compare(a, b);
}

function normBool(v: boolean | string | undefined, fallback: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (v.toLowerCase() === "true") return true;
    if (v.toLowerCase() === "false") return false;
  }
  return fallback;
}

function normInt(v: number | string | undefined, fallback: number): number {
  if (typeof v === "number" && !isNaN(v)) return v;
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    if (!isNaN(n)) return n;
  }
  return fallback;
}

function normalizeDirPath(p: string): string {
  return p.trim().replace(/^\/+|\/+$/g, "");
}

function isSafeRelativePath(p: string, allowEmpty = false): boolean {
  const raw = p.trim();
  if (!raw) return allowEmpty;
  if (raw.includes("\\") || /[\x00-\x1f]/.test(raw)) return false;
  const clean = normalizeDirPath(raw);
  if (!clean) return allowEmpty;
  if (clean === ".r2-explorer" || clean.startsWith(".r2-explorer/")) return false;
  const segs = clean.split("/");
  for (const s of segs) {
    if (!s || s === "." || s === ".." || s.startsWith(".")) return false;
  }
  return true;
}

export function getNormalizedPrefix(env: Env): string {
  const p = normalizeDirPath(env.PATH_PREFIX || "");
  return p ? p + "/" : "";
}

export function withPathPrefix(relPath: string, env: Env): string {
  const pfx = getNormalizedPrefix(env);
  const clean = relPath.replace(/^\/+/, "");
  return pfx + clean;
}

export function stripPathPrefix(bucketKey: string, env: Env): string {
  const pfx = getNormalizedPrefix(env);
  const clean = bucketKey.replace(/^\/+/, "");
  if (pfx && clean.startsWith(pfx)) {
    return clean.slice(pfx.length);
  }
  return clean;
}

function isPathUnderHidden(path: string, hiddenDirs: string[]): boolean {
  const clean = normalizeDirPath(path);
  if (!clean) return false;
  for (const h of hiddenDirs) {
    const hc = normalizeDirPath(h);
    if (!hc) continue;
    if (clean === hc || clean.startsWith(hc + "/")) {
      return true;
    }
  }
  return false;
}

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload)
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function loadGalleryConfig(env: Env): Promise<GalleryConfig> {
  try {
    const obj = await env.R2_BUCKET.get(CONFIG_KEY);
    if (obj) {
      const parsed = JSON.parse(await obj.text()) as GalleryConfig;
      if (!Array.isArray(parsed.hiddenDirs)) parsed.hiddenDirs = [];
      parsed.hiddenDirs = Array.from(
        new Set(parsed.hiddenDirs.map(normalizeDirPath).filter(Boolean))
      );
      return parsed;
    }
  } catch (err) {
    if (normBool(env.LOGGING, true)) {
      console.error("Failed to load gallery config:", err);
    }
  }
  return { hiddenDirs: [] };
}

async function saveGalleryConfig(
  env: Env,
  cfg: GalleryConfig
): Promise<GalleryConfig> {
  cfg.hiddenDirs = Array.from(
    new Set((cfg.hiddenDirs || []).map(normalizeDirPath).filter(Boolean))
  ).sort(natCompare);
  cfg.updatedAt = Date.now();
  await env.R2_BUCKET.put(CONFIG_KEY, JSON.stringify(cfg, null, 2), {
    httpMetadata: { contentType: "application/json" },
  });
  return cfg;
}

async function getJwtSecret(env: Env, cfg: GalleryConfig): Promise<string> {
  if (env.ADMIN_SECRET) return env.ADMIN_SECRET;
  if (cfg.jwtSecret) return cfg.jwtSecret;
  cfg.jwtSecret =
    crypto.randomUUID().replace(/-/g, "") +
    crypto.randomUUID().replace(/-/g, "");
  await saveGalleryConfig(env, cfg);
  return cfg.jwtSecret;
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    out[k] = decodeURIComponent(v);
  }
  return out;
}

async function verifyAdminSession(
  request: Request,
  env: Env,
  cfg?: GalleryConfig
): Promise<{ isAdmin: boolean; username: string }> {
  const cookies = parseCookies(request.headers.get("cookie"));
  const token = cookies[COOKIE_NAME];
  if (!token) return { isAdmin: false, username: "" };

  const parts = token.split(".");
  if (parts.length !== 3) return { isAdmin: false, username: "" };
  const [userB64, expStr, sig] = parts;
  const exp = parseInt(expStr, 10);
  if (isNaN(exp) || Date.now() > exp) return { isAdmin: false, username: "" };

  const loadedCfg = cfg || (await loadGalleryConfig(env));
  const secret = await getJwtSecret(env, loadedCfg);
  const expectedSig = await hmacSign(`${userB64}.${expStr}`, secret);
  if (sig !== expectedSig) return { isAdmin: false, username: "" };

  let username = "admin";
  try {
    username = decodeURIComponent(escape(atob(userB64)));
  } catch {
    username = "admin";
  }
  return { isAdmin: true, username };
}

function guessContentType(key: string): string {
  const ext = key.slice(key.lastIndexOf(".") + 1).toLowerCase();
  const map: Record<string, string> = {
    webp: "image/webp",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    avif: "image/avif",
    bmp: "image/bmp",
    svg: "image/svg+xml",
    ico: "image/x-icon",
    mp4: "video/mp4",
    webm: "video/webm",
    json: "application/json",
    txt: "text/plain; charset=utf-8",
    md: "text/markdown; charset=utf-8",
    pdf: "application/pdf",
  };
  return map[ext] || "application/octet-stream";
}

function jsonResponse(data: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...(extraHeaders || {}),
    },
  });
}

// 处理短链访问：/share/<id> 或 /s/<id>
async function handleShareLink(
  shareId: string,
  request: Request,
  env: Env
): Promise<Response> {
  const cleanId = shareId.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleanId) {
    return new Response("Share link not found", { status: 404 });
  }
  const shareKey = `${SHARE_PREFIX}${cleanId}.json`;
  const shareObj = await env.R2_BUCKET.get(shareKey);
  if (!shareObj) {
    return new Response("分享链接不存在或已被撤销 (404)", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  let meta: ShareMetadata;
  try {
    meta = JSON.parse(await shareObj.text()) as ShareMetadata;
  } catch {
    return new Response("Invalid share metadata", { status: 500 });
  }

  if (meta.expiresAt && Date.now() > meta.expiresAt) {
    return new Response("该分享链接已过期 (410 Gone)", {
      status: 410,
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  }

  const targetKey = withPathPrefix(meta.key, env);
  let file =
    request.method === "HEAD"
      ? await env.R2_BUCKET.head(targetKey)
      : await env.R2_BUCKET.get(targetKey);
  if (!file && targetKey !== meta.key) {
    file =
      request.method === "HEAD"
        ? await env.R2_BUCKET.head(meta.key)
        : await env.R2_BUCKET.get(meta.key);
  }

  if (!file) {
    return new Response("原始文件不存在或已被移除 (404)", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (request.method === "GET") {
    meta.currentDownloads = (meta.currentDownloads || 0) + 1;
    await env.R2_BUCKET.put(shareKey, JSON.stringify(meta), {
      httpMetadata: { contentType: "application/json" },
      customMetadata: {
        targetBucket: meta.bucket || env.BUCKET_NAME || "R2_BUCKET",
        targetKey: meta.key,
      },
    });
  }

  const headers = new Headers();
  file.writeHttpMetadata(headers);
  if (!headers.get("content-type")) {
    headers.set("content-type", guessContentType(meta.key));
  }
  headers.set("etag", file.httpEtag);
  headers.set("content-length", file.size.toString());
  headers.set("cache-control", "private, no-cache");

  const fileName = meta.key.split("/").pop() || "image";
  const url = new URL(request.url);
  const dl = url.searchParams.get("download") === "1";
  const dispositionType = dl || !IMAGE_EXT.test(fileName) ? "attachment" : "inline";
  const asciiFileName = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  headers.set(
    "Content-Disposition",
    `${dispositionType}; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(
      fileName
    )}`
  );

  return new Response(hasBody(file) ? file.body : null, {
    status: 200,
    headers,
  });
}

// 管理员 API 路由：/_gallery/api/...
async function handleGalleryApi(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);
  const sub = url.pathname.replace(/^\/_gallery\/api\/?/, "");
  const cfg = await loadGalleryConfig(env);

  // 1. 登录接口
  if (sub === "login" && request.method === "POST") {
    let body: { username?: string; password?: string } = {};
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "请求格式错误" }, 400);
    }

    const inputUser = (body.username || "").trim();
    const inputPass = body.password || "";
    const expectedUser = env.ADMIN_USERNAME || cfg.adminUsername || "admin";

    if (inputUser !== expectedUser) {
      return jsonResponse({ error: "管理员账号或密码错误" }, 401);
    }

    let passValid = false;
    if (cfg.passwordHash && cfg.passwordSalt) {
      const candidate = await sha256Hex(`${cfg.passwordSalt}:${inputPass}`);
      passValid = candidate === cfg.passwordHash;
    } else if (env.ADMIN_PASSWORD) {
      passValid = inputPass === env.ADMIN_PASSWORD;
    } else {
      return jsonResponse(
        { error: "管理员密码尚未设置，请先配置 ADMIN_PASSWORD" },
        503
      );
    }

    if (!passValid) {
      return jsonResponse({ error: "管理员账号或密码错误" }, 401);
    }

    const secret = await getJwtSecret(env, cfg);
    const exp = Date.now() + 30 * 24 * 3600 * 1000; // 30 天有效期
    const userB64 = btoa(unescape(encodeURIComponent(expectedUser)));
    const sig = await hmacSign(`${userB64}.${exp}`, secret);
    const token = `${userB64}.${exp}.${sig}`;

    const isHttps = url.protocol === "https:";
    const cookie = `${COOKIE_NAME}=${encodeURIComponent(
      token
    )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 24 * 3600}${
      isHttps ? "; Secure" : ""
    }`;

    return jsonResponse(
      { ok: true, username: expectedUser },
      200,
      { "set-cookie": cookie }
    );
  }

  // 2. 退出登录
  if (sub === "logout" && request.method === "POST") {
    const cookie = `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
    return jsonResponse({ ok: true }, 200, { "set-cookie": cookie });
  }

  // 3. 会话检查
  const auth = await verifyAdminSession(request, env, cfg);
  if (sub === "session" && request.method === "GET") {
    return jsonResponse({
      isAdmin: auth.isAdmin,
      username: auth.username,
      hiddenDirs: auth.isAdmin ? cfg.hiddenDirs : [],
    });
  }

  if (!auth.isAdmin) {
    return jsonResponse({ error: "未登录或管理员会话已过期" }, 401);
  }

  // 4. 修改管理员密码
  if (sub === "password" && request.method === "POST") {
    const body = (await request.json()) as { newPassword?: string };
    const newPass = (body.newPassword || "").trim();
    if (newPass.length < 6) {
      return jsonResponse({ error: "新密码长度不能少于 6 位" }, 400);
    }
    const salt = crypto.randomUUID().replace(/-/g, "");
    cfg.passwordSalt = salt;
    cfg.passwordHash = await sha256Hex(`${salt}:${newPass}`);
    cfg.adminUsername = auth.username || "admin";
    await saveGalleryConfig(env, cfg);
    return jsonResponse({ ok: true });
  }

  // 5. 获取/设置隐藏文件夹 + 目录树扫描
  if (sub === "hidden-dirs") {
    if (request.method === "GET") {
      return jsonResponse({ hiddenDirs: cfg.hiddenDirs });
    }
    if (request.method === "POST") {
      const body = (await request.json()) as {
        hiddenDirs?: string[];
        toggleDir?: string;
        hide?: boolean;
      };
      if (Array.isArray(body.hiddenDirs)) {
        cfg.hiddenDirs = body.hiddenDirs;
      } else if (typeof body.toggleDir === "string") {
        const target = normalizeDirPath(body.toggleDir);
        const set = new Set(cfg.hiddenDirs.map(normalizeDirPath));
        if (body.hide) set.add(target);
        else set.delete(target);
        cfg.hiddenDirs = Array.from(set);
      }
      await saveGalleryConfig(env, cfg);
      return jsonResponse({ ok: true, hiddenDirs: cfg.hiddenDirs });
    }
  }

  // 6. 获取文件夹列表（供移动/复制目录选择器 & 文件夹显隐管理使用）
  if (sub === "dirs" && request.method === "GET") {
    const parent = normalizeDirPath(url.searchParams.get("prefix") || "");
    const relPrefix = parent ? parent + "/" : "";
    const bucketPrefix = withPathPrefix(relPrefix, env);
    const list = await env.R2_BUCKET.list({
      prefix: bucketPrefix,
      delimiter: "/",
      limit: 1000,
      include: [],
    } as R2ListOptions);

    const dirs: { path: string; name: string; hidden: boolean }[] = [];
    for (const dp of list.delimitedPrefixes) {
      const cleanRel = normalizeDirPath(stripPathPrefix(dp, env));
      const name = cleanRel.slice(relPrefix.length);
      if (!name || name.startsWith(".")) continue;
      dirs.push({
        path: cleanRel,
        name,
        hidden: isPathUnderHidden(cleanRel, cfg.hiddenDirs),
      });
    }
    dirs.sort((a, b) => natCompare(a.name, b.name));
    return jsonResponse({ prefix: parent, dirs, hiddenDirs: cfg.hiddenDirs });
  }

  // R2 没有真正的空目录对象，使用 .keep 隐藏占位文件，避免在父目录产生 0 字节同名空文件
  if (sub === "mkdir" && request.method === "POST") {
    const body = (await request.json()) as { path?: string };
    const rawPath = (body.path || "").trim();
    if (!isSafeRelativePath(rawPath, false)) {
      return jsonResponse({ error: "请输入有效文件夹路径" }, 400);
    }
    const folder = normalizeDirPath(rawPath);
    await env.R2_BUCKET.put(`${withPathPrefix(folder, env)}/.keep`, new Uint8Array(0), {
      httpMetadata: { contentType: "application/octet-stream" },
    });
    return jsonResponse({ ok: true, path: folder });
  }

  if (sub === "folder" && request.method === "POST") {
    return folderApi(request, env, auth.username, cfg, saveGalleryConfig);
  }

  // 多选下载为 ZIP（Store 模式，逐对象流式写出，不在 Worker 内存聚合整包）。
  if (sub === "download" && request.method === "POST") {
    const body = (await request.json()) as { keys?: string[] };
    const keys = Array.from(
      new Set(
        (body.keys || [])
          .map((k) => k.replace(/^\/+/, ""))
          .filter((k) => isSafeRelativePath(k, false))
      )
    );
    if (!keys.length) return jsonResponse({ error: "未选择文件" }, 400);
    if (keys.length > 500) {
      return jsonResponse({ error: "单次最多下载 500 个文件" }, 400);
    }
    const zip = streamZip(
      env,
      keys.map((k) => withPathPrefix(k, env))
    );
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(zip, {
      headers: {
        "content-type": "application/zip",
        "content-disposition": `attachment; filename="gallery-${stamp}.zip"`,
        "cache-control": "no-store",
      },
    });
  }

  // 7. 直接上传文件（支持单文件 PUT/POST 二进制流或 FormData）
  if (sub === "upload" && (request.method === "POST" || request.method === "PUT")) {
    const keyParam = url.searchParams.get("key");
    if (keyParam !== null) {
      if (!isSafeRelativePath(keyParam, false)) {
        return jsonResponse({ error: "非法文件路径" }, 400);
      }
      const cleanKey = normalizeDirPath(keyParam);
      const bucketKey = withPathPrefix(cleanKey, env);
      if (await env.R2_BUCKET.head(bucketKey)) {
        return jsonResponse({ error: "目标文件已存在，请先改名或删除原文件" }, 409);
      }
      const contentType =
        request.headers.get("x-file-type") ||
        request.headers.get("content-type") ||
        guessContentType(cleanKey);
      await env.R2_BUCKET.put(bucketKey, request.body, {
        httpMetadata: {
          contentType,
          cacheControl: env.CACHE_CONTROL || "max-age=2592000",
        },
      });
      return jsonResponse({ ok: true, key: cleanKey });
    }

    // FormData 多文件上传兜底
    const formData = await request.formData();
    const rawDir = String(formData.get("path") || "").trim();
    if (!isSafeRelativePath(rawDir, true)) {
      return jsonResponse({ error: "非法文件夹路径" }, 400);
    }
    const dir = normalizeDirPath(rawDir);
    const prefix = dir ? dir + "/" : "";
    const files = formData.getAll("files");
    const uploaded: string[] = [];
    for (const item of files) {
      const candidate = item as unknown as File;
      if (candidate && typeof candidate.arrayBuffer === "function") {
        const f = candidate;
        const cleanName = f.name.replace(/^\/+/, "");
        if (!cleanName || !isSafeRelativePath(cleanName, false)) continue;
        const fullKey = prefix + cleanName;
        if (!isSafeRelativePath(fullKey, false)) continue;
        const bucketKey = withPathPrefix(fullKey, env);
        if (await env.R2_BUCKET.head(bucketKey)) continue;
        await env.R2_BUCKET.put(bucketKey, f.stream(), {
          httpMetadata: {
            contentType: f.type || guessContentType(fullKey),
            cacheControl: env.CACHE_CONTROL || "max-age=2592000",
          },
        });
        uploaded.push(fullKey);
      }
    }
    return jsonResponse({ ok: true, uploaded });
  }

  // 8. 批量删除文件
  if (sub === "delete" && request.method === "POST") {
    const body = (await request.json()) as { keys?: string[] };
    const keys = (body.keys || [])
      .map((k) => k.replace(/^\/+/, ""))
      .filter((k) => isSafeRelativePath(k, false));
    if (!keys.length) {
      return jsonResponse({ error: "未选择要删除的文件" }, 400);
    }
    const bucketKeys = keys.map((k) => withPathPrefix(k, env));
    // R2 delete 支持每次最多 1000 个 key
    for (let i = 0; i < bucketKeys.length; i += 500) {
      await env.R2_BUCKET.delete(bucketKeys.slice(i, i + 500));
    }
    const deletedSet = new Set<string>([...keys, ...bucketKeys]);
    let shareCursor: string | undefined;
    do {
      const shareList = await env.R2_BUCKET.list({
        prefix: SHARE_PREFIX,
        cursor: shareCursor,
        limit: 500,
      });
      const toRemove: string[] = [];
      for (const obj of shareList.objects) {
        if (!obj.key.endsWith(".json")) continue;
        const shareObj = await env.R2_BUCKET.get(obj.key);
        if (!shareObj) continue;
        try {
          const meta = (await shareObj.json()) as ShareMetadata;
          if (deletedSet.has(meta.key)) {
            toRemove.push(obj.key);
          }
        } catch {
          // ignore
        }
      }
      if (toRemove.length) await env.R2_BUCKET.delete(toRemove);
      shareCursor = shareList.truncated ? shareList.cursor : undefined;
    } while (shareCursor);
    return jsonResponse({ ok: true, deletedCount: keys.length });
  }

  // 9. 批量复制 / 移动文件
  if ((sub === "copy" || sub === "move") && request.method === "POST") {
    const body = (await request.json()) as {
      keys?: string[];
      targetDir?: string;
      overwrite?: boolean;
    };
    const rawTargetDir = (body.targetDir || "").trim();
    if (!isSafeRelativePath(rawTargetDir, true)) {
      return jsonResponse({ error: "非法文件夹路径" }, 400);
    }
    const keys = (body.keys || [])
      .map((k) => k.replace(/^\/+/, ""))
      .filter((k) => isSafeRelativePath(k, false));
    const targetDir = normalizeDirPath(rawTargetDir);
    const targetPrefix = targetDir ? targetDir + "/" : "";

    if (!keys.length) {
      return jsonResponse({ error: "未选择要操作的文件" }, 400);
    }

    const results: { from: string; to: string; status: string }[] = [];
    const movedMap = new Map<string, string>();
    for (const srcKey of keys) {
      const fileName = srcKey.split("/").pop() || srcKey;
      const dstKey = targetPrefix + fileName;
      if (!isSafeRelativePath(dstKey, false)) {
        results.push({ from: srcKey, to: dstKey, status: "invalid_target" });
        continue;
      }
      if (srcKey === dstKey) {
        results.push({ from: srcKey, to: dstKey, status: "skipped_same" });
        continue;
      }
      const srcBucketKey = withPathPrefix(srcKey, env);
      const dstBucketKey = withPathPrefix(dstKey, env);
      const srcObj = await env.R2_BUCKET.get(srcBucketKey);
      if (!srcObj) {
        results.push({ from: srcKey, to: dstKey, status: "not_found" });
        continue;
      }
      if (await env.R2_BUCKET.head(dstBucketKey)) {
        results.push({ from: srcKey, to: dstKey, status: "exists" });
        continue;
      }
      await env.R2_BUCKET.put(dstBucketKey, srcObj.body, {
        httpMetadata: srcObj.httpMetadata,
        customMetadata: srcObj.customMetadata,
      });
      if (sub === "move") {
        await env.R2_BUCKET.delete(srcBucketKey);
        movedMap.set(srcKey, dstKey);
        if (srcBucketKey !== srcKey) {
          movedMap.set(srcBucketKey, dstKey);
        }
      }
      results.push({ from: srcKey, to: dstKey, status: "ok" });
    }

    if (sub === "move" && movedMap.size > 0) {
      let shareCursor: string | undefined;
      do {
        const shareList = await env.R2_BUCKET.list({
          prefix: SHARE_PREFIX,
          cursor: shareCursor,
          limit: 500,
        });
        for (const obj of shareList.objects) {
          if (!obj.key.endsWith(".json")) continue;
          const shareObj = await env.R2_BUCKET.get(obj.key);
          if (!shareObj) continue;
          try {
            const meta = (await shareObj.json()) as ShareMetadata;
            const newTarget = movedMap.get(meta.key);
            if (newTarget) {
              meta.key = newTarget;
              await env.R2_BUCKET.put(obj.key, JSON.stringify(meta), {
                httpMetadata: shareObj.httpMetadata,
                customMetadata: {
                  ...shareObj.customMetadata,
                  targetKey: newTarget,
                },
              });
            }
          } catch {
            // ignore broken share json
          }
        }
        shareCursor = shareList.truncated ? shareList.cursor : undefined;
      } while (shareCursor);
    }

    return jsonResponse({
      ok: true,
      action: sub,
      count: results.filter((r) => r.status === "ok").length,
      skippedCount: results.filter((r) => r.status !== "ok").length,
      results,
    });
  }

  // 10. 分享短链管理：列表 / 创建 / 修改有效期 / 删除
  if (sub === "shares") {
    if (request.method === "GET") {
      const listed = await env.R2_BUCKET.list({
        prefix: SHARE_PREFIX,
        limit: 1000,
      });
      const shares: Array<
        ShareMetadata & {
          shareId: string;
          shareUrl: string;
          shortUrl: string;
          status: "active" | "expired";
        }
      > = [];

      await Promise.all(
        listed.objects.map(async (obj) => {
          if (!obj.key.endsWith(".json")) return;
          const id = obj.key
            .slice(SHARE_PREFIX.length, -5)
            .trim();
          if (!id) return;
          try {
            const full = await env.R2_BUCKET.get(obj.key);
            if (!full) return;
            const meta = JSON.parse(await full.text()) as ShareMetadata;
            const expired = Boolean(
              meta.expiresAt && Date.now() > meta.expiresAt
            );
            shares.push({
              ...meta,
              shareId: id,
              shareUrl: `${url.origin}/share/${id}`,
              shortUrl: `${url.origin}/s/${id}`,
              status: expired ? "expired" : "active",
            });
          } catch {
            // ignore broken json
          }
        })
      );

      shares.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return jsonResponse({ shares });
    }

    if (request.method === "POST") {
      const body = (await request.json()) as {
        key?: string;
        expiresIn?: number | null; // 秒；null 或 0 表示永不过期
        expiresAt?: number | null; // 毫秒时间戳
        length?: number; // 短码长度，默认 8（也支持 10 位兼容 r2-explorer）
      };
      const rawKey = (body.key || "").trim();
      if (!isSafeRelativePath(rawKey, false)) {
        return jsonResponse({ error: "缺少文件路径 key" }, 400);
      }
      const key = normalizeDirPath(rawKey);
      const exists = await env.R2_BUCKET.head(withPathPrefix(key, env));
      if (!exists) {
        return jsonResponse({ error: `文件不存在：${key}` }, 404);
      }

      const codeLen = body.length && body.length >= 6 && body.length <= 12 ? body.length : 10;
      let shareId = "";
      for (let i = 0; i < 6; i++) {
        const candidate = crypto
          .randomUUID()
          .replace(/-/g, "")
          .substring(0, codeLen);
        const taken = await env.R2_BUCKET.head(
          `${SHARE_PREFIX}${candidate}.json`
        );
        if (!taken) {
          shareId = candidate;
          break;
        }
      }
      if (!shareId) {
        return jsonResponse({ error: "生成唯一短链 ID 失败，请重试" }, 500);
      }

      let expiresAt: number | undefined;
      if (typeof body.expiresAt === "number" && body.expiresAt > 0) {
        expiresAt = body.expiresAt;
      } else if (typeof body.expiresIn === "number" && body.expiresIn > 0) {
        expiresAt = Date.now() + body.expiresIn * 1000;
      }

      const bucketName = env.BUCKET_NAME || "R2_BUCKET";
      const meta: ShareMetadata = {
        bucket: bucketName,
        key,
        ...(expiresAt ? { expiresAt } : {}),
        currentDownloads: 0,
        createdBy: auth.username || "admin",
        createdAt: Date.now(),
      };

      await env.R2_BUCKET.put(
        `${SHARE_PREFIX}${shareId}.json`,
        JSON.stringify(meta),
        {
          httpMetadata: { contentType: "application/json" },
          customMetadata: {
            targetBucket: bucketName,
            targetKey: key,
          },
        }
      );

      return jsonResponse({
        ok: true,
        shareId,
        shareUrl: `${url.origin}/share/${shareId}`,
        shortUrl: `${url.origin}/s/${shareId}`,
        expiresAt: expiresAt || null,
        meta,
      });
    }

    if (request.method === "PATCH") {
      const body = (await request.json()) as {
        shareId?: string;
        expiresIn?: number | null; // 秒，null/0 为永久
        expiresAt?: number | null; // 绝对毫秒时间戳，null/0 为永久
      };
      const shareId = (body.shareId || "").replace(/[^a-zA-Z0-9_-]/g, "");
      if (!shareId) {
        return jsonResponse({ error: "缺少 shareId" }, 400);
      }
      const shareKey = `${SHARE_PREFIX}${shareId}.json`;
      const existing = await env.R2_BUCKET.get(shareKey);
      if (!existing) {
        return jsonResponse({ error: "未找到该分享链接" }, 404);
      }
      const meta = JSON.parse(await existing.text()) as ShareMetadata;

      if (body.expiresAt === null || body.expiresAt === 0 || body.expiresIn === null || body.expiresIn === 0) {
        delete meta.expiresAt;
      } else if (typeof body.expiresAt === "number" && body.expiresAt > 0) {
        meta.expiresAt = body.expiresAt;
      } else if (typeof body.expiresIn === "number" && body.expiresIn > 0) {
        meta.expiresAt = Date.now() + body.expiresIn * 1000;
      }

      await env.R2_BUCKET.put(shareKey, JSON.stringify(meta), {
        httpMetadata: { contentType: "application/json" },
        customMetadata: {
          targetBucket: meta.bucket || env.BUCKET_NAME || "R2_BUCKET",
          targetKey: meta.key,
        },
      });

      return jsonResponse({
        ok: true,
        shareId,
        expiresAt: meta.expiresAt || null,
        status:
          meta.expiresAt && Date.now() > meta.expiresAt ? "expired" : "active",
      });
    }

    if (request.method === "DELETE") {
      const shareId = (
        url.searchParams.get("shareId") || ""
      ).replace(/[^a-zA-Z0-9_-]/g, "");
      if (!shareId) {
        return jsonResponse({ error: "缺少 shareId" }, 400);
      }
      await env.R2_BUCKET.delete(`${SHARE_PREFIX}${shareId}.json`);
      return jsonResponse({ ok: true, shareId });
    }
  }

  return jsonResponse({ error: "未知管理接口" }, 404);
}

function crc32Update(crc: number, bytes: Uint8Array): number {
  let value = crc;
  for (let i = 0; i < bytes.length; i++) {
    value ^= bytes[i];
    for (let bit = 0; bit < 8; bit++) {
      value = (value >>> 1) ^ (value & 1 ? 0xedb88320 : 0);
    }
  }
  return value >>> 0;
}

function zipU16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function zipU32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value >>> 0, true);
}

function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date:
      ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function streamZip(env: Env, keys: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const output = new TransformStream<Uint8Array, Uint8Array>();
  const writer = output.writable.getWriter();
  const central: Uint8Array[] = [];
  let offset = 0;
  const write = async (bytes: Uint8Array) => {
    await writer.write(bytes);
    offset += bytes.length;
  };

  void (async () => {
    try {
      for (const key of keys) {
        const file = await env.R2_BUCKET.get(key);
        if (!file) continue;
        const archiveName = key.split("/").pop() || key;
        const nameBytes = encoder.encode(archiveName);
        if (nameBytes.length > 0xffff || offset > 0xffffffff) {
          throw new Error("ZIP32 archive size limit exceeded");
        }
        const dt = dosDateTime(file.uploaded || new Date());
        const localOffset = offset;
        const local = new Uint8Array(30 + nameBytes.length);
        const localView = new DataView(local.buffer);
        zipU32(localView, 0, 0x04034b50);
        zipU16(localView, 4, 20);
        zipU16(localView, 6, 0x0808); // UTF-8 filename and trailing data descriptor
        zipU16(localView, 8, 0); // Store, no compression
        zipU16(localView, 10, dt.time);
        zipU16(localView, 12, dt.date);
        zipU16(localView, 26, nameBytes.length);
        local.set(nameBytes, 30);
        await write(local);

        let crc = 0xffffffff;
        let size = 0;
        const reader = file.body.getReader();
        try {
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            const chunk = part.value;
            crc = crc32Update(crc, chunk);
            size += chunk.length;
            if (size > 0xffffffff) throw new Error("ZIP32 file size limit exceeded");
            await write(chunk);
          }
        } finally {
          reader.releaseLock();
        }
        crc = (crc ^ 0xffffffff) >>> 0;
        const descriptor = new Uint8Array(16);
        const descView = new DataView(descriptor.buffer);
        zipU32(descView, 0, 0x08074b50);
        zipU32(descView, 4, crc);
        zipU32(descView, 8, size);
        zipU32(descView, 12, size);
        await write(descriptor);

        const entry = new Uint8Array(46 + nameBytes.length);
        const entryView = new DataView(entry.buffer);
        zipU32(entryView, 0, 0x02014b50);
        zipU16(entryView, 4, 20);
        zipU16(entryView, 6, 20);
        zipU16(entryView, 8, 0x0808);
        zipU16(entryView, 10, 0);
        zipU16(entryView, 12, dt.time);
        zipU16(entryView, 14, dt.date);
        zipU32(entryView, 16, crc);
        zipU32(entryView, 20, size);
        zipU32(entryView, 24, size);
        zipU16(entryView, 28, nameBytes.length);
        zipU32(entryView, 38, 0x81a40000);
        zipU32(entryView, 42, localOffset);
        entry.set(nameBytes, 46);
        central.push(entry);
      }

      const centralOffset = offset;
      let centralSize = 0;
      for (const entry of central) {
        await write(entry);
        centralSize += entry.length;
      }
      if (central.length > 0xffff || offset > 0xffffffff) {
        throw new Error("ZIP32 archive size limit exceeded");
      }
      const end = new Uint8Array(22);
      const endView = new DataView(end.buffer);
      zipU32(endView, 0, 0x06054b50);
      zipU16(endView, 8, central.length);
      zipU16(endView, 10, central.length);
      zipU32(endView, 12, centralSize);
      zipU32(endView, 16, centralOffset);
      await write(end);
      await writer.close();
    } catch (err) {
      await writer.abort(err).catch(() => undefined);
    }
  })();

  return output.readable;
}

type ParsedRange = { offset: number; length: number } | { suffix: number };

function rangeHasLength(
  object: ParsedRange
): object is { offset: number; length: number } {
  return (<{ offset: number; length: number }>object).length !== undefined;
}

function hasBody(object: R2Object | R2ObjectBody): object is R2ObjectBody {
  return (<R2ObjectBody>object).body !== undefined;
}

function hasSuffix(range: ParsedRange): range is { suffix: number } {
  return (<{ suffix: number }>range).suffix !== undefined;
}

function getRangeHeader(range: ParsedRange, fileSize: number): string {
  return `bytes ${hasSuffix(range) ? fileSize - range.suffix : range.offset}-${
    hasSuffix(range) ? fileSize - 1 : range.offset + range.length - 1
  }/${fileSize}`;
}

async function makeListingResponse(
  path: string,
  env: Env,
  request: Request
): Promise<Response | null> {
  path = path.replace(/^\/+/, "");
  if (path === "/") path = "";
  else if (path !== "" && !path.endsWith("/")) {
    path += "/";
  }

  const uiPath = stripPathPrefix(path, env);

  const cfg = await loadGalleryConfig(env);
  const auth = await verifyAdminSession(request, env, cfg);
  const isAdmin = auth.isAdmin;

  // 若该目录被设为隐藏且当前非管理员访问，则不在画廊展示目录页（直链不受影响）
  if (!isAdmin && uiPath !== "" && isPathUnderHidden(uiPath, cfg.hiddenDirs)) {
    return null;
  }

  let cursor = new URL(request.url).searchParams.get("cursor") || undefined;
  const limit = normInt(env.ITEMS_PER_PAGE, 1000);
  const hideDot = normBool(env.HIDE_HIDDEN_FILES, true);

  const doList = (c: string | undefined) =>
    env.R2_BUCKET.list({
      prefix: path,
      delimiter: "/",
      cursor: c,
      limit,
    });

  let listing: R2Objects;
  try {
    listing = await doList(cursor);
  } catch (err) {
    if (normBool(env.LOGGING, true)) {
      console.error("list failed, retry without cursor:", err);
    }
    if (cursor === undefined) throw err;
    cursor = undefined;
    listing = await doList(undefined);
  }

  if (
    cursor !== undefined &&
    listing.delimitedPrefixes.length === 0 &&
    listing.objects.length === 0
  ) {
    listing = await doList(undefined);
  }

  // 管理员在空目录下也允许看到画廊界面（以便向新建/空文件夹上传图片）
  if (
    !isAdmin &&
    uiPath !== "" &&
    listing.delimitedPrefixes.length === 0 &&
    listing.objects.length === 0
  ) {
    return null;
  }

  let html = "";
  let lastModified: Date | null = null;

  if (request.method === "GET") {
    const dirs: {
      name: string;
      path: string;
      href: string;
      cover?: string;
      count?: number;
      capped?: boolean;
      hidden?: boolean;
    }[] = [];
    const images: {
      name: string;
      key: string;
      href: string;
      size: number;
      uploaded?: string;
    }[] = [];
    const files: {
      name: string;
      key: string;
      href: string;
      size: number;
    }[] = [];

    for (let dir of listing.delimitedPrefixes) {
      if (dir.endsWith("/")) dir = dir.substring(0, dir.length - 1);
      const name = dir.substring(path.length, dir.length);
      if (name.startsWith(".") && hideDot) continue;
      const fullDirPath = normalizeDirPath(uiPath + name);
      const isHidden = isPathUnderHidden(fullDirPath, cfg.hiddenDirs);
      if (isHidden && !isAdmin) continue;
      dirs.push({
        name,
        path: fullDirPath,
        href: encodeURIComponent(name) + "/",
        hidden: isHidden,
      });
    }

    const dirNameSet = new Set(dirs.map((d) => d.name));
    for (const file of listing.objects) {
      const name = file.key.substring(path.length, file.key.length);
      if (!name || (name.startsWith(".") && hideDot)) continue;
      if (file.size === 0 && (dirNameSet.has(name) || file.httpMetadata?.contentType === "application/x-directory")) continue;

      if (lastModified == null || file.uploaded > lastModified) {
        lastModified = file.uploaded;
      }

      const relFileKey = stripPathPrefix(file.key, env);
      const href = encodeURIComponent(name);
      if (IMAGE_EXT.test(name)) {
        images.push({
          name,
          key: relFileKey,
          href,
          size: file.size,
          uploaded: file.uploaded ? file.uploaded.toISOString() : undefined,
        });
      } else {
        files.push({ name, key: relFileKey, href, size: file.size });
      }
    }

    dirs.sort((a, b) => natCompare(a.name, b.name));
    images.sort((a, b) => natCompare(a.name, b.name));
    files.sort((a, b) => natCompare(a.name, b.name));

    const COVER_LIMIT = 24;
    await Promise.all(
      dirs.slice(0, COVER_LIMIT).map(async (d) => {
        try {
          const sub: R2Objects = await env.R2_BUCKET.list({
            prefix: path + d.name + "/",
            limit: 1000,
            include: [],
          } as R2ListOptions);

          let count = 0;
          let coverKey: string | null = null;
          for (const o of sub.objects) {
            const relObjKey = stripPathPrefix(o.key, env);
            if (!isAdmin && isPathUnderHidden(relObjKey, cfg.hiddenDirs)) continue;
            const base = o.key.substring(o.key.lastIndexOf("/") + 1);
            if (base.startsWith(".") || !IMAGE_EXT.test(base)) continue;
            count++;
            if (coverKey === null || natCompare(o.key, coverKey) < 0) {
              coverKey = o.key;
            }
          }

          d.count = count;
          d.capped = sub.truncated;
          if (coverKey) {
            const relCover = stripPathPrefix(coverKey, env);
            d.cover =
              "/" + relCover.split("/").map(encodeURIComponent).join("/");
          }
        } catch (err) {
          if (normBool(env.LOGGING, true)) {
            console.error("cover probe failed:", d.name, err);
          }
        }
      })
    );

    let moreHref = "";
    if (listing.truncated) {
      moreHref = "?cursor=" + encodeURIComponent(listing.cursor || "");
    }

    const segs = uiPath.split("/").filter((p) => p.length > 0);
    const parentHref =
      segs.length === 0
        ? null
        : "/" +
          segs.slice(0, -1).map(encodeURIComponent).join("/") +
          (segs.length > 1 ? "/" : "");

    const totalBytes =
      images.reduce((n, x) => n + x.size, 0) +
      files.reduce((n, x) => n + x.size, 0);

    html = galleryHtml({
      path: uiPath,
      dirs,
      images,
      files,
      hasMore: listing.truncated,
      moreHref,
      parentHref,
      totalBytes,
      isAdmin,
      adminUsername: auth.username || env.ADMIN_USERNAME || cfg.adminUsername || "admin",
      hiddenDirs: isAdmin ? cfg.hiddenDirs : [],
      currentDirHidden:
        uiPath !== "" && isPathUnderHidden(uiPath, cfg.hiddenDirs),
    });
  }

  return new Response(html === "" ? null : html, {
    status: 200,
    headers: {
      "access-control-allow-origin": env.ALLOWED_ORIGINS || "",
      "last-modified": lastModified === null ? "" : lastModified.toUTCString(),
      "content-type": "text/html; charset=utf-8",
      "x-robots-tag": "noindex, nofollow",
      // 目录页因含登录态与动态显隐，统一走 no-store 避免缓存串态
      "cache-control": "no-store",
    },
  });
}

async function retryAsync<T>(env: Env, fn: () => Promise<T>): Promise<T> {
  const maxAttempts = normInt(env.R2_RETRIES, 0);
  let attempts = 0;

  while (maxAttempts === -1 || attempts <= maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      attempts++;
      if (normBool(env.LOGGING, true)) {
        console.error(`Attempt ${attempts} failed:`, err);
      }

      if (attempts <= maxAttempts) {
        const delay = Math.min(1000 * Math.pow(2, attempts - 1), 30000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error("unreachable");
}

async function serveNotFound(env: Env, request: Request): Promise<Response> {
  if (env.NOTFOUND_FILE && env.NOTFOUND_FILE !== "") {
    const nfPath = env.NOTFOUND_FILE.replace(/^\/+/, "");
    const file =
      request.method === "HEAD"
        ? await retryAsync(env, () => env.R2_BUCKET.head(nfPath))
        : await retryAsync(env, () => env.R2_BUCKET.get(nfPath));
    if (file != null) {
      let body: ReadableStream | undefined;
      if (hasBody(file) && file.size !== 0) {
        const { readable, writable } = new FixedLengthStream(file.size);
        file.body.pipeTo(writable);
        body = readable;
      }
      return new Response(body, {
        status: 404,
        headers: {
          "accept-ranges": "bytes",
          "access-control-allow-origin": env.ALLOWED_ORIGINS || "",
          "content-type":
            file.httpMetadata?.contentType ?? guessContentType(nfPath),
          "content-length": file.size.toString(),
        },
      });
    }
  }
  return new Response("File Not Found", { status: 404 });
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    let url: URL;
    try {
      url = new URL(request.url);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    let decodedPathname: string;
    try {
      decodedPathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    // 1. 管理员 API 路由
    if (url.pathname.startsWith("/_gallery/api/")) {
      const origin = request.headers.get("origin");
      if (origin && origin !== url.origin) {
        return jsonResponse({ error: "跨站请求被拒绝" }, 403);
      }
      return handleGalleryApi(request, env);
    }

    // 2. 分享短链路由：支持 /share/<id>（兼容 r2-explorer）和更简短的 /s/<id>
    const shareMatch = /^\/(?:share|s)\/([a-zA-Z0-9_-]+)$/.exec(url.pathname);
    if (shareMatch && (request.method === "GET" || request.method === "HEAD")) {
      return handleShareLink(shareMatch[1], request, env);
    }

    // Legacy URLs survive the requested render -> pic directory rename.
    if (url.pathname === "/render" || url.pathname.startsWith("/render/")) {
      const relocated = new URL(request.url);
      relocated.pathname = "/pic" + url.pathname.slice(7);
      if (relocated.pathname === "/pic") relocated.pathname += "/";
      return Response.redirect(relocated.href, 307);
    }

    // Never let a cache entry bypass the private metadata guard or path traversal.
    const requestedKey = decodedPathname.replace(/^\/+/, "");
    const rawSegs = requestedKey.split("/").filter(Boolean);
    if (
      requestedKey === ".r2-explorer" ||
      requestedKey.startsWith(".r2-explorer/") ||
      rawSegs.some((s) => s === ".." || s === ".r2-explorer")
    ) {
      return new Response("File Not Found", { status: 404 });
    }

    const allowedMethods = ["GET", "HEAD", "OPTIONS"];
    if (allowedMethods.indexOf(request.method) === -1) {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { allow: allowedMethods.join(", ") },
      });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: { allow: allowedMethods.join(", ") },
      });
    }

    let triedIndex = false;
    let response: Response | undefined;

    const isCachingEnabled = env.CACHE_CONTROL !== "no-store";
    const cache = caches.default;
    const isDirRequest = url.pathname.endsWith("/");

    // 只对静态文件请求启用 Worker Cache，目录页实时响应
    if (isCachingEnabled && !isDirRequest) {
      response = await cache.match(request);
    }

    let range: ParsedRange | undefined;

    if (!response || !(response.ok || response.status === 304)) {
      if (normBool(env.LOGGING, true) && !isDirRequest) {
        console.warn("Cache MISS for", request.url);
      }
      const pfx = getNormalizedPrefix(env);
      const relReq = decodedPathname.replace(/^\/+/, "");
      let path = pfx + relReq;
      if (decodedPathname.endsWith("/") && path !== "" && !path.endsWith("/")) {
        path += "/";
      }

      // directory logic
      if (decodedPathname.endsWith("/")) {
        if (env.INDEX_FILE && env.INDEX_FILE !== "") {
          path += env.INDEX_FILE;
          triedIndex = true;
        } else if (normBool(env.DIRECTORY_LISTING, true)) {
          const listResponse = await makeListingResponse(path, env, request);
          if (listResponse !== null) {
            return listResponse;
          }
          return serveNotFound(env, request);
        }
      }

      if (path !== "/" && path.startsWith("/")) {
        path = path.substring(1);
      }

      // 禁止外部通过直链直接读取内部管理配置与分享元数据
      if (path === ".r2-explorer" || path.startsWith(".r2-explorer/")) {
        return new Response("File Not Found", { status: 404 });
      }

      let file: R2Object | R2ObjectBody | null | undefined;

      // Range handling
      if (request.method === "GET") {
        const rangeHeader = request.headers.get("range");
        if (rangeHeader) {
          file = await retryAsync(env, () => env.R2_BUCKET.head(path));
          if (file === null) return serveNotFound(env, request);
          const parsedRanges = parseRange(file.size, rangeHeader);
          if (
            parsedRanges !== -1 &&
            parsedRanges !== -2 &&
            parsedRanges.length === 1 &&
            parsedRanges.type === "bytes"
          ) {
            const firstRange = parsedRanges[0];
            range =
              file.size === firstRange.end + 1
                ? { suffix: file.size - firstRange.start }
                : {
                    offset: firstRange.start,
                    length: firstRange.end - firstRange.start + 1,
                  };
          } else {
            return new Response("Range Not Satisfiable", { status: 416 });
          }
        }
      }

      // Etag/If-(Not)-Match handling
      const getHeaderEtag = (header: string | null) =>
        header?.trim().replace(/^W\//i, "").replace(/^['"]|['"]$/g, "");
      const ifMatch = getHeaderEtag(request.headers.get("if-match"));
      const ifNoneMatch = getHeaderEtag(request.headers.get("if-none-match"));

      const ifModifiedSince = Date.parse(
        request.headers.get("if-modified-since") || ""
      );
      const ifUnmodifiedSince = Date.parse(
        request.headers.get("if-unmodified-since") || ""
      );

      const ifRange = request.headers.get("if-range");
      if (range && ifRange && file) {
        const maybeDate = Date.parse(ifRange);

        if (isNaN(maybeDate) || new Date(maybeDate) > file.uploaded) {
          if (ifRange.startsWith("W/") || ifRange !== file.httpEtag)
            range = undefined;
        }
      }

      if (ifMatch || ifUnmodifiedSince) {
        file = await retryAsync(env, () =>
          env.R2_BUCKET.get(path, {
            onlyIf: {
              etagMatches: ifMatch,
              uploadedBefore: ifUnmodifiedSince
                ? new Date(ifUnmodifiedSince)
                : undefined,
            },
            range,
          })
        );

        if (file && !hasBody(file)) {
          return new Response("Precondition Failed", { status: 412 });
        }
      }

      if (ifNoneMatch || ifModifiedSince) {
        if (ifNoneMatch) {
          file = await retryAsync(env, () =>
            env.R2_BUCKET.get(path, {
              onlyIf: { etagDoesNotMatch: ifNoneMatch },
              range,
            })
          );
        } else if (ifModifiedSince) {
          file = await retryAsync(env, () =>
            env.R2_BUCKET.get(path, {
              onlyIf: { uploadedAfter: new Date(ifModifiedSince) },
              range,
            })
          );
        }
        if (file && !hasBody(file)) {
          return new Response(null, { status: 304 });
        }
      }

      file =
        request.method === "HEAD"
          ? await retryAsync(env, () => env.R2_BUCKET.head(path))
          : file && hasBody(file)
          ? file
          : await retryAsync(env, () => env.R2_BUCKET.get(path, { range }));

      let notFound = false;

      if (file === null) {
        if (env.INDEX_FILE && triedIndex) {
          path = path.substring(0, path.length - env.INDEX_FILE.length);
        }

        if (
          normBool(env.DIRECTORY_LISTING, true) &&
          (path.endsWith("/") || path === "")
        ) {
          const listResponse = await makeListingResponse(path, env, request);
          if (listResponse !== null) {
            return listResponse;
          }
        }

        if (env.NOTFOUND_FILE && env.NOTFOUND_FILE !== "") {
          notFound = true;
          path = env.NOTFOUND_FILE;
          file =
            request.method === "HEAD"
              ? await retryAsync(env, () => env.R2_BUCKET.head(path))
              : await retryAsync(env, () => env.R2_BUCKET.get(path));
        }

        if (file == null) {
          return new Response("File Not Found", { status: 404 });
        }
      }

      let body;
      let contentLength = file.size;
      if (hasBody(file) && file.size !== 0) {
        if (range && !notFound) {
          contentLength = rangeHasLength(range) ? range.length : range.suffix;
        }
        const { readable, writable } = new FixedLengthStream(contentLength);
        file.body.pipeTo(writable);
        body = readable;
      }
      response = new Response(body, {
        status: notFound ? 404 : range ? 206 : 200,
        headers: {
          "accept-ranges": "bytes",
          "access-control-allow-origin": env.ALLOWED_ORIGINS || "",
          etag: notFound ? "" : file.httpEtag,
          "cache-control":
            file.httpMetadata?.cacheControl ??
            (notFound ? "" : env.CACHE_CONTROL || ""),
          expires: file.httpMetadata?.cacheExpiry?.toUTCString() ?? "",
          "last-modified": notFound ? "" : file.uploaded.toUTCString(),
          "content-encoding": file.httpMetadata?.contentEncoding ?? "",
          "content-type":
            file.httpMetadata?.contentType ?? guessContentType(path),
          "content-language": file.httpMetadata?.contentLanguage ?? "",
          "content-disposition": file.httpMetadata?.contentDisposition ?? "",
          "content-range":
            range && !notFound ? getRangeHeader(range, file.size) : "",
          "content-length": contentLength.toString(),
        },
      });

      if (request.method === "GET" && !range && isCachingEnabled && !notFound)
        ctx.waitUntil(cache.put(request, response.clone()));
    }

    return response;
  },
};
