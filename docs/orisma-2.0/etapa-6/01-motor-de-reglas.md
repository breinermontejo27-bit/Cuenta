# Orisma 2.0 · Etapa 6 · Motor de reglas comerciales

`src/business/`: **101 funciones puras** en 11 archivos (≈1.200 líneas). No leen ni guardan datos, no tocan la
pantalla y no consultan el reloj: reciben todo (incluida la fecha de hoy, los ajustes y un generador de
identificadores) y devuelven resultados nuevos sin modificar lo que reciben. Por eso se pueden probar solas y
comparar con la versión original.

Cada función indica en su comentario la regla que implementa (`RV-04`, `RP-10`…, Etapa 1, Documento 2) y la línea
del `index.html` original de donde viene.

## 1. Una sola fuente de verdad

| Cálculo | Antes (versión original) | Ahora |
|---|---|---|
| Costo promedio ponderado | 3 copias | `costoPromedio` |
| Reservas de un producto | 2 bucles iguales | `reservadoSinEncargos` (usado por `unidadesReservadas`) |
| "Abonos o anticipo como abono" | 5 variantes | `abonosConAnticipo` (+ las dos variantes que sí difieren en resultado, dentro de `abonarPendiente` y `entregarPendiente`) |
| Descontar stock (venta y entrega) | 2 formas | `descontarStock` + `cantidadesNecesarias` |
| ¿Tiene control de stock? | 12 comparaciones repartidas | `tieneControlStock` |
| Saldo, deuda, total por cobrar | repetidos en 6 pantallas | `payments.js` |
| Caja (día, mes, cada día, flujo) | 1 función + 3 bucles parecidos | `resumenCaja`, `movimientosDelDia`, `diasConMovimiento`, `flujo` |

## 2. Reglas provisionales (esperan decisión del dueño)

Se conservan **tal cual** funcionan hoy, aisladas y con nombre propio. Si se autoriza cambiarlas, se cambia una
función y su prueba.

| Decisión (Etapa 1, Doc. 2 §15) | Dónde está hoy |
|---|---|
| 1 · Total de un pendiente | `totalFormularioPendiente`, `totalApartado`, `sumaPendiente`, `saldoDetallePendiente` (`orders-rules.js`) |
| 2 · Descuento del asistente en pendientes | `pendienteDesdeAsistente` no lo guarda |
| 3 · Ganancia con o sin impuesto | `gananciaDe` usa el total con impuesto (`accounting.js`) |
| 4 · Compras desde el producto | `compraDesdeProducto` (sin tipo) vs. `compraDesdeGastos` (`inventory-rules.js`) |
| 5 · Anular venta sin devolución de dinero | `anularVenta` (`sales-rules.js`) |
| 6 · Número de comprobante al abrir | `siguienteComprobante` (`invoicing.js`) |
| 7 · Validar stock en el formulario de pendientes | `guardarPendienteFormulario` no lo valida |
| 8 · Eliminar clientes con deuda | sin regla (se decide en la operación, Etapa 7) |
| 9 · Ajustes al restaurar | `data/backup.js` (mezcla) |

También se conservan: el descuento de anticipo editado (D4-09, `guardarPendienteFormulario`), la verificación de
stock al entregar sin descontar reservas de otros pendientes (D4-15, `faltanteParaEntregar`) y el medio "Efectivo"
cuando el anticipo fue con tarjeta y el saldo en efectivo (D4-20).

## 3. Diferencias con la versión original

Solo **dos**, y solo con datos que la app nunca produce. Las dos están probadas (`tests/business/reglas.test.js`),
mostrando qué hacía la original:

| # | Caso | Original | Orisma |
|---|---|---|---|
| 1 | Producto sin el campo `stock` (no se crea así; solo podría venir de un respaldo editado a mano) | operaciones con `NaN`: el stock queda `null` | se trata como "sin control de stock" |
| 2 | Totales o montos guardados como texto (mismo origen) | `'100' + '50'` = `'010050'` en Reportes | se suman como números |

## 4. Cómo se comprobó que calcula igual

