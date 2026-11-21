# Orisma 2.0 · Etapa 1 · Documento 1
# Inventario completo de funcionalidades

**Versión auditada:** aplicación original "Cuentas" del repositorio, commit `9300dfa` (15-nov-2026).
Un solo `index.html` de 4.141 líneas (CSS líneas 10–405, JavaScript 450–4138), más `sw.js`, `manifest.json` y tres íconos.
Todas las referencias `L123` son líneas de ese `index.html`.

## Cómo leer la columna "Verificación"

| Marca | Significado |
|---|---|
| **E** | **Ejecutado**: una prueba automática hizo la operación en la app original y comprobó el resultado (ver `pruebas/resultados-pruebas.json`, IDs T1–T15 y R1–R5). |
| **R** | **Recorrido**: la pantalla se abrió en el recorrido automático de 53 pasos (`pruebas/recorrido.js`) y se dibujó sin errores de JavaScript. Confirma que *abre*, no que el cálculo sea correcto. |
| **I** | **Solo inspección del código**. Requiere prueba de ejecución antes de darla por buena. |

No se marca nada como probado si solo se leyó el código.

---

## 0. Estructura general

| # | Funcionalidad | Dónde | Verif. |
|---|---|---|---|
| 0.1 | Seis pestañas: Clientes, Inventario, Ventas, Facturas, Gastos, Reportes | L439–446, L4120 | R |
| 0.2 | Encabezado con nombre del negocio y foto de perfil (o logo, o iniciales) | `renderHeader` L517 | R |
| 0.3 | Buscador por pestaña con texto de ayuda propio; oculto en Reportes | L524–526 | R |
| 0.4 | Botón "+" que hace algo distinto según la pestaña; oculto en Reportes y en Inventario › Stock/Historial | `onFab` L4109, L527 | R |
| 0.5 | Botón de ajustes (engranaje) | L4133 | R |
| 0.6 | Hojas emergentes ("overlay") que se cierran tocando fuera | `openOverlay` L1910 | R |
| 0.7 | Tema oscuro automático según el teléfono | CSS L31 | I |
| 0.8 | Diseño de una columna de máximo 560 px (en computador queda angosto y centrado) | CSS L61 | I |
| 0.9 | Instalable como app (PWA) y funciona sin conexión | `manifest.json`, `sw.js` | E (T15) |

## 1. Clientes

| # | Funcionalidad | Dónde | Verif. |
|---|---|---|---|
| 1.1 | Lista de clientes con teléfono/correo y etiqueta "Debe $X" si tiene saldo | `renderClientes` L624 | R |
| 1.2 | Búsqueda por nombre | L626 | R |
| 1.3 | Crear cliente: nombre (obligatorio), teléfono, correo, dirección de facturación | `openClienteForm` L1927 | E (T7) |
| 1.4 | Editar cliente | L1978 | I |
| 1.5 | Importar desde los contactos del teléfono (solo navegadores con Contact Picker API) | L1924, L1959 | I |
| 1.6 | Ver créditos del cliente (ventas fiadas, abonado, saldo) y abrir el abono de cada una | L1929–1941, L1983 | E (R1) |
| 1.7 | Eliminar cliente (sin confirmación) | L1985 | E (T5) |

## 2. Inventario

### 2.1 Productos

