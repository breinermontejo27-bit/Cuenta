# Orisma 2.0 · Etapa 1 · Documento 4
# Diagnóstico técnico y oportunidades de mejora

**Versión auditada:** commit `9300dfa`, `index.html`. `L123` = línea del archivo.

## Gravedad

| Nivel | Criterio |
|---|---|
| **Crítica** | Puede perder datos o ejecutar código no deseado. |
| **Alta** | Produce cifras de dinero o inventario incorrectas o contradictorias. |
| **Media** | Comportamiento inconsistente o confuso; riesgo acotado. |
| **Baja** | Calidad, mantenimiento o detalle de experiencia de uso. |

**Evidencia:** `T#`/`R#` = prueba ejecutada sobre la app original con resultado guardado en
`pruebas/resultados-pruebas.json`. "Inspección" = solo leído en el código (requiere prueba).

**Autorización:** "Sí" significa que corregirlo **cambia una regla comercial** y no se hará sin aprobación expresa.
"No" significa que se puede corregir sin cambiar ningún resultado de negocio.

---

## 1. Resumen

| Gravedad | Cantidad |
|---|---|
| Crítica | 2 |
| Alta | 5 |
| Media | 13 |
| Baja | 10 |
| **Total** | **30** |

Lo más importante:

1. **Pérdida silenciosa de datos** cuando el almacenamiento del navegador se llena (D4-10). Las fotos guardadas
   en base64 aceleran ese momento.
2. **Un respaldo manipulado puede ejecutar código** al restaurarse (D4-11).
3. **Cifras que no cuadran entre pantallas**: el total de un mismo pedido se calcula de tres maneras (D4-02),
   la ganancia de Reportes incluye el impuesto (D4-05) y las compras hechas desde el producto restan
   como gasto (D4-01).

---

## 2. Errores funcionales confirmados

### D4-01 · Compra registrada desde el producto no queda como compra de inventario
**Gravedad:** Alta · **Evidencia:** T1 · **Autorización:** Sí
`openCompraForm` (L2262) crea el gasto sin `tipo`, `metodo`, `productoId` ni `cantidad`. La compra hecha desde
Gastos (L2569) sí los guarda.
**Efectos medidos:** el gasto de $300 aparece como "Otros gastos" en Reportes y **resta de la ganancia** (las
compras no deberían restar hasta venderse, RR-02); no aparece en el historial de compras del producto ni en el
historial de inventario.
**Recomendación:** que ambos caminos usen la misma operación de compra. Migrar los gastos existentes solo con
autorización y un criterio verificable (descripción "Compra de inventario: … xN").

### D4-02 · El total de un pendiente se calcula de tres maneras
**Gravedad:** Alta · **Evidencia:** T2 · **Autorización:** Sí

| Lugar | Fórmula |
|---|---|
| Formulario (L1071) y entrega (L1179) | (suma − descuento%) × (1 + impuesto%) |
| Apartados en lista y detalle (L1422) | suma × (1 + impuesto%), sin descuento |
| Pedidos/encargos en lista, detalle, abono, cancelación y flujo (L961, L1309, L1353, L1282, L1747) | suma, sin descuento ni impuesto |

**Efecto medido (T2):** apartado de $100 con 10 % de descuento. El formulario dice "Total $90". El detalle dice
"Total $100". Tras abonar $90 el detalle muestra "Saldo pendiente $10" y el botón de entregar sigue bloqueado.
Para entregarlo hay que cobrar $100; al entregar, la venta se crea por $90 con $100 abonados.
Con impuesto ocurre lo contrario en pedidos: el detalle muestra un saldo menor al que se cobra al entregar.
**Recomendación:** una sola función de total para pendientes, la misma que usa la entrega.

### D4-03 · El descuento del asistente se pierde en pedidos, encargos y apartados
**Gravedad:** Alta · **Evidencia:** T3 · **Autorización:** Sí
`guardarPendiente` (L2725) no guarda `descuentoPct`. **Medido:** el asistente mostraba total 80 (20 % de
descuento) y el pedido quedó con precio 100 y sin descuento. El total escrito a mano tampoco se guarda.
**Recomendación:** guardar el descuento (y su tipo) en el pendiente.

