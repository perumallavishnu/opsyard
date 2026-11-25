// Turns content/*.txt into data. Format is documented in PROJECT.md.
import fs from 'node:fs';
const DIR = new URL('./content/', import.meta.url);
const cut = s => s.split('|').map(x => x.trim());
const flows = s => s.split(';;').map(f => {
  const m = f.trim().match(/^(!?)(\w+)>(\w+)\s*(.*)$/);
  if (!m) throw Error('bad flow: ' + f);
  return { a: m[2], b: m[3], t: m[4], err: !!m[1] };
});

export function parseSubject(text) {
  let sub, chap, les, step;
  const fail = (m, n) => { throw Error(`${sub?.id}/${les?.id} line ${n + 1}: ${m}`); };
  text.split(/\r?\n/).forEach((raw, n) => {
    const l = raw.trim(); if (!l) return;
    const sp = l.indexOf(' '), k = sp < 0 ? l : l.slice(0, sp), v = l.slice(sp + 1).trim();
    if (k === '%') { const [id, title, color, desc] = cut(v); sub = { id, title, color, desc, chapters: [] }; }
    else if (k === '##') { chap = { title: v, lessons: [] }; sub.chapters.push(chap); }
    else if (k === '#') { const [id, title, level, sum] = cut(v); if (!sum) fail('lesson header', n); les = { id, title, level, sum, nodes: [], zones: [], steps: [], src: [] }; step = null; chap.lessons.push(les); }
    else if (k === '@') { const m = v.match(/^(\w+) (\w+) (-?[\d.]+) (-?[\d.]+) (.+)$/); if (!m) fail('node ' + l, n); const [label, s] = cut(m[5]); les.nodes.push({ id: m[1], shape: m[2], x: +m[3], y: +m[4], label, sub: s }); }
    // Concept lesson: "@@ shape Label ; shape Label ; ..." = actor, the concept, what it acts on, helpers.
    else if (k === '@@') les.kind = 'concept', les.nodes = v.split(';').map((x, i) => { const [shape, ...t] = x.trim().split(' '); return { id: 'abcde'[i], shape, x: [0, 1, 2, 1, 2][i], y: [0, 0, 0, 1, 1][i], label: t.join(' ') }; });
    // History lesson: "@h year event ; year event" = one milestone per step.
    else if (k === '@h') les.kind = 'history', les.nodes = v.split(';').map((x, i) => { const [y, ...t] = x.trim().split(' '); return { id: 'h' + i, shape: 'flag', x: i, y: 0, label: y, sub: t.join(' ') }; });
    else if (k === 'Z') { const m = v.match(/^(\w+) (-?[\d.]+) (-?[\d.]+) ([\d.]+) ([\d.]+) (.+)$/); if (!m) fail('zone ' + l, n); les.zones.push({ id: m[1], x: +m[2], y: +m[3], w: +m[4], h: +m[5], label: m[6] }); }
    else if (k === '^') { const m = v.match(/^(\S+) (.+)$/); les.src.push({ url: m[1], t: m[2] }); }
    else if (k === '=') { const [t, tag] = cut(v); step = { t, tag: tag || 'CONCEPT', body: [], add: [], del: [], hot: [], flow: [], st: [], acts: [] }; les.steps.push(step); }
    else if (!step) fail('text before first step: ' + l, n);
    else if (k === '+') step.add.push(...v.split(/\s+/));
    else if (k === 'x') step.del.push(...v.split(/\s+/));
    else if (k === '*') step.hot.push(...v.split(/\s+/));
    else if (k === '~') for (const f of flows(v)) { step.flow.push(f); step.acts.push({ k: 'flow', ...f }); }
    else if (k === 'w') for (const f of flows(v)) { step.flow.push({ ...f, walk: true }); step.acts.push({ k: 'walk', ...f }); }
    else if (k === '"') { const [id, ...rest] = v.split(' '); step.acts.push({ k: 'say', id, t: rest.join(' ') }); }
    else if (k === ':') { const m = v.match(/^(\w+) (ok|err|warn|off|info) ?(.*)$/); if (!m) fail('state ' + l, n); step.st.push({ id: m[1], s: m[2], t: m[3] }); }
    else if (k === '?') { const [q, ...o] = cut(v); les.quiz = { q, o: o.map(x => ({ t: x.replace(/^\*/, ''), ok: x[0] === '*' })) }; }
    else if (k === '!!') step.body.push({ k: 'warn', t: v });
    else if (k === '!') step.body.push({ k: 'key', t: v });
    else if (k === '$') step.body.push({ k: 'cmd', t: v });
    else if (k === '>') step.body.push({ k: 'out', t: raw.replace(/^\s*> ?/, '') });
    else if (k === '|') step.body.push({ k: 'row', t: v });
    else step.body.push({ k: 'p', t: l });
  });
  for (const c of sub.chapters) for (const l of c.lessons) defaults(l);
  return sub;
}

