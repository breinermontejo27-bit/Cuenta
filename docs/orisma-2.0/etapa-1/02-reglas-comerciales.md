# Orisma 2.0 · Etapa 1 · Documento 2
# Reglas comerciales

**Versión auditada:** commit `9300dfa`, `index.html`. `L123` = línea del archivo.

Este documento describe **lo que la app hace hoy**, no lo que debería hacer. Es el contrato que Orisma 2.0
debe respetar. Cuando una regla parece incorrecta o contradice a otra, se marca con **⚠ Observación** y remite
al Documento 4 (`D4-xx`). Ninguna de esas observaciones se corregirá sin autorización.

Verificación: **E** = comprobada ejecutando la app (ID de prueba entre paréntesis), **I** = solo leída en el código.

---

## 1. Modelo de datos

Todo se guarda en `localStorage`, en 7 claves con JSON:

| Clave | Contenido |
|---|---|
| `cuentas_clientes` | lista de clientes |
| `cuentas_inventario` | lista de productos |
| `cuentas_ventas` | lista de ventas (también son las facturas) |
| `cuentas_gastos` | lista de gastos (incluye compras de inventario y devoluciones) |
| `cuentas_movimientos` | ajustes, altas, bajas y devoluciones de inventario |
| `cuentas_pedidos` | pedidos, encargos y apartados |
| `cuentas_config` | configuración del negocio y contadores |

### 1.1 Cliente
`id`, `nombre` (obligatorio), `telefono`, `email`, `direccion`.

### 1.2 Producto
`id`, `nombre` (obligatorio), `categoria`, `descripcion` (sale en la factura), `costo`, `margen` (%),
`precio`, `stock` (número, o `''` = **sin control de stock**), `foto` (imagen en base64),
`stockMinimo` (número, o `''` = usar el general), `sinAlerta` (booleano).
Un producto creado desde una compra de Gastos solo tiene `id, nombre, categoria:'', costo, margen, precio, stock` (L2550).

### 1.3 Venta
| Campo | Significado |
|---|---|
| `id`, `creadoTs` | identificador y marca de tiempo de creación |
| `folio` | `null` hasta generar la factura; luego número consecutivo |
| `clienteId`, `clienteNombre`, `clienteDireccion`, `clienteTelefono`, `clienteEmail` | copia de los datos del cliente en el momento de la venta (la factura puede editarlos) |
| `items[]` | `productoId` (o `null` si es servicio/prenda a medida), `nombre`, `precio`, `cantidad`, `caracteristicas`, `foto`, `materiales[]` (`productoId`, `nombre`, `cantidad` por prenda) |
| `sumaItems` | Σ precio × cantidad |
| `descuentoTipo` | `'pct'` o `'monto'` |
| `descuentoPct`, `descuentoMonto` | descuento en % y en dinero |
| `subtotal` | ⚠ en ventas del asistente = suma − descuento; en ventas que vienen de un pedido = suma **sin** restar descuento (D4-17) |
| `impuesto`, `total` | impuesto en dinero y total cobrado |
| `costoTotal`, `gananciaEstimada` | costo de lo vendido y ganancia de la venta |
| `notas`, `fecha` | notas y fecha `AAAA-MM-DD` |
| `metodoPago` | `efectivo`, `tarjeta`, `credito` o `mixto` |
| `fiado` | `true` si queda saldo a crédito |
| `abonos[]` | pagos recibidos: `id`, `fecha`, `monto`, `metodo` (`efectivo`/`tarjeta`), `nota` |

No se guarda el costo de cada ítem, solo el total (`costoTotal`).

### 1.4 Gasto
`id`, `tipo` (`'general'`, `'compra'`, o **sin tipo** en gastos antiguos y en compras hechas desde el producto, D4-01),
`metodo` (`efectivo`/`tarjeta`; si falta se trata como efectivo), `descripcion`, `monto`, `fecha`, `categoria`,
y en compras: `productoId`, `cantidad`.

