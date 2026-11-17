import { type Env, type GalleryConfig, type ShareMetadata, withPathPrefix } from './index';

const JOBS = '.r2-explorer/folder-jobs/';
const SHARES = '.r2-explorer/sharable-links/';
type Entry = { key: string; etag: string; size: number };
type Job = {
  id: string; owner: string; action: 'move' | 'delete'; from: string; to: string;
  phase: 'scan' | 'copy' | 'shares' | 'remove' | 'done'; entries: Entry[];
  cursor?: string; position: number; copied: number; deleted: number;
};
function reply(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'cache-control': 'no-store' } });
}
function path(value: unknown): string {
  if (typeof value !== 'string') return '';
  const p = value.trim().replace(/^\/+|\/+$/g, '');
  if (!p || p.split('/').some(s => !s || s.startsWith('.') || /[\\\x00-\x1f]/.test(s))) return '';
  if (/^(?:_gallery|s|share)$/.test(p.split('/')[0])) return '';
  return p;
}
function summary(job: Job) {
  return { ok: true, jobId: job.id, phase: job.phase, total: job.entries.length,
    copied: job.copied, deleted: job.deleted, done: job.phase === 'done',
    fromDir: job.from, toDir: job.to, action: job.action };
}

// Each request does a bounded amount of work; source objects are not removed
// until all destination objects have been copied and verified.
export async function folderApi(
  request: Request, env: Env, owner: string, cfg: GalleryConfig,
  save: (env: Env, cfg: GalleryConfig) => Promise<GalleryConfig>,
): Promise<Response> {
  const body = await request.json() as Record<string, unknown>;
  if (typeof body.jobId !== 'string') {
    const action = body.action === 'delete' ? 'delete' : 'move';
    const from = path(body.fromDir || body.path);
    const to = action === 'move' ? path(body.toDir) : '';
    if (!from || (action === 'move' && !to)) return reply({ error: '非法文件夹路径' }, 400);
    if (action === 'delete' && body.confirmPath !== from) return reply({ error: '请完整输入要删除的文件夹路径' }, 400);
    if (action === 'move' && (from === to || to.startsWith(from + '/') || from.startsWith(to + '/'))) {
      return reply({ error: '源目录与目标目录不能相同或相互包含' }, 400);
    }
    const bucketFrom = withPathPrefix(from, env);
    const source = await env.R2_BUCKET.list({ prefix: bucketFrom + '/', limit: 1 });
    if (!source.objects.length) return reply({ error: '文件夹不存在' }, 404);
    if (action === 'move') {
      const bucketTo = withPathPrefix(to, env);
      const target = await env.R2_BUCKET.list({ prefix: bucketTo + '/', limit: 1 });
      if (target.objects.length || await env.R2_BUCKET.head(bucketTo)) return reply({ error: '目标文件夹已存在，请使用新路径' }, 409);
    }
    const job: Job = { id: crypto.randomUUID(), owner, action, from, to,
      phase: 'scan', entries: [], position: 0, copied: 0, deleted: 0 };
    await env.R2_BUCKET.put(JOBS + job.id + '.json', JSON.stringify(job));
    return reply(summary(job));
  }
  if (!/^[a-f0-9-]{36}$/.test(body.jobId)) return reply({ error: '非法任务编号' }, 400);
  const record = await env.R2_BUCKET.get(JOBS + body.jobId + '.json');
  if (!record) return reply({ error: '任务不存在' }, 404);
  const job = await record.json<Job>();
  if (job.owner !== owner) return reply({ error: '无权操作此任务' }, 403);
  try {
    const bucketFrom = withPathPrefix(job.from, env);
    const bucketTo = job.to ? withPathPrefix(job.to, env) : '';
    if (job.phase === 'scan') {
      const list = await env.R2_BUCKET.list({ prefix: bucketFrom + '/', cursor: job.cursor, limit: 1000 });
      for (const o of list.objects) job.entries.push({ key: o.key, etag: o.etag, size: o.size });
      job.cursor = list.truncated ? list.cursor : undefined;
      if (!list.truncated) { job.phase = job.action === 'move' ? 'copy' : 'remove'; job.position = 0; }
    } else if (job.phase === 'copy') {
      for (let i = 0; i < 8 && job.position < job.entries.length; i++, job.position++) {
        const entry = job.entries[job.position];
        const targetKey = bucketTo + '/' + entry.key.slice(bucketFrom.length + 1);
        const src = await env.R2_BUCKET.get(entry.key);
        if (!src || src.etag !== entry.etag) throw new Error('源文件已变化，已暂停且保留源文件');
        const existing = await env.R2_BUCKET.head(targetKey);
        if (existing) {
          // Idempotent retry: only accept an exact copy from a previous step.
          if (existing.etag !== entry.etag || existing.size !== entry.size) throw new Error('目标存在不同文件，停止以避免覆盖');
        } else {
          const put = await env.R2_BUCKET.put(targetKey, src.body, {
            httpMetadata: src.httpMetadata, customMetadata: src.customMetadata,
            onlyIf: { etagDoesNotMatch: '*' },
          });
          if (!put || put.size !== entry.size) throw new Error('目标文件校验失败，源文件已保留');
        }
        job.copied++;
      }
      if (job.position >= job.entries.length) { job.phase = 'shares'; job.position = 0; job.cursor = undefined; }
    } else if (job.phase === 'shares') {
      const list = await env.R2_BUCKET.list({ prefix: SHARES, cursor: job.cursor, limit: 12 });
      for (const obj of list.objects) {
        const share = await env.R2_BUCKET.get(obj.key);
        if (!share) continue;
        const meta = await share.json<ShareMetadata>();
        if (meta.key.startsWith(job.from + '/')) {
          meta.key = job.to + '/' + meta.key.slice(job.from.length + 1);
          await env.R2_BUCKET.put(obj.key, JSON.stringify(meta), {
            httpMetadata: share.httpMetadata,
            customMetadata: { ...share.customMetadata, targetKey: meta.key },
          });
        } else if (bucketFrom !== job.from && meta.key.startsWith(bucketFrom + '/')) {
          meta.key = job.to + '/' + meta.key.slice(bucketFrom.length + 1);
          await env.R2_BUCKET.put(obj.key, JSON.stringify(meta), {
            httpMetadata: share.httpMetadata,
            customMetadata: { ...share.customMetadata, targetKey: meta.key },
          });
        }
      }
      job.cursor = list.truncated ? list.cursor : undefined;
      if (!list.truncated) {
        cfg.hiddenDirs = cfg.hiddenDirs.map(h => h === job.from ? job.to : h.startsWith(job.from + '/') ? job.to + h.slice(job.from.length) : h);
        await save(env, cfg);
        job.phase = 'remove'; job.position = 0;
      }
    } else if (job.phase === 'remove') {
      const chunk = job.entries.slice(job.position, job.position + 12);
      const deletable: string[] = [];
      for (const entry of chunk) {
        const current = await env.R2_BUCKET.head(entry.key);
        if (!current) continue;
        if (current.etag !== entry.etag) throw new Error('源文件已变化，停止删除以保护新内容');
        deletable.push(entry.key);
      }
      if (deletable.length) await env.R2_BUCKET.delete(deletable);
      job.position += chunk.length; job.deleted += deletable.length;
      if (job.position >= job.entries.length) {
        const remaining = await env.R2_BUCKET.list({ prefix: bucketFrom + '/', limit: 1 });
        if (remaining.objects.length) throw new Error('操作期间目录新增了文件，新增文件已保留，请刷新后重试');
        if (job.action === 'delete') {
          cfg.hiddenDirs = cfg.hiddenDirs.filter(h => h !== job.from && !h.startsWith(job.from + '/'));
          await save(env, cfg);
          let sc: string | undefined;
          do {
            const sl = await env.R2_BUCKET.list({ prefix: SHARES, cursor: sc, limit: 500 });
            const staleShares: string[] = [];
            for (const obj of sl.objects) {
              if (!obj.key.endsWith('.json')) continue;
              const sObj = await env.R2_BUCKET.get(obj.key);
              if (!sObj) continue;
              try {
                const meta = await sObj.json<ShareMetadata>();
                if (meta.key.startsWith(job.from + '/') || meta.key.startsWith(bucketFrom + '/')) {
                  staleShares.push(obj.key);
                }
              } catch {}
            }
            if (staleShares.length) await env.R2_BUCKET.delete(staleShares);
            sc = sl.truncated ? sl.cursor : undefined;
          } while (sc);
        }
        job.phase = 'done';
      }
    }
    await env.R2_BUCKET.put(JOBS + job.id + '.json', JSON.stringify(job));
    return reply(summary(job));
  } catch (error) {
    await env.R2_BUCKET.put(JOBS + job.id + '.json', JSON.stringify(job));
    return reply({ error: error instanceof Error ? error.message : '文件夹操作失败，源文件已保留', jobId: job.id }, 409);
  }
}
