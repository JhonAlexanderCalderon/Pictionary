# Pictionary · El reto — PWA para Boox Tab X C

App de pantalla completa que muestra **la frase secreta y el cronómetro**. La división de
pantalla la hace la tablet: en la otra mitad abres la app de Notas de Boox para dibujar
con el lápiz. Pesa ~30 KB, no carga nada de la red y funciona sin conexión.

## Archivos

| Archivo | Para qué |
|---|---|
| `index.html` | La app completa, con las 200 frases dentro |
| `manifest.webmanifest` | Nombre, iconos y arranque a pantalla completa |
| `sw.js` | Service worker: guarda todo en caché para uso sin internet |
| `.github/workflows/` + `scripts/` | Sincronización automática con Notion desde GitHub |
| `worker.js` | Alternativa: puente en vivo con Notion (Cloudflare) |
| `frases.json` | Las 200 frases en el formato que la app descarga |
| `frases.txt` | Las mismas frases en texto, listas para pegar en la app |
| `icon-*.png` | Iconos |

## Instalar en la tablet

1. Sube la carpeta a un hosting gratis con HTTPS (GitHub Pages, Netlify Drop, Cloudflare Pages).
2. Abre la dirección **una vez** con internet desde la tablet.
3. Menú del navegador → *Instalar app* / *Añadir a pantalla de inicio*.
4. Ya puedes apagar el wifi: abre siempre desde el icono.

También puedes copiar la carpeta a la tablet y abrir `index.html` directamente: el juego
funciona igual, pero no se instala como app (el service worker sólo se registra en
`https://` o en `localhost`).

### Pantalla dividida en el Tab X C

Abre la app instalada, entra en el menú de multitarea de Boox y ponla en una mitad;
en la otra abre **Notas**. La app se adapta a cualquier ancho: la frase, el número y la
barra crecen o se encogen con la ventana. Deja el reto en la mitad estrecha y el cuaderno
en la ancha. Dibujar en Notas y no en el navegador da mucha menos latencia con el lápiz.

## Cómo se juega

1. **Nueva frase** → sólo la ve quien dibuja.
2. Deja la tablet a la vista y toca **Empezar**.
3. La frase se tapa con `? ? ?` y arranca la cuenta atrás.
4. Si quien dibuja la olvida, mantiene pulsado **Espiar** tapando la pantalla con la mano.
5. Al llegar a cero suena, vibra y se revela la frase. Suma el punto con los botones **+**.

La barra son 12 bloques de 5 segundos: se lee desde el otro lado de la mesa y se refresca
12 veces por turno en vez de 60. Los últimos 10 segundos se ponen en rojo.
La barra espaciadora encadena frase → empezar → terminar.

## Cambiar las frases

Botón **Frases**. Tres caminos, y todos guardan el resultado en la tablet:

**Pegar la lista.** Escribe o pega en el cuadro de texto y pulsa *Guardar lista*.
Una frase por línea; el número inicial es opcional; una línea que empiece por `###` abre
un bloque nuevo. Es exactamente el formato de `frases.txt`, así que puedes copiar de
Notion y pegar aquí sin retocar nada.

**Sincronizar desde Notion.** Escribe la dirección del puente y pulsa *Sincronizar ahora*.
Descarga, reemplaza el banco y lo deja guardado para jugar sin conexión. Si no hay red,
avisa y sigue con las frases que ya tenías.

**Volver a las originales.** Restaura las 200 de fábrica.

### La base de Notion

Ya está creada y cargada con las 200 frases:

**Pictionary · Frases** — https://app.notion.com/p/c90c7c1ee90146c5b361258440512c0d

| Columna | Qué hace |
|---|---|
| **Frase** | La oración en inglés (es el título de la fila) |
| **Bloque** | 1 a 4. La app lo usa para el filtro por bloques |
| **Activa** | Desmárcala y la frase sale del juego sin borrarla |
| **N** | Número de orden original |
| **Notas** | Pistas o comentarios, la app las ignora |

