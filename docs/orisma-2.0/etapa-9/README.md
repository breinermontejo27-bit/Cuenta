# Etapa 9 · Optimización y migración · Informe de cierre

## 1. Objetivo
Que Orisma sea rápido con muchos datos y que el paso desde la app actual ("Cuentas") sea seguro en un teléfono
real: con la app instalada, sin perder datos y con forma de volver atrás.

## 2. Análisis previo
- Rendimiento medido en la Etapa 1 (D4-27): listas completas que se redibujan en cada tecla; Ventas ~340 ms
  con 5.000 ventas en la original.
- Primera medición de Orisma en esta etapa: más rápido al cargar, pero **más lento al dibujar listas largas**
  (Ventas 554 ms, 90.000 elementos en pantalla), porque dibuja la lista del teléfono y la tabla del computador.
- La app anterior tiene un service worker (`cuentas-v3`) que primero busca en internet. Se revisó cómo se
  comporta al publicar Orisma en la misma dirección.
- Pendientes: pantalla de migración (Etapa 5 §8) y limpieza de imágenes sin uso (Etapa 5 §8).

## 3. Archivos
**Creados (5):** `src/operations/migration.js`, `src/features/settings/migration-section.js`,
`tests/e2e/migracion.e2e.cjs`, `tests/business/optimizacion.test.js`, `tests/rendimiento/rendimiento.cjs`.
Documentos: este informe, `01-plan-de-publicacion.md`, `rendimiento.json`.

**Modificados:** `sw.js`, `src/app.js`, `src/data/database.js`, `src/data/files.js`, `src/data/legacy-import.js`,
`src/business/payments.js`, `src/business/inventory-rules.js`, `src/ui/components/list.js`,
`src/operations/backup.js`, los módulos de clientes, inventario (productos y stock), ventas, facturas y gastos,
`settings-menu.js`, `backup-section.js`, `styles/components.css`, `package.json`, `src/core/config.js`,
`src/precache-list.js`.

**Eliminados:** ninguno.

## 4. Cambios técnicos
- **Listas por partes:** cada lista muestra 100 filas y un botón "Mostrar más". La búsqueda sigue recorriendo
  todos los registros.
- **Cálculos en una pasada:** la deuda de todos los clientes se calcula una sola vez, y las reservas de stock
  solo para los productos que están en algún pendiente. Se comprobó que dan el mismo resultado en 400 y 800
  conjuntos de datos al azar.
- **Paso desde la app anterior:** el service worker de Orisma se activa enseguida en su primera instalación y
  borra el caché viejo. Las actualizaciones de Orisma a Orisma siguen esperando a "Actualizar".
- **Seguimiento de la versión anterior:** al importar se guarda una huella SHA-256 de los datos anteriores. Al
  abrir, si cambiaron, Orisma avisa. En **Ajustes › Versión anterior** se ve el estado y, si hace falta, se
  pueden **traer de nuevo** los datos: antes se guarda una copia automática, luego se verifican registro por
  registro, y si algo falla se vuelve a lo que había.
- **Limpieza de imágenes:** al abrir, se borran las fotos que ya no usa ningún registro. Se hace en una sola
  transacción, así que nunca se borra una foto en uso. Ajustes › Respaldo informa cuántas se borraron.

## 5. Funcionalidades conservadas
Todas. Los cálculos no cambian: las comparaciones con la versión original siguen idénticas. Cambio visible: en
listas de más de 100 registros aparece "Mostrar más".

## 6. Pruebas ejecutadas (todas ejecutadas)
| Prueba | Resultado |
|---|---|
| `npm test` | 77/77 (incluye la equivalencia de los cálculos optimizados) |
| `npm run verificar` | arquitectura correcta (100 archivos), precarga al día |
| `migracion.e2e.cjs` (nueva) | **13/13** |
| `seguridad` · `nucleo` · `datos` · `reglas` | 31/31 · 25/25 · 17/17 · 46/46 |
| `modulos.e2e.cjs` (comparación con la original) | 9/9 idénticos |

**Rendimiento** (`npm run rendimiento`; mediana de 3 corridas; Chromium de escritorio; en un teléfono de gama
media, de 3 a 5 veces más):

| Pantalla (ms) | Original 5.000 ventas | Orisma 5.000 ventas | Orisma + 200 fotos |
|---|---|---|---|
| Abrir la app | 371 | 269 | 300 |
| Clientes | 92 | 8 | 8 |
| Inventario | 102 | 23 | 22 |
| Ventas | 341 | 16 | 19 |
| Facturas | 180 | 15 | 15 |
| Gastos | 206 | 16 | 15 |
| Inventario › Stock | 102 | 30 | 31 |
| Reportes (resumen / caja / flujo) | 6 / 8 / 15 | 7 / 7 / 13 | 7 / 8 / 19 |
| Tecla en el buscador de Ventas | 136 | 13 | 22 |
| Importar desde la versión anterior (una sola vez) | — | 1.126 | — |

## 7. Errores encontrados y corregidos
1. **Lentitud de las listas de Orisma con muchos datos** (más lentas que la original al empezar la etapa).
   Corregido: de 10 a 20 veces más rápidas que la original.
2. **Inventario › Stock** recalculaba las reservas dos veces por producto, recorriendo todos los pedidos.
   Corregido: el cálculo bajó de 54 a 16 ms.
3. Ajustes de las propias pruebas (esperar a que termine de guardarse la copia; la lista recuerda cuántas filas
   se ampliaron).

## 8. Riesgos pendientes
- El primer arranque después de publicar necesita conexión; sin ella sigue abriendo la app anterior hasta que
  haya red. Es esperado y no pierde datos.
- Si se registran cosas en las dos apps a la vez, Orisma no las mezcla: avisa y deja decidir.
- Probado en Chromium de escritorio; falta un teléfono real (Android y iPhone), sobre todo el paso con la app
  instalada.
- Siguen abiertas las 9 decisiones comerciales y V1–V4.

## 9. Documentación
Este informe, `01-plan-de-publicacion.md` (paso a paso y cómo volver atrás), `rendimiento.json` (medición
completa) y `SEGUIMIENTO.md`.

## 10. Cómo continuar
1. Revisar y aprobar esta etapa.
2. Etapa 10 (pruebas integrales y estabilización): recorrido completo de todas las funciones, prueba en un
   teléfono real si es posible, corrección de lo que aparezca y preparación de la publicación según
   `01-plan-de-publicacion.md`, solo con tu aprobación.