### 1.5 Movimiento de inventario
`id`, `tipo` (`ajuste`, `alta`, `baja`, `devolucion`), `ts`, `productoId`, `productoNombre`, `fecha`,
y según el tipo: `stockAnterior`, `stockNuevo`, `cantidad`, `motivo`.
Las ventas y compras **no** se guardan aquí: el historial las reconstruye a partir de ventas y gastos.

### 1.6 Pendiente (pedido / encargo / apartado)
`id`, `tipo` (`pedido` | `encargo` | `apartado`; si falta = pedido), `estado` (`pendiente` | `entregado` | `cancelado`),
`clienteId`, `clienteNombre`, `fechaEntrega` (vacía en apartados y opcional en encargos), `anticipo`,
`anticipoMetodo`, `fechaAnticipo`, `descuentoPct` (solo si se creó o editó desde el formulario de Pendientes),
`abonos[]`, `items[]` (`productoId` o `null`, `nombre`, `cantidad`, `precio`, `caracteristicas`, `costo`, y desde el asistente también `foto`, `materiales[]`),
`notas`, `creadoTs`, `canceladoFecha`.

### 1.7 Configuración
`nombre`, `moneda`, `impuesto`, `siguienteFolio`, `siguienteComprobante`, `direccion`, `telefono`, `email`,
`logo`, `fotoPerfil`, `margenDefault`, `stockMinimo`, `facturaTitulo`, `facturaPie`, `colorFactura`,
`tengaTexto`, `firmaImg`, y los interruptores `mostrarDireccion`, `mostrarTelefono`, `mostrarEmail`,
`mostrarTenga`, `mostrarPagos`, `mostrarFirma`, `mostrarPie`, `mostrarFotos`, `mostrarSello`.
Valores por defecto en `CONFIG_DEFAULTS` (L474): impuesto 0, folio 1, stockMinimo 3, título "FACTURA",
pie "Gracias por su compra", color `#1E4FA0`, todo visible salvo fotos.

---

## 2. Reglas generales

| ID | Regla | Dónde | Verif. |
|---|---|---|---|
| RG-01 | Identificadores: marca de tiempo en base 36 + 5 caracteres aleatorios. | L493 | I |
| RG-02 | Dinero: símbolo + espacio + signo + miles con punto + coma + 2 decimales (`$ 1.234,50`). Los valores se guardan sin redondear. | L494 | E |
| RG-03 | Fecha "de hoy" = fecha local del dispositivo. Todas las fechas se guardan como `AAAA-MM-DD`. | L507 | E |
| RG-04 | Folio visible: `F-` + número con 4 dígitos (`F-0007`). | varias | E (R3) |
| RG-05 | Un número de teléfono de 10 dígitos que empieza por 3 se considera colombiano y se le antepone `57` para WhatsApp. | L3628 | I |
| RG-06 | Nombre de cliente y de producto son los únicos campos obligatorios de sus formularios. | L1970, L2109 | I |

## 3. Productos e inventario

