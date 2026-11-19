# Orisma 2.0 · Etapa 2 · Trazabilidad

Asegura que nada de la versión original quede sin destino. Generado y verificado por script:
si falta una sola función (de las 98) o una sola regla (de las 92), la generación falla.

## 1. Funciones de la versión original → destino

Línea = `index.html` de `9300dfa`. Cuando una función mezclaba pantalla, cálculo y guardado, aparece repartida en varios destinos.

| Función original | Línea | Destino en Orisma 2.0 | Nota |
|---|---|---|---|
| `load` | 454 | data/legacy-import.js | solo para leer los datos viejos; el guardado nuevo es IndexedDB |
| `save` | 458 | data/database.js | reemplazado por transacciones; los errores ya no se silencian (D4-10) |
| `uid` | 493 | data/database.js | `nuevoId()`; mismo formato de id |
| `money` | 494 | ui/format.js |  |
| `escapeHtml` | 501 | ui/html.js | escape automático en plantillas |
| `initials` | 504 | ui/format.js |  |
| `todayStr` | 507 | core/clock.js | `hoy()` |
| `fmtDate` | 508 | ui/format.js |  |
| `monthKey` | 512 | business/dates.js |  |
| `renderHeader` | 517 | ui/layouts/app-shell.js |  |
| `emptyState` | 530 | ui/components/list.js |  |
| `renderList` | 537 | ui/layouts/app-shell.js | despacha según el registro de módulos |
| `metodoLabel` | 550 | ui/format.js | corrige D4-04 al aceptar un medio suelto |
| `segHtml` | 551 | ui/components/segmented.js |  |
| `abonadoVenta` | 555 | business/payments.js | RC-01 |
| `saldoVenta` | 556 | business/payments.js | RC-02 |
| `clienteSaldo` | 557 | business/payments.js | RC-03 |
| `openAbonoForm` | 559 | features/credits/payment-form.js + operations/credits.js | RC-04 |
| `renderClientes` | 624 | features/clients/index.js |  |
| `getCategorias` | 645 | business/inventory-rules.js |  |
| `bindInvSub` | 651 | features/inventory/index.js |  |
| `movimientosInventario` | 655 | business/inventory-rules.js | RI-12 |
| `renderHistorialHtml` | 681 | features/inventory/history-view.js |  |
| `umbralStock` | 709 | business/inventory-rules.js | RI-04 |
| `esPocoStock` | 714 | business/inventory-rules.js | RI-04 |
| `bindPocoBanner` | 719 | features/inventory/index.js |  |
| `openPocoStock` | 723 | features/inventory/low-stock.js |  |
| `renderStockHtml` | 749 | features/inventory/stock-view.js + business/inventory-rules.js | RI-11 |
| `renderInventario` | 785 | features/inventory/index.js |  |
| `bindCatChips` | 840 | features/inventory/index.js |  |
| `reservadoSinEncargos` | 850 | business/inventory-rules.js | RI-13; se unifica con `unidadesReservadas` sin cambiar el resultado |
| `reservadoPorEncargos` | 861 | business/inventory-rules.js | RI-14 |
| `unidadesReservadas` | 878 | business/inventory-rules.js | RI-13, RI-14 |
| `segVentas` | 889 | features/sales/index.js |  |
| `bindVentasSeg` | 892 | features/sales/index.js |  |
| `pedidoEstadoInfo` | 896 | business/orders-rules.js | RP-01 |
| `openNuevoPendiente` | 904 | features/orders/index.js |  |
| `renderPedidosHtml` | 921 | features/orders/index.js + business/orders-rules.js | RP-02, RP-05, RP-06 |
| `openPedidoForm` | 995 | features/orders/order-form.js + operations/orders.js | RP-03, RP-04 |
| `costoPedido` | 1145 | business/orders-rules.js | RP-10 |
| `avisarPendienteWA` | 1152 | business/orders-rules.js (texto) + services/whatsapp.js |  |
| `entregarPedido` | 1164 | operations/orders.js + business/orders-rules.js | RP-10…RP-14 |
| `comprobanteDeAbono` | 1230 | business/invoicing.js + operations/orders.js | RP-16, RP-17 |
| `openComprobante` | 1247 | features/invoices/invoice-view.js |  |
| `cancelarPedidoConEfecto` | 1266 | features/orders/order-detail.js + operations/orders.js + business/orders-rules.js | RP-15 |
| `registrarAbonoPedido` | 1306 | features/orders/order-detail.js + operations/orders.js | RP-07 |
| `openPedidoDetalle` | 1350 | features/orders/order-detail.js |  |
| `apartadoTotal` | 1422 | business/orders-rules.js | RP-06 (provisional, D4-02) |
| `apartadoAbonado` | 1426 | business/orders-rules.js |  |
| `renderApartadosHtml` | 1428 | — (no se reconstruye) | código muerto: no alcanzable desde la interfaz (Documento 4 §7) |
| `openApartadoDetalle` | 1459 | features/orders/layaway-detail.js | RP-08, RP-09 |
| `renderVentas` | 1535 | features/sales/index.js |  |
| `renderVentasLista` | 1553 | features/sales/index.js |  |
| `renderGastos` | 1576 | features/expenses/index.js |  |
| `cajaResumen` | 1608 | business/accounting.js | RK-01…RK-06 |
| `renderCajaHtml` | 1645 | features/reports/cash-view.js |  |
| `renderFlujoHtml` | 1742 | features/reports/flow-view.js + business/accounting.js | RL-01…RL-03 |
| `bindVistaReportes` | 1788 | features/reports/index.js |  |
| `mesAnteriorKey` | 1800 | business/dates.js |  |
| `gananciaDe` | 1804 | business/accounting.js | RR-02 |
| `renderReportes` | 1813 | features/reports/summary-view.js + business/accounting.js | RR-01…RR-04 |
| `openOverlay` | 1910 | ui/overlays/sheet.js | con pila y botón atrás |
| `puedeContactos` | 1924 | services/contacts.js |  |
| `openClienteForm` | 1927 | features/clients/client-form.js + operations/clients.js |  |
| `openProductoForm` | 1997 | features/inventory/product-form.js + operations/products.js + business/inventory-rules.js | RI-02, RI-03, RI-05, RI-06 |
| `openCompraForm` | 2172 | features/inventory/purchase-form.js + operations/purchases.js + business/inventory-rules.js | RI-07…RI-10; conserva D4-01 hasta autorización |
| `openGastoForm` | 2277 | features/expenses/expense-form.js + operations/expenses.js + operations/purchases.js | RG-07…RG-09 |
| `openVentaWizard` | 2587 | features/sales/sale-wizard.js, sale-cart.js, sale-payment.js, free-item-form.js, custom-item-form.js + operations/sales.js + operations/orders.js + business/sales-rules.js | RV-01…RV-12, RI-15…RI-17 |
| `openVentaSavedConfirm` | 3174 | features/sales/sale-payment.js | RV-13 |
| `generarFactura` | 3204 | operations/invoices.js + business/invoicing.js | RF-01 |
| `renderFacturas` | 3220 | features/invoices/index.js |  |
| `openSinFacturaPicker` | 3249 | features/invoices/index.js |  |
| `buildInvoiceHtml` | 3279 | features/invoices/invoice-document.js + business/invoicing.js | RF-04…RF-07 |
| `buildVentaSummaryHtml` | 3374 | features/sales/sale-detail.js |  |
| `openVentaDetail` | 3397 | features/sales/sale-detail.js + features/invoices/invoice-view.js |  |
| `cargarLibsPDF` | 3444 | services/pdf.js | librerías locales (A10) |
| `descargarArchivo` | 3456 | services/export.js | sin `window.claude` |
| `compartirFacturaPDF` | 3467 | services/pdf.js + services/export.js + services/whatsapp.js | RF-08 |
| `openFacturaEdit` | 3516 | features/invoices/invoice-edit.js + operations/invoices.js | RF-03 |
| `resizeImageFile` | 3559 | services/images.js |  |
| `imagePickerHtml` | 3580 | ui/components/image-picker.js |  |
| `wireImagePicker` | 3592 | ui/components/image-picker.js |  |
| `toggleRowHtml` | 3615 | ui/components/fields.js |  |
| `waUrl` | 3628 | services/whatsapp.js | RG-05 |
| `anularVenta` | 3633 | features/invoices/invoice-view.js + operations/sales.js | RA-01…RA-03; conserva D4-08 hasta autorización |
| `totalPorCobrarAll` | 3673 | business/payments.js | RC-03 |
| `openCreditosAjustes` | 3675 | features/credits/credits-view.js |  |
| `openCreditoCliente` | 3713 | features/credits/credits-view.js + operations/credits.js | RC-05 |
| `openRespaldoAjustes` | 3792 | features/settings/backup-section.js + operations/backup.js + data/backup.js | RB-01…RB-04 |
| `openSettings` | 3875 | features/settings/settings-menu.js |  |
| `openSettingSection` | 3910 | features/settings/settings-menu.js |  |
| `sectionShell` | 3920 | features/settings/settings-menu.js |  |
| `wireSection` | 3933 | features/settings/settings-menu.js |  |
| `openSettingsUsuario` | 3944 | features/settings/business-section.js + operations/settings.js |  |
| `openSettingsFactura` | 3971 | features/settings/invoice-section.js + ui/components/signature-pad.js + operations/settings.js |  |
| `openSettingsProductos` | 4073 | features/settings/products-section.js + operations/settings.js |  |
| `openSettingsVentas` | 4091 | features/settings/money-section.js + operations/settings.js |  |
| `onFab` | 4109 | ui/layouts/app-shell.js | `accionPrincipal` de cada módulo |