### D4-04 · El detalle del apartado no muestra el medio de pago de los abonos
**Gravedad:** Baja · **Evidencia:** T4 · **Autorización:** No
L1467 llama a `metodoLabel(a.metodo)` con un texto, pero la función espera una venta. **Medido:** la línea
dice "19 nov 2026 · $ 30,00" para un abono con tarjeta.
**Recomendación:** usar la etiqueta del medio directamente.

### D4-05 · La ganancia de Reportes incluye el impuesto
**Gravedad:** Alta · **Evidencia:** T9 · **Autorización:** Sí
`gananciaDe` (L1804) usa `v.total` (con impuesto). Cada venta calcula su ganancia sin impuesto (L2874).
**Medido:** con impuesto 19 %, venta de $100 con costo $60: la venta dice ganancia $40; Reportes dice $59.
Hoy solo afecta si se configura un impuesto distinto de 0.
**Recomendación:** usar la base sin impuesto (o mostrar el impuesto como línea aparte).

### D4-06 · Eliminar un cliente: sin confirmación y deja deudas huérfanas
**Gravedad:** Media · **Evidencia:** T5 · **Autorización:** Sí (es una regla nueva)
Un toque en "Eliminar" borra el cliente (L1985). Sus ventas fiadas siguen contando en el total por cobrar,
pero desaparecen de la lista de créditos. **Medido:** menú de Ajustes "Por cobrar $100"; pantalla Créditos
"Total por cobrar $0".
**Recomendación:** pedir confirmación y no permitir eliminar (o archivar) clientes con saldo o pendientes.

### D4-07 · Cada vez que se abre un comprobante de abono se consume un número
**Gravedad:** Media · **Evidencia:** T8 · **Autorización:** Sí
`comprobanteDeAbono` (L1237) incrementa el contador al **abrir**. **Medido:** abrir tres veces el mismo
comprobante dio 0001, 0002 y 0003. El número no se guarda en el pendiente.
**Recomendación:** asignar el número una vez y guardarlo.

### D4-08 · Anular una venta reescribe la caja de días pasados
**Gravedad:** Alta · **Evidencia:** T11 · **Autorización:** Sí
Anular borra la venta con sus abonos (L3663). **Medido:** pedido con anticipo de $40 entregado a crédito y luego
anulado: la caja del día pasó de $40 de ingresos a $0, sin registrar devolución; el pedido sigue "entregado".
En cambio, cancelar un pendiente sí registra la devolución como gasto (R4).
**Recomendación:** conservar la venta como "anulada" y registrar la devolución del dinero recibido, igual que
al cancelar un pendiente.

### D4-09 · Editar el anticipo de un pedido con abonos descuadra anticipo y abonos
**Gravedad:** Media · **Evidencia:** T6 · **Autorización:** No (corrige una inconsistencia interna)
Al editar, si el pedido ya tiene abonos se conservan, pero `anticipo` toma el valor nuevo (L1119, L1127).
**Medido:** anticipo 80, abonos 30. El detalle muestra "Saldo al entregar $20"; la caja muestra $30 de ingresos.
**Recomendación:** que el anticipo sea siempre la suma de los abonos y que los abonos se editen como abonos.

### D4-10 · Con el almacenamiento lleno, los datos se pierden sin aviso — CRÍTICA
**Gravedad:** Crítica · **Evidencia:** T7 · **Autorización:** No
`save()` (L458) captura el error y solo lo escribe en la consola. **Medido:** con el almacenamiento lleno se
creó un cliente; apareció en pantalla, no hubo ningún aviso, y al recargar ya no existía.
Agravantes: las operaciones que escriben varias claves (entregar pedido, anular, compras) pueden quedar a medias;
las fotos en base64 se guardan en las mismas claves (y la foto de cada servicio/prenda se copia dentro de cada
venta y pendiente). Límite medido: ~5,2 millones de caracteres. 5.000 ventas sin fotos ocupan ~2,4 MB.
**Recomendación:** IndexedDB (Etapa 5), escrituras en transacción, aviso inmediato al usuario si algo no se guarda,
imágenes en un almacén separado.