| ID | Regla | Dónde | Verif. |
|---|---|---|---|
| RI-01 | Un producto con `stock` vacío **no tiene control de stock**: nunca se descuenta, nunca se agota, no cuenta en unidades ni en valor del inventario. | L715, L751, L2623 | E |
| RI-02 | Precio sugerido = `costo × (1 + ganancia% / 100)`, con 2 decimales. Si se escribe el precio, ganancia% = `round((precio − costo) / costo × 100)`. Solo si costo > 0. | L2077 | I |
| RI-03 | Al crear un producto se propone la "ganancia por defecto" de Ajustes. | L2036, L2064 | I |
| RI-04 | Poco stock: producto con control de stock y `stock ≤ límite`. Límite = `stockMinimo` del producto o, si está vacío, el general (3 por defecto). Productos marcados "no avisar" quedan fuera. | L709–718 | I |
| RI-05 | Cambiar el stock a mano registra un movimiento "ajuste" (stock anterior, nuevo, motivo opcional). Un stock vacío cuenta como 0 para el ajuste. | L2125–2138 | I |
| RI-06 | Crear producto registra "alta"; eliminarlo registra "baja" con el stock que tenía. | L2140, L2161 | I |
| RI-07 | **Costo promedio ponderado** al comprar: si hay stock > 0 y costo > 0, `nuevoCosto = (stock × costo + cantidad × costoCompra) / (stock + cantidad)`; si no, el costo de la compra (o el anterior si la compra viene en 0). | L2205, L2461 | E (R5) |
| RI-08 | Al comprar, `stock = stock actual + cantidad` (un producto sin control de stock pasa a tenerlo, partiendo de 0). | L2255, L2564 | E (R5) |
| RI-09 | Al comprar se puede fijar un nuevo precio o ganancia%; si el producto ya tenía ganancia%, se recalcula el precio desde el nuevo costo; si no, se recalcula la ganancia desde el precio. | L2203, L2459 | E (R5) |
| RI-10 | La compra genera un gasto por `cantidad × costoCompra`. | L2262, L2569 | E (R5) |
| RI-11 | Valor del inventario = Σ stock × costo (solo productos con control). Valor a precio de venta = Σ stock × precio. | L752–754, L1834 | R |
| RI-12 | El historial de inventario se arma con: cada ítem vendido (−), cada compra tipo `compra` (+), ajustes (diferencia), altas, bajas y devoluciones (+). Muestra los 200 más recientes. | L655–707 | R |

### 3.1 Reservas por pendientes

| ID | Regla | Dónde | Verif. |
|---|---|---|---|
| RI-13 | Pedidos y apartados pendientes **reservan** sus unidades. Los materiales de prendas a medida de cualquier pendiente reservan `cantidad del material × cantidad de prendas`. | L850–858 | E (T12) |
| RI-14 | Los encargos pendientes reservan **solo si el stock libre alcanza** para el encargo completo, atendiéndolos por orden de creación; al primer encargo que no cabe, se deja de reservar para los siguientes. | L861–877 | I |
| RI-15 | Disponible para vender = `max(0, stock − reservadas)`; sin control de stock = ilimitado. | L2621 | E (T12) |
| RI-16 | El asistente impide vender o agregar más unidades que las disponibles, y valida los materiales de las prendas a medida. | L2920, L3090, L3136, L3057 | E (T12) |
| RI-17 | Al crear un pedido o apartado **desde el asistente** también se valida el disponible (los encargos no). | L2713 | I |
| ⚠ | **Observación:** el formulario de Pendientes (botón + en Pendientes) **no** valida stock. → D4-18 | L1110 | I |

## 4. Ventas

| ID | Regla | Dónde | Verif. |
|---|---|---|---|
| RV-01 | Toda venta exige un cliente registrado. | L2588 | I |
| RV-02 | Suma de productos = Σ precio unitario × cantidad. El precio unitario se puede cambiar en el carrito. | L2609 | E |
| RV-03 | Descuento: en % sobre la suma (0–100) o en monto (cuando se escribe el total a mano), nunca mayor que la suma. Se guardan ambos: `descuentoPct` (redondeado a 2 decimales) y `descuentoMonto`. | L2610–2617 | E (T3) |
| RV-04 | Base = suma − descuento. Impuesto = base × impuesto% de Ajustes. **Total = base + impuesto.** | L2618–2620 | E (T9) |
| RV-05 | Total escrito a mano: base = total / (1 + impuesto%); no puede superar la suma de productos; la diferencia pasa a ser descuento en monto. | L3114 | I |
| RV-06 | Costo de la venta = Σ costo × cantidad del carrito (costo del producto al agregarlo, o el costo escrito para servicios, o la suma de costos de materiales en prendas a medida). | L2873 | E (T9) |
| RV-07 | **Ganancia de la venta = base (sin impuesto) − costo.** | L2874 | E (T9) |
| RV-08 | Prenda a medida: precio por prenda = Σ precio de cada material × su cantidad; costo = Σ costo × cantidad. No se crea como producto. | L2989, L3046 | I |
| RV-09 | Al guardar se descuenta el stock de cada producto vendido y de cada material (`material × prendas`), sin bajar de 0, solo en productos con control. | L3155 | E (R1) |
| RV-10 | Pagos: **efectivo/tarjeta** → un pago por el total, `fiado = false`. **Crédito** → abono inicial opcional (máx. total) con su medio, `fiado = true` aunque el abono cubra todo. **Mixto** → efectivo (máx. total) + tarjeta (máx. lo que falta); si sobra saldo, `fiado = true`. | L2836–2852 | E (T9, R1, R2) |
| RV-11 | Los pagos se guardan como `abonos` con fecha de hoy. | L2840 | E |
| RV-12 | Se muestra una pantalla de confirmación antes de guardar. | L2791 | E |
| RV-13 | La factura es opcional y se puede generar después. | L3174 | E |
| RV-14 | Etiqueta de medio de pago en lista y factura: Efectivo / Tarjeta / A crédito / Mixto. | L549 | E |