| Método | Qué cubre | Resultado |
|---|---|---|
| **Oráculo**: 33 funciones de cálculo copiadas **literalmente** del commit `9300dfa` (`tests/business/original/`), comparadas sobre **400 conjuntos de datos aleatorios** + 400 enfocados en encargos | saldos, deudas, reservas, poco stock, historial, estado y totales de pendientes, entregas, comprobantes, caja diaria/mensual, flujo, Reportes (3 períodos) y pantalla Stock | 16/16 pruebas |
| Prueba de copia literal | cada función del oráculo es idéntica a la original y está en la línea indicada | 1/1 (y detecta un cambio de un carácter) |
| **Navegador**: la app original operada con clics reales, comparando lo que guarda con lo que calculan las reglas | 30 ventas aleatorias (productos, cantidades, precio editado, descuento % o total escrito, 4 medios de pago, impuesto 0 o 19 %), abonos y liquidación, 4 compras desde el producto, 3 desde Gastos, alta y edición de producto, pedido/encargo/apartado (crear, abonar —incluido el rechazo por exceso—, cancelar), edición del anticipo, pedido desde el asistente y su entrega, prenda a medida y su anulación, factura, gastos y clientes | 46/46 |
| **Pruebas de mutación**: errores introducidos a propósito en las reglas | 12 en las pruebas de Node y 2 en las de navegador | 14/14 detectados |
| Valores conocidos de la auditoría (R1, R2, R5, T2, T9, descuentos, reservas) y las 2 diferencias de borde | casos concretos | 9/9 |

Para repetir: `npm test` (Node) y `node tests/e2e/reglas.e2e.cjs` (navegador, necesita Playwright y git).

## 5. Cómo cambiar una regla autorizada

1. Cambiar la función en `src/business/` y su comentario (regla y motivo).
2. Ajustar o agregar el caso en `tests/business/reglas.test.js`.
3. La prueba diferencial correspondiente fallará a propósito: se anota la diferencia autorizada en la prueba
   (nunca se edita el oráculo).

## 6. Catálogo

### `numbers.js`
Números: conversión segura y sumas. Base de todas las reglas.

| Función | Qué hace |
|---|---|
| `num` | Número o 0 (equivale a `Number(x) // 0` de la versión original). |
| `sumar` | Suma de `fn(elemento)` sobre una lista (lista ausente = 0). |
| `limitar` | Limita un número entre mínimo y máximo. |

### `dates.js`
Fechas del negocio (AAAA-MM-DD). Sin formato visual: eso está en ui/format.js.

| Función | Qué hace |
|---|---|
| `mesDe` | Mes de una fecha: "2026-11-19" → "2026-11" (monthKey, L512). |
| `mesAnterior` | Mes anterior al de hoy (mesAnteriorKey, L1800). |

### `payments.js`
Abonos, saldos y créditos de ventas (Etapa 1, Documento 2 §5: RC-01 … RC-06).

| Función | Qué hace |
|---|---|
| `abonadoVenta` | RC-01 · Total abonado a una venta (abonadoVenta, L555). |
| `saldoVenta` | RC-02 · Saldo de una venta: solo las fiadas tienen saldo (saldoVenta, L556). |
| `deudaCliente` | RC-03 · Deuda de un cliente (clienteSaldo, L557). |
| `totalPorCobrar` | RC-03 · Total por cobrar de todas las ventas (totalPorCobrarAll, L3673). |
| `deudores` | Clientes con deuda, de mayor a menor (openCreditosAjustes, L3676). Solo clientes que existen. |
| `ventasConSaldo` | Ventas con saldo de un cliente, de la más antigua a la más nueva (openCreditoCliente, L3716). |
| `ventasFiadasCliente` | Ventas fiadas de un cliente, de la más nueva a la más antigua (formulario de cliente, L1929). |
| `abonarVenta` | RC-04 · Abono a una venta a crédito (openAbonoForm, L602–616). El monto se limita en silencio al saldo; un monto ≤ 0 no se acepta. |
| `liquidarDeuda` | RC-05 · Liquidar la deuda de un cliente: un abono por el saldo de cada venta fiada (L3772–3779). |

### `inventory-rules.js`
Inventario: stock, poco stock, reservas, costo promedio, precio y ganancia, compras, historial

