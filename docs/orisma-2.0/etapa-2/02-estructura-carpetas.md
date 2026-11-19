# Orisma 2.0 · Etapa 2 · Estructura definitiva de carpetas

Cambios respecto a la propuesta inicial del documento maestro, con su motivo:

| Cambio | Motivo |
|---|---|
| **+ `src/operations/`** | Las acciones que tocan varias colecciones (venta, entrega, anulación, compra) necesitan un lugar propio que las guarde en una transacción. Ni `business/` (pura) ni `features/` (pantallas) deben hacerlo. |
| **+ `business/orders-rules.js`, `invoicing.js`, `numbers.js`, `dates.js`** | Pendientes y facturación tienen reglas propias (RP, RF); números y fechas son la base de todas. |
| **+ `core/clock.js`** | Fecha de hoy en un solo lugar, para poder fijarla en pruebas. |
| **+ `data/schema.js`, `legacy-import.js`, `files.js`** | Esquema para validar; importación desde `localStorage` separada de las migraciones; imágenes aparte. |
| **`data/storage.js` → `data/files.js`** | Se llamaba igual que el concepto general; su función real es guardar imágenes. |
| **+ `services/contacts.js`** | Importar contactos es una funcionalidad existente (1.5). |
| **+ `assets/vendor/`** | Librerías del PDF locales (A10). |
| **− `assets/images/`** | La app no tiene imágenes propias aparte de los íconos. No se crean carpetas vacías. |
| **+ `styles/base.css`, `print.css`** | Estilos generales y de impresión de la factura (hoy `@media print`). |
| **+ `tests/`, `tools/`** | Pruebas y verificaciones automáticas. No se publican como parte de la app. |
| **`orders/` incluye apartados y encargos** | Son tres tipos del mismo registro (`pedidos`). |
| **Pantallas de Créditos y Respaldo dentro de `features/`** | Hoy viven en Ajustes; se conservan ahí en la navegación, pero su código va en su módulo. |

## Árbol

Los archivos de `features/` y `ui/components/` son los previstos según el inventario de la Etapa 1; se pueden
dividir más en la Etapa 7 si alguno pasa de ~300 líneas, pero no se crean archivos sin responsabilidad real.