// Scenes for concept and history lessons, unless a step draws its own.
function defaults(l) {
  if (!l.kind) return;
  const has = id => l.nodes.some(n => n.id === id), own = l.steps.some(s => s.add.length);
  l.steps.forEach((s, i) => {
    const go = (...fs) => { if (!s.flow.length) for (const x of fs) { const m = /^(!?)(\w+)>(\w+)$/.exec(x); if (!has(m[2]) || !has(m[3])) continue; const f = { a: m[2], b: m[3], t: '', err: !!m[1] }; s.flow.push(f); s.acts.push({ k: 'flow', ...f }); } };
    const add = (...ids) => { if (!own) s.add.push(...ids.filter(has)); };
    if (l.kind === 'history') { add('h' + i); if (has('h' + i)) { if (i) go(`h${i - 1}>h${i}`); if (!s.hot.length) s.hot.push('h' + i); } return; }
    if (i === 0) { add('a', 'c'); go('!a>c'); if (!s.st.length && has('c')) s.st.push({ id: 'c', s: 'err', t: '' }); }
    else if (i === 1) { add('b'); go('a>b', 'b>c'); if (!s.hot.length) s.hot.push('a', 'b', 'c'); if (!s.st.length) s.st.push({ id: 'b', s: 'ok', t: '' }); }
    else if (i === 2) { add('d', 'e'); go('a>b', 'b>d', has('e') ? 'd>e' : 'b>c'); }
    else go('a>b', 'b>c', 'c>b');
  });
}

const read = f => fs.readFileSync(new URL(f, DIR), 'utf8');
export function load() {
  const subjects = fs.readdirSync(DIR).filter(f => /^\d.*\.txt$/.test(f)).sort().reduce((all, f) => { // files with the same subject id are joined in name order
    const s = parseSubject(read(f)), had = all.find(x => x.id === s.id);
    if (had) had.chapters.push(...s.chapters); else all.push(s);
    return all;
  }, []);
  // commands.txt: "% group | Title", "@" nodes, then  cmd | what | risk | flows | flags | tip
  const commands = []; let g;
  for (const l of read('commands.txt').split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
    if (l[0] === '%') { const [id, title] = cut(l.slice(1)); commands.push(g = { id, title, nodes: [], list: [] }); }
    else if (l[0] === '@') { const m = l.slice(2).match(/^(\w+) (\w+) (-?[\d.]+) (-?[\d.]+) (.+)$/); g.nodes.push({ id: m[1], shape: m[2], x: +m[3], y: +m[4], label: m[5] }); }
    else { const [cmd, what, risk, fl, flags, tip] = l.split(' | ').map(x => x.trim()); if (!/^[scd]$/.test(risk) || !fl) throw Error('command: ' + l); g.list.push({ cmd, what, risk, flow: flows(fl), flags: (flags || '').split(';;').map(x => x.trim()).filter(Boolean), tip }); }
  }
  const tools = []; let t;
  for (const l of read('tools.txt').split(/\r?\n/).map(x => x.trim()).filter(Boolean)) {
    if (l[0] === '#') { const [name, os, pkg, cat, risk] = cut(l.slice(1)); tools.push(t = { name, os, pkg, cat, risk, uses: [] }); }
    else if (l[0] === '$') { const [c, d] = l.slice(1).split(' # ').map(x => x.trim()); t.uses.push({ c, d }); }
    else { const i = l.indexOf(':'); t[l.slice(0, i)] = l.slice(i + 1).trim(); }
  }
  return { subjects, commands, tools };
}
