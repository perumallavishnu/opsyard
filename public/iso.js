// Isometric SVG scene. One grid cell = one node. x runs right-down, y runs left-down, z is up.
import { UI, BRAND } from './icons.js';
const U = 74, V = 43, NS = 'http://www.w3.org/2000/svg';
const OUT = 'cubic-bezier(.2,.7,.2,1)', INOUT = 'cubic-bezier(.65,0,.35,1)', BACK = 'cubic-bezier(.34,1.56,.64,1)';
const P = (x, y, z = 0) => [(x - y) * U, (x + y) * V - z];
const S = 1.85, G = (x, y) => P(x * S, y * S); // grid spacing, independent of object size
const pts = a => a.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ');
const poly = (a, c) => `<polygon class="${c}" points="${pts(a)}"/>`;
const line = (a, b, c = 'ln') => `<line class="${c}" x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}"/>`;

// Rounded block: a fat round-joined outline under three fat round-joined faces.
function box(w, d, h, z = 0, { ribs = 0, slots = 0 } = {}) {
  const L = (u, v) => P(-w + u * 2 * w, d, z + v * h), R = (u, v) => P(w, d - u * 2 * d, z + v * h);
  let s = poly([P(-w, -d, z + h), P(w, -d, z + h), P(w, -d, z), P(w, d, z), P(-w, d, z), P(-w, d, z + h)], 'ol')
    + poly([L(0, 0), L(1, 0), L(1, 1), L(0, 1)], 'fl') + poly([R(0, 0), R(1, 0), R(1, 1), R(0, 1)], 'fr')
    + poly([P(-w, -d, z + h), P(w, -d, z + h), P(w, d, z + h), P(-w, d, z + h)], 'ft');
  for (let i = 1; i < ribs; i++) s += line(R(i / ribs, .08), R(i / ribs, .92));
  for (let i = 1; i <= slots; i++) { const v = i / (slots + 1); s += line(L(.12, v), L(.6, v)) + `<circle class="led" style="animation-delay:${-i * .37}s" cx="${L(.84, v)[0]}" cy="${L(.84, v)[1]}" r="2.6"/>`; }
  return s;
}
const cyl = (r, h, z = 0) => { const y = r * .58; return `<path class="ol" d="M${-r} ${-z - h}V${-z}A${r} ${y} 0 0 0 ${r} ${-z}V${-z - h}A${r} ${y} 0 0 0 ${-r} ${-z - h}Z"/><path class="fl" d="M${-r} ${-z - h}V${-z}A${r} ${y} 0 0 0 ${r} ${-z}V${-z - h}Z"/><path class="fr" d="M${r * .3} ${-z - h}V${-z + y * .95}A${r} ${y} 0 0 0 ${r} ${-z}V${-z - h}Z"/><ellipse class="ft" cx="0" cy="${-z - h}" rx="${r}" ry="${y}"/>`; };
const panel = (w, h, z, inner) => { const A = (u, v) => P(-w + 2 * w * u, .05, z + v * h); return box(w, .05, h, z) + inner(A); };
const row = (A, u0, u1, v, c) => line(A(u0, v), A(u1, v), c);
const at = (x, y, s) => `<g transform="translate(${x} ${y})">${s}</g>`;

/* icons */
const glyph = (name, size) => BRAND[name] ? `<path class="gb" transform="scale(${size / BRAND[name][0]}) translate(${-BRAND[name][0] / 2} ${-BRAND[name][0] / 2})" d="${BRAND[name][1]}"/>` : `<g class="gu" transform="scale(${size / 24}) translate(-12 -12)">${UI[name]}</g>`;
const onLeft = (w, d, h, z, name, size) => { const c = P(0, d, z + h / 2); return `<g transform="matrix(.865 .502 0 1 ${c[0]} ${c[1]})">${glyph(name, size)}</g>`; };
const flat = (x, y, name, size) => at(x, y, glyph(name, size));