| Función | Qué hace |
|---|---|
| `tieneControlStock` | RI-01 · ¿El producto controla stock? (stock vacío = sin control; ver "diferencias de borde" en la documentación). |
| `stockDe` | Stock como número, o null si no tiene control. |
| `categorias` | Categorías distintas, en orden alfabético (getCategorias, L645). |
| `umbralStock` | RI-04 · Límite de poco stock del producto, o null si no avisa (umbralStock, L709). |
| `esPocoStock` | RI-04 · ¿Está en poco stock? (esPocoStock, L714). |
| `pocoStock` | Productos en poco stock (de menor a mayor stock) y productos sin aviso (openPocoStock, L724–725). |
| `reservadoSinEncargos` | RI-13 · Reservado por pedidos y apartados pendientes (y por materiales de cualquier pendiente) (L850). |
| `reservadoPorEncargos` | RI-14 · Un encargo aparta sus unidades solo si el stock libre alcanza, por orden de creación (L861). |
| `unidadesReservadas` | RI-13 + RI-14 · Unidades reservadas de un producto (unidadesReservadas, L878). |
| `disponible` | RI-15 · Disponible para vender: stock − reservadas, o Infinity sin control de stock (stockMax, L2621). |
| `mensajeSinStock` | Mensaje cuando no alcanza el disponible (sinStockMsg, L2626). |
| `cantidadesNecesarias` | Unidades que necesitan unos ítems, por producto: el producto mismo + cada material × cantidad de prendas. |
| `validarMateriales` | RI-16 · Valida que alcance el disponible para los materiales (validarMateriales, L3057). Devuelve '' o el mensaje. |
| `descontarStock` | Descuenta unidades del stock (venta L3155–3163 y entrega L1215–1219). Nunca baja de 0; sin control de stock no cambia. |
| `precioDesdeMargen` | RI-02 · Precio sugerido desde costo y ganancia % (2 decimales). null si no aplica. Formulario de producto (L2081): exige ganancia distinta de 0. Formularios de compra (L2229, L2481): no la exigen. |
| `margenDesdePrecio` | RI-02 · Ganancia % desde costo y precio (redondeada). null si no hay costo (L2084). |
| `gananciaUnitaria` | Ganancia por unidad y % sobre el costo, como en la lista de productos (L815–817). null si no hay costo. |
| `costoPromedio` | RI-07 · Costo promedio ponderado tras una compra (calcularNuevoCosto, L2205). |
| `compraDesdeProducto` | RI-07 … RI-10 · Compra registrada desde el PRODUCTO (openCompraForm, L2249–2268). Conserva el comportamiento actual: el gasto no lleva tipo, medio, producto ni cantidad (D4-01, decisión 4 pendiente). |
| `compraDesdeGastos` | RI-07 … RI-10, RG-08 · Compra registrada desde GASTOS, de un producto existente o nuevo (L2531–2580). |
| `guardarProducto` | Guarda un producto desde su formulario (L2107–2144). Los valores del formulario llegan como texto. |
| `movimientoBaja` | RI-06 · Movimiento de baja al eliminar un producto (L2161). |
| `comprasDeProducto` | Historial de compras de un producto (L1999–2002). |
| `resumenStock` | RI-11 · Resumen de stock (renderStockHtml, L749–760). |
| `historialInventario` | RI-12 · Historial de inventario: ventas (−), compras (+), ajustes, altas, bajas y devoluciones (movimientosInventario, L655). Devuelve datos; el texto lo arma la pantalla. |
| `variacionHistorial` | Variación de unidades que muestra el historial para cada evento (qty, L691–698). |

### `sales-rules.js`
Ventas: totales, descuento, impuesto, costo, ganancia, pagos, armado de la venta y anulación

| Función | Qué hace |
|---|---|
| `sumaCarrito` | RV-02 · Suma de productos (sumaItems, L2609). |
| `totalesVenta` | RV-03, RV-04 · Totales de la venta (L2610–2620). |
| `descuentoPorcentaje` | RV-03 · Descuento escrito en % (se limita a 0–100) (L3110–3111). |
| `descuentoDesdeTotal` | RV-05 · Total escrito a mano → descuento en monto (L3114–3126). |
| `costoCarrito` | RV-06 · Costo del carrito (L2873). |
| `gananciaVenta` | RV-07 · Ganancia estimada = base sin impuesto − costo (L2874). |
| `margenSobreCosto` | Margen sobre el costo para el panel de ganancia, o null si no hay costo (L2879). |
| `prendaAMedida` | RV-08 · Prenda a medida: agrupa materiales repetidos, precio = Σ precio × cantidad (sin agrupar), costo = Σ costo × cantidad (L2989–2992, L3040–3047). |
| `faltantesPrenda` | Faltantes del formulario de prenda a medida (L3028–3035). Lista vacía si está completo. |
| `pagosVenta` | RV-10, RV-11 · Pagos según el medio (calcPagos, L2836–2852). |
| `saldoACredito` | Saldo que queda a crédito según lo escrito (updateRest, L2782–2789). |
| `construirVenta` | Arma la venta del asistente (L3141–3153). Los ids de los pagos se generan antes que el de la venta, como en la original. |
| `unidadesDeVenta` | RV-09 · Unidades a descontar del inventario por una venta (productos + materiales). |
| `anularVenta` | RA-01 … RA-03 · Anular una venta (anularVenta, L3649–3663): devuelve unidades y materiales al stock (solo productos que existen y controlan stock) y registra movimientos "devolucion". La venta se borra; no se registra devolución de dinero (comportamiento actual; D4-08, decisión 5 pendiente). |
| `unidadesVendidas` | Unidades de una venta (texto de confirmación de anulación, L3636). |
| `filtrarVentas` | Lista de ventas para la pantalla: búsqueda por cliente o "f<folio>", más recientes primero (L1555–1557). |