Funciones internas de formularios grandes (por ejemplo `calcPagos`, `validarMateriales`, `recalc`, `calcularNuevoCosto`)
se reparten según lo mismo: el cálculo va a `business/`, el dibujo a `features/`. `calcularNuevoCosto` existe hoy en 3 copias;
en Orisma 2.0 será una sola función en `business/inventory-rules.js` (RI-07).

## 2. Reglas comerciales → módulo responsable

| Regla | Descripción (resumida) | Módulo |
|---|---|---|
| RG-01 | Identificadores: marca de tiempo en base 36 + 5 caracteres aleatorios. | data/database.js |
| RG-02 | Dinero: símbolo + espacio + signo + miles con punto + coma + 2 decimales (`$ 1.234,50`). Los valores se… | ui/format.js |
| RG-03 | Fecha "de hoy" = fecha local del dispositivo. Todas las fechas se guardan como `AAAA-MM-DD`. | core/clock.js, business/dates.js |
| RG-04 | Folio visible: `F-` + número con 4 dígitos (`F-0007`). | ui/format.js |
| RG-05 | Un número de teléfono de 10 dígitos que empieza por 3 se considera colombiano y se le antepone `57` para… | services/whatsapp.js |
| RG-06 | Nombre de cliente y de producto son los únicos campos obligatorios de sus formularios. | business/validation.js |
| RI-01 | Un producto con `stock` vacío **no tiene control de stock**: nunca se descuenta, nunca se agota, no cuenta… | business/inventory-rules.js |
| RI-02 | Precio sugerido = `costo × (1 + ganancia% / 100)`, con 2 decimales. Si se escribe el precio, ganancia% =… | business/inventory-rules.js |
| RI-03 | Al crear un producto se propone la "ganancia por defecto" de Ajustes. | business/inventory-rules.js |
| RI-04 | Poco stock: producto con control de stock y `stock ≤ límite`. Límite = `stockMinimo` del producto o, si… | business/inventory-rules.js |
| RI-05 | Cambiar el stock a mano registra un movimiento "ajuste" (stock anterior, nuevo, motivo opcional). Un stock… | business/inventory-rules.js |
| RI-06 | Crear producto registra "alta"; eliminarlo registra "baja" con el stock que tenía. | business/inventory-rules.js |
| RI-07 | **Costo promedio ponderado** al comprar: si hay stock > 0 y costo > 0, `nuevoCosto = (stock × costo +… | business/inventory-rules.js |
| RI-08 | Al comprar, `stock = stock actual + cantidad` (un producto sin control de stock pasa a tenerlo, partiendo… | business/inventory-rules.js |
| RI-09 | Al comprar se puede fijar un nuevo precio o ganancia%; si el producto ya tenía ganancia%, se recalcula el… | business/inventory-rules.js |
| RI-10 | La compra genera un gasto por `cantidad × costoCompra`. | business/inventory-rules.js |
| RI-11 | Valor del inventario = Σ stock × costo (solo productos con control). Valor a precio de venta = Σ stock ×… | business/inventory-rules.js |
| RI-12 | El historial de inventario se arma con: cada ítem vendido (−), cada compra tipo `compra` (+), ajustes… | business/inventory-rules.js |
| RI-13 | Pedidos y apartados pendientes **reservan** sus unidades. Los materiales de prendas a medida de cualquier… | business/inventory-rules.js |
| RI-14 | Los encargos pendientes reservan **solo si el stock libre alcanza** para el encargo completo,… | business/inventory-rules.js |
| RI-15 | Disponible para vender = `max(0, stock − reservadas)`; sin control de stock = ilimitado. | business/inventory-rules.js |
| RI-16 | El asistente impide vender o agregar más unidades que las disponibles, y valida los materiales de las… | business/validation.js (usa inventory-rules) |
| RI-17 | Al crear un pedido o apartado **desde el asistente** también se valida el disponible (los encargos no). | business/validation.js (usa inventory-rules) |
| RV-01 | Toda venta exige un cliente registrado. | business/validation.js |
| RV-02 | Suma de productos = Σ precio unitario × cantidad. El precio unitario se puede cambiar en el carrito. | business/sales-rules.js |
| RV-03 | Descuento: en % sobre la suma (0–100) o en monto (cuando se escribe el total a mano), nunca mayor que la… | business/sales-rules.js |
| RV-04 | Base = suma − descuento. Impuesto = base × impuesto% de Ajustes. **Total = base + impuesto.** | business/sales-rules.js |
| RV-05 | Total escrito a mano: base = total / (1 + impuesto%); no puede superar la suma de productos; la diferencia… | business/sales-rules.js |
| RV-06 | Costo de la venta = Σ costo × cantidad del carrito (costo del producto al agregarlo, o el costo escrito… | business/sales-rules.js |
| RV-07 | **Ganancia de la venta = base (sin impuesto) − costo.** | business/sales-rules.js |
| RV-08 | Prenda a medida: precio por prenda = Σ precio de cada material × su cantidad; costo = Σ costo × cantidad.… | business/sales-rules.js |
| RV-09 | Al guardar se descuenta el stock de cada producto vendido y de cada material (`material × prendas`), sin… | business/sales-rules.js |
| RV-10 | Pagos: **efectivo/tarjeta** → un pago por el total, `fiado = false`. **Crédito** → abono inicial opcional… | business/sales-rules.js |
| RV-11 | Los pagos se guardan como `abonos` con fecha de hoy. | business/sales-rules.js |
| RV-12 | Se muestra una pantalla de confirmación antes de guardar. | features/sales/sale-payment.js |
| RV-13 | La factura es opcional y se puede generar después. | features/sales/sale-payment.js |
| RV-14 | Etiqueta de medio de pago en lista y factura: Efectivo / Tarjeta / A crédito / Mixto. | ui/format.js |
| RC-01 | Abonado de una venta = Σ montos de sus abonos. | business/payments.js |
| RC-02 | **Saldo de una venta = máx(0, total − abonado) si `fiado`; si no, 0.** | business/payments.js |
| RC-03 | Deuda de un cliente = Σ saldo de sus ventas. Total por cobrar = Σ saldo de todas las ventas. | business/payments.js |
| RC-04 | Un abono se limita en silencio al saldo pendiente; montos ≤ 0 no se aceptan. | business/payments.js |
| RC-05 | Liquidar deuda: agrega a cada venta fiada del cliente un abono por su saldo, con fecha de hoy, nota… | business/payments.js + operations/credits.js |
| RC-06 | Una venta pagada por completo sigue con `fiado = true` (aparece como "Pagado" en los créditos del cliente). | business/payments.js |
| RP-01 | Estado de un pedido según la fecha: vencido (antes de hoy), hoy, próximo, sin fecha. | business/orders-rules.js |
| RP-02 | Orden de la lista: pedidos por fecha (y luego por creación); encargos con fecha por fecha y sin fecha por… | business/orders-rules.js |
| RP-03 | Al crear con anticipo > 0 se registra un abono (nota "Anticipo" o "Abono inicial") con su fecha y medio. | business/orders-rules.js |
| RP-04 | Total en el **formulario** = (suma − descuento%) × (1 + impuesto%). Anticipo limitado al total. | business/orders-rules.js |
| RP-05 | Total en la **lista**, **detalle**, **abono a pedido**, **cancelación** y **flujo** = suma de productos,… | business/orders-rules.js |
| RP-06 | Total de un **apartado** (lista y detalle) = suma × (1 + impuesto%), **sin descuento**. | business/orders-rules.js |
| RP-07 | Abono a pedido/encargo: monto > 0, fecha obligatoria, no mayor al saldo (RP-05), medio efectivo/tarjeta.… | business/orders-rules.js |
| RP-08 | Abono a apartado: mismas validaciones, saldo según RP-06. | business/orders-rules.js |
| RP-09 | Un apartado solo se puede entregar con saldo 0. | business/orders-rules.js |
| RP-10 | **Entregar** crea una venta: suma de productos, descuento% guardado en el pendiente, impuesto actual de… | business/orders-rules.js |
| RP-11 | Al entregar se verifica que haya stock (sin descontar las reservas de otros pendientes) y se descuenta… | business/inventory-rules.js + business/orders-rules.js |
| RP-12 | Al entregar, los abonos del pendiente pasan a la venta (con nuevos ids y sus fechas originales). Si "Pagó… | business/orders-rules.js |
| RP-13 | Medio de la venta entregada: crédito si queda saldo; en apartados, el único medio usado o "mixto"; en… | business/orders-rules.js |
| RP-14 | El pendiente pasa a `entregado` y deja de reservar. | business/orders-rules.js |
| RP-15 | **Cancelar**: el pendiente pasa a `cancelado` con fecha; lo abonado se devuelve como **gasto** categoría… | business/orders-rules.js |
| RP-16 | El comprobante de abono usa su propio contador (`siguienteComprobante`), distinto al de facturas, y se… | business/invoicing.js |
| RP-17 | El comprobante de un pedido/encargo muestra un único pago por el valor de `anticipo`; el de un apartado… | business/orders-rules.js |
| RF-01 | Una venta recibe folio solo al pedir "Generar factura": `folio = siguienteFolio`, y el contador sube 1. Si… | business/invoicing.js |
| RF-02 | Anular una factura no libera su número (el folio no se reutiliza). | business/invoicing.js |
| RF-03 | Editar factura cambia solo datos del cliente, fecha y notas; productos y precios no. | operations/invoices.js |
| RF-04 | Sello "PAGADA" cuando saldo = 0 (toda venta no fiada se considera pagada). | business/invoicing.js |
| RF-05 | Descripción de cada ítem = características del ítem o, si no hay, la descripción del producto en inventario. | business/invoicing.js |
| RF-06 | Foto en la factura = foto del ítem o la foto actual del producto (si la opción está activa). | business/invoicing.js |
| RF-07 | Totales mostrados: suma de productos, descuento (con % si fue en %), impuesto, gran total, pagado, saldo… | business/invoicing.js |
| RF-08 | Texto al compartir: "Factura NNNN de {negocio}. Total: $X[. Saldo pendiente: $Y]." | business/invoicing.js + services/whatsapp.js |
| RA-01 | Anular **borra** la venta (y con ella sus abonos). | business/sales-rules.js + operations/sales.js |
| RA-02 | Devuelve al stock las unidades vendidas y los materiales (solo productos que aún existen y con control) y… | business/inventory-rules.js + operations/sales.js |
| RA-03 | No registra devolución de dinero (a diferencia de cancelar un pendiente, RP-15). El pendiente de origen,… | business/sales-rules.js + operations/sales.js |
| RG-07 | Gasto general: descripción obligatoria; monto, fecha, categoría y medio libres (monto 0 o negativo se acepta). | business/validation.js + operations/expenses.js |
| RG-08 | Compra de inventario desde Gastos: producto existente o nuevo; cantidad > 0 obligatoria; aplica RI-07 a… | operations/purchases.js + business/inventory-rules.js |
| RG-09 | Editar un gasto de compra no ajusta stock ni costo (lo advierte); eliminarlo tampoco. | operations/expenses.js |
| RK-01 | **Ingresos** = todos los abonos de ventas con fecha en el rango (efectivo o tarjeta según su medio; un… | business/accounting.js |
| RK-02 | Ventas antiguas sin abonos y no fiadas cuentan su total como efectivo en su fecha. | business/accounting.js |
| RK-03 | Más los abonos de pendientes **pendientes o cancelados** en el rango (los entregados ya están en la… | business/accounting.js |
| RK-04 | "Abonos de créditos" = parte de los ingresos que viene de ventas fiadas (incluye el abono inicial). | business/accounting.js |
| RK-05 | **Egresos** = todos los gastos del rango; "compras" = los de tipo `compra`; "otros" = el resto. | business/accounting.js |
| RK-06 | Cierre neto = ingresos − egresos. Efectivo en caja = ingresos en efectivo − gastos en efectivo; igual para… | business/accounting.js |
| RK-07 | Los ingresos se cuentan el día en que se recibe el dinero, no el día de la venta (criterio de caja). | business/accounting.js |
| RL-01 | Dinero disponible hoy = efectivo en caja + tarjeta en caja de **toda la historia**. | business/accounting.js |
| RL-02 | Por cobrar = Σ saldos de ventas fiadas + Σ (suma de productos − abonado) de pendientes pendientes (sin… | business/accounting.js |
| RL-03 | Flujo por mes: entradas, salidas, efectivo y tarjeta del mes; el número del mes es el acumulado hasta ese mes. | business/accounting.js |
| RR-01 | Períodos: este mes, mes anterior, todo. Las ventas cuentan por su fecha (criterio de devengo: cuentan… | business/accounting.js |
| RR-02 | **Ganancia del período = Σ total de ventas − Σ costo de lo vendido − otros gastos** (gastos que no son… | business/accounting.js |
| RR-03 | Comparación con el mes anterior: diferencia de ganancias; si el mes anterior no tiene ventas ni gastos, se… | business/accounting.js |
| RR-04 | Top 5 productos del período por unidades vendidas, agrupados por **nombre**. | business/accounting.js |
| RB-01 | Formato: `{ app: 'cuentas', version: 2, fecha, datos: { clientes, inventario, ventas, gastos, movimientos,… | data/backup.js + operations/backup.js |
| RB-02 | Para restaurar, el archivo debe tener `datos.clientes`, `datos.inventario`, `datos.ventas` y… | data/backup.js + operations/backup.js |
| RB-03 | Restaurar reemplaza las seis listas; la configuración se **mezcla** (las claves que no vienen en el… | data/backup.js + operations/backup.js |
| RB-04 | Restaurar pide confirmación mostrando cuántos clientes, productos, ventas y gastos trae. | data/backup.js + operations/backup.js |

**Cobertura:** 98 de 98 funciones y 92 de 92 reglas con destino asignado.