| # | Funcionalidad | Dónde | Verif. |
|---|---|---|---|
| 2.1.1 | Lista de productos con foto, stock, reservadas/disponibles, costo, precio, % y valor de ganancia por unidad | `renderInventario` L785 | R |
| 2.1.2 | Filtro por categoría (chips) | L798, `bindCatChips` L840 | R |
| 2.1.3 | Búsqueda por nombre | L792 | R |
| 2.1.4 | Aviso "Poco stock (n)" con lista; al tocarlo abre el panel de poco stock | L794, `openPocoStock` L723 | I |
| 2.1.5 | Panel de poco stock: productos bajo su límite y productos sin aviso; abre el producto | L723–747 | I |
| 2.1.6 | Crear producto: nombre, foto, categoría, descripción para factura, costo, ganancia %, precio, stock opcional, límite de aviso propio, "no avisar" | `openProductoForm` L1997 | R |
| 2.1.7 | Cálculo automático precio ↔ ganancia % y vista previa "Ganas $X por unidad" | `recalc` L2077 | I |
| 2.1.8 | Editar producto; si cambia el stock pide motivo y registra un ajuste | L2093–2138 | I |
| 2.1.9 | Historial de compras del producto: unidades compradas, invertido, costo promedio, vendidas | L1999–2019 | E (T1: muestra "sin compras" tras una compra hecha desde el producto) |
| 2.1.10 | Registrar compra (reabastecer) desde el producto | `openCompraForm` L2172 | E (T1) |
| 2.1.11 | Eliminar producto con confirmación; registra movimiento "baja" | L2148–2168 | I |

### 2.2 Stock (resumen)

| # | Funcionalidad | Dónde | Verif. |
|---|---|---|---|
| 2.2.1 | Costo total del inventario, unidades, valor a precio de venta, reservadas, poco stock | `renderStockHtml` L749 | R |
| 2.2.2 | Detalle por producto ordenado por valor, con reservadas y disponibles | L758–782 | R |

### 2.3 Historial

| # | Funcionalidad | Dónde | Verif. |
|---|---|---|---|
| 2.3.1 | Línea de tiempo combinada: ventas, compras, ajustes, altas, bajas y devoluciones (máx. 200) | `movimientosInventario` L655, `renderHistorialHtml` L681 | R |
| 2.3.2 | Búsqueda por nombre de producto | L683 | I |

## 3. Ventas

### 3.1 Lista

| # | Funcionalidad | Dónde | Verif. |
|---|---|---|---|
| 3.1.1 | Sub-vistas "Ventas" y "Pendientes" | `segVentas` L889 | R |
| 3.1.2 | Lista de ventas: cliente, folio o "Sin factura", fecha, medio de pago, total | `renderVentasLista` L1553 | R |
| 3.1.3 | Búsqueda por cliente o folio ("f12") | L1556 | R |
| 3.1.4 | Detalle de venta sin factura: resumen, ganancia, generar factura, anular | `openVentaDetail` L1397 | R |

### 3.2 Asistente de nueva venta (botón +)

| # | Funcionalidad | Dónde | Verif. |
|---|---|---|---|
| 3.2.1 | Exige al menos un cliente | L2588 | I |
| 3.2.2 | Paso 1: elegir cliente | `bodyStep1` L2632 | E (R1) |
| 3.2.3 | Paso 2: buscar producto y agregarlo; respeta stock disponible (stock − reservado) | `renderProdPick` L2905 | E (T12) |
| 3.2.4 | Cambiar cantidad (+/−), quitar, cambiar precio unitario (se marca si es menor al de catálogo) | `renderCart` L3071 | E (R1: +) |
| 3.2.5 | Agregar servicio o producto libre (nombre, trabajo, foto, precio, cantidad, costo); no descuenta stock | L2930 | I |
| 3.2.6 | Agregar "prenda a medida" hecha con materiales del inventario; precio = suma de precios de materiales; costo = suma de costos | L2966–3055 | I |
| 3.2.7 | Validar materiales suficientes | `validarMateriales` L3057 | I |
| 3.2.8 | Descuento en % sobre la venta | L3109 | E (T3) |
| 3.2.9 | Editar el "Total a cobrar" a mano (se convierte en descuento en monto) | L3114 | I |
| 3.2.10 | Impuesto según ajustes | L2619 | E (T9) |
| 3.2.11 | Ganancia estimada desplegable (costo, descuento, ingreso, margen) | `renderGanancia` L2876 | I |
| 3.2.12 | Notas para el cliente | L2662 | I |
| 3.2.13 | Formas de pago: efectivo, tarjeta, a crédito (con abono inicial y su medio), mixto (efectivo + tarjeta; lo que falte queda a crédito) | `calcPagos` L2836 | E (T9 efectivo, R1 crédito, R2 mixto) |
| 3.2.14 | Pantalla de confirmación antes de cobrar | `openConfirmarVenta` L2791 | E |
| 3.2.15 | Guardar venta y descontar stock (productos y materiales) | L3133–3169 | E (R1) |
| 3.2.16 | Pantalla "Venta registrada" con ganancia y opción de generar factura | `openVentaSavedConfirm` L3174 | E |
| 3.2.17 | Desde el mismo asistente: registrar como Pedido, Encargo o Apartado (fecha, anticipo/abono inicial, medio) | `renderOpWrap` L2686, `guardarPendiente` L2709 | E (T3) |
| 3.2.18 | Botón Atrás vuelve al paso 1 conservando el carrito | L2899 | I |