### `orders-rules.js`
Pendientes: pedidos, encargos y apartados (Etapa 1, Documento 2 §6: RP-01 … RP-17).

| Función | Qué hace |
|---|---|
| `NOMBRE_TIPO` | Nombre de cada tipo de pendiente en los textos. |
| `tipoDe` | Tipo de un pendiente (sin tipo = pedido, como en la versión original). |
| `sumaPendiente` | RP-05 · Suma de productos de un pendiente, sin descuento ni impuesto (provisional, ver arriba). |
| `totalApartado` | RP-06 · Total de un apartado: suma × (1 + impuesto %), sin descuento (apartadoTotal, L1422; provisional). |
| `abonadoPendiente` | Total abonado según la lista de abonos (apartadoAbonado, L1426). |
| `totalFormularioPendiente` | RP-04 · Resumen del formulario: subtotal, descuento %, total con impuesto, anticipo (limitado al total) y saldo (L1071–1079). |
| `abonosConAnticipo` | Abonos de un pendiente; si no tiene lista pero sí anticipo, el anticipo cuenta como un abono en efectivo en su fecha (patrón repetido en la versión original: L1267, L1623, L1668). |
| `estadoPorFecha` | RP-01 · Estado de un pedido según su fecha de entrega (pedidoEstadoInfo, L896). |
| `agruparPendientes` | RP-02 · Pendientes agrupados y ordenados como en la lista (renderPedidosHtml, L921–943). |
| `saldoDetallePendiente` | Saldo que muestra el detalle de un pedido/encargo: suma − anticipo (L1369; provisional, D4-02). |
| `costoPendiente` | RP-10 · Costo de un pendiente: costo actual del producto, o el escrito si no está en inventario (costoPedido, L1145). |
| `itemDeFormulario` | Ítem agregado en el formulario de pendientes (L1086–1099). El producto se busca por nombre exacto (sin mayúsculas). |
| `guardarPendienteFormulario` | RP-03 · Guarda un pendiente desde su formulario (L1110–1135). Conserva el comportamiento actual: al editar, si ya tiene abonos se conservan y `anticipo` toma el valor escrito (D4-09). |
| `pendienteDesdeAsistente` | Pendiente creado desde el asistente de venta (guardarPendiente, L2720–2736). Conserva el comportamiento actual: no guarda el descuento del asistente (D4-03, decisión 2 pendiente). |
| `abonarPendiente` | RP-07 · Abono a un pedido o encargo (registrarAbonoPedido, L1306–1342). Si aún no tenía lista de abonos, el anticipo pasa a ser el primero. El saldo se calcula con la suma sin descuento ni impuesto (provisional). |
| `abonarApartado` | RP-08 · Abono a un apartado (L1509–1516). Saldo según el total del apartado (provisional). |
| `saldoApartado` | RP-09 · Saldo de un apartado; solo se entrega con saldo 0. |
| `faltanteParaEntregar` | RP-11 · Primer producto sin stock suficiente para entregar (no descuenta reservas de otros; D4-15). null si alcanza. |
| `entregarPendiente` | RP-10, RP-12 … RP-14 · Entregar un pendiente (entregarPedido, L1164–1224): crea la venta, descuenta stock y marca el pendiente como entregado. El total usa el descuento guardado y el impuesto ACTUAL de los ajustes. |
| `cancelarPendiente` | RP-15 · Cancelar: lo abonado se devuelve como gasto "Devolución", uno por medio de pago (L1266–1297). |
| `mensajeRecordatorio` | Recordatorio de un pendiente por WhatsApp (avisarPendienteWA, L1155–1160). |

