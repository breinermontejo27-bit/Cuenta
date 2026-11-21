# Etapa 10 · Matriz de cobertura: cada función de la app original y la prueba que la comprueba

Las 111 funciones del inventario de la Etapa 1 (`etapa-1/01-inventario-funcionalidades.md`). **Todas las pruebas
citadas se ejecutan** (no son revisiones de código). Las que dicen MOD, REG, INT, DAT y DIF comparan contra la
app original (commit `9300dfa`).

| Sigla | Prueba | Qué hace |
|---|---|---|
| NUC | `tests/e2e/nucleo.e2e.cjs` | marco, navegación, hojas, avisos, teléfono y computador |
| DAT | `tests/e2e/datos.e2e.cjs` | importación, respaldos en ambos sentidos con la original, transacciones |
| REG | `tests/e2e/reglas.e2e.cjs` | 46 operaciones reales hechas en las dos apps; se comparan los datos guardados |
| MOD-1…9 | `tests/e2e/modulos.e2e.cjs` | 9 escenarios con clics en las dos apps (1 clientes y créditos, 2 productos, 3 gastos, 4–6 ventas, 7 pendientes, 8 asistente y facturas, 9 ajustes) |
| SEG | `tests/e2e/seguridad.e2e.cjs` | inyección de código, respaldos manipulados, PIN, sin conexión |
| MIG | `tests/e2e/migracion.e2e.cjs` | paso real desde la app instalada, cambios posteriores, limpieza de fotos, listas largas |
| INT | `tests/e2e/integral.e2e.cjs` | **pantalla contra pantalla con la original**: R reportes (12 conjuntos), B búsquedas, W mensajes de WhatsApp |
| FUN | `tests/e2e/funciones.e2e.cjs` | G funciones sin prueba propia (G1–G15), S1 estrés de 600 operaciones |
| DIF / U | `tests/business/*.test.js`, `tests/core/*.test.js` | reglas contra el oráculo literal de la original (400 + 400 conjuntos) y unidades |