### 3.3 Pendientes: pedidos, encargos y apartados

| # | Funcionalidad | Dónde | Verif. |
|---|---|---|---|
| 3.3.1 | Lista agrupada en secciones plegables: Pedidos (vencidos / hoy / próximos), Encargos (con fecha / sin fecha), Apartados | `renderPedidosHtml` L921 | R |
| 3.3.2 | Búsqueda por cliente | L924 | R |
| 3.3.3 | Botón + pregunta qué registrar: Pedido, Encargo o Apartado | `openNuevoPendiente` L904 | R |
| 3.3.4 | Formulario de pendiente: cliente, productos (del inventario o libres), cantidad, precio, características, costo, notas, fecha de entrega, anticipo, descuento %, fecha y medio del anticipo; resumen con total y saldo | `openPedidoForm` L995 | E (T2, T6) |
| 3.3.5 | Editar pendiente | L995 (con `id`) | E (T6) |
| 3.3.6 | Detalle de pedido/encargo: productos, materiales, fotos, total estimado, anticipo, saldo al entregar, ganancia estimada, notas | `openPedidoDetalle` L1350 | E (T6) |
| 3.3.7 | Registrar abono a un pedido/encargo | `registrarAbonoPedido` L1306 | I |
| 3.3.8 | Detalle de apartado con lista de abonos y formulario de abono | `openApartadoDetalle` L1459 | E (T2, T4) |
| 3.3.9 | Comprobante de abono (documento imprimible y compartible) | `openComprobante` L1247 | E (T8) |
| 3.3.10 | Recordatorio por WhatsApp (texto distinto para pedido, encargo y apartado) | `avisarPendienteWA` L1152 | I |
| 3.3.11 | Marcar entregado: "Pagó el saldo" (efectivo/tarjeta) o "Queda a crédito"; crea la venta y descuenta stock | `entregarPedido` L1164 | E (T11 a crédito) |
| 3.3.12 | Entregar apartado: solo si está pagado | L1499, L1526 | E (T2) |
| 3.3.13 | Cancelar pendiente con devolución de lo abonado (gasto "Devolución" por medio de pago) | `cancelarPedidoConEfecto` L1266 | E (R4) |
| 3.3.14 | Reservas de stock por pendientes (los encargos reservan solo si el stock alcanza, por orden de llegada) | L850–887 | E (T12) |

## 4. Facturas

