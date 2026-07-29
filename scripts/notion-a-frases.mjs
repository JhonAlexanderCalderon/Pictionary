/* ---------------------------------------------------------------
   Descarga la base de Notion y escribe frases.json + frases.txt.
   Se ejecuta desde GitHub Actions, nunca desde el navegador:
   el token vive en los Secrets del repositorio y no se publica.

   Variables de entorno:
     NOTION_TOKEN  -> secreto de la integracion
     DATABASE_ID   -> c90c7c1ee90146c5b361258440512c0d
---------------------------------------------------------------- */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const TOKEN = process.env.NOTION_TOKEN;
const DB = process.env.DATABASE_ID;

export function leerFila(props) {
  let t = '', b = 1, n = 0;
  for (const key in props) {
    const p = props[key];
    if (p.type === 'title') t = (p.title || []).map(x => x.plain_text).join('').trim();
    if (/bloque|block/i.test(key)) {
      if (p.type === 'select' && p.select) b = Number(p.select.name) || 1;
      if (p.type === 'number' && p.number != null) b = Number(p.number) || 1;
    }
    if (/^n$|orden/i.test(key) && p.type === 'number' && p.number != null) n = p.number;
    if (/activa|active/i.test(key) && p.type === 'checkbox' && p.checkbox === false) return null;
  }
  return t ? { t, b, n } : null;
}

export function aTexto(items) {
  let s = '', ultimo = null;
  for (const it of items) {
    if (it.b !== ultimo) { s += (s ? '\n' : '') + `### Bloque ${it.b}\n`; ultimo = it.b; }
    s += `${it.n || ''}${it.n ? '. ' : ''}${it.t}\n`;
  }
  return s;
}

async function main() {
  if (!TOKEN || !DB) throw new Error('Faltan NOTION_TOKEN o DATABASE_ID');

  const items = [];
  let cursor;
  do {
    const res = await fetch(`https://api.notion.com/v1/databases/${DB}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ page_size: 100, start_cursor: cursor })
    });
    if (!res.ok) throw new Error(`Notion respondio ${res.status}: ${await res.text()}`);
    const data = await res.json();
    for (const row of data.results) {
      const item = leerFila(row.properties);
      if (item) items.push(item);
    }
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);

  items.sort((a, b) => a.b - b.b || a.n - b.n);
  if (!items.length) throw new Error('La base no devolvio ninguna frase activa');

  const payload = {
    version: 1,
    updated: new Date().toISOString().slice(0, 10),
    source: 'notion',
    items
  };

  const nuevo = JSON.stringify(payload, null, 1);
  const previo = existsSync('frases.json') ? readFileSync('frases.json', 'utf8') : '';
  // ignora el cambio de fecha para no ensuciar el historial con commits vacios
  const sinFecha = s => s.replace(/"updated":\s*"[^"]*"/, '');
  if (sinFecha(previo) === sinFecha(nuevo)) {
    console.log(`Sin cambios (${items.length} frases).`);
    return;
  }
  writeFileSync('frases.json', nuevo);
  writeFileSync('frases.txt', aTexto(items));
  console.log(`Actualizadas ${items.length} frases.`);
}

if (process.argv[1]?.endsWith('notion-a-frases.mjs')) main();