## 5. Créditos y abonos de ventas

| ID | Regla | Dónde | Verif. |
|---|---|---|---|
| RC-01 | Abonado de una venta = Σ montos de sus abonos. | L555 | E (R1) |
| RC-02 | **Saldo de una venta = máx(0, total − abonado) si `fiado`; si no, 0.** | L556 | E (R1) |
| RC-03 | Deuda de un cliente = Σ saldo de sus ventas. Total por cobrar = Σ saldo de todas las ventas. | L557, L3673 | E (T5) |
| RC-04 | Un abono se limita en silencio al saldo pendiente; montos ≤ 0 no se aceptan. | L604–605 | E (R1) |
| RC-05 | Liquidar deuda: agrega a cada venta fiada del cliente un abono por su saldo, con fecha de hoy, nota "Liquidación" y el medio elegido. | L3772–3779 | E (R1) |
| RC-06 | Una venta pagada por completo sigue con `fiado = true` (aparece como "Pagado" en los créditos del cliente). | L1938 | E (R1) |

## 6. Pedidos, encargos y apartados

### 6.1 Tipos

| Tipo | Fecha | Reserva stock | Cuándo se entrega |
|---|---|---|---|
| Pedido | fecha de entrega obligatoria | sí | en la fecha |
| Encargo | llegada estimada opcional | solo si el stock alcanza (RI-14) | cuando llega el producto |
| Apartado | sin fecha | sí | solo cuando está pagado completo |

### 6.2 Reglas