| # | Funcionalidad | Dónde | Verif. |
|---|---|---|---|
| 4.1 | Lista de facturas por folio descendente; aviso de "Ventas sin factura" | `renderFacturas` L3220 | R |
| 4.2 | Búsqueda por cliente, "f12" o "0012" | L3224 | R |
| 4.3 | Botón +: elegir una venta sin factura y facturarla | `openSinFacturaPicker` L3249 | E (R3) |
| 4.4 | Asignación de folio consecutivo (una sola vez por venta) | `generarFactura` L3204 | E (R3) |
| 4.5 | Documento de factura: logo, datos del negocio, cliente, Nº, fecha, forma de pago, tabla de productos con descripción, "Tenga en cuenta", totales, pagado, saldo, tabla de pagos, sello PAGADA, firma, pie, fotos | `buildInvoiceHtml` L3279 | R |
| 4.6 | Imprimir / guardar PDF con el diálogo del navegador | `window.print`, CSS `@media print` L399 | I |
| 4.7 | Compartir PDF por WhatsApp (genera PDF con html2canvas + jsPDF desde internet; usa compartir del sistema o descarga y abre el chat) | `compartirFacturaPDF` L3467 | E (T15: falla sin conexión) |
| 4.8 | Editar factura: nombre/dirección/teléfono/correo del cliente, fecha, notas (no productos ni precios) | `openFacturaEdit` L3516 | I |
| 4.9 | Anular factura/venta: devuelve unidades al inventario y registra devoluciones | `anularVenta` L3633 | E (T11) |

## 5. Gastos

| # | Funcionalidad | Dónde | Verif. |
|---|---|---|---|
| 5.1 | Lista de gastos (📦 si es compra), categoría, fecha, monto | `renderGastos` L1576 | R |
| 5.2 | Búsqueda por descripción o categoría | L1579 | R |
| 5.3 | Nuevo gasto general: descripción, monto, fecha, categoría, medio (efectivo/tarjeta) | `openGastoForm` L2277 | E (T13) |
| 5.4 | Nueva compra de inventario: elegir producto existente o crear uno nuevo; cantidad, costo, fecha, precio y ganancia; recalcula costo promedio y stock | L2372–2580 | E (R5) |
| 5.5 | Editar gasto (aviso: en compras no ajusta stock ni costo) | L2283–2323 | I |
| 5.6 | Eliminar gasto (sin confirmación) | L2324 | E (T13) |

## 6. Créditos (dentro de Ajustes y de Clientes)

| # | Funcionalidad | Dónde | Verif. |
|---|---|---|---|
| 6.1 | Total por cobrar y lista de clientes deudores ordenada por deuda | `openCreditosAjustes` L3675 | E (T5, R1) |
| 6.2 | Deuda de un cliente: ventas pendientes, abonar cada una | `openCreditoCliente` L3713 | E (R1) |
| 6.3 | Abono a una venta a crédito: monto (se limita al saldo), fecha, nota, medio | `openAbonoForm` L559 | E (R1) |
| 6.4 | Liquidar toda la deuda de un cliente con un medio de pago | L3757–3784 | E (R1) |
| 6.5 | Recordatorio de deuda por WhatsApp | L3748 | I |

## 7. Reportes

| # | Funcionalidad | Dónde | Verif. |
|---|---|---|---|
| 7.1 | Resumen: ganancia del período (este mes, mes anterior, todo), comparación con el mes anterior | `renderReportes` L1813 | E (T9) |
| 7.2 | Movimiento: ventas, gastos totales, costo de lo vendido, compras, otros gastos | L1877–1886 | E (T1) |
| 7.3 | Histórico total: ventas, por cobrar, ganancia | L1888–1893 | R |
| 7.4 | Inventario: valor de costo en stock, productos con poco stock | L1895–1899 | R |
| 7.5 | Top 5 productos más vendidos del período (por unidades) | L1840–1863 | R |
| 7.6 | Caja diaria y mensual: ingresos efectivo/tarjeta, abonos de créditos, egresos (compras / otros), cierre neto | `renderCajaHtml` L1645 | E (T6, T11) |
| 7.7 | Caja diaria: lista de movimientos del día | L1654–1679 | R |
| 7.8 | Caja mensual: cierre de cada día | L1681–1704 | R |
| 7.9 | Flujo: dinero disponible hoy (efectivo y tarjeta), por cobrar (créditos y pendientes), flujo acumulado por mes | `renderFlujoHtml` L1742 | R |

