// Generates fixtures/basic.apkg (legacy format: collection.anki2 + media, "Support older Anki versions").
// Run once:  node apps/web/e2e/fixtures/make-basic-apkg.mjs
// Needs sql.js + fflate; borrowed from the backend workspace (remoa-backend/packages/anki/node_modules).
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const req = createRequire(resolve(here, '../../../../../remoa-backend/packages/anki/package.json'));
const initSqlJs = req('sql.js');
const { zipSync, strToU8 } = req('fflate');

const SQL = await initSqlJs();
const db = new SQL.Database();
db.run(`CREATE TABLE col (id integer primary key, crt integer, mod integer, scm integer, ver integer, dty integer, usn integer, ls integer, conf text, models text, decks text, dconf text, tags text);
CREATE TABLE notes (id integer primary key, guid text, mid integer, mod integer, usn integer, tags text, flds text, sfld text, csum integer, flags integer, data text);
CREATE TABLE cards (id integer primary key, nid integer, did integer, ord integer, mod integer, usn integer, type integer, queue integer, due integer, ivl integer, factor integer, reps integer, lapses integer, left integer, odue integer, odid integer, flags integer, data text);`);
const models = { 10: { id: 10, name: 'Basic', type: 0, flds: [{ name: 'Front', ord: 0 }, { name: 'Back', ord: 1 }, { name: 'Tema', ord: 2 }], tmpls: [{ name: 'Card 1', ord: 0 }] } };
const decks = { 1: { id: 1, name: 'Default' }, 100: { id: 100, name: 'E2E Anki' } };
db.run('INSERT INTO col VALUES (1,0,0,0,11,0,0,0,?,?,?,?,?)', ['{}', JSON.stringify(models), JSON.stringify(decks), '{}', '{}']);
const notes = [
  ['Critério de sepse', 'Disfunção orgânica com SOFA ≥ 2', 'Sepse-3'],
  ['Choque séptico', 'Sepse com vasopressor e lactato > 2', 'Choque'],
  ['Primeira droga no choque séptico', 'Noradrenalina', 'Vasopressor'],
  ['Meta de lactato', 'Reduzir em 10-20% a cada 2 h', 'Ressuscitação'],
  ['Tempo do antibiótico', 'Na primeira hora', 'Antibiótico'],
  ['Hemocultura', 'Duas amostras antes do antibiótico', 'Coleta'],
];
notes.forEach((f, i) => {
  db.run('INSERT INTO notes VALUES (?,?,?,?,?,?,?,?,?,?,?)', [1000 + i, `g${i}`, 10, 0, 0, '', f.join('\x1f'), f[0], i, 0, '']);
  db.run('INSERT INTO cards VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [2000 + i, 1000 + i, 100, 0, 0, 0, 0, 0, i, 0, 0, 0, 0, 0, 0, 0, 0, '']);
});
const zip = zipSync({ 'collection.anki2': db.export(), media: strToU8('{}') });
writeFileSync(resolve(here, 'basic.apkg'), zip);
console.log('basic.apkg', zip.length, 'bytes');
