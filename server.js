// Static site plus generated course data. `node build.js` writes the same thing to dist/ for any static host.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';
import { load } from './parse.js';
import { strings } from './strings.js';
import { key } from './public/i18n.js';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const PUB = path.join(ROOT, 'public');
// Language files are read when asked for, so new translations show on a page refresh without a restart.
const I18N = path.join(ROOT, 'i18n'), ALL = strings(), seen = new Map();
const langFiles = () => fs.existsSync(I18N) ? fs.readdirSync(I18N).filter(f => /^[A-Za-z-]+[.]json$/.test(f)) : [];
function langJson(f) {
  const full = path.join(I18N, f), old = seen.get(f);
  if (!fs.existsSync(full)) return null;
  const m = fs.statSync(full).mtimeMs; if (old?.m === m) return old.json;
  try { const d = JSON.parse(fs.readFileSync(full, 'utf8')), json = JSON.stringify(Object.fromEntries(ALL.filter(s => d[s] && d[s] !== s).map(s => [key(s), d[s]]))); seen.set(f, { m, json }); return json; }
  catch { return old?.json ?? null; } // being written right now
}
export function dataFiles() {
  const { subjects, commands, tools } = load(), out = new Map();
  out.set('data/catalog.json', subjects.map(s => ({ ...s, chapters: s.chapters.map(c => ({ title: c.title, lessons: c.lessons.map(l => ({ id: l.id, title: l.title, level: l.level, sum: l.sum, n: l.steps.length, steps: l.steps.map(x => x.t) })) })) })));
  out.set('data/commands.json', commands); out.set('data/tools.json', tools);
  for (const s of subjects) for (const c of s.chapters) for (const l of c.lessons) out.set(`data/lesson/${l.id}.json`, l);
  for (const f of langFiles()) out.set('data/i18n/' + f, JSON.parse(langJson(f)));
  return new Map([...out].map(([k, v]) => [k, JSON.stringify(v)]));
}
const data = dataFiles();
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8' };
export const server = http.createServer((req, res) => {
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('content-security-policy', "default-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  const send = (code, type, body) => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-cache' }); res.end(req.method === 'HEAD' ? undefined : body); };
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return send(400, 'text/plain', 'Bad request'); }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'text/plain', 'Method not allowed');
  const lf = p.startsWith('/data/i18n/') && /^[A-Za-z-]+[.]json$/.test(p.slice(11)), json = lf ? langJson(p.slice(11)) : data.get(p.slice(1)); if (json) { if (!(req.headers['accept-encoding'] || '').includes('gzip')) return send(200, 'application/json; charset=utf-8', json); res.setHeader('content-encoding', 'gzip'); return send(200, 'application/json; charset=utf-8', zlib.gzipSync(json)); }
  const f = path.join(PUB, p === '/' ? 'index.html' : p);
  if (!f.startsWith(PUB + path.sep) || !TYPES[path.extname(f)] || !fs.existsSync(f)) return send(404, 'text/plain', 'Not found');
  send(200, TYPES[path.extname(f)], fs.readFileSync(f));
});
if (process.argv[1] === fileURLToPath(import.meta.url)) server.listen(process.env.PORT || 4173, () => console.log('Opsyard on http://localhost:' + (process.env.PORT || 4173)));