## 8. Ajustes

| # | Funcionalidad | Dónde | Verif. |
|---|---|---|---|
| 8.1 | Menú con resumen de cada sección | `openSettings` L3875 | R |
| 8.2 | Usuario: foto de perfil, logo, nombre, dirección, teléfono, correo del negocio | `openSettingsUsuario` L3944 | R (guardar sin cambios) |
| 8.3 | Créditos (ver sección 6) | L3913 | E |
| 8.4 | Factura: título, pie (on/off), color, "Tenga en cuenta" (on/off y texto), mostrar dirección/teléfono/correo, tabla de pagos, sello PAGADA, fotos, firma dibujada con el dedo (on/off, borrar) | `openSettingsFactura` L3971 | R (guardar sin cambios) |
| 8.5 | Productos: ganancia por defecto %, límite general de poco stock | `openSettingsProductos` L4073 | R |
| 8.6 | Respaldo: descargar JSON con todos los datos | `openRespaldoAjustes` L3792 | I |
| 8.7 | Respaldo: restaurar desde archivo (valida forma mínima, pide confirmación, reemplaza) | L3828–3871 | E (T10, T14) |
| 8.8 | Moneda (símbolo) e impuesto % | `openSettingsVentas` L4091 | R |

## 9. Servicios transversales

| # | Funcionalidad | Dónde | Verif. |
|---|---|---|---|
| 9.1 | Guardado en `localStorage` (7 claves) | `load`/`save` L454–461 | E (T7) |
| 9.2 | Formato de dinero: símbolo, miles con punto, decimales con coma, siempre 2 decimales | `money` L494 | E |
| 9.3 | Fechas locales `AAAA-MM-DD` y formato "19 nov 2026" | L507–512 | E |
| 9.4 | Imágenes: se reducen a 300 px (productos, piezas) o 400 px (logo, perfil) en JPEG 85 %; máximo 15 MB de entrada | `resizeImageFile` L3559, `wireImagePicker` L3592 | I |
| 9.5 | Enlaces de WhatsApp: agrega el indicativo 57 a números colombianos de 10 dígitos que empiezan por 3 | `waUrl` L3628 | I |
| 9.6 | Descargas mediante `window.claude.use('downloads')` si existe (entorno de artifacts de Claude) o enlace normal | L3456, L3807 | I |
| 9.7 | Service worker: primero red, si falla usa la copia guardada | `sw.js` | E (T15) |

---

## Resumen de cobertura

| Área | Funcionalidades | Ejecutadas (E) | Solo abiertas (R) | Solo inspección (I) |
|---|---|---|---|---|
| Estructura | 9 | 1 | 6 | 2 |
| Clientes | 7 | 3 | 2 | 2 |
| Inventario | 15 | 2 | 7 | 6 |
| Ventas (lista, asistente y pendientes) | 36 | 19 | 7 | 10 |
| Facturas | 9 | 4 | 3 | 2 |
| Gastos | 6 | 3 | 2 | 1 |
| Créditos | 5 | 4 | 0 | 1 |
| Reportes | 9 | 3 | 6 | 0 |
| Ajustes | 8 | 2 | 5 | 1 |
| Transversales | 7 | 4 | 0 | 3 |
| **Total** | **111** | **45** | **38** | **28** |

**Funcionalidades que requieren prueba de ejecución antes de la Etapa 7** (marcadas I): importar contactos,
editar cliente, cálculo precio↔margen, ajuste de stock con motivo, eliminar producto, panel de poco stock,
búsqueda en historial, servicio libre, prenda a medida y validación de materiales, edición manual del total,
ganancia desplegable, abono a pedido/encargo, WhatsApp (todos), imprimir, editar factura, editar gasto,
descargar respaldo, imágenes, firma dibujada, tema oscuro.
Se incluirán en la batería de pruebas comparativas de las Etapas 7 y 10.