| ID | Regla | Dónde | Verif. |
|---|---|---|---|
| RP-01 | Estado de un pedido según la fecha: vencido (antes de hoy), hoy, próximo, sin fecha. | L896 | R |
| RP-02 | Orden de la lista: pedidos por fecha (y luego por creación); encargos con fecha por fecha y sin fecha por creación; apartados por creación. | L932–943 | R |
| RP-03 | Al crear con anticipo > 0 se registra un abono (nota "Anticipo" o "Abono inicial") con su fecha y medio. | L1119, L2722 | E |
| RP-04 | Total en el **formulario** = (suma − descuento%) × (1 + impuesto%). Anticipo limitado al total. | L1071–1078 | E (T2) |
| RP-05 | Total en la **lista**, **detalle**, **abono a pedido**, **cancelación** y **flujo** = suma de productos, **sin descuento ni impuesto**. | L961, L1309, L1353, L1282, L1747 | E (T2) |
| RP-06 | Total de un **apartado** (lista y detalle) = suma × (1 + impuesto%), **sin descuento**. | L1422 | E (T2) |
| ⚠ | **Observación:** RP-04, RP-05, RP-06 y RP-10 calculan el total de un mismo pendiente de 3 formas distintas. → D4-02 | | |
| RP-07 | Abono a pedido/encargo: monto > 0, fecha obligatoria, no mayor al saldo (RP-05), medio efectivo/tarjeta. Si no había lista de abonos, el anticipo se convierte primero en abono. Después `anticipo = Σ abonos`. | L1306–1347 | I |
| RP-08 | Abono a apartado: mismas validaciones, saldo según RP-06. | L1509–1521 | E (T2) |
| RP-09 | Un apartado solo se puede entregar con saldo 0. | L1499, L1527 | E (T2) |
| RP-10 | **Entregar** crea una venta: suma de productos, descuento% guardado en el pendiente, impuesto actual de Ajustes, `total = (suma − descuento) × (1 + impuesto%)`; costo = costo **actual** del producto (o el costo escrito si no está en inventario); ganancia = base − costo; fecha = hoy; notas = notas + características. | L1164–1214 | E (T11) |
| RP-11 | Al entregar se verifica que haya stock (sin descontar las reservas de otros pendientes) y se descuenta stock de productos y materiales. | L1165–1177, L1215 | E (T11) |
| RP-12 | Al entregar, los abonos del pendiente pasan a la venta (con nuevos ids y sus fechas originales). Si "Pagó el saldo", se agrega un abono por el saldo con fecha de hoy. Si "Queda a crédito", la venta queda `fiado` con `metodoPago = 'credito'`. | L1194–1202 | E (T11) |
| RP-13 | Medio de la venta entregada: crédito si queda saldo; en apartados, el único medio usado o "mixto"; en pedidos, "mixto" si hubo anticipo y el saldo se pagó con algo distinto de efectivo; si no, el medio del saldo o efectivo. | L1198–1202 | I |
| RP-14 | El pendiente pasa a `entregado` y deja de reservar. | L1221 | E (T11) |
| RP-15 | **Cancelar**: el pendiente pasa a `cancelado` con fecha; lo abonado se devuelve como **gasto** categoría "Devolución", un gasto por medio de pago (efectivo y tarjeta por separado), con fecha de hoy. | L1266–1303 | E (R4) |
| RP-16 | El comprobante de abono usa su propio contador (`siguienteComprobante`), distinto al de facturas, y se incrementa **cada vez que se abre**. | L1237–1239 | E (T8) |
| RP-17 | El comprobante de un pedido/encargo muestra un único pago por el valor de `anticipo`; el de un apartado lista sus abonos. | L1234–1236 | I |

## 7. Facturas

| ID | Regla | Dónde | Verif. |
|---|---|---|---|
| RF-01 | Una venta recibe folio solo al pedir "Generar factura": `folio = siguienteFolio`, y el contador sube 1. Si ya tenía folio, no cambia. | L3204–3215 | E (R3) |
| RF-02 | Anular una factura no libera su número (el folio no se reutiliza). | L3663 | I |
| RF-03 | Editar factura cambia solo datos del cliente, fecha y notas; productos y precios no. | L3516 | I |
| RF-04 | Sello "PAGADA" cuando saldo = 0 (toda venta no fiada se considera pagada). | L3301–3302, L3360 | I |
| RF-05 | Descripción de cada ítem = características del ítem o, si no hay, la descripción del producto en inventario. | L3293 | I |
| RF-06 | Foto en la factura = foto del ítem o la foto actual del producto (si la opción está activa). | L3296 | I |
| RF-07 | Totales mostrados: suma de productos, descuento (con % si fue en %), impuesto, gran total, pagado, saldo (si fiada). | L3349–3356 | R |
| RF-08 | Texto al compartir: "Factura NNNN de {negocio}. Total: $X[. Saldo pendiente: $Y]." | L3498 | I |

## 8. Anulación de ventas

