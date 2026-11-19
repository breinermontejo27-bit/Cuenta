# Etapa 7 · Reconstrucción de módulos · Informe de cierre

## 1. Objetivo
Reconstruir cada módulo de la app (ventas, pendientes, clientes, créditos, inventario, gastos, facturas, reportes
y ajustes) sobre el núcleo (Etapa 4), los datos (Etapa 5) y las reglas (Etapa 6), **con el mismo comportamiento
que la versión original** y sin agregar funciones nuevas.

## 2. Análisis previo
- Pantallas y flujos de la auditoría (Etapa 1, 53 pantallas) y prototipos de la Etapa 3.
- Cada pantalla de la versión original (`9300dfa`) se leyó antes de reconstruirla; los comentarios de cada
  archivo citan las líneas originales que reemplaza.
- Regla de la Etapa 2: las pantallas no calculan ni guardan. Leen del estado, piden el cálculo a `business/`
  y guardan a través de `operations/` (una transacción por operación).

## 3. Archivos

**Creados (55)**
- `src/operations/`: `contexto.js`, `comun.js`, `clients.js`, `products.js`, `purchases.js`, `expenses.js`,
  `sales.js`, `orders.js`, `credits.js`, `invoices.js`, `settings.js`.
- `src/services/`: `images.js`, `whatsapp.js`, `contacts.js`, `pdf.js`, `export.js`.
- `src/ui/operar.js`; `src/ui/components/`: `cards.js`, `segmented.js`, `fields.js`, `image-picker.js`,
  `signature-pad.js`.
- `src/features/clients/client-form.js`; `src/features/credits/` (`index.js`, `payment-form.js`, `credits-view.js`);
  `src/features/inventory/` (`stock-view.js`, `history-view.js`, `low-stock.js`, `product-form.js`, `purchase-form.js`);
  `src/features/expenses/expense-form.js`; `src/features/sales/` (`sales-list.js`, `sale-detail.js`, `sale-wizard.js`,
  `sale-items.js`, `sale-payment.js`, `pending-list.js`, `pending-form.js`, `pending-detail.js`, `layaway-detail.js`);
  `src/features/invoices/` (`invoice-document.js`, `invoice-view.js`, `invoice-edit.js`); `src/features/reports/`
  (`summary-view.js`, `cash-view.js`, `flow-view.js`); `src/features/settings/` (`section.js`, `business-section.js`,
  `invoice-section.js`, `products-section.js`).
- `styles/invoice.css`.
- `assets/vendor/`: `html2canvas.min.js` 1.4.1, `jspdf.umd.min.js` 2.5.1, `LICENCIAS.txt` (las mismas librerías
  que usaba la versión original, ahora guardadas en la app: el PDF funciona sin Internet).
- `tests/e2e/modulos.e2e.cjs`.

**Modificados (20):** `index.html`, `package.json`, `src/app.js`, `src/business/inventory-rules.js`,
`src/core/config.js`, `src/core/navigation.js`, `src/data/database.js`, los `index.js` de los módulos (antes eran
pantallas de muestra), `settings-menu.js`, `ui/components/list.js`, `ui/notifications/toast.js`,
`styles/components.css`, `src/precache-list.js`, `tests/e2e/nucleo.e2e.cjs`, `tools/check-architecture.js`.

**Eliminados:** ninguno.

**Cambios respecto a la estructura de la Etapa 2**
- **Pedidos dentro de `features/sales/`**: en la original comparten pestaña con ventas; separarlos obligaba a
  que dos módulos se importaran entre sí.
- **Módulo `credits`** propio (sin pestaña): la lista de créditos se abre desde Ajustes y desde Clientes.
- **Registro de hojas con nombre** (`registrarHoja`/`pedirHoja` en `core/navigation.js`): un módulo abre la hoja de
  otro (p. ej. "ver factura" desde una venta) sin importarlo, respetando las reglas de capas.
- `operations/contexto.js` (fecha, hora y generador de identificadores en un solo lugar) y `operations/comun.js`.
- `ui/operar.js`: un solo patrón para botones que guardan (desactiva el botón, muestra el error en su campo).
- `styles/invoice.css` aparte, porque la factura también se imprime y se convierte a PDF.

## 4. Cambios técnicos
- 11 archivos de operaciones: cada una valida, calcula con `business/`, guarda todo en **una transacción** con
  `guardarCambios` y solo entonces actualiza la pantalla. Si algo falla, no queda nada a medias.
- Componentes reutilizables (filas, tarjetas, campos, segmentos, selector de imagen, firma) en vez de HTML repetido.
- Todo texto del usuario se escapa al pintarlo (`html```); las imágenes pasan por `imagenSegura()`; sin estilos
  ni scripts en línea (la política de seguridad CSP sigue activa).
