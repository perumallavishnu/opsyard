// node test.js : content integrity and the server.
import assert from 'node:assert';
process.env.DB = ':memory:';
const { load } = await import('./parse.js');
const { subjects, commands, tools } = load();
const { SHAPES, PEOPLE } = await import('./public/iso.js');
const bad = [], ids = new Set(); let steps = 0;
for (const s of subjects) for (const c of s.chapters) for (const l of c.lessons) {
  const at = `${s.id}/${l.id}`;
  assert(!ids.has(l.id), 'duplicate ' + at); ids.add(l.id);
  assert(l.steps.length >= 3, at + ' too short'); assert(l.quiz && l.quiz.o.filter(o => o.ok).length === 1, at + ' quiz');
  assert(l.nodes.length, at + ' no scene');
  const n = new Set(l.nodes.map(x => x.id)), all = new Set([...n, ...l.zones.map(z => z.id)]);
  assert.equal(new Set(l.nodes.map(x => x.x + ',' + x.y)).size, l.nodes.length, at + ' nodes share a cell');
  assert.equal(all.size, l.nodes.length + l.zones.length, at + ' duplicate node id');
  for (const x of l.nodes) assert(SHAPES[x.shape], `${at} shape ${x.shape}`);
  const vis = new Set(all); for (const st of l.steps) for (const a of st.add) vis.delete(a);
  for (const st of l.steps) {
    steps++;
    for (const r of [...st.add, ...st.del, ...st.hot, ...st.st.map(x => x.id)]) assert(all.has(r), `${at} "${st.t}" unknown ${r}`);
    st.add.forEach(a => vis.add(a)); st.del.forEach(a => vis.delete(a));
    for (const a of st.acts) if (a.k === 'say') assert(n.has(a.id) && vis.has(a.id) && a.t.length <= 90, `${at} "${st.t}" say ${a.id}`); else if (a.k === 'walk') assert(PEOPLE.has(l.nodes.find(x => x.id === a.a)?.shape), `${at} "${st.t}" only people walk: ${a.a}`);
    for (const f of st.flow) for (const r of [f.a, f.b]) { assert(n.has(r), `${at} "${st.t}" flow ${r}`); assert(vis.has(r), `${at} "${st.t}" flow to hidden ${r}`); }
    if (!st.body.some(b => b.k === 'p' || b.k === 'row')) bad.push(`${at} "${st.t}" no text`);
  }
}
for (const g of commands) { const n = new Set(g.nodes.map(x => x.id)); for (const x of g.nodes) assert(SHAPES[x.shape], g.id + x.shape); for (const c of g.list) for (const f of c.flow) assert(n.has(f.a) && n.has(f.b), `${g.id}: ${c.cmd}`); }
for (const t of tools) assert(t.purpose && t.where && t.risks && t.guide && t.uses.length && t.src, 'tool ' + t.name);

assert.deepEqual(bad, []);
const { strings } = await import('./strings.js'), { key, LANGS } = await import('./public/i18n.js'), fs = await import('node:fs');
const all = strings(); assert.equal(new Set(all.map(key)).size, all.length, 'translation key collision');
for (const [l] of LANGS) if (l !== 'en') { const d = JSON.parse(fs.readFileSync(new URL('./i18n/' + l + '.json', import.meta.url), 'utf8')), miss = all.filter(s => !d[s]); if (miss.length) console.warn(`note: ${l} has ${miss.length} untranslated texts (shown in English), e.g. "${miss[0].slice(0, 60)}"`); }
const { server } = await import('./server.js');
await new Promise(r => server.listen(0, r));
const B = 'http://localhost:' + server.address().port;
assert.equal((await fetch(B + '/')).status, 200);
for (const id of ids) assert.equal((await fetch(B + '/data/lesson/' + id + '.json')).status, 200, id);
assert((await (await fetch(B + '/data/commands.json')).json()).every(g => g.list.length));
assert.equal((await fetch(B + '/..%2fserver.js')).status, 404);
assert.equal((await fetch(B + '/%')).status, 400);
assert.equal((await fetch(B + '/', { method: 'POST' })).status, 405);
server.close();
console.log(`ok: ${subjects.length} subjects, ${ids.size} lessons, ${steps} steps, ${commands.reduce((a, g) => a + g.list.length, 0)} commands, ${tools.length} tools`);
process.exit(0);