/* people */
const ROLES = [ // label pattern, icon, body colour
  [/client|customer|stakeholder|buyer|^users?$/i, 'briefcase', '--p-coral'],
  [/analyst|\bBA\b/i, 'clipboard-list', '--p-sand'],
  [/product owner|manager|commander|lead|plan/i, 'flag', '--p-amber'],
  [/scrum master|coach/i, 'refresh-cw', '--p-teal'],
  [/design/i, 'lightbulb', '--p-sand'],
  [/test|qa\b/i, 'bug', '--p-green'],
  [/ops|operat|on-call|admin|responder|support|sre/i, 'headset', '--p-teal'],
  [/review|owner/i, 'eye', '--p-green'],
  [/commun/i, 'message-square', '--p-amber'],
  [/attack|fork author|manual/i, 'triangle-alert', '--p-coral'],
  [/dev|engineer|author|ana|ben|pair|programmer/i, 'code', '--p-blue'],
];
const roleOf = label => ROLES.find(r => r[0].test(label || '')) || [0, 'user', '--p-blue'];
const person = (col, icon) => `<g class="person" style="--c:var(${col})"><path class="ol" d="M-15 -8C-15 -30 -9 -37 0 -37S15 -30 15 -8C15 4 -15 4 -15 -8Z"/><path class="fl" d="M-15 -8C-15 -30 -9 -37 0 -37S15 -30 15 -8C15 4 -15 4 -15 -8Z"/><path class="fr" d="M4 -36.500C11 -34 15 -26 15 -8C15 -2 10 .5 4 .9Z"/><circle class="ol" cx="0" cy="-48" r="11.500"/><circle class="hd" cx="0" cy="-48" r="11.500"/>${icon ? flat(0, -15, icon, 15) : ''}</g>`;
const CREW = ['--p-blue', '--p-amber', '--p-green', '--p-coral'];
const crew = n => {
  const [, icon, col] = roleOf(n.label), spots = [[-.24, -.24], [.24, -.24], [-.24, .24], [.24, .24]];
  return box(.52, .52, 5) + spots.map(([x, y], i) => { const p = P(x, y, 7); return at(p[0], p[1], `<g transform="scale(.74)">${person(i === 3 ? col : CREW[(i + n.id.length) % 4], i === 3 ? icon : '')}</g>`); }).join('');
};
export const PEOPLE = new Set(['user', 'team']);