### `invoicing.js`
Facturas y comprobantes (Etapa 1, Documento 2 §7: RF-01 … RF-08, RP-16, RP-17).

| Función | Qué hace |
|---|---|
| `asignarFolio` | RF-01 · Asigna folio si la venta no lo tiene; el contador sube 1 (generarFactura, L3204–3211). |
| `siguienteComprobante` | RP-16 · Número para un comprobante de abono. Conserva el comportamiento actual: se consume uno nuevo cada vez que se abre un comprobante (D4-07, decisión 6 pendiente). |
| `comprobanteDeAbono` | RP-17 · Documento "Comprobante de abono" de un pendiente (comprobanteDeAbono, L1230–1244). |
| `datosDocumento` | RF-04 … RF-07 · Datos calculados para dibujar una factura o comprobante (buildInvoiceHtml, L3279–3304). |
| `textoCompartirFactura` | RF-08 · Texto al compartir la factura (L3497–3498). `dinero` formatea montos. |
| `editarFactura` | RF-03 · Editar factura: solo datos del cliente, fecha y notas (L3540–3550). |
| `filtrarFacturas` | Lista de facturas: con folio, búsqueda por cliente, "f12" o "0012", de mayor a menor folio (L3222–3226). |
| `ventasSinFactura` | Ventas sin factura, más recientes primero (openSinFacturaPicker, L3250–3252). |

### `accounting.js`
Caja, flujo de dinero y ganancia (Etapa 1, Documento 2 §10–12: RK-01 … RK-07, RL-01 … RL-03, RR-01 … RR-04).

| Función | Qué hace |
|---|---|
| `resumenCaja` | RK-01 … RK-06 · Resumen de caja para un rango de fechas (cajaResumen, L1608–1643). |
| `rangoDia` | Rango de un día (para resumenCaja). |
| `rangoMes` | Rango de un mes AAAA-MM (para resumenCaja). |
| `movimientosDelDia` | Movimientos de caja de un día, en el orden de la versión original (L1655–1671). Datos sin formato: tipo 'venta' / 'abono-credito' / 'venta-anterior' / 'abono-pendiente' / 'gasto'. |
| `diasConMovimiento` | Días de un mes con ventas, abonos de ventas o gastos (cierre de cada día, L1683–1689). |
| `flujo` | RL-01 … RL-03 · Flujo: dinero disponible, por cobrar y acumulado por mes (renderFlujoHtml, L1742–1761). Por cobrar de pendientes usa la suma sin descuento ni impuesto (provisional, D4-02). |
| `gananciaDe` | RR-02 · Ganancia = ventas − costo de lo vendido − otros gastos (gananciaDe, L1804). Conserva el comportamiento actual: "ventas" usa el total CON impuesto (D4-05, decisión 3 pendiente). |
| `masVendidos` | RR-04 · Los 5 productos más vendidos por unidades, agrupados por nombre (L1840–1842). |
| `resumenReportes` | RR-01 … RR-04 · Resumen de Reportes (renderReportes, L1824–1853). |

### `clients-rules.js`
Clientes (formulario y lista, L624–643, L1968–1981).

| Función | Qué hace |
|---|---|
| `guardarCliente` | Guarda un cliente desde su formulario. Nombre obligatorio (RG-06). |
| `filtrarClientes` | Búsqueda por nombre, en el orden en que se registraron (L626). |

### `expenses-rules.js`
Gastos generales (Etapa 1, Documento 2 §9: RG-07, RG-09). Las compras de inventario están en inventory-rules.js.

| Función | Qué hace |
|---|---|
| `gastoGeneral` | RG-07 · Gasto general nuevo (L2514–2524). Solo la descripción es obligatoria; el monto se acepta como venga. |
| `editarGasto` | RG-09 · Editar un gasto (L2309–2318). Si es una compra, no cambia stock ni costo. |
| `filtrarGastos` | Lista de gastos: búsqueda en descripción o categoría, más recientes primero (L1578–1580). |

### `validation.js`
Mensajes de validación comerciales (Etapa 2, §6). Las reglas devuelven { ok: false, campo } o un código de error;

| Función | Qué hace |
|---|---|
| `MENSAJES` | Texto para cada campo o código de error. |
| `mensajeAbono` | Mensaje para un error de abono de pendiente (L1339, L1514). `dinero` formatea el saldo. |