### D4-11 · Un respaldo manipulado puede ejecutar código — CRÍTICA
**Gravedad:** Crítica · **Evidencia:** T10 · **Autorización:** No
Varios datos se insertan en el HTML sin escapar: `src` de imágenes (`config.logo`, `fotoPerfil`, `firmaImg`,
`p.foto`, `it.foto`), ids en atributos `data-id`, `config.moneda` en etiquetas, `colorFactura` en `style`.
La restauración solo verifica que existan cuatro listas (L3835). **Medido:** un respaldo con
`logo: 'x" onerror="…'` ejecutó código al restaurarse.
Riesgo real: bajo mientras solo se restauren respaldos propios, pero un archivo recibido de otra persona
podría leer o borrar todos los datos.
**Recomendación:** validación estricta de esquema al restaurar (tipos, formato de ids, imágenes solo
`data:image/…`), escapar todo valor insertado en HTML, y política de seguridad de contenido (CSP).

### D4-12 · El PDF no funciona sin conexión y el error es confuso
**Gravedad:** Media · **Evidencia:** T15 · **Autorización:** No
html2canvas y jsPDF se descargan de cdnjs al compartir (L3444). Sin conexión, el service worker responde con
`index.html` en lugar de la librería, y el usuario ve "window.html2canvas is not a function".
**Recomendación:** incluir las librerías en el proyecto (o generar el PDF sin ellas) y precargarlas en el
service worker; nunca devolver `index.html` para peticiones que no son de navegación.

### D4-13 · Gastos sin validación de monto y eliminaciones sin confirmación
**Gravedad:** Media · **Evidencia:** T13 · **Autorización:** No (validar montos negativos: Sí)
**Medido:** se guardó un gasto de −$500 y se eliminó con un solo toque. Lo mismo pasa al eliminar clientes (D4-06).
Productos, ventas y pendientes sí piden confirmación.
**Recomendación:** confirmación uniforme para toda eliminación; validar montos > 0.

### D4-14 · Restaurar mezcla la configuración en vez de reemplazarla
**Gravedad:** Media · **Evidencia:** T14 · **Autorización:** Sí
`Object.assign(config, d.config)` (L3855). **Medido:** tras restaurar, el nombre vino del respaldo pero la firma
y el texto "Tenga en cuenta" se quedaron los del teléfono. Tampoco se hace un respaldo automático antes de reemplazar.
**Recomendación:** reemplazo completo, respaldo automático previo y opción de deshacer.

---

## 3. Inconsistencias y riesgos detectados por inspección (requieren prueba)

| ID | Gravedad | Hallazgo | Dónde | Autoriz. |
|---|---|---|---|---|
| D4-15 | Media | Entregar un pedido verifica el stock total, no el disponible: puede consumir unidades reservadas para otro pedido. | L1170–1173 | Sí |
| D4-16 | Baja | Un pedido tipo "pedido" sin fecha cuenta en la sección pero no aparece en ningún subgrupo (solo con datos antiguos: el formulario exige fecha). | L937 | No |
| D4-17 | Baja | `subtotal` significa "antes de descuento" en ventas que vienen de pedidos y "después de descuento" en las del asistente. La factura no se ve afectada porque usa `sumaItems`, pero cualquier cálculo futuro con `subtotal` daría cifras distintas. | L1207 vs L3148 | No |
| D4-18 | Media | El formulario de Pendientes no valida stock; el asistente sí (RI-17). Se pueden reservar más unidades de las que hay. | L1110 | Sí |
| D4-19 | Media | El abono a pedido rechaza con aviso un monto mayor al saldo; el abono a una venta lo recorta en silencio al saldo. | L1339 vs L604 | No (solo mensajes) |
| D4-20 | Baja | Medio de la venta entregada: si el anticipo fue con tarjeta y el saldo en efectivo, queda "Efectivo" en vez de "Mixto". | L1201 | Sí |
| D4-21 | Media | Si se cambia el impuesto en Ajustes, los pendientes ya creados se entregan con el impuesto nuevo, y los totales de pantallas anteriores cambian. | L1183 | Sí |
| D4-22 | Baja | Eliminar o editar un gasto de compra no revierte stock ni costo (está advertido en pantalla). | L2286 | Sí |
| D4-23 | Baja | Fechas o nombres ausentes en datos antiguos rompen ordenamientos y búsquedas (`b.fecha.localeCompare`, `v.clienteNombre.toLowerCase`). Un solo registro dañado puede impedir que se abra una pestaña. | varias | No |