/* shapes: each gets the node, so it can place that node's icon */
const ico = (n, d) => n.icon || d;
export const SHAPES = {
  cube: n => box(.3, .3, 42) + onLeft(.3, .3, 42, 0, ico(n, 'cpu'), 26),
  box: n => box(.38, .28, 46, 0, { ribs: 5 }) + onLeft(.38, .28, 46, 0, ico(n, 'package'), 28),
  small: n => box(.23, .23, 30) + onLeft(.23, .23, 30, 0, ico(n, 'zap'), 19),
  server: n => box(.27, .27, 78, 0, { slots: 4 }) + (n.icon ? at(...P(0, 0, 78), `<g transform="scale(1 .58)">${glyph(n.icon, 22)}</g>`) : ''),
  rack: n => box(.31, .31, 102, 0, { slots: 6 }) + (n.icon ? at(...P(0, 0, 102), `<g transform="scale(1 .58)">${glyph(n.icon, 24)}</g>`) : ''),
  router: n => box(.36, .28, 22, 0, { slots: 1 }) + line(P(.2, -.12, 24), P(.2, -.12, 56), 'st') + `<circle class="led" cx="${P(.2, -.12, 58)[0]}" cy="${P(.2, -.12, 58)[1]}" r="4"/>` + at(...P(-.06, .04, 22), `<g transform="scale(1 .58)">${glyph(ico(n, 'workflow'), 24)}</g>`),
  db: n => cyl(30, 56) + flat(0, -16, ico(n, 'database'), 24),
  bucket: n => cyl(28, 36) + flat(0, -8, ico(n, 'layers'), 20),
  commit: () => cyl(21, 11) + `<g transform="translate(0 -11) scale(1 .58)">${glyph('git-commit-horizontal', 22)}</g>`,
  stack: n => [0, 1, 2, 3].map(i => box(.32, .32, 9, i * 16)).join('') + at(...P(0, 0, 57), `<g transform="scale(1 .58)">${glyph(ico(n, 'layers'), 26)}</g>`),
  layer: n => box(.36, .36, 10) + at(...P(0, 0, 10), `<g transform="scale(1 .58)">${glyph(ico(n, 'layers'), 28)}</g>`),
  doc: n => panel(.25, 60, 0, A => [.84, .7].map((v, i) => row(A, .14, i ? .6 : .86, v, 'lk')).join('')) + at(...P(0, .05, 22), `<g transform="matrix(.865 .502 0 1 0 0)">${glyph(ico(n, 'file-text'), 22)}</g>`),
  board: n => panel(.44, 64, 0, A => line(A(.33, .06), A(.33, .8)) + line(A(.66, .06), A(.66, .8)) + row(A, .06, .94, .86, 'lk') + [[.06, .27, .66], [.06, .27, .46], [.39, .6, .66], [.72, .94, .66], [.72, .94, .46], [.72, .94, .26]].map(r => row(A, r[0], r[1], r[2], 'tk')).join('')),
  card: n => panel(.22, 38, 0, A => row(A, .15, .85, .76, 'lk') + row(A, .15, .6, .5, 'tk') + row(A, .15, .75, .26, 'tk')),
  gauge: n => panel(.36, 54, 0, A => `<polyline class="lk draw" pathLength="1" points="${pts([A(.08, .2), A(.28, .5), A(.45, .35), A(.65, .75), A(.92, .6)])}"/>`),
  folder: n => box(.34, .13, 42) + at(...P(-.2, 0, 45), '') + onLeft(.34, .13, 42, 0, ico(n, 'folder'), 26),
  laptop: () => box(.32, .28, 6) + poly([P(-.32, -.28, 8), P(.32, -.28, 8), P(.32, -.36, 58), P(-.32, -.36, 58)], 'ol') + poly([P(-.32, -.28, 8), P(.32, -.28, 8), P(.32, -.36, 58), P(-.32, -.36, 58)], 'fl') + poly([P(-.27, -.28, 14), P(.27, -.28, 14), P(.27, -.35, 53), P(-.27, -.35, 53)], 'scr') + `<g transform="matrix(.865 .502 -.06 1 ${P(0, -.31, 33)[0]} ${P(0, -.31, 33)[1]})">${glyph('code', 22)}</g>` + line(P(-.2, -.08, 7), P(.2, -.08, 7)) + line(P(-.2, .06, 7), P(.2, .06, 7)),
  user: n => { const r = roleOf(n.label); return person(r[2], r[1]); },
  team: crew,
  cloud: n => `<g class="float"><path class="ol" d="M-46 2C-62 2 -62 -22 -44 -23C-44 -46 -14 -54 -2 -38C12 -52 40 -42 38 -22C58 -22 56 2 40 2Z"/><path class="ft" d="M-46 2C-62 2 -62 -22 -44 -23C-44 -46 -14 -54 -2 -38C12 -52 40 -42 38 -22C58 -22 56 2 40 2Z"/>${flat(-3, -16, ico(n, 'globe'), 26)}</g>`,
  pod: n => { const r = 33, h = 38, p = i => [r * Math.cos(i * Math.PI / 3), r * .58 * Math.sin(i * Math.PI / 3)], q = (i, z) => [p(i)[0], p(i)[1] - z]; return poly([q(3, h), q(4, h), q(5, h), q(0, h), q(0, 0), q(1, 0), q(2, 0), q(3, 0)], 'ol') + poly([q(3, 0), q(2, 0), q(2, h), q(3, h)], 'fl') + poly([q(2, 0), q(1, 0), q(1, h), q(2, h)], 'fl') + poly([q(1, 0), q(0, 0), q(0, h), q(1, h)], 'fr') + poly([0, 1, 2, 3, 4, 5].map(i => q(i, h)), 'ft') + flat(0, -3, ico(n, 'container'), 22); },
  shield: () => `<path class="ol" d="M0 -62L-26 -52V-28C-26 -10 -12 2 0 8C12 2 26 -10 26 -28V-52Z"/><path class="fl" d="M0 -62L-26 -52V-28C-26 -10 -12 2 0 8Z"/><path class="fr" d="M0 -62L26 -52V-28C26 -10 12 2 0 8Z"/><polyline class="ck draw" pathLength="1" points="-11,-28 -3,-19 12,-38"/>`,
  gear: n => box(.32, .32, 42) + onLeft(.32, .32, 42, 0, ico(n, 'settings'), 27) + at(...P(0, 0, 43), `<g transform="scale(1 .58)"><g class="spin"><g class="gu" transform="scale(1.15) translate(-12 -12)">${UI.settings}</g></g></g>`),
  queue: () => [-.32, 0, .32].map((o, i) => at(o * U, o * V, box(.11, .2, 26))).join(''),
  flag: () => cyl(13, 5) + line([0, -3], [0, -66], 'st') + `<path class="ol" d="M1 -66C14 -72 22 -60 38 -65V-43C22 -38 14 -50 1 -44Z"/><path class="fl wave" d="M1 -66C14 -72 22 -60 38 -65V-43C22 -38 14 -50 1 -44Z"/>`,
  key: () => cyl(24, 8) + at(0, -34, `<g class="float">${glyph('key-round', 38)}</g>`),
  gate: () => at(-.3 * U, -.3 * V, box(.07, .07, 60)) + line(P(-.3, 0, 46), P(.3, 0, 46), 'bar') + at(.3 * U, .3 * V, box(.07, .07, 60)),
};
// Colour by what a thing is, so a scene reads at a glance.
const TONE = { server: 'blue', rack: 'blue', pod: 'blue', small: 'blue', cube: 'blue', laptop: 'sand', db: 'teal', bucket: 'teal', stack: 'teal', layer: 'teal', folder: 'amber', doc: 'sand', card: 'sand', board: 'sand', gauge: 'sand', box: 'coral', gear: 'amber', queue: 'amber', router: 'amber', commit: 'coral', shield: 'green', key: 'amber', gate: 'green', flag: 'coral', cloud: 'cloud', team: 'sand', user: 'blue' };
const NAMED = [[/argo/i, 'argo'], [/github|actions\b|dependabot|codeql/i, 'github'], [/\bgit\b|^repo|local repo|repository|upstream|^fork$|^main$/i, 'git'], [/jenkins|^controller$/i, 'jenkins'], [/docker|compose/i, 'docker'], [/containerd|runc/i, 'containerd'], [/prometheus/i, 'prometheus'], [/grafana/i, 'grafana'], [/terraform/i, 'terraform'], [/ansible|control node|playbook/i, 'ansible'], [/helm|chart/i, 'helm'], [/vault/i, 'vault'], [/kube|^api server|cluster/i, 'kubernetes'], [/otel|opentelemetry/i, 'opentelemetry'], [/nginx/i, 'nginx'], [/postgres/i, 'postgresql'], [/\becs\b|\beks\b|\becr\b|fargate|lambda|s3\b|ec2|\baws\b|rds|dynamo|cloudwatch|cloudtrail/i, 'aws'], [/shell/i, 'gnubash'], [/kernel|linux/i, 'linux'], [/jira/i, 'jira'], [/test|scan/i, 'shield-check'], [/image/i, 'layers'], [/network|bridge/i, 'network']];
const LABEL = { server: 'cpu', rack: 'cpu', pod: 'container', small: 'zap', cube: 'cpu', laptop: 'laptop', db: 'database', bucket: 'database', stack: 'layers', layer: 'layers', folder: 'folder', doc: 'file-text', card: 'list', board: 'square-kanban', gauge: 'gauge', box: 'package', gear: 'settings', queue: 'list', router: 'network', commit: 'git-commit-horizontal', shield: 'shield-check', key: 'key-round', gate: 'lock', flag: 'flag', cloud: 'cloud', team: 'users' };

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const wid = (s, k) => [...String(s)].reduce((a, c) => a + (/\p{M}/u.test(c) ? .12 : c > '⺀' ? 1.75 : c >= 'ऀ' && c <= '෿' ? 1.35 : 1), 0) * k; // Indic and CJK letters are wider, marks take no room
function pill(cls, y, txt, fs = 12, icon) {
  const w = wid(txt, fs * .57) + 18 + (icon ? fs + 5 : 0), h = fs + 11, off = icon ? (fs + 5) / 2 : 0;
  return `<g class="pill ${cls}"><rect x="${-w / 2}" y="${y}" width="${w}" height="${h}" rx="6"/>${icon ? at(-w / 2 + 9 + fs / 2, y + h / 2, glyph(icon, fs + 1)) : ''}<text x="${off}" y="${y + h / 2 + fs * .35}" style="font-size:${fs}px">${esc(txt)}</text></g>`;
}
function wrap(t, n = 24) { const out = ['']; for (const w of String(t).split(' ')) { const l = out.at(-1); if (l && wid(l + ' ' + w, 1) > n) out.push(w); else out[out.length - 1] = l ? l + ' ' + w : w; } return out; }
function bubble(t) {
  const ls = wrap(t), w = Math.max(...ls.map(l => wid(l, 7.1))) + 26, h = ls.length * 17 + 14;
  return `<g class="bubble"><path d="M${-w / 2 + 9} ${-h - 9}H${w / 2 - 9}q9 0 9 9V-18q0 9 -9 9H9L0 0L-7 -9H${-w / 2 + 9}q-9 0 -9 -9V${-h}q0 -9 9 -9Z"/>${ls.map((l, i) => `<text y="${-h + 8 + i * 17}">${esc(l)}</text>`).join('')}</g>`;
}