| # | Función | Comprobada con |
|---|---|---|
| 0.1 | Seis pestañas: Clientes, Inventario, Ventas, Facturas, Gastos, Reportes | NUC |
| 0.2 | Encabezado con nombre del negocio y foto de perfil (o logo, o iniciales) | NUC, SEG-A2 |
| 0.3 | Buscador por pestaña con texto de ayuda propio; oculto en Reportes | NUC, INT-B |
| 0.4 | Botón "+" que hace algo distinto según la pestaña; oculto en Reportes y en Inventario › Stock/Historial | NUC |
| 0.5 | Botón de ajustes (engranaje) | NUC |
| 0.6 | Hojas emergentes ("overlay") que se cierran tocando fuera | NUC |
| 0.7 | Tema oscuro automático según el teléfono | FUN-G1 |
| 0.8 | Diseño de una columna de máximo 560 px (en computador queda angosto y centrado) | NUC (computador: barra lateral, rediseño aprobado en Etapa 3), FUN-G13 (320 px) |
| 0.9 | Instalable como app (PWA) y funciona sin conexión | SEG-E1, MIG-M1…M4 |
| 1.1 | Lista de clientes con teléfono/correo y etiqueta "Debe $X" si tiene saldo | MOD-1, SEG-A2, DIF-RC |
| 1.2 | Búsqueda por nombre | INT-B |
| 1.3 | Crear cliente: nombre (obligatorio), teléfono, correo, dirección de facturación | MOD-1 |
| 1.4 | Editar cliente | MOD-1 |
| 1.5 | Importar desde los contactos del teléfono (solo navegadores con Contact Picker API) | FUN-G2 |
| 1.6 | Ver créditos del cliente (ventas fiadas, abonado, saldo) y abrir el abono de cada una | MOD-1, REG |
| 1.7 | Eliminar cliente (sin confirmación) | FUN-G14 (ahora con confirmación) |
| 2.1.1 | Lista de productos con foto, stock, reservadas/disponibles, costo, precio, % y valor de ganancia por unidad | MOD-2, SEG-A2 |
| 2.1.2 | Filtro por categoría (chips) | FUN-G4 |
| 2.1.3 | Búsqueda por nombre | INT-B |
| 2.1.4 | Aviso "Poco stock (n)" con lista; al tocarlo abre el panel de poco stock | FUN-G3 |
| 2.1.5 | Panel de poco stock: productos bajo su límite y productos sin aviso; abre el producto | FUN-G3 |
| 2.1.6 | Crear producto: nombre, foto, categoría, descripción para factura, costo, ganancia %, precio, stock opcional, límite de aviso propio, "no avisar" | MOD-2, REG |
| 2.1.7 | Cálculo automático precio ↔ ganancia % y vista previa "Ganas $X por unidad" | MOD-2, REG |
| 2.1.8 | Editar producto; si cambia el stock pide motivo y registra un ajuste | MOD-2, REG |
| 2.1.9 | Historial de compras del producto: unidades compradas, invertido, costo promedio, vendidas | FUN-G5 |
| 2.1.10 | Registrar compra (reabastecer) desde el producto | MOD-2, REG |
| 2.1.11 | Eliminar producto con confirmación; registra movimiento "baja" | MOD-2 |
| 2.2.1 | Costo total del inventario, unidades, valor a precio de venta, reservadas, poco stock | DIF-RI-11, FUN-S1 (pantalla) |
| 2.2.2 | Detalle por producto ordenado por valor, con reservadas y disponibles | DIF-RI-11, U-optimización |
| 2.3.1 | Línea de tiempo combinada: ventas, compras, ajustes, altas, bajas y devoluciones (máx. 200) | DIF-RI-12, SEG-A2 |
| 2.3.2 | Búsqueda por nombre de producto | FUN-G15 |
| 3.1.1 | Sub-vistas "Ventas" y "Pendientes" | NUC |
| 3.1.2 | Lista de ventas: cliente, folio o "Sin factura", fecha, medio de pago, total | MOD-4…6, INT-B |
| 3.1.3 | Búsqueda por cliente o folio ("f12") | INT-B, MIG-L2 |
| 3.1.4 | Detalle de venta sin factura: resumen, ganancia, generar factura, anular | MOD-8 |
| 3.2.1 | Exige al menos un cliente | NUC |
| 3.2.2 | Paso 1: elegir cliente | MOD-4…6 |
| 3.2.3 | Paso 2: buscar producto y agregarlo; respeta stock disponible (stock − reservado) | MOD-4…6, FUN-G6 |
| 3.2.4 | Cambiar cantidad (+/−), quitar, cambiar precio unitario (se marca si es menor al de catálogo) | FUN-G6, REG |
| 3.2.5 | Agregar servicio o producto libre (nombre, trabajo, foto, precio, cantidad, costo); no descuenta stock | MOD-6 |
| 3.2.6 | Agregar "prenda a medida" hecha con materiales del inventario; precio = suma de precios de materiales; costo = suma de costos | MOD-6, REG |
| 3.2.7 | Validar materiales suficientes | REG |
| 3.2.8 | Descuento en % sobre la venta | MOD-4, REG |
| 3.2.9 | Editar el "Total a cobrar" a mano (se convierte en descuento en monto) | MOD-6, U |
| 3.2.10 | Impuesto según ajustes | U-T9, REG |
| 3.2.11 | Ganancia estimada desplegable (costo, descuento, ingreso, margen) | FUN-G6 |
| 3.2.12 | Notas para el cliente | MOD-4…6 |
| 3.2.13 | Formas de pago: efectivo, tarjeta, a crédito (con abono inicial y su medio), mixto (efectivo + tarjeta; lo que falte queda a crédito) | MOD-4…6, REG |
| 3.2.14 | Pantalla de confirmación antes de cobrar | MOD-4…6 |
| 3.2.15 | Guardar venta y descontar stock (productos y materiales) | MOD-4…6, REG |
| 3.2.16 | Pantalla "Venta registrada" con ganancia y opción de generar factura | MOD-8 |
| 3.2.17 | Desde el mismo asistente: registrar como Pedido, Encargo o Apartado (fecha, anticipo/abono inicial, medio) | MOD-8, REG |
| 3.2.18 | Botón Atrás vuelve al paso 1 conservando el carrito | FUN-G6 |
| 3.3.1 | Lista agrupada en secciones plegables: Pedidos (vencidos / hoy / próximos), Encargos (con fecha / sin fecha), Apartados | INT-W, INT-B |
| 3.3.2 | Búsqueda por cliente | INT-B |
| 3.3.3 | Botón + pregunta qué registrar: Pedido, Encargo o Apartado | MOD-7 |
| 3.3.4 | Formulario de pendiente: cliente, productos (del inventario o libres), cantidad, precio, características, costo, notas, fecha de entrega, anticipo, descuento %, fecha y medio del anticipo; resumen con total y saldo | MOD-7, REG |
| 3.3.5 | Editar pendiente | REG (anticipo, D4-09 conservado) |
| 3.3.6 | Detalle de pedido/encargo: productos, materiales, fotos, total estimado, anticipo, saldo al entregar, ganancia estimada, notas | SEG-A3, INT-W |
| 3.3.7 | Registrar abono a un pedido/encargo | MOD-7, REG |
| 3.3.8 | Detalle de apartado con lista de abonos y formulario de abono | MOD-7 |
| 3.3.9 | Comprobante de abono (documento imprimible y compartible) | SEG-A3, DIF-RP-16/17 |
| 3.3.10 | Recordatorio por WhatsApp (texto distinto para pedido, encargo y apartado) | INT-W (texto idéntico) |
| 3.3.11 | Marcar entregado: "Pagó el saldo" (efectivo/tarjeta) o "Queda a crédito"; crea la venta y descuenta stock | MOD-7, REG, DIF-RP-10…14 |
| 3.3.12 | Entregar apartado: solo si está pagado | FUN-G7, MOD-7 |
| 3.3.13 | Cancelar pendiente con devolución de lo abonado (gasto "Devolución" por medio de pago) | MOD-7, REG |
| 3.3.14 | Reservas de stock por pendientes (los encargos reservan solo si el stock alcanza, por orden de llegada) | DIF-RI-13/14, U |
| 4.1 | Lista de facturas por folio descendente; aviso de "Ventas sin factura" | MOD-8, INT-B |
| 4.2 | Búsqueda por cliente, "f12" o "0012" | FUN-G8, INT-B |
| 4.3 | Botón +: elegir una venta sin factura y facturarla | MOD-8 |
| 4.4 | Asignación de folio consecutivo (una sola vez por venta) | MOD-8, REG |
| 4.5 | Documento de factura: logo, datos del negocio, cliente, Nº, fecha, forma de pago, tabla de productos con descripción, "Tenga en cuenta", totales, pagado, saldo, tabla de pagos, sello PAGADA, firma, pie, fotos | SEG-A3, SEG-A5, NUC |
| 4.6 | Imprimir / guardar PDF con el diálogo del navegador | FUN-G9 |
| 4.7 | Compartir PDF por WhatsApp (genera PDF con html2canvas + jsPDF desde internet; usa compartir del sistema o descarga y abre el chat) | FUN-G10, FUN-G11, SEG-A5, SEG-E1 (sin conexión) |
| 4.8 | Editar factura: nombre/dirección/teléfono/correo del cliente, fecha, notas (no productos ni precios) | MOD-8, REG |
| 4.9 | Anular factura/venta: devuelve unidades al inventario y registra devoluciones | MOD-8, REG |
| 5.1 | Lista de gastos (📦 si es compra), categoría, fecha, monto | MOD-3, SEG-A2 |
| 5.2 | Búsqueda por descripción o categoría | INT-B |
| 5.3 | Nuevo gasto general: descripción, monto, fecha, categoría, medio (efectivo/tarjeta) | MOD-3, REG |
| 5.4 | Nueva compra de inventario: elegir producto existente o crear uno nuevo; cantidad, costo, fecha, precio y ganancia; recalcula costo promedio y stock | MOD-3, REG |
| 5.5 | Editar gasto (aviso: en compras no ajusta stock ni costo) | MOD-3, REG |
| 5.6 | Eliminar gasto (sin confirmación) | MOD-3 (ahora con confirmación) |
| 6.1 | Total por cobrar y lista de clientes deudores ordenada por deuda | MOD-1, DIF-RC |
| 6.2 | Deuda de un cliente: ventas pendientes, abonar cada una | MOD-1 |
| 6.3 | Abono a una venta a crédito: monto (se limita al saldo), fecha, nota, medio | MOD-1, REG |
| 6.4 | Liquidar toda la deuda de un cliente con un medio de pago | MOD-1, REG |
| 6.5 | Recordatorio de deuda por WhatsApp | INT-W (texto idéntico) |
| 7.1 | Resumen: ganancia del período (este mes, mes anterior, todo), comparación con el mes anterior | INT-R (12 conjuntos), DIF-RR |
| 7.2 | Movimiento: ventas, gastos totales, costo de lo vendido, compras, otros gastos | INT-R, DIF-RR |
| 7.3 | Histórico total: ventas, por cobrar, ganancia | INT-R, DIF-RR |
| 7.4 | Inventario: valor de costo en stock, productos con poco stock | INT-R, DIF-RR |
| 7.5 | Top 5 productos más vendidos del período (por unidades) | DIF-RR, SEG-A2 |
| 7.6 | Caja diaria y mensual: ingresos efectivo/tarjeta, abonos de créditos, egresos (compras / otros), cierre neto | INT-R, DIF-RK |
| 7.7 | Caja diaria: lista de movimientos del día | INT-R, DIF-RK |
| 7.8 | Caja mensual: cierre de cada día | INT-R, DIF-RK |
| 7.9 | Flujo: dinero disponible hoy (efectivo y tarjeta), por cobrar (créditos y pendientes), flujo acumulado por mes | INT-R, DIF-RL |
| 8.1 | Menú con resumen de cada sección | NUC |
| 8.2 | Usuario: foto de perfil, logo, nombre, dirección, teléfono, correo del negocio | MOD-9 |
| 8.3 | Créditos (ver sección 6) | MOD-1 |
| 8.4 | Factura: título, pie (on/off), color, "Tenga en cuenta" (on/off y texto), mostrar dirección/teléfono/correo, tabla de pagos, sello PAGADA, fotos, firma dibujada con el dedo (on/off, borrar) | MOD-9 |
| 8.5 | Productos: ganancia por defecto %, límite general de poco stock | MOD-9 |
| 8.6 | Respaldo: descargar JSON con todos los datos | DAT-B1, DAT-B2 |
| 8.7 | Respaldo: restaurar desde archivo (valida forma mínima, pide confirmación, reemplaza) | DAT-C1, DAT-C2, SEG-B |
| 8.8 | Moneda (símbolo) e impuesto % | MOD-9 |
| 9.1 | Guardado en `localStorage` (7 claves) | Reemplazado por IndexedDB (Etapa 5): DAT, MIG; localStorage se lee y nunca se modifica |
| 9.2 | Formato de dinero: símbolo, miles con punto, decimales con coma, siempre 2 decimales | U-format (20.000 valores) |
| 9.3 | Fechas locales `AAAA-MM-DD` y formato "19 nov 2026" | U-format (todos los días 2025–2027) |
| 9.4 | Imágenes: se reducen a 300 px (productos, piezas) o 400 px (logo, perfil) en JPEG 85 %; máximo 15 MB de entrada | FUN-G12 |
| 9.5 | Enlaces de WhatsApp: agrega el indicativo 57 a números colombianos de 10 dígitos que empiezan por 3 | SEG-A4, INT-W |
| 9.6 | Descargas mediante `window.claude.use('downloads')` si existe (entorno de artifacts de Claude) o enlace normal | No aplica: solo existía para el entorno de artifacts donde se creó la app (Etapa 2); la descarga normal funciona (DAT-B1, FUN-G11) |
| 9.7 | Service worker: primero red, si falla usa la copia guardada | Reemplazado: precarga completa y "Actualizar" a pedido (NUC, MIG-M3/M4, SEG-E1) |

**Resultado:** 111 de 111 funciones con al menos una prueba ejecutada; 2 reemplazadas a propósito (9.1
localStorage → IndexedDB, 9.7 service worker), 1 que no aplica fuera del entorno donde se creó la app (9.6).
Cambios de comportamiento conocidos, aprobados en etapas anteriores: confirmación antes de eliminar (1.7, 5.6), PIN
opcional (Etapa 8) y "Mostrar más" en listas de más de 100 registros (Etapa 9).
