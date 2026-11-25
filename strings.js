// Every piece of English text a reader can see, apart from code. `node strings.js` prints it as JSON for the translator.
import { fileURLToPath } from 'node:url';
import { load } from './parse.js';
// Small fixed texts that live in public/app.js.
export const FIXED = ['data can be lost', 'only with permission', 'lab only', 'run', 'check', 'answer', 'Admin', 'Report', 'Network', 'Scripts', 'Data', 'Processes', 'Process', 'Firewall', 'Your server', 'Your system', 'Image', 'Test network', 'Test web app', 'Test accounts', 'Isolated lab', 'Your Wi-Fi', 'Repository', 'Test server', 'Keys', 'Target', 'Client', 'Analyst', 'Dev team', 'Tester', 'Operations', 'Production', 'I need an online shop.', 'It is live.'];
export function strings() {
  const out = new Set(FIXED), add = (...a) => a.forEach(x => x && /[A-Za-z]{2}/.test(x) && out.add(x));
  const { subjects, commands, tools } = load();
  for (const s of subjects) { add(s.title, s.desc); for (const c of s.chapters) { add(c.title); for (const l of c.lessons) {
    add(l.title, l.sum, l.level); l.nodes.forEach(n => add(n.label, n.sub)); l.zones.forEach(z => add(z.label));
    add(l.quiz.q, ...l.quiz.o.map(o => o.t));
    for (const t of l.steps) { add(t.t, t.tag[0] + t.tag.slice(1).toLowerCase(), ...t.st.map(x => x.t), ...t.acts.map(x => x.t)); for (const b of t.body) if (b.k === 'row') add(...b.t.split('|').map(x => x.trim())); else if (b.k !== 'cmd' && b.k !== 'out') add(b.t); }
  } } }
  for (const g of commands) { add(...g.nodes.map(n => n.label)); for (const c of g.list) add(c.what, c.tip, ...c.flags.map(f => f.includes(' = ') ? f.slice(f.indexOf(' = ') + 3) : '')); }
  for (const t of tools) add(t.cat, t.purpose, t.where, t.risks, t.guide, ...t.uses.map(u => u.d));
  return [...out];
}
if (process.argv[1] === fileURLToPath(import.meta.url)) process.stdout.write(JSON.stringify(strings()));