export class Scene {
  constructor(host) {
    this.host = host; this.reduced = matchMedia('(prefers-reduced-motion: reduce)'); this.rate = 1; this.tok = 0; this.anims = new Set(); this.vb = null;
    let grid = ''; for (let i = -10; i <= 14; i += .5) grid += line(G(i, -10), G(i, 14), 'gl') + line(G(-10, i), G(14, i), 'gl');
    host.innerHTML = `<svg class="iso" role="img" preserveAspectRatio="xMidYMid meet"><defs><marker id="ah" viewBox="0 0 8 8" refX="6.500" refY="4" markerUnits="userSpaceOnUse" markerWidth="15" markerHeight="15" orient="auto-start-reverse"><path d="M0 .6L7 4L0 7.400Z"/></marker><radialGradient id="fade" gradientUnits="userSpaceOnUse"><stop offset=".35" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient><mask id="gm" maskUnits="userSpaceOnUse" x="-4000" y="-3000" width="8000" height="7000"><rect x="-4000" y="-3000" width="8000" height="7000" fill="url(#fade)"/></mask></defs><g class="grid" mask="url(#gm)">${grid}</g><g class="zones"></g><g class="edges"></g><g class="spots"></g><g class="nodes"></g><g class="labels"></g><g class="pk"></g><g class="over"></g></svg>`;
    this.svg = host.firstChild; this.g = k => this.svg.querySelector('.' + k); this.grad = this.svg.querySelector('#fade');
    this.ro = new ResizeObserver(() => this.want && this.camera(this.want, true)); this.ro.observe(host);
  }
  destroy() { this.stop(); this.ro.disconnect(); cancelAnimationFrame(this.cam); this.dead = true; }
  el(id) { return this.svg.querySelector(`.node[data-id="${id}"]`); }

