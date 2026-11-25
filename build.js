// node build.js : writes dist/, ready for any static host.
import fs from 'node:fs';
import path from 'node:path';
import { dataFiles, PUB } from './server.js';
const out = path.join(path.dirname(PUB), 'dist');
fs.rmSync(out, { recursive: true, force: true });
fs.cpSync(PUB, out, { recursive: true });
for (const [k, v] of dataFiles()) { const f = path.join(out, k); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, v); }
console.log('dist/ written');