| ID | Regla | Dónde | Verif. |
|---|---|---|---|
| RA-01 | Anular **borra** la venta (y con ella sus abonos). | L3663 | E (T11) |
| RA-02 | Devuelve al stock las unidades vendidas y los materiales (solo productos que aún existen y con control) y registra movimientos "devolucion". | L3649–3662 | E (T11) |
| RA-03 | No registra devolución de dinero (a diferencia de cancelar un pendiente, RP-15). El pendiente de origen, si lo hubo, sigue "entregado". | — | E (T11) |
| ⚠ | **Observación:** RA-01 + RA-03 cambian hacia atrás la caja de días ya cerrados. → D4-08 | | |

## 9. Gastos

| ID | Regla | Dónde | Verif. |
|---|---|---|---|
| RG-07 | Gasto general: descripción obligatoria; monto, fecha, categoría y medio libres (monto 0 o negativo se acepta). | L2514–2528 | E (T13) |
| RG-08 | Compra de inventario desde Gastos: producto existente o nuevo; cantidad > 0 obligatoria; aplica RI-07 a RI-10; el gasto lleva `tipo: 'compra'`, `productoId`, `cantidad`, categoría "Inventario". Producto nuevo: precio = el escrito o, si no, el costo. | L2531–2580 | E (R5) |
| RG-09 | Editar un gasto de compra no ajusta stock ni costo (lo advierte); eliminarlo tampoco. | L2286 | I |

## 10. Caja (Reportes › Caja)

Un mismo cálculo (`cajaResumen`, L1608) sirve para el día, el mes, cada día del mes y el flujo.

| ID | Regla | Dónde | Verif. |
|---|---|---|---|
| RK-01 | **Ingresos** = todos los abonos de ventas con fecha en el rango (efectivo o tarjeta según su medio; un medio desconocido cuenta como efectivo). | L1610–1616 | E (T6, T11) |
| RK-02 | Ventas antiguas sin abonos y no fiadas cuentan su total como efectivo en su fecha. | L1617 | I |
| RK-03 | Más los abonos de pendientes **pendientes o cancelados** en el rango (los entregados ya están en la venta). Si un pendiente no tiene lista de abonos, su `anticipo` cuenta como efectivo en `fechaAnticipo`. | L1621–1629 | E (T6) |
| RK-04 | "Abonos de créditos" = parte de los ingresos que viene de ventas fiadas (incluye el abono inicial). | L1615 | I |
| RK-05 | **Egresos** = todos los gastos del rango; "compras" = los de tipo `compra`; "otros" = el resto. | L1632–1636 | E (T1) |
| RK-06 | Cierre neto = ingresos − egresos. Efectivo en caja = ingresos en efectivo − gastos en efectivo; igual para tarjeta. | L1637–1641 | E |
| RK-07 | Los ingresos se cuentan el día en que se recibe el dinero, no el día de la venta (criterio de caja). | — | E (T11) |

## 11. Flujo (Reportes › Flujo)

| ID | Regla | Dónde | Verif. |
|---|---|---|---|
| RL-01 | Dinero disponible hoy = efectivo en caja + tarjeta en caja de **toda la historia**. | L1743–1744 | I |
| RL-02 | Por cobrar = Σ saldos de ventas fiadas + Σ (suma de productos − abonado) de pendientes pendientes (sin descuento ni impuesto, ver D4-02). | L1745–1750 | I |
| RL-03 | Flujo por mes: entradas, salidas, efectivo y tarjeta del mes; el número del mes es el acumulado hasta ese mes. | L1751–1761 | I |

## 12. Reportes › Resumen (ganancia)

| ID | Regla | Dónde | Verif. |
|---|---|---|---|
| RR-01 | Períodos: este mes, mes anterior, todo. Las ventas cuentan por su fecha (criterio de devengo: cuentan aunque no estén pagadas). | L1824–1828 | E (T9) |
| RR-02 | **Ganancia del período = Σ total de ventas − Σ costo de lo vendido − otros gastos** (gastos que no son compras). Las compras de inventario no restan hasta que se venden. | L1804–1811 | E (T9) |
| ⚠ | **Observación:** RR-02 usa el **total con impuesto**; RV-07 usa la base sin impuesto. Con impuesto 19 %, Reportes muestra $59 de ganancia donde la venta dice $40. → D4-05 | | E (T9) |
| ⚠ | **Observación:** las compras hechas desde el producto quedan sin `tipo`, así que cuentan como "otros gastos" y sí restan de la ganancia. → D4-01 | | E (T1) |
| RR-03 | Comparación con el mes anterior: diferencia de ganancias; si el mes anterior no tiene ventas ni gastos, se dice "Sin datos". | L1846–1853 | I |
| RR-04 | Top 5 productos del período por unidades vendidas, agrupados por **nombre**. | L1840–1842 | R |

