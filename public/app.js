import { Scene, stateAt } from './iso.js';
import { LANGS, setLang, t, lang, loadLang, known } from './i18n.js';
import { ui, brand, subject } from './icons.js';
import * as hairline from './vendor/hairline.js';

const $ = s => document.querySelector(s), main = $('#main');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const md = s => esc(known(s)).replace(/`([^`]+)`/g, '<code translate="no">$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
let cat = [], flat = [], done = new Set(), scene = null, view = null, seq = 0, figures = [], openSub = null;
try { done = new Set(JSON.parse(store.get('done') || '[]')); } catch {}
const cache = new Map();
async function get(u) { if (!cache.has(u)) { const r = await fetch('data/' + u + '.json'); if (!r.ok) throw Error(r.status); cache.set(u, await r.json()); } return cache.get(u); }
const metaOf = id => flat.find(l => l.id === id);
const lessonsOf = s => s.chapters.flatMap(c => c.lessons);
const doneIn = ls => ls.filter(l => done.has(l.id)).length;
const href = l => `#/l/${l.id}/1`;

/* chrome: built once, then only updated, so opening and closing can animate */
function chrome() {
  const [, h = '', cur = ''] = location.hash.split('/');
  const on = { '': h === '' || h === 'l', commands: h === 'commands', tools: h === 'tools' };
  $('#nav').innerHTML = [['', 'learn', 'book-open'], ['commands', 'commands', 'terminal'], ['tools', 'tools', 'wrench']].map(([p, k, i]) => `<a href="#/${p}"${on[p] ? ' aria-current="page"' : ''}>${ui(i)}${t(k)}</a>`).join('');
  $('#search').innerHTML = `${ui('search')}<span>${t('search')}</span><kbd>Ctrl K</kbd>`; $('#search').setAttribute('aria-label', t('search'));
  $('#lang').innerHTML = `${ui('globe')}<span>${LANGS.find(x => x[0] === lang())[1]}</span>`; $('#lang').setAttribute('aria-label', t('language'));
  const dark = isDark(); $('#theme').innerHTML = ui(dark ? 'sun' : 'moon'); $('#theme').setAttribute('aria-label', t('theme'));
  $('#menu').innerHTML = ui('menu', 18); $('#menu').setAttribute('aria-label', t('menu'));
  $('#langs').innerHTML = `<p>${t('language')}</p><div>${LANGS.map(([k, n, e]) => `<button data-lang="${k}" lang="${k}"${k === lang() ? ' aria-pressed="true"' : ''}><i>${k === lang() ? ui('check') : k.slice(0, 2).toUpperCase()}</i><span><b>${n}</b><small lang="en">${e}</small></span></button>`).join('')}</div>${t('mt') ? `<p class="mt2">${t('mt')}</p>` : ''}`;
  const side = $('#side'), sig = lang();
  if (side.dataset.sig !== sig) {
    side.dataset.sig = sig; const top = side.querySelector('.tree')?.scrollTop || 0;
    side.innerHTML = `<div class="shead"><b>${t('course')}</b><small>${flat.length} ${t('lessons')}</small></div><div class="tree">${cat.map(s => `<section class="mod" data-mod="${s.id}" style="--c:${s.color}"><button class="mh" aria-expanded="false" aria-controls="m-${s.id}">${ui('chevron-right', 14)}<span class="si">${subject(s.id)}</span><span class="mt">${esc(known(s.title))}</span><small></small></button><div class="mb" id="m-${s.id}" inert><div class="mc">${s.chapters.map(c => `<h3>${esc(known(c.title))}</h3><ul>${c.lessons.map(l => `<li><a href="${href(l)}" data-l="${l.id}"><i></i><span>${esc(known(l.title))}</span></a></li>`).join('')}</ul>`).join('')}</div></div></section>`).join('')}</div><div class="prog"><span>${t('progress')}</span><b></b><div><i></i></div></div>`;
    side.querySelector('.tree').scrollTop = top; void side.offsetHeight;
  }
  for (const a of side.querySelectorAll('[data-l]')) { const d = done.has(a.dataset.l), w = a.classList.contains('done'); if (d !== w || !a.firstChild.innerHTML) { a.classList.toggle('done', d); a.firstChild.innerHTML = ui(d ? 'check' : 'file-text', 14); } const c = h === 'l' && a.dataset.l === cur; c ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); }
  for (const s of cat) side.querySelector(`[data-mod="${s.id}"] .mh small`).textContent = `${doneIn(lessonsOf(s))}/${lessonsOf(s).length}`;
  const n = doneIn(flat); side.querySelector('.prog b').textContent = `${n}/${flat.length}`; side.querySelector('.prog div i').style.width = n / flat.length * 100 + '%';
  const m = h === 'l' && metaOf(cur); if (m && chrome.last !== cur) { chrome.last = cur; toggle(m.sub.id, true); setTimeout(() => side.querySelector('[aria-current]')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 360); } else toggle(openSub, true);
}
function toggle(id, force) {
  openSub = force ? id : openSub === id ? null : id;
  for (const m of document.querySelectorAll('.mod')) { const o = m.dataset.mod === openSub; m.classList.toggle('open', o); m.querySelector('.mh').setAttribute('aria-expanded', o); m.querySelector('.mb').inert = !o; }
}
const isDark = () => (document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light')) === 'dark';
function reset() { scene?.destroy(); scene = null; view = null; figures.forEach(f => f.destroy()); figures = []; }
const enter = html => { main.innerHTML = html; main.scrollTop = 0; };

/* learn */
const cmdBlocks = body => {
  let out = '', buf = [], rows = [], parts = [], lis = [];
  const table = () => { if (rows.length) out += `<div class="tb" tabindex="0"><table>${rows.map((x, i) => `<tr>${x.split('|').map(c => `<t${i ? 'd' : 'h'}>${md(c.trim())}</t${i ? 'd' : 'h'}>`).join('')}</tr>`).join('')}</table></div>`; rows = []; };
  const flush = () => { if (buf.length) out += `<pre translate="no" tabindex="0"${parts.length ? ' class="has"' : ''}>${buf.join('\n')}</pre>`; buf = []; };
  const lists = () => {
    if (parts.length) { flush(); out += `<dl class="anat">${parts.map(b => `<dt translate="no"><code>${esc(b.a.replace(/\*\*|`/g, ''))}</code></dt><dd>${md(b.t)}</dd>`).join('')}</dl>`; parts = []; }
    if (lis.length) { out += `<ul class="li">${lis.map(b => `<li>${md(b.t)}</li>`).join('')}</ul>`; lis = []; }
  };
  for (const b of body) {
    if (b.k === 'part') { parts.push(b); continue; }
    if (b.k === 'li') { flush(); lis.push(b); continue; }
    lists();
    if (b.k === 'row') { flush(); rows.push(b.t); continue; }
    table();
    if (b.k === 'cmd') buf.push(`<span class="p">$ </span>${esc(b.t)}`);
    else if (b.k === 'out') buf.push(`<span class="o">${esc(b.t)}</span>`);
    else { flush(); out += b.k === 'p' ? `<p>${md(b.t)}</p>` : `<div class="box ${b.k}">${ui(b.k === 'key' ? 'lightbulb' : 'triangle-alert', 18)}<div><b class="h">${t(b.k)}</b>${md(b.t)}</div></div>`; }
  }
  lists(); flush(); table(); return out;
};
async function showLesson(id, n) {
  const my = ++seq, meta = metaOf(id); if (!meta) return home();
  let l; try { l = await get('lesson/' + id); } catch { return fail(); }
  if (my !== seq) return;
  document.title = `${known(meta.title)} · Opsyard`;
  const i = Math.min(Math.max(1, n | 0), l.steps.length) - 1;
  if (!(view?.id === id && scene)) {
    reset();
    enter(`<div class="learn" style="--c:${meta.sub.color}"><section class="pane stage"><header><span class="si big">${subject(meta.sub.id, 26)}</span><div><h1></h1><p></p></div><span class="lvl"></span></header><div class="view"><div class="host"></div><div class="ctl"><button class="btn" data-replay></button><button class="btn" data-pause></button><button class="btn" data-speed>1×</button></div></div></section><div class="col"><section class="pane step"><div class="txt" aria-live="polite"></div><div class="go"></div></section><section class="pane chap"></section></div><nav class="pane tl" aria-label="${t('inLesson')}"><div class="tlw"><div class="tr"><i></i></div><ol>${l.steps.map((x, k) => `<li><button data-step="${k + 1}"><i>${k + 1}</i><span></span></button></li>`).join('')}</ol></div></nav></div>`);
    scene = new Scene(main.querySelector('.host')); scene.build(l.nodes, l.zones, known); view = { id, l };
  }
  view.i = i; chrome(); paint();
  const s = l.steps[i];
}
function paint() {
  const { l, i } = view, s = l.steps[i], meta = metaOf(l.id), last = i === l.steps.length - 1, ch = meta.sub.chapters.find(c => c.lessons.some(x => x.id === l.id));
  const q = (x, y) => { main.querySelector(x).innerHTML = y; };
  q('.stage h1', esc(known(meta.title))); q('.stage header p', esc(known(meta.sum))); q('.lvl', `${esc(known(meta.level))} · ${l.steps.length} ${t('step').toLowerCase()}${lang() === 'en' ? 's' : ''}`);
  q('[data-replay]', ui('rotate-ccw') + t('replay')); pauseBtn(); main.querySelector('[data-speed]').setAttribute('aria-label', t('speed'));
  q('.txt', `<div class="tag"><span>${t('step')} ${i + 1} ${t('of')} ${l.steps.length}</span><b class="${s.tag}">${esc(known(s.tag[0] + s.tag.slice(1).toLowerCase()))}</b></div><h2>${esc(known(s.t))}</h2>${cmdBlocks(s.body)}${last ? `<div class="quiz"><b>${t('quiz')}</b><p>${md(l.quiz.q)}</p>${l.quiz.o.map((o, k) => `<button data-q="${k}">${md(o.t)}</button>`).join('')}<p class="qr" role="status"></p></div>${l.src.length ? `<p class="src">${t('sources')}: ${l.src.map(x => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.t)}</a>`).join(', ')}</p>` : ''}` : ''}`);
  [...main.querySelector('.txt').children].forEach((e, k) => { e.style.setProperty('--i', k); e.classList.add('gin'); });
  main.querySelector('.txt').scrollTop = 0;
  q('.go', `<button class="btn" data-go="-1"${i ? '' : ' disabled'}>${ui('arrow-left')}${t('back')}</button><button class="btn pri" data-go="1"><span>${last ? t('finish') : `${t('next')}: ${esc(known(l.steps[i + 1].t))}`}</span>${ui('arrow-right')}</button>`);
  q('.chap', `<h3>${t('inChapter')}</h3><ul>${ch.lessons.map(x => `<li><a href="${href(x)}"${x.id === l.id ? ' aria-current="page"' : ''} class="${done.has(x.id) ? 'done' : ''}">${ui(done.has(x.id) ? 'circle-check' : 'file-text')}<span>${esc(known(x.title))}</span></a></li>`).join('')}</ul>`);
  main.querySelectorAll('.tl li').forEach((li, k) => { li.className = k < i ? 'was' : k === i ? 'now' : ''; k === i ? li.setAttribute('aria-current', 'step') : li.removeAttribute('aria-current'); li.querySelector('span').textContent = known(l.steps[k].t); });
  const tl = main.querySelector('.tl'), cur = tl.querySelector('[aria-current]'), N = l.steps.length;
  main.querySelector('.tr').style.cssText = `left:${50 / N}%;right:${50 / N}%`; main.querySelector('.tr i').style.width = (N > 1 ? i / (N - 1) * 100 : 0) + '%';
  tl.scrollTo({ left: cur.offsetLeft - tl.clientWidth / 2 + cur.offsetWidth / 2, behavior: 'smooth' });
  scene.apply(stateAt(l, i));
}
const pauseBtn = () => { main.querySelector('[data-pause]').innerHTML = ui(scene.paused ? 'play' : 'pause') + t(scene.paused ? 'play' : 'pause'); };
function go(d) {
  if (!view?.l) return;
  const k = view.i + d; if (k < 0) return;
  if (k < view.l.steps.length) { location.hash = `#/l/${view.id}/${k + 1}`; return; }
  done.add(view.id); store.set('done', JSON.stringify([...done]));
  const nx = flat[flat.findIndex(l => l.id === view.id) + 1];
  location.hash = nx ? href(nx) : '#/';
}

/* home */
const HERO = { nodes: [['client', 'user', 0, 0, 'Client'], ['ba', 'user', 1, 0, 'Analyst'], ['dev', 'team', 2, 0, 'Dev team'], ['qa', 'user', 2, 1, 'Tester'], ['ops', 'user', 1, 1, 'Operations'], ['prod', 'rack', 0, 1, 'Production']].map(([id, shape, x, y, label]) => ({ id, shape, x, y, label })), zones: [], steps: [{ add: [], del: [], hot: [], st: [], flow: [['client', 'ba'], ['ba', 'dev'], ['dev', 'qa'], ['qa', 'ops'], ['ops', 'prod']].map(([a, b]) => ({ a, b, t: '', walk: b !== 'prod' })), acts: [{ k: 'say', id: 'client', t: 'I need an online shop.' }, { k: 'walk', a: 'client', b: 'ba', t: '' }, { k: 'walk', a: 'ba', b: 'dev', t: '' }, { k: 'walk', a: 'dev', b: 'qa', t: '' }, { k: 'walk', a: 'qa', b: 'ops', t: '' }, { k: 'flow', a: 'ops', b: 'prod', t: '' }, { k: 'say', id: 'ops', t: 'It is live.' }] }] };
const FIG = { sdlc: 'riffle', linux: 'terminal', git: 'branches', github: 'hub', cicd: 'slow', jenkins: 'relay', docker: 'lockers', kubectl: 'settle', ansible: 'patch', terraform: 'terrain', aws: 'cabinet', observe: 'phosphor', devsecops: 'vault' };
function home() {
  seq++; reset(); document.title = 'Opsyard: ' + t('heroT'); chrome();
  const first = flat.find(l => !done.has(l.id)) || flat[0];
  enter(`<div class="page"><section class="hero"><div class="gin"><h1>${t('heroT')}</h1><p>${t('heroP')}</p><div class="acts"><a class="btn pri" href="${href(first)}">${t('start')}${ui('arrow-right')}</a></div></div><div class="view"><div class="host"></div></div></section><section class="yard">${cat.map(s => { const ls = lessonsOf(s); return `<a class="crate" style="--c:${s.color}" href="${href(ls[0])}" data-fig="${s.id}"><span class="fig" aria-hidden="true"></span><div><h2><span class="si">${subject(s.id, 22)}</span>${esc(known(s.title))}</h2><p>${esc(known(s.desc))}</p><span class="cnt">${doneIn(ls)}/${ls.length} ${t('lessons')}</span></div></a>`; }).join('')}</section><section class="syll"><h2>${t('syllabus')}</h2>${cat.map(s => `<div class="fold" style="--c:${s.color}"><button class="fh" aria-expanded="false">${ui('chevron-right', 16)}<span class="si">${subject(s.id, 20)}</span>${esc(known(s.title))}</button><div class="mb" inert><div class="mc">${s.chapters.map(c => `<h3>${esc(known(c.title))}</h3><ul>${c.lessons.map(l => `<li><a href="${href(l)}">${esc(known(l.title))}</a> <span>${esc(known(l.sum))}</span></li>`).join('')}</ul>`).join('')}</div></div></div>`).join('')}</section></div>`);
  scene = new Scene(main.querySelector('.host')); scene.build(HERO.nodes, HERO.zones, known); scene.apply(stateAt(HERO, 0));
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: main, rootMargin: '0px 0px -6% 0px' });
  main.querySelectorAll('.crate,.fold').forEach((e, k) => { e.style.setProperty('--i', k % 3); io.observe(e); });
  main.querySelectorAll('[data-fig]').forEach(a => { const box = a.querySelector('.fig'), f = hairline[FIG[a.dataset.fig]](box, { play: true, intensity: .6 }); figures.push(f); box.querySelectorAll('[tabindex]').forEach(x => x.tabIndex = -1); });
}
function fail() { reset(); enter(`<div class="lockp"><h1>${t('eNet')}</h1><button class="btn pri" data-reload>${t('replay')}</button></div>`); }
const RISK = { s: 'safe', c: 'changes', d: 'destructive' }, TRISK = { s: 'rLow', c: 'rMed', d: 'rHigh' };
const stagger = el => [...el.children].forEach((e, k) => { e.classList.add('gin'); e.style.setProperty('--i', Math.min(k, 8)); });

/* commands */
async function commands(gid, ci) {
  const my = ++seq; let all; try { all = await get('commands'); } catch { return fail(); } if (my !== seq) return;
  document.title = t('commands') + ' · Opsyard'; chrome();
  const g = all.find(x => x.id === gid) || all[0], c = g.list[ci | 0] || g.list[0], color = cat.find(s => s.id === (g.id === 'gh' ? 'github' : g.id))?.color || '#0f6b63';
  if (view?.cmd !== g.id) {
    reset(); view = { cmd: g.id };
    enter(`<div class="ref" style="--c:${color}"><section class="pane view"><div class="host"></div></section><section class="pane list"><div class="tabs"><h1>${t('commands')}</h1>${all.map(x => `<button aria-pressed="${x === g}" data-href="#/commands/${x.id}/0">${subject(x.id)}${esc(x.title)}</button>`).join('')}</div><div class="rows"></div></section><section class="pane det" aria-live="polite"></section></div>`);
    scene = new Scene(main.querySelector('.host')); scene.build(g.nodes, [], known);
  }
  const rows = main.querySelector('.rows');
  if (rows.dataset.k !== lang() + known(c.what)) { rows.dataset.k = lang() + known(c.what); const top = rows.parentNode.scrollTop; rows.innerHTML = g.list.map((x, k) => `<button class="rowb" data-href="#/commands/${g.id}/${k}"><code translate="no">${esc(x.cmd)}</code><span>${md(x.what)}</span><span class="rk ${x.risk}">${t(RISK[x.risk])}</span></button>`).join(''); rows.parentNode.scrollTop = top; }
  [...rows.children].forEach((b, k) => b.setAttribute('aria-pressed', g.list[k] === c));
  rows.querySelector('[aria-pressed=true]')?.scrollIntoView({ block: 'nearest' });
  const det = main.querySelector('.det');
  det.innerHTML = `<h2 translate="no"><code>${esc(c.cmd)}</code></h2><p class="rk ${c.risk}">${t(RISK[c.risk])}</p><p>${md(c.what)}</p>${c.flags.length ? `<dl><dt>${t('flags')}</dt>${c.flags.map(f => { const p = f.indexOf(' = '); return p < 0 ? `<dd>${md(f)}</dd>` : `<dd><code translate="no">${esc(f.slice(0, p))}</code> ${md(f.slice(p + 3))}</dd>`; }).join('')}</dl>` : ''}${c.tip ? `<div class="box">${ui('lightbulb', 18)}<div><b class="h">${t('tip')}</b>${md(c.tip)}</div></div>` : ''}`;
  stagger(det);
  const used = new Set(c.flow.flatMap(f => [f.a, f.b]));
  scene.apply({ vis: new Set(g.nodes.map(n => n.id)), hot: [...used], st: c.risk === 'd' ? [{ id: c.flow.at(-1).b, s: 'err', t: 'data can be lost' }] : [], edges: c.flow.map(f => [f.a, f.b]), flow: c.flow, acts: c.flow.map(f => ({ k: 'flow', ...f })) });
}
/* tools */
const TCAT = { Network: ['cloud', 'Network'], Shell: ['doc', 'Scripts'], 'Text and data': ['doc', 'Data'], Monitoring: ['gauge', 'Processes'], Debugging: ['gear', 'Process'], Firewall: ['gate', 'Firewall'], Defence: ['shield', 'Your server'], Auditing: ['server', 'Your system'], 'Container security': ['stack', 'Image'], Discovery: ['router', 'Test network'], 'Web testing': ['server', 'Test web app'], 'Credential testing': ['key', 'Test accounts'], Exploitation: ['rack', 'Isolated lab'], Wireless: ['router', 'Your Wi-Fi'], Secrets: ['db', 'Repository'], 'Load testing': ['server', 'Test server'], Cryptography: ['key', 'Keys'] };
async function tools(i, f = 'all') {
  const my = ++seq; let all; try { all = await get('tools'); } catch { return fail(); } if (my !== seq) return;
  document.title = t('tools') + ' · Opsyard'; chrome();
  const x = all[i | 0] || all[0], show = all.filter(y => f === 'all' || y.os.toLowerCase().includes(f));
  if (!view?.tools) { reset(); view = { tools: 1 }; enter(`<div class="ref" style="--c:#8a6d1d"><section class="pane view"><div class="host"></div></section><section class="pane list"><div class="tabs"></div><div class="rows"></div></section><section class="pane det" aria-live="polite"></section></div>`); scene = new Scene(main.querySelector('.host')); }
  main.querySelector('.tabs').innerHTML = `<h1>${t('tools')}</h1>` + [['all', t('all'), 'layers'], ['ubuntu', 'Ubuntu'], ['kali', 'Kali']].map(([k, n]) => `<button aria-pressed="${k === f}" data-href="#/tools/${i | 0}/${k}">${k === 'all' ? ui('layers') : brandOf(k)}${n}</button>`).join('');
  main.querySelector('.rows').innerHTML = show.map(y => `<button class="rowb" aria-pressed="${y === x}" data-href="#/tools/${all.indexOf(y)}/${f}"><code translate="no">${esc(y.name)}</code><span>${esc(known(y.cat))} · ${esc(y.os)}</span><span class="rk ${y.risk}">${t(TRISK[y.risk])}</span></button>`).join('');
  const det = main.querySelector('.det'); det.scrollTop = 0;
  det.innerHTML = `<h2 translate="no">${esc(x.name)}</h2><p class="cnt">${esc(x.os)}${x.pkg ? ` · sudo apt install ${esc(x.pkg)}` : ''}</p><p class="rk ${x.risk}">${t(TRISK[x.risk])}</p><dl><dt>${t('purpose')}</dt><dd>${md(x.purpose)}</dd><dt>${t('where')}</dt><dd>${md(x.where)}</dd><dt>${t('how')}</dt></dl>${x.uses.map(u => `<div class="use"><pre translate="no" tabindex="0"><span class="p">$ </span>${esc(u.c)}</pre><span>${md(u.d || '')}</span></div>`).join('')}<dl><dt>${t('risks')}</dt><dd>${md(x.risks)}</dd><dt>${t('guide')}</dt><dd>${md(x.guide)}</dd></dl><p class="src">${t('sources')}: <a href="${esc(x.src)}" target="_blank" rel="noopener">${esc(x.src)}</a></p>`;
  stagger(det);
  const [shape, label] = TCAT[x.cat] || ['server', 'Target'], T = { nodes: [{ id: 'y', shape: 'user', x: 0, y: 0, label: 'Admin' }, { id: 't', shape: 'laptop', x: 1, y: 0, label: x.name }, { id: 'g', shape, x: 2, y: 0, label, sub: x.risk === 's' ? '' : 'only with permission' }, { id: 'r', shape: 'doc', x: 1, y: 1, label: 'Report' }], zones: [], steps: [{ add: [], del: [], hot: ['t'], st: x.risk === 'd' ? [{ id: 'g', s: 'warn', t: 'lab only' }] : [], flow: [['y', 't'], ['t', 'g'], ['g', 't'], ['t', 'r']].map(([a, b], k) => ({ a, b, t: ['run', 'check', 'answer', ''][k] })) }] };
  T.steps[0].acts = T.steps[0].flow.map(q => ({ k: 'flow', ...q })); scene.build(T.nodes, [], known); scene.apply(stateAt(T, 0));
}
const brandOf = k => brand(k === 'kali' ? 'kalilinux' : k);

/* search */
function find() {
  const d = $('#find'); d.innerHTML = `<div class="fi">${ui('search', 18)}<input type="search" aria-label="${t('search')}" placeholder="${t('search')}"></div><div class="res"></div>`; if (!d.open) d.showModal();
  const inp = d.querySelector('input'), run = () => {
    const w = inp.value.toLowerCase().split(/\s+/).filter(Boolean);
    const hit = flat.filter(l => { const h = [l.title, known(l.title), l.sum, l.sub.title, ...l.steps].join(' ').toLowerCase(); return w.every(x => h.includes(x)); }).slice(0, 14);
    d.querySelector('.res').innerHTML = hit.map(l => `<a href="${href(l)}"><span class="si" style="--c:${l.sub.color}">${subject(l.sub.id, 20)}</span><span>${esc(known(l.title))}<small>${esc(known(l.sub.title))}: ${esc(known(l.sum))}</small></span></a>`).join('') || `<p>${t('none')}</p>`;
  };
  inp.oninput = run; inp.onkeydown = e => { if (e.key === 'Enter') d.querySelector('.res a')?.click(); }; run(); inp.focus();
}

const closeSide = () => { $('#side').classList.remove('open'); $('#menu').setAttribute('aria-expanded', 'false'); };
function route() {
  const [, p, a, b] = location.hash.split('/'); closeSide();
  if (p === 'l') showLesson(a, +b || 1); else if (p === 'commands') commands(a, b); else if (p === 'tools') tools(a, b); else home();
}
async function changeLang(l) {
  const ok = await loadLang(l); store.set('lang', setLang(l)); view = null; route();
  $('#note').textContent = t('eNet'); $('#note').hidden = ok;
}
document.addEventListener('click', e => {
  const b = e.target.closest('button,a'); if (!b) { if ($('#side').classList.contains('open') && !e.target.closest('#side')) closeSide(); if (e.target.id === 'find') e.target.close(); return; }
  const d = b.dataset;
  if (b.id === 'menu') b.setAttribute('aria-expanded', $('#side').classList.toggle('open'));
  else if (b.id === 'search') find();
  else if (b.id === 'theme') { store.set('theme', document.documentElement.dataset.theme = isDark() ? 'light' : 'dark'); chrome(); }
  else if (b.classList.contains('mh')) toggle(b.parentNode.dataset.mod);
  else if (b.classList.contains('fh')) { const o = b.parentNode.classList.toggle('open'); b.setAttribute('aria-expanded', o); b.nextElementSibling.inert = !o; }
  else if (d.lang) { $('#langs').hidePopover(); changeLang(d.lang); }
  else if (d.go) go(+d.go);
  else if (d.step) location.hash = `#/l/${view.id}/${d.step}`;
  else if (d.href) location.hash = d.href;
  else if ('reload' in d) location.reload();
  else if ('replay' in d) { scene.pause(false); pauseBtn(); scene.build(view.l.nodes, view.l.zones, known); scene.apply(stateAt(view.l, view.i)); }
  else if ('pause' in d) { scene.pause(!scene.paused); pauseBtn(); }
  else if ('speed' in d) { const n = { 1: 2, 2: .5, .5: 1 }[scene.rate]; scene.speed(n); b.textContent = n + '×'; }
  else if (d.q) { const o = view.l.quiz.o[d.q]; b.className = o.ok ? 'y' : 'n'; main.querySelector('.qr').textContent = t(o.ok ? 'right' : 'wrong'); }
  else if (b.closest('#find')) $('#find').close();
});
document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return find(); }
  if (e.target.closest('input,select,textarea,dialog,pre,[popover]') || e.ctrlKey || e.metaKey || e.altKey || !view?.l) return;
  if (e.key === 'ArrowRight' && view.i < view.l.steps.length - 1) go(1); else if (e.key === 'ArrowLeft') go(-1);
  else if (e.key === 'r') main.querySelector('[data-replay]').click();
  else if (e.key === ' ' && !e.target.closest('button,a')) { e.preventDefault(); main.querySelector('[data-pause]').click(); }
});
addEventListener('hashchange', route);

const th = store.get('theme'); if (th) document.documentElement.dataset.theme = th;
setLang(store.get('lang') || navigator.languages?.map(l => /^zh-(TW|HK|Hant)/.test(l) ? 'zh-Hant' : l.split('-')[0]).find(l => LANGS.some(x => x[0] === l)) || 'en');
try {
  cat = await get('catalog'); flat = cat.flatMap(s => lessonsOf(s).map(l => ({ ...l, sub: s })));
  if (lang() === 'en') route(); else changeLang(lang());
} catch (e) { console.error(e); fail(); }