---

## 4. Seguridad

| ID | Gravedad | Hallazgo | Recomendación |
|---|---|---|---|
| D4-11 | Crítica | Inserción de HTML sin escapar + restauración sin validación (ver arriba). | Escapar todo, validar esquema, CSP. |
| D4-24 | Media | Librerías de CDN cargadas en ejecución sin verificación de integridad (SRI). Si el CDN fuera comprometido, ese código tendría acceso a todos los datos. | Incluirlas en el proyecto. |
| D4-25 | Media | Datos personales de clientes (nombre, teléfono, correo, dirección) en texto plano en `localStorage` y en el respaldo descargado. | Explicar el alcance. Opcional: respaldo cifrado con contraseña. Una contraseña local **no** protege frente a quien tiene el teléfono desbloqueado o las herramientas de desarrollo. |
| D4-26 | Baja | `window.open(url, '_blank')` sin `noopener`. | Añadir `noopener`. |
| — | — | No hay inicio de sesión ni bloqueo de la app. | A decidir en la Etapa 8 (bloqueo local con PIN como protección frente a uso casual, no como cifrado). |

---

## 5. Almacenamiento e integridad

Además de D4-10 y D4-14:

- No hay **versión de esquema** ni migraciones: los formatos viejos se manejan con `|| valor` repartidos
  por el código (anticipo sin abonos, gastos sin tipo, ventas sin `sumaItems`, pedidos sin `tipo`).
- No hay **integridad referencial** (Documento 3, §2).
- No hay **transacciones**: cada colección se guarda por separado.
- No hay **respaldo automático** ni recordatorio de respaldo.
- Cada guardado reescribe la colección completa, imágenes incluidas.

---

## 6. Rendimiento (medido)

Prueba `pruebas/perf.js`: datos ficticios, Chromium de escritorio. En un teléfono de gama media espere
entre 3 y 5 veces más.

| Pestaña (tiempo de dibujado) | 1.000 ventas | 5.000 ventas |
|---|---|---|
| Clientes | 6 ms | 58 ms |
| Inventario | 18 ms | 57 ms |
| Inventario › Stock | 8 ms | 87 ms |
| Ventas | 47 ms | 238 ms |
| Facturas | 25 ms | 158 ms |
| Gastos | 25 ms | 133 ms |
| Reportes (resumen / caja / flujo) | 3–6 ms | 3–11 ms |
| Carga inicial de la app | 550 ms | 439 ms |
| Tamaño de los datos (sin fotos) | 467 KB | 2.370 KB |

**Diagnóstico:** el rendimiento es aceptable hoy. El límite real llegará antes por almacenamiento (D4-10) que por
velocidad. Puntos a mejorar:

| ID | Gravedad | Hallazgo |
|---|---|---|
| D4-27 | Baja | Las listas se dibujan completas (sin paginar) y se redibujan en cada tecla del buscador; Ventas tarda ~240 ms con 5.000 ventas. |
| D4-28 | Baja | Cálculos repetidos: la lista de clientes calcula el saldo dos veces por fila recorriendo todas las ventas (O(clientes × ventas)); Stock calcula las reservas tres veces por producto, y cada vez reordena los encargos. |

---

## 7. Código y mantenibilidad

| ID | Gravedad | Hallazgo |
|---|---|---|
| D4-29 | Baja | Un archivo de 4.141 líneas; 98 funciones de nivel superior en un solo ámbito con 7 variables globales mutables. Funciones de más de 300 líneas (asistente de venta: L2587–3172; gastos: L2277–2582). |
| — | Baja | Reglas de negocio mezcladas con HTML y eventos: no se pueden probar sin abrir pantallas (Documento 3, §1). |
| — | Baja | Código duplicado: ver Documento 3, §9 (costo promedio ×3, total de pendientes ×8, descontar/devolver stock ×3…). |
| — | Baja | Código muerto: rama `ventasVista === 'apartados'` y `renderApartadosHtml` (L1428, L1536) ya no son alcanzables desde la interfaz. |
| — | Baja | Restos del entorno donde se creó la app (`window.claude.use('downloads')`). |
| — | Baja | 24 `alert()` del navegador para mensajes, mezclados con avisos dentro de la app. |
| — | Baja | Estilos en línea (`style="…"`) repartidos en cientos de plantillas. |