- `cerrarHoja` devuelve una promesa: una hoja que abre otra espera a que la primera termine de cerrarse
  (corrige una carrera con el historial del botón atrás).
- El verificador de arquitectura ahora también detecta importaciones sin uso.
- Versión `2.0.0-etapa7`; lista de precarga regenerada (107 archivos).

## 5. Funcionalidades conservadas
Ventas con el asistente (efectivo, tarjeta, transferencia, crédito con abono inicial, mixto, total escrito a mano,
descuento, servicio libre, prenda a medida con materiales), detalle y anulación de ventas; pedidos, apartados y
encargos (anticipo, abonos, entrega, cancelación con devolución, comprobante, recordatorio por WhatsApp);
clientes (alta, edición, importar contacto, WhatsApp) y créditos (abonos, liquidar deuda); inventario (alta,
edición con motivo, compras, historial, poco stock, ganancia por defecto); gastos generales y compras desde gastos;
facturas (generar, ver, editar, imprimir, compartir PDF, firma, colores); reportes (resumen, caja, flujo);
ajustes (negocio, factura, productos, moneda e impuesto, créditos, respaldo).

**Agregados de interfaz** (no cambian datos ni cálculos; se pueden quitar si el dueño lo prefiere): buscador de clientes en el
asistente, ventas agrupadas por día y confirmación antes de eliminar.

## 6. Pruebas ejecutadas (todas ejecutadas, no solo inspeccionadas)
| Prueba | Resultado |
|---|---|
| `npm test` (reglas, datos, núcleo en Node) | 69/69 |
| `npm run verificar` (arquitectura + precarga) | correcto, 92 archivos |
| `tests/e2e/nucleo.e2e.cjs` | 25/25 |
| `tests/e2e/datos.e2e.cjs` | 17/17 |
| `tests/e2e/reglas.e2e.cjs` | 46/46 |
| `tests/e2e/modulos.e2e.cjs` — **comparación con la original** | **9/9 escenarios con datos idénticos** |
| Recorrido de todas las pantallas a 390 px y 1280 px | sin errores de JavaScript |

`modulos.e2e.cjs` hace las mismas operaciones, tocando la pantalla, en la versión original (`9300dfa`) y en
Orisma, y compara todos los datos guardados (clientes, inventario, movimientos, ventas, pendientes, gastos,
facturas, ajustes). Escenarios: clientes y créditos; productos; gastos y compras; tres ventas (efectivo con
descuento, crédito, mixto con total escrito, servicio libre y prenda a medida); pedido, apartado y encargo con
abonos, entrega y cancelación; pedido desde el asistente, factura, edición de factura y anulación; ajustes.

## 7. Errores encontrados y corregidos
- **Error real de la reconstrucción:** al escribir el nombre de un producto nuevo en una compra desde Gastos el
  cursor volvía al inicio ("botones" quedaba "otonesB"). Corregido.
- Carrera al cerrar una hoja y abrir otra (historial): corregido con `cerrarHoja` como promesa.
- Errores de campo mostrados como aviso flotante en vez de bajo el campo; aviso de error con el ícono de éxito;
  un escuchador duplicado en la zona de pago; estilos del carrito y de la factura que faltaban. Corregidos.
- Ajustes de las pruebas (no de la app): `nucleo.e2e.cjs` usaba botones de las pantallas de muestra de la Etapa 4;
  `modulos.e2e.cjs` escribía en un campo calculado sin vaciarlo y no esperaba la lista de créditos que la
  original vuelve a abrir tras liquidar.

## 8. Riesgos pendientes
- Las 9 decisiones comerciales (Etapa 1, §15) y V1–V4 siguen sin respuesta: se conserva el comportamiento actual.
- Imprimir, compartir PDF, importar contactos y la firma táctil dependen del navegador del teléfono; se probaron
  en Chromium de escritorio, no en un teléfono real.
- La app publicada sigue siendo la original: Orisma aún no reemplaza nada. La importación automática al abrir y
  la seguridad (Etapa 8) y la migración definitiva (Etapa 9) están pendientes.

## 9. Documentación
Este informe; comentarios en cada archivo con las líneas originales que reemplaza; `SEGUIMIENTO.md` actualizado.

## 10. Cómo continuar
1. Revisar y aprobar esta etapa.
2. Etapa 8 (integración y seguridad): unir importación, respaldos y módulos en el arranque real, contraseña de
   acceso local opcional (sin presentarla como protección frente a quien tenga el teléfono y sus herramientas),
   revisión de seguridad completa.
3. Para repetir las pruebas: `npm test`, `npm run verificar` y `NODE_PATH=$(npm root -g) npm run test:e2e`.