Tiene dos vistas: la tabla completa y **Por bloque**, un tablero agrupado por bloque
donde puedes arrastrar frases de uno a otro. Para añadir frases, crea filas nuevas:
con que pongas Frase y Bloque basta, pero acuérdate de marcar *Activa*.

### Publicar y sincronizar, todo en GitHub

Es la vía recomendada: la app, las frases y la sincronización viven en el mismo
repositorio y no hace falta ninguna otra cuenta.

**Preparar el repositorio**

1. Crea un repositorio y sube esta carpeta entera, incluidas `.github/` y `scripts/`.
2. *Settings* → *Pages* → publica desde la rama `main`, carpeta raíz.
   Tu app queda en `https://TU-USUARIO.github.io/TU-REPO/`.
3. Ábrela una vez desde la tablet e instálala.

**Conectar Notion**

4. Crea una integración en `notion.so/my-integrations` (tipo *Internal*, permiso de
   lectura) y copia el token.
5. Abre la base en Notion → *•••* → *Conexiones* → conecta tu integración.
   Sin esto la API responde *Could not find object*.
6. En el repositorio: *Settings* → *Secrets and variables* → *Actions* → *New repository
   secret*, dos veces:
   - `NOTION_TOKEN` → el token del paso 4
   - `DATABASE_ID` → `c90c7c1ee90146c5b361258440512c0d`
7. Pestaña *Actions* → **Sincronizar frases desde Notion** → *Run workflow*.

El flujo lee la base, escribe `frases.json` y `frases.txt` y los publica en el repositorio.
Se ejecuta solo una vez al día y siempre que pulses *Run workflow*; si nada cambió, no hace
ningún commit. El token nunca sale de los Secrets, así que no acaba en la web.

**En la app:** botón *Frases* → deja el campo vacío → *Sincronizar ahora*. Al estar en el
mismo sitio, coge el `frases.json` de la propia carpeta. Ese archivo se pide siempre a la
red y sólo se recurre a la copia guardada si no hay conexión.

El circuito completo queda así: editas en Notion → *Run workflow* → *Sincronizar ahora* en
la tablet. Si prefieres saltarte Notion, edita `frases.txt` o `frases.json` directamente
desde el editor web de GitHub: no necesitas token ni flujo, y la app los descarga igual.

### Alternativa: Cloudflare Worker

Sirve si quieres que la app lea Notion en vivo, sin esperar al flujo. `worker.js` es un
Cloudflare Worker que guarda el token y devuelve la lista al momento; existe porque el
navegador no puede llamar a `api.notion.com` directamente (Notion bloquea las peticiones
desde una página web por CORS, y el token quedaría a la vista).

1. Integración y conexión igual que en los pasos 4 y 5 de arriba.
2. En Cloudflare: *Workers & Pages* → *Create Worker*, entra en *Edit code*, pega
   `worker.js` y despliega.
3. *Settings* → *Variables and Secrets*: `NOTION_TOKEN` como *Secret* y `DATABASE_ID`
   como *Text*, con el valor `c90c7c1ee90146c5b361258440512c0d`.
4. Pega la URL del worker en el campo de sincronización de la app.

## Decisiones pensadas para tinta electrónica

- Cero animaciones, transiciones, sombras y degradados: cada uno provoca repintados y fantasmas.
- Negro puro sobre blanco puro; el rojo aparece sólo en los últimos segundos.
- Nada de grises medios, que en e-ink se ven tramados.
- Bordes de 3 px y botones grandes, para el toque lento del panel.
- El cronómetro cambia sólo el número; la barra, sólo 12 veces por turno.
- El tamaño de la frase se ajusta a su longitud para que nunca se corte.
- La pantalla se mantiene encendida durante el turno (Wake Lock).

Si cambias archivos, sube el número de `CACHE` en `sw.js` (`pictionary-v2` → `v3`)
para que la tablet recoja la versión nueva.