```
orisma/
├── index.html                    marco de la página, CSP, carga de src/app.js
├── manifest.json                 app instalable
├── sw.js                         funcionamiento sin conexión
│
├── assets/
│   ├── icons/                    icon-192.png, icon-512.png, apple-touch-icon.png
│   └── vendor/                   html2canvas.min.js (1.4.1), jspdf.umd.min.js (2.5.1)
│
├── src/
│   ├── app.js                    arranque y lista de módulos
│   ├── precache-list.js          lista de archivos para sw.js (generada por tools/precache.js)
│   │
│   ├── core/
│   │   ├── config.js             versión, colecciones, valores por defecto
│   │   ├── state.js              datos en memoria y estado de navegación
│   │   ├── events.js             eventos entre módulos
│   │   ├── navigation.js         rutas, pila de hojas, botón atrás
│   │   ├── errors.js             tipos de error, captura y registro
│   │   └── clock.js              fecha y hora
│   │
│   ├── data/
│   │   ├── database.js           IndexedDB y transacciones
│   │   ├── schema.js             almacenes y forma de cada registro
│   │   ├── migrations.js         versiones del esquema
│   │   ├── legacy-import.js      importación desde localStorage (sin borrarlo)
│   │   ├── files.js              imágenes
│   │   └── backup.js             exportar, importar y validar respaldos
│   │
│   ├── business/
│   │   ├── numbers.js            conversión segura y sumas
│   │   ├── dates.js              meses y comparaciones de fecha
│   │   ├── inventory-rules.js    stock, reservas, costo promedio, precio y ganancia
│   │   ├── sales-rules.js        totales, descuento, impuesto, ganancia, pagos
│   │   ├── payments.js           abonos, saldos, créditos
│   │   ├── orders-rules.js       pedidos, encargos y apartados
│   │   ├── invoicing.js          folios, comprobantes, datos del documento
│   │   ├── accounting.js         caja, flujo, ganancia, top de productos
│   │   └── validation.js         validaciones comerciales
│   │
│   ├── operations/
│   │   ├── clients.js
│   │   ├── products.js
│   │   ├── purchases.js
│   │   ├── sales.js
│   │   ├── orders.js
│   │   ├── credits.js
│   │   ├── invoices.js
│   │   ├── expenses.js
│   │   ├── settings.js
│   │   └── backup.js
│   │
│   ├── services/
│   │   ├── pdf.js
│   │   ├── images.js
│   │   ├── export.js
│   │   ├── whatsapp.js
│   │   └── contacts.js
│   │
│   ├── features/
│   │   ├── clients/
│   │   │   ├── index.js              descripción del módulo + lista
│   │   │   └── client-form.js        crear/editar, créditos del cliente
│   │   ├── inventory/
│   │   │   ├── index.js              productos, filtros, aviso de poco stock
│   │   │   ├── product-form.js       crear/editar/eliminar, historial de compras
│   │   │   ├── purchase-form.js      compra desde el producto
│   │   │   ├── stock-view.js         resumen de stock
│   │   │   ├── history-view.js       historial de movimientos
│   │   │   └── low-stock.js          panel de poco stock
│   │   ├── sales/
│   │   │   ├── index.js              lista de ventas y sub-vistas
│   │   │   ├── sale-detail.js        detalle de venta sin factura
│   │   │   ├── sale-wizard.js        asistente: pasos, cliente
│   │   │   ├── sale-cart.js          carrito, descuento, total
│   │   │   ├── sale-payment.js       formas de pago y confirmación
│   │   │   ├── free-item-form.js     servicio o producto libre
│   │   │   └── custom-item-form.js   prenda a medida
│   │   ├── orders/
│   │   │   ├── index.js              lista de pendientes
│   │   │   ├── order-form.js         crear/editar pendiente
│   │   │   ├── order-detail.js       detalle, abono, entrega, cancelación de pedido/encargo
│   │   │   └── layaway-detail.js     detalle de apartado
│   │   ├── invoices/
│   │   │   ├── index.js              lista de facturas, facturar una venta
│   │   │   ├── invoice-document.js   documento de factura y comprobante
│   │   │   ├── invoice-view.js       ver, imprimir, compartir, anular
│   │   │   └── invoice-edit.js       editar datos de la factura
│   │   ├── expenses/
│   │   │   ├── index.js              lista
│   │   │   └── expense-form.js       gasto general y compra de inventario
│   │   ├── credits/
│   │   │   ├── credits-view.js       deudores y deuda por cliente
│   │   │   └── payment-form.js       abono a una venta, liquidación
│   │   ├── reports/
│   │   │   ├── index.js              selector de vista
│   │   │   ├── summary-view.js       ganancia del período
│   │   │   ├── cash-view.js          caja diaria y mensual
│   │   │   └── flow-view.js          flujo
│   │   └── settings/
│   │       ├── settings-menu.js      menú
│   │       ├── business-section.js   usuario y negocio
│   │       ├── invoice-section.js    diseño de factura y firma
│   │       ├── products-section.js   ganancia por defecto, poco stock
│   │       ├── money-section.js      moneda e impuesto
│   │       └── backup-section.js     respaldo
│   │
│   └── ui/
│       ├── html.js                   plantillas con escape automático
│       ├── format.js                 dinero, fechas, folio
│       ├── components/
│       │   ├── segmented.js          selector segmentado
│       │   ├── list.js               filas de lista y estado vacío
│       │   ├── cards.js              tarjetas de cifras y resumen
│       │   ├── fields.js             campos de formulario, interruptores
│       │   ├── image-picker.js       elegir/quitar imagen
│       │   └── signature-pad.js      firma con el dedo
│       ├── overlays/
│       │   ├── sheet.js              hojas emergentes
│       │   └── dialog.js             confirmaciones
│       ├── layouts/
│       │   └── app-shell.js          encabezado, pestañas/barra lateral, buscador, botón +
│       └── notifications/
│           └── toast.js              avisos
│
├── styles/
│   ├── variables.css             colores, tipografía, espacios (claro y oscuro)
│   ├── base.css                  estilos generales
│   ├── layout.css                marco de la app
│   ├── components.css            componentes
│   ├── responsive.css            teléfono / tableta / computador
│   └── print.css                 impresión de facturas
│
├── tests/
│   ├── business/                 una prueba por archivo de business/ (node --test)
│   └── e2e/                      comparativas con la app original (Playwright)
│
├── tools/
│   ├── check-architecture.js     verifica las reglas de dependencia
│   └── precache.js               genera src/precache-list.js
│
└── docs/
    └── orisma-2.0/               documentos de cada etapa y seguimiento
```

**Total previsto:** 3 archivos raíz, 5 de recursos, 87 de código en `src/`, 6 de estilos, 2 herramientas.

## Qué pasa con los archivos actuales

| Actual | Destino |
|---|---|
| `index.html` (original en `main` y `9300dfa`) | Se conserva en `main` hasta que Orisma 2.0 se apruebe (Etapa 10). En la rama de trabajo se reemplaza en la Etapa 4. |
| `css/`, `js/` (commit `1480bd7`) | Se eliminan en la Etapa 4 al crear la estructura nueva (A9). Siguen disponibles en el historial de git. |
| `sw.js`, `manifest.json` | Se reescriben en la Etapa 4/9. Se mantiene el mismo nombre y `scope` para que la app instalada se actualice sola. |
| `icon-*.png`, `apple-touch-icon.png` | Pasan a `assets/icons/` (la Etapa 3 decide si se rediseñan). |
| `README.md` | Se actualiza en la Etapa 4. |
| `docs/` | Se conserva. |

**Importante para la migración:** el navegador separa los datos por dominio, no por carpeta. Mientras Orisma 2.0
se publique en el mismo dominio que la app actual (por ejemplo `usuario.github.io`), podrá leer los datos
actuales de `localStorage` para migrarlos. Si se publica en otro dominio, la migración se hará con un archivo
de respaldo.