  build(nodes, zones = [], tr = x => x, still = false) {
    this.stop(); this.tr = tr;
    this.nodes = new Map(nodes.map(n => [n.id, { ...n, icon: PEOPLE.has(n.shape) ? null : NAMED.find(r => r[0].test(n.label))?.[1] }])); this.zonesM = new Map(zones.map(z => [z.id, z]));
    const tf = n => `translate(${G(n.x, n.y).map(v => v.toFixed(1)).join(' ')})`, sorted = [...this.nodes.values()].sort((a, b) => a.x + a.y - b.x - b.y);
    this.g('zones').innerHTML = zones.map(z => { const [a, b, c, d] = [z.x - .48, z.y - .48, z.x + z.w - .52, z.y + z.h - .52], o = G(a, d); return `<g class="zone" data-id="${esc(z.id)}">${poly([G(a, b), G(c, b), G(c, d), G(a, d)], 'zp')}<text class="zt" transform="matrix(.865 .5 -.865 .5 ${o[0] + 20} ${o[1] - 5})">${esc(tr(z.label))}</text></g>`; }).join('');
    this.g('spots').innerHTML = sorted.map(n => `<g transform="${tf(n)}"><ellipse class="spot" data-spot="${esc(n.id)}" rx="46" ry="27"/></g>`).join('');
    this.g('nodes').innerHTML = sorted.map(n => `<g class="node n-${n.shape}" data-id="${esc(n.id)}" style="--c:var(--p-${TONE[n.shape]})" transform="${tf(n)}"><ellipse class="sh" cy="3" rx="${n.shape === 'team' ? 60 : 38}" ry="${n.shape === 'team' ? 35 : 21}"/><g class="pop"><g class="body">${SHAPES[n.shape](n)}</g></g></g>`).join('');
    this.g('labels').innerHTML = sorted.map(n => `<g class="lab" data-id="${esc(n.id)}" transform="${tf(n)}">${this.tag(n)}<g class="bd"></g></g>`).join('');
    this.g('edges').innerHTML = ''; this.g('pk').innerHTML = ''; this.g('over').innerHTML = ''; this.edgeM = new Map();
    this.vb = still ? this.vb : null; this.svg.classList.toggle('still', still);
    this.tops = new Map(sorted.map(n => [n.id, this.el(n.id).querySelector('.body').getBBox().y]));
  }
  tag(n) { const y = n.shape === 'team' ? 46 : 28; return pill('nm', y, this.tr(n.label), 12, PEOPLE.has(n.shape) ? (n.shape === 'team' ? 'users' : roleOf(n.label)[1]) : n.icon || LABEL[n.shape]) + (n.sub ? `<text class="sub" y="${y + 38}">${esc(this.tr(n.sub))}</text>` : ''); }

