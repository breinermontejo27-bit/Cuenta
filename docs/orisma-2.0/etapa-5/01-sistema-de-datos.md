# Orisma 2.0 · Etapa 5 · Sistema de datos y almacenamiento

Documentación técnica de `src/data/`. Referencias: `D4-xx` = hallazgos de la Etapa 1; `RB-xx` = reglas de respaldo.

## 1. Dónde se guarda cada cosa

Base IndexedDB `orisma`, versión de estructura 1 (`data/migrations.js`).

| Almacén | Contenido | Clave |
|---|---|---|
| `clientes`, `inventario`, `ventas`, `gastos`, `movimientos`, `pedidos` | una fila por registro: `{ k: id, n: posición, r: registro }` | `k`; índice `n` |
| `ajustes` | una fila `{ k: 'ajustes', r: ajustes }` | `k` |
| `archivos` | imágenes: `{ id: 'img-<huella>', tipo, datos: Blob }` (o `texto` si no se puede reproducir idéntica en binario) | `id` |
| `respaldos` | copias automáticas: `{ fecha, motivo, contenido }` | autoincremental |
| `meta` | datos internos: `esquema`, `migracionLegado`, `persistente` | `k` |

- **El registro `r` se guarda tal cual**, con los mismos campos de la versión original (Etapa 2, A6).
  La única diferencia: las imágenes son una referencia `archivo:img-…` en lugar del texto `data:image/…`.
- **`n` conserva el orden** de las listas de la versión original (por ejemplo, Clientes se muestra en orden de alta).
- `localStorage` **no se usa para guardar** y no se borra (ver §4).

## 2. Cómo se lee y se escribe

```
arranque → importarLegado() (solo la primera vez) → cargarEnMemoria() → core/state (memoria) → pantallas
operación → guardarCambios({ colecciones: { ventas: [...], inventario: [...] }, ajustes }) → UNA transacción → memoria
```

| Función (`data/database.js`) | Qué hace |
|---|---|
| `abrir()` | abre/crea la base; avisa si otra pestaña tiene una versión vieja abierta |
| `cargarEnMemoria()` | lee todo, prepara las imágenes para mostrarse y llena `core/state` |
| `guardarCambios(cambios)` | recibe las listas completas nuevas (igual que la versión original: `ventas = ventas.map(…)`), calcula qué filas cambiaron, valida esas filas, separa sus imágenes y escribe **todo en una transacción**. Solo si se confirma, actualiza la memoria |
| `planDeCambios()` | decide qué escribir y qué borrar conservando las posiciones (función pura, probada) |
| `transaccion(almacenes, modo, fn)` | transacción genérica: si `fn` falla, se deshace completa |
| `reemplazarTodo()` | reemplaza todos los datos en una transacción, guardando antes una copia automática |
| `listarRespaldos()`, `leerRespaldo()` | copias automáticas |
| `pedirPersistencia()`, `espacio()` | pide al navegador no borrar los datos; espacio usado |

**Errores:** cualquier fallo de IndexedDB se convierte en `ErrorDeAlmacenamiento` y llega a la pantalla como aviso
grave (corrige D4-10: antes `save()` lo escondía en la consola). Una escritura con registros inválidos o
identificadores repetidos se rechaza antes de tocar la base.

## 3. Imágenes (`data/files.js`)

- Campos con imagen: `inventario.foto`, `ventas.items[].foto`, `pedidos.items[].foto`, `ajustes.logo`, `fotoPerfil`, `firmaImg`.
- Al guardar, cada imagen `data:` se identifica por su huella SHA-256: **una imagen repetida se guarda una vez**
  (en la versión original la foto de un servicio se copiaba en cada venta).
- Se guarda en binario (≈25 % menos espacio que el texto). Si al volver a codificarla no diera exactamente el
  mismo texto, se guarda el texto: **nunca se altera una imagen**.
- Para mostrarla, `core/state` tiene la dirección `blob:` de cada archivo; `ui/html.js › imagenSegura()` acepta
  referencias `archivo:` y las convierte.
- Al exportar un respaldo, las referencias vuelven a ser la imagen completa.

## 4. Importación desde la versión original (`data/legacy-import.js`)

Se ejecuta al abrir la app, **una sola vez**:

| Paso | Cómo |
|---|---|
| 1. Respaldo original | copia **literal** de las 7 claves `cuentas_*` en el almacén `respaldos` (motivo `legado`, nunca se borra) |
| 2. Validar formato | cada clave debe ser JSON válido; colecciones como listas, ajustes como objeto; ids presentes y sin repetir |
| 3. Reconocer origen | por la forma de los datos (la versión original no guardaba número de versión): pedidos, movimientos, abonos, descuentos, compras |
| 4. Transformar | solo las imágenes (§3). Nada más |
| 5. Evitar duplicados | no importa si ya se importó (`meta.migracionLegado`) ni si la base ya tiene datos |
| 6. Cantidades | se comparan las cantidades de cada colección |
| 7. Integridad | se lee de vuelta todo lo guardado, se reconstruyen las imágenes y se compara **registro por registro** (texto JSON idéntico) con el original |
| 8. Recuperación | si algo falla: se borra lo importado, `localStorage` queda intacto, aviso grave; se reintenta al abrir otra vez |

`localStorage` nunca se escribe ni se borra en este proceso (comprobado byte a byte).

## 5. Respaldos (`data/backup.js`)

**Formato 3 (Orisma):**
```json
{ "app": "orisma", "version": 3, "esquema": 1, "fecha": "2026-11-19",
  "datos": { "clientes": [], "inventario": [], "ventas": [], "gastos": [], "movimientos": [], "pedidos": [], "config": {} } }
```
- Incluye las imágenes completas. Es compatible con la app original: **un respaldo de Orisma se puede restaurar
  en la versión anterior** (probado), así que siempre hay camino de regreso.
- Se aceptan los respaldos de la versión original (formato 2, con o sin pedidos y movimientos).

**Restaurar:** validación **estricta** contra el esquema (tipos, identificadores, imágenes solo `data:image/…`;
corrige D4-11) → resumen de lo que trae → confirmación → **copia automática de lo actual** → reemplazo en una
transacción. Se guardan las últimas 5 copias automáticas.

**Configuración al restaurar:** se **mezcla** con la actual, como en la versión original (RB-03). Cambiarlo a
reemplazo completo es la decisión 9 de la Etapa 1, pendiente.

## 6. Validación (`data/schema.js`)

| Modo | Se usa en | Bloquea | Solo informa |
|---|---|---|---|
| `legado` | datos propios de `localStorage` | listas inválidas, ids ausentes o repetidos | tipos raros de campos, clientes borrados |
| `estricto` | respaldo que viene de un archivo | todo lo anterior + tipos de campos + imágenes no válidas + ids con caracteres raros | clientes borrados |

Las referencias a clientes o productos borrados son normales en la versión original (D4-06) y no bloquean.

## 7. Cambios futuros de estructura

- Estructura de la base: agregar un paso a `PASOS` en `migrations.js` (nunca editar uno publicado).
- Forma de los registros: subir `VERSION_ESQUEMA` y agregar la transformación correspondiente; un respaldo de
  un esquema más nuevo se rechaza con un mensaje claro.
