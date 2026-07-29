/* ---------------------------------------------------------------
   Puente Notion -> app (Cloudflare Worker, plan gratuito).
   Existe porque el navegador no puede llamar a api.notion.com
   directamente: Notion no permite peticiones desde una web (CORS)
   y ademas habria que dejar el token a la vista. El worker guarda
   el token y devuelve solo la lista limpia de frases.

   Variables de entorno a configurar en el worker:
     NOTION_TOKEN  -> secreto de la integracion (ntn_...)
     DATABASE_ID   -> c90c7c1ee90146c5b361258440512c0d
                      (base "Pictionary · Frases", ya creada)
   Propiedades esperadas en la base:
     Frase   (titulo)          -> la oracion en ingles
     Bloque  (seleccion 1..4)  -> opcional, por defecto 1
     Activa  (casilla)         -> si esta desmarcada, la frase se omite
---------------------------------------------------------------- */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
  'Access-Control-Allow-Headers': '*'
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });

    try {
      const items = [];
      let cursor;
      do {
        const res = await fetch(`https://api.notion.com/v1/databases/${env.DATABASE_ID}/query`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.NOTION_TOKEN}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ page_size: 100, start_cursor: cursor })
        });
        if (!res.ok) {
          return json({ error: 'notion', status: res.status, detail: await res.text() }, 502);
        }
        const data = await res.json();
        for (const row of data.results) {
          const item = readRow(row.properties);
          if (item) items.push(item);
        }
        cursor = data.has_more ? data.next_cursor : null;
      } while (cursor);

      items.sort((a, b) => a.b - b.b || a.n - b.n);
      return json({ version: 1, updated: new Date().toISOString().slice(0, 10), source: 'notion', items });
    } catch (err) {
      return json({ error: String(err) }, 500);
    }
  }
};

function readRow(props) {
  let t = '', b = 1, n = 0;
  for (const key in props) {
    const p = props[key];
    if (p.type === 'title') t = (p.title || []).map(x => x.plain_text).join('').trim();
    if (/bloque|block/i.test(key)) {
      if (p.type === 'select' && p.select) b = Number(p.select.name) || 1;
      if (p.type === 'number' && p.number != null) b = Number(p.number) || 1;
    }
    if (/^n$|orden|number/i.test(key) && p.type === 'number' && p.number != null) n = p.number;
    if (/activa|active/i.test(key) && p.type === 'checkbox' && p.checkbox === false) return null;
  }
  return t ? { t, b, n } : null;
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}