---

## 8. Experiencia de uso, accesibilidad y adaptación

| ID | Gravedad | Hallazgo |
|---|---|---|
| D4-30 | Media | En computador la app es una columna de 560 px; tablas y reportes no aprovechan el ancho. |
| — | Baja | El botón "atrás" del teléfono cierra la app en vez de cerrar la hoja abierta. |
| — | Baja | Hojas emergentes sin `role="dialog"`, sin foco inicial ni cierre con Escape; se pueden apilar varias. |
| — | Baja | El título de cada pestaña muestra la clave interna en minúsculas ("clientes"). |
| — | Baja | Mensajes de error inconsistentes: unos con `alert`, otros dentro de la hoja, otros enfocando el campo sin decir nada. |
| — | Baja | Ícono `apple-touch-icon.png` no se precarga para uso sin conexión. |

---

## 9. Lo que funciona bien y debe conservarse

- Modelo de **caja por fecha de cobro** coherente (RK-07): entregar un pedido no duplica ingresos.
- **Reservas** de stock por pendientes, con regla FIFO para encargos (RI-13, RI-14).
- **Costo promedio ponderado** en compras (R5).
- **Crédito** completo: abono inicial, abonos parciales, liquidación por medio de pago (R1).
- **Pago mixto** con saldo a crédito (R2).
- **Cancelación** de pendientes con devolución registrada por medio de pago (R4).
- **Factura** configurable (título, color, firma, sello, secciones) y folio consecutivo estable (R3).
- **Copia de los datos del cliente** en cada venta, para que la factura no cambie al editar el cliente.
- Escapado de texto en la mayoría de las plantillas (`escapeHtml` se usa en 37 funciones).
- Funciona sin conexión (T15) y es instalable.

---

## 10. Oportunidades de mejora para Orisma 2.0 (sin cambiar reglas)

| Área | Oportunidad | Etapa |
|---|---|---|
| Arquitectura | Separar reglas de negocio (funciones puras probables), datos, servicios e interfaz | 2, 4, 6 |
| Datos | IndexedDB con esquema versionado, transacciones, migración verificada desde `localStorage` (sin borrarlo) | 5, 9 |
| Datos | Imágenes en almacén aparte; evitar copiar fotos dentro de cada venta | 5 |
| Reglas | Una sola función por cálculo (total de pendiente, costo promedio, reservas, saldo) | 6 |
| Seguridad | Escapado sistemático, validación de respaldos, CSP, librerías locales | 8 |
| Respaldo | Respaldo automático antes de restaurar y antes de migrar; recordatorio periódico | 5, 8 |
| Offline | Service worker con versión automática, sin devolver `index.html` a recursos | 9 |
| Interfaz | Diseño adaptable a computador, hojas accesibles, botón atrás, confirmaciones uniformes, avisos propios en lugar de `alert` | 3, 7 |
| Pruebas | Pruebas automáticas de reglas + recorrido comparativo con la versión original | 6, 10 |

---

## 11. Cobertura de esta auditoría

- **Ejecutado:** 20 pruebas dirigidas (15 hallazgos y 5 reglas de dinero), un recorrido de 53 pantallas sin errores
  de JavaScript y una medición de rendimiento con 1.000 y 5.000 ventas.
- **No ejecutado todavía** (requiere prueba, ver Documento 1): WhatsApp, impresión, generación real del PDF con conexión,
  importación de contactos, imágenes y firma, prenda a medida, servicio libre, edición de factura y de gasto,
  descarga del respaldo, tema oscuro, uso en teléfono real.
- Las pruebas se hicieron en Chromium (escritorio, ventana de 400 px). No se probó en Safari/iOS ni en un teléfono real.