## 13. Respaldo

| ID | Regla | Dónde | Verif. |
|---|---|---|---|
| RB-01 | Formato: `{ app: 'cuentas', version: 2, fecha, datos: { clientes, inventario, ventas, gastos, movimientos, pedidos, config } }`. Nombre: `cuentas-respaldo-AAAA-MM-DD.json`. | L3806 | I |
| RB-02 | Para restaurar, el archivo debe tener `datos.clientes`, `datos.inventario`, `datos.ventas` y `datos.gastos` como listas; `pedidos` y `movimientos` son opcionales. | L3835 | E (T10, T14) |
| RB-03 | Restaurar reemplaza las seis listas; la configuración se **mezcla** (las claves que no vienen en el archivo se conservan). | L3849–3856 | E (T14) |
| RB-04 | Restaurar pide confirmación mostrando cuántos clientes, productos, ventas y gastos trae. | L3839 | E |

## 14. Mensajes de WhatsApp

| Caso | Texto | Dónde |
|---|---|---|
| Apartado | "Hola {cliente}, te escribimos de {negocio} para recordarte el saldo de tu apartado.[ Saldo pendiente: $X.] Cuando quieras lo completamos. ¡Gracias!" | L1157 |
| Encargo | "Hola {cliente}, te escribimos de {negocio}: tu encargo ya llegó.[ Saldo pendiente: $X.] ¿Cuándo te lo podemos entregar? ¡Gracias!" | L1159 |
| Pedido | "Hola {cliente}, te recordamos tu pedido[ para el {fecha}] en {negocio}.[ Saldo pendiente: $X.] ¡Gracias!" | L1160 |
| Deuda | "Hola {cliente}, tienes un saldo pendiente de $X en {negocio}. ¡Gracias!" | L3749 |
| Factura | ver RF-08 | L3498 |

Si el cliente no tiene teléfono, los recordatorios de pendientes avisan y no abren WhatsApp; el de deuda abre WhatsApp sin número.

---

## 15. Decisiones que requieren autorización del dueño

Estas reglas son contradictorias o dudosas. Orisma 2.0 **las conservará tal cual** salvo que se autorice cambiarlas.
El detalle y la recomendación de cada una están en el Documento 4.

| # | Pregunta | Ref. |
|---|---|---|
| 1 | ¿El total de un pendiente debe incluir siempre descuento e impuesto (como al entregarlo)? | D4-02 |
| 2 | ¿El descuento del asistente debe guardarse también en pedidos, encargos y apartados? | D4-03 |
| 3 | ¿La ganancia de Reportes debe excluir el impuesto (igual que la ganancia de cada venta)? | D4-05 |
| 4 | ¿Las compras hechas desde el producto deben registrarse como compras de inventario (igual que desde Gastos)? | D4-01 |
| 5 | ¿Anular una venta debe registrar la devolución del dinero recibido en vez de borrar los pagos? | D4-08 |
| 6 | ¿El comprobante de abono debe conservar su número en vez de tomar uno nuevo cada vez que se abre? | D4-07 |
| 7 | ¿El formulario de Pendientes debe validar stock como lo hace el asistente? | D4-18 |
| 8 | ¿Se puede eliminar un cliente que tiene deudas o pendientes? | D4-06 |
| 9 | ¿Restaurar un respaldo debe reemplazar toda la configuración? | D4-14 |