  // s: {vis:Set, hot:[], st:[], edges:[[a,b,walk]], flow:[], acts:[]}
  apply(s) {
    this.stop(); this.state = s; this.svg.getBoundingClientRect();
    this.svg.setAttribute('aria-label', [...s.vis].map(i => this.nodes.get(i)?.label).filter(Boolean).join(', '));
    const hot = new Set(s.hot), any = hot.size > 0, st = new Map(s.st.map(x => [x.id, x])); let k = 0;
    for (const el of this.svg.querySelectorAll('[data-id]')) {
      const id = el.dataset.id, x = st.get(id), on = s.vis.has(id), fresh = on && !el.classList.contains('on');
      if (el.classList.contains('node')) el.style.setProperty('--d', (fresh ? 80 * k++ : 0) + 'ms');
      else if (fresh && el.classList.contains('lab')) el.style.setProperty('--d', '260ms');
      el.classList.toggle('on', on); el.classList.toggle('hot', hot.has(id));
      el.classList.toggle('dim', any && !hot.has(id) && !el.classList.contains('zone'));
      for (const c of ['ok', 'err', 'warn', 'off', 'info']) el.classList.toggle('s-' + c, x?.s === c);
      const b = el.querySelector('.bd');
      if (b) { const want = x?.t ? x.s + x.t : ''; if (b.dataset.k !== want) { b.dataset.k = want; b.innerHTML = x?.t ? `<g class="badge">${pill('b-' + x.s, 0, this.tr(x.t), 11, { ok: 'circle-check', err: 'triangle-alert', warn: 'bell', info: 'activity', off: 'pause' }[x.s])}</g>` : ''; b.setAttribute('transform', `translate(0 ${this.tops.get(id) - 34})`); } }
    }
    for (const sp of this.svg.querySelectorAll('.spot')) { sp.classList.remove('go'); if (hot.has(sp.dataset.spot) && s.vis.has(sp.dataset.spot)) { void sp.getBoundingClientRect(); sp.classList.add('go'); } }
    this.links(s); this.camera(s.vis); this.run();
    requestAnimationFrame(() => requestAnimationFrame(() => this.svg.classList.remove('still')));
  }
  links(s) {
    const want = new Map();
    for (const [a, b, walk] of s.edges) { if (a === b || !s.vis.has(a) || !s.vis.has(b)) continue; const rev = want.get(b + '>' + a); if (rev) { rev.both = true; if (!walk) rev.walk = false; } else want.set(a + '>' + b, { a, b, walk, both: false }); }
    for (const [k, p] of this.edgeM) if (!want.has(k)) { p.remove(); this.edgeM.delete(k); }
    for (const [k, e] of want) {
      let p = this.edgeM.get(k);
      if (!p) { p = document.createElementNS(NS, 'path'); p.setAttribute('d', this.path(this.route(e.a, e.b))); this.g('edges').append(p); this.edgeM.set(k, p);
        if (!this.reduced.matches && !this.svg.classList.contains('still')) { const L = p.getTotalLength(); p.animate([{ strokeDasharray: `0 ${L}`, markerEnd: 'none' }, { strokeDasharray: `${L} 0`, markerEnd: 'none' }], { duration: 620, delay: 180, easing: INOUT, fill: 'backwards' }); } }
      const f = s.flow.filter(f => (f.a === e.a && f.b === e.b) || (f.a === e.b && f.b === e.a));
      p.setAttribute('class', 'edge' + (f.length ? ' act' : '') + (f.some(x => x.err) ? ' bad' : '') + (e.walk ? ' walk' : ''));
      p.setAttribute('marker-end', 'url(#ah)'); if (e.both) p.setAttribute('marker-start', 'url(#ah)'); else p.removeAttribute('marker-start');
    }
  }
  path(r) { // rounded corners
    let d = `M${r[0]}`;
    for (let i = 1; i < r.length - 1; i++) { const [p, c, n] = [r[i - 1], r[i], r[i + 1]], t = (a, b) => { const l = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.min(16, l / 2) / (l || 1); return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]; }; d += `L${t(c, p)}Q${c} ${t(c, n)}`; }
    return d + `L${r.at(-1)}`;
  }
  route(a, b) {
    const A = this.nodes.get(a), B = this.nodes.get(b);
    if (A === B) return [[.3, 0], [.52, .1], [.4, .42], [.08, .42], [0, .28]].map(([x, y]) => G(A.x + x, A.y + y));
    const busy = (x, y) => [...this.nodes.values()].some(n => n.x === x && n.y === y), gap = n => n.shape === 'team' ? .34 : .25;
    if (A.x === B.x || A.y === B.y) { // straight runs that would pass under another node take a parallel lane
      const dx = Math.sign(B.x - A.x), dy = Math.sign(B.y - A.y), n = Math.abs(B.x - A.x + B.y - A.y), X = Math.abs(dy), Y = Math.abs(dx);
      for (let i = 1; i < n; i++) if (busy(A.x + dx * i, A.y + dy * i)) return [[A.x + X * .25 + dx * .1, A.y + Y * .25 + dy * .1], [A.x + X * .5 + dx * .1, A.y + Y * .5 + dy * .1], [B.x + X * .5 - dx * .1, B.y + Y * .5 - dy * .1], [B.x + X * .25 - dx * .1, B.y + Y * .25 - dy * .1]].map(p => G(...p));
    }
    const mid = A.x !== B.x && A.y !== B.y ? (!busy(B.x, A.y) ? [B.x, A.y] : !busy(A.x, B.y) ? [A.x, B.y] : null) : null;
    const cut = (p, q, g) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1, k = Math.min(g, d / 3); return [p[0] + (q[0] - p[0]) / d * k, p[1] + (q[1] - p[1]) / d * k]; };
    const a0 = [A.x, A.y], b0 = [B.x, B.y];
    return [cut(a0, mid || b0, gap(A)), ...(mid ? [mid] : []), cut(b0, mid || a0, gap(B))].map(p => G(...p));
  }

  /* playback: every wait and move is a Web Animation, so pause and speed apply to all of it */
  anim(el, kf, o) { const a = el.animate(kf, o); a.playbackRate = this.rate; if (this.paused) a.pause(); this.anims.add(a); return a.finished.then(() => { this.anims.delete(a); }, () => { this.anims.delete(a); throw 0; }); }
  wait(ms) { return this.anim(this.svg, [], { duration: ms }); }
  along(el, r, o) {
    const len = r.slice(1).map((p, i) => Math.hypot(p[0] - r[i][0], p[1] - r[i][1])), tot = len.reduce((a, b) => a + b, 0) || 1; let acc = 0;
    const dur = o.duration || Math.min(1900, Math.max(650, 320 + tot * 3.4));
    return this.anim(el, r.map((p, i) => { if (i) acc += len[i - 1]; return { transform: `translate(${p[0]}px,${p[1]}px)`, offset: acc / tot, easing: r.length > 2 ? 'linear' : undefined }; }), { duration: dur, easing: r.length > 2 ? 'cubic-bezier(.4,.1,.5,.95)' : INOUT, fill: 'both', ...o });
  }
  mk(cls, html, layer = 'pk') { const g = document.createElementNS(NS, 'g'); g.setAttribute('class', cls); g.innerHTML = html; this.g(layer).append(g); return g; }
  hit(id, err) { const b = this.el(id)?.querySelector('.body'); if (b) this.anim(b, [{ transform: 'none' }, { transform: err ? 'translateX(-5px)' : 'translateY(-7px)' }, { transform: err ? 'translateX(4px)' : 'translateY(1px)' }, { transform: 'none' }], { duration: 420, easing: OUT }).catch(() => {}); }
  async flow(f) {
    const r = this.route(f.a, f.b), dots = [2, 1, 0].map(i => this.mk('dot' + (f.err ? ' bad' : ''), `<circle r="${7 - i * 1.7}" style="opacity:${1 - i * .28}"/>` + (i === 0 && f.t ? pill('pl', -34, this.tr(f.t), 11) : '')));
    try { await Promise.all(dots.map((d, i) => this.along(d, r, { delay: (2 - i) * 75 }))); } finally { dots.forEach(d => d.remove()); }
    this.hit(f.b, f.err);
  }
  async walk(f) {
    const A = this.nodes.get(f.a), role = roleOf(A.label), home = G(A.x, A.y), r = this.route(f.a, f.b), full = A.shape === 'user' ? [home, ...r.slice(1)] : r, src = this.el(f.a);
    const card = `<g class="carry"><g transform="translate(15 -26)"><rect x="-9" y="-12" width="19" height="23" rx="3"/>${glyph('file-text', 14)}</g></g>`;
    const w = this.mk('walker' + (f.err ? ' bad' : ''), `<g class="hop">${person(role[2], role[1])}${card}</g>${f.t ? pill('pl', -92, this.tr(f.t), 11) : ''}`);
    if (A.shape === 'user') src.classList.add('away');
    const hop = () => { const a = w.querySelector('.hop').animate([{ transform: 'none' }, { transform: 'translateY(-7px) rotate(-2deg)' }, { transform: 'none' }, { transform: 'translateY(-7px) rotate(2deg)' }, { transform: 'none' }], { duration: 620, iterations: Infinity, easing: 'ease-in-out' }); a.playbackRate = this.rate; if (this.paused) a.pause(); this.anims.add(a); return a; };
    try {
      let h = hop(); const dur = 1500 + full.length * 120;
      if (A.shape === 'team') this.anim(w, [{ opacity: 0 }, { opacity: 1 }], { duration: 220, composite: 'add' }).catch(() => {});
      await this.along(w, full, { duration: dur, easing: 'ease-in-out' }); h.cancel(); this.anims.delete(h);
      this.hit(f.b, f.err); w.querySelector('.pl')?.remove();
      await this.anim(w.querySelector('.carry'), [{ transform: 'none', opacity: 1 }, { transform: 'translate(26px,-14px) scale(.7)', opacity: 0 }], { duration: 420, easing: OUT, fill: 'forwards' });
      h = hop(); await this.along(w, [...full].reverse(), { duration: dur * .8, easing: 'ease-in-out' }); h.cancel(); this.anims.delete(h);
    } finally { w.remove(); src?.classList.remove('away'); }
  }
  async say(a) {
    const n = this.nodes.get(a.id), p = G(n.x, n.y), b = this.mk('sayer', `<g transform="translate(${p[0]} ${p[1] + this.tops.get(a.id) - 6})">${bubble(this.tr(a.t))}</g>`, 'over'), g = b.querySelector('.bubble'), hold = 1300 + a.t.length * 34;
    const el = this.el(a.id).querySelector('.body');
    try {
      this.anim(el, [{ transform: 'none' }, { transform: 'translateY(-5px)' }, { transform: 'none' }], { duration: 520, iterations: Math.ceil(hold / 900), easing: 'ease-in-out' }).catch(() => {});
      await this.anim(g, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 340, easing: BACK, fill: 'both' });
      await this.wait(hold);
      await this.anim(g, [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-8px)', opacity: 0 }], { duration: 240, easing: OUT, fill: 'both' });
    } finally { b.remove(); }
  }
  async run() {
    const s = this.state, tok = ++this.tok, acts = s.acts || [];
    if (!acts.length) return;
    if (this.reduced.matches) { const seen = new Set(); for (const a of acts) if (a.k === 'say' && !seen.has(a.id)) { seen.add(a.id); const n = this.nodes.get(a.id), p = G(n.x, n.y); this.mk('sayer', `<g transform="translate(${p[0]} ${p[1] + this.tops.get(a.id) - 6})">${bubble(this.tr(a.t))}</g>`, 'over'); } return; }
    try {
      await this.wait(650);
      for (;;) {
        for (let i = 0; i < acts.length; i++) {
          if (tok !== this.tok) return;
          if (acts[i].k === 'flow') { // moves leaving the same place go together
            const g = [acts[i]]; while (acts[i + 1]?.k === 'flow' && acts[i + 1].a === acts[i].a && acts[i + 1].b !== acts[i].b) g.push(acts[++i]);
            await Promise.all(g.map((f, k) => (k ? this.wait(k * 160) : Promise.resolve()).then(() => this.flow(f))));
          } else await this[acts[i].k](acts[i]);
        }
        await this.wait(1500);
      }
    } catch {} // cancelled by stop()
  }
  stop() { this.tok++; for (const a of [...this.anims]) a.cancel(); this.anims.clear(); if (this.svg) { this.g('pk').innerHTML = ''; this.g('over').innerHTML = ''; this.svg.querySelectorAll('.away').forEach(e => e.classList.remove('away')); } }
  pause(v) { this.paused = v; this.svg.classList.toggle('paused', v); this.anims.forEach(a => v ? a.pause() : a.play()); }
  speed(r) { this.rate = r; this.anims.forEach(a => a.playbackRate = r); }
  camera(vis, snap) {
    this.want = vis; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const grow = (p, l, t, r, b) => { x0 = Math.min(x0, p[0] - l); y0 = Math.min(y0, p[1] - t); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + b); };
    const says = new Map((this.state?.acts || []).filter(a => a.k === 'say').map(a => [a.id, 1]));
    for (const id of vis) {
      const n = this.nodes.get(id), z = this.zonesM.get(id);
      if (n) { const hw = Math.max(60, wid(this.tr(n.label), 3.8) + 22, says.has(id) ? 100 : 0); grow(G(n.x, n.y), hw, says.has(id) ? 175 : 125, hw, 84); }
      if (z) for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) grow(G(z.x - .5 + a * z.w, z.y - .5 + b * z.h), 20, 20, 20, 30);
    }
    if (x1 < x0) return;
    const ar = (this.host.clientWidth || 16) / (this.host.clientHeight || 9);
    let w = Math.max(x1 - x0, 600), h = Math.max(y1 - y0, 360); if (w / h < ar) w = h * ar; else h = w / ar;
    const to = [(x0 + x1 - w) / 2, (y0 + y1 - h) / 2, w, h], from = this.vb || [to[0] + w * .06, to[1] + h * .06, w * .88, h * .88];
    cancelAnimationFrame(this.cam);
    const set = v => { this.vb = v; this.svg.setAttribute('viewBox', v.map(n => n.toFixed(1)).join(' ')); this.grad.setAttribute('cx', v[0] + v[2] / 2); this.grad.setAttribute('cy', v[1] + v[3] / 2); this.grad.setAttribute('r', Math.max(v[2], v[3]) * .62); };
    if (snap || this.reduced.matches) return set(to);
    set(from); const t0 = performance.now(), f = t => { const k = Math.min(1, Math.max(0, (t - t0) / 800)), e = k < .5 ? 4 * k ** 3 : 1 - (-2 * k + 2) ** 3 / 2; set(to.map((v, i) => from[i] + (v - from[i]) * e)); if (k < 1 && !this.dead) this.cam = requestAnimationFrame(f); };
    this.cam = requestAnimationFrame(f);
  }
}
// Cumulative state for step i, so Back and Replay always agree.
export function stateAt(lesson, i) {
  const vis = new Set([...lesson.nodes, ...lesson.zones].map(n => n.id));
  for (const s of lesson.steps) for (const a of s.add) vis.delete(a);
  const edges = new Map();
  lesson.steps.slice(0, i + 1).forEach(s => { s.add.forEach(a => vis.add(a)); s.del.forEach(a => vis.delete(a)); s.flow.forEach(f => (!f.err || s === lesson.steps[i]) && edges.set(f.a + '>' + f.b, [f.a, f.b, !!f.walk && (edges.get(f.a + '>' + f.b)?.[2] ?? true)])); });
  const s = lesson.steps[i];
  // Between people a plain arrow becomes a handover on foot.
  const shape = id => lesson.nodes.find(n => n.id === id)?.shape;
  const acts = s.acts.map(a => a.k === 'flow' && a.a !== a.b && PEOPLE.has(shape(a.a)) && PEOPLE.has(shape(a.b)) ? { ...a, k: 'walk' } : a);
  return { vis, edges: [...edges.values()], hot: s.hot, st: s.st, flow: s.flow, acts };
}
