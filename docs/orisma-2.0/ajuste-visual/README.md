# Ajuste visual final · Estilo 1 y factura A · Informe

**Rama:** `claude/orisma-ajuste-visual`, creada desde `claude/account-code-restructure-fe1fqc` (commit `7a7872d`,
versión 2.0.0-rc.1). **Versión resultante:** 2.0.0-rc.2. **Para volver atrás:** usar la rama o el commit de origen,
que no se modificaron.

**Aprobado por el dueño:**
- Factura: **propuesta A** (fiel a la original).
- Interfaz: **Estilo 1**, con Ajustes completo y el engranaje arriba a la derecha.
- Demostración navegable en `demo-visual/`, independiente de la app.

## 1. Cambios realizados
**Navegación**
- Inicio es la primera pantalla.
- En el teléfono, barra de 5 destinos: Inicio, Ventas, Inventario, Clientes y Más.
- Facturas, Gastos, Reportes, Créditos, Pendientes y Ajustes se abren desde "Más", con botón Volver.
- El engranaje de Ajustes queda arriba a la derecha, como en la app original.
- En el computador, barra lateral agrupada en "Día a día" y "Negocio", con Ajustes abajo.

**Encabezados.** Título grande con una línea de contexto, por ejemplo "2 clientes · 1 con deuda", "3 productos · 26 unidades en stock" o "Última: F-0024".

**Inicio (nuevo)**
- Lo vendido hoy, la caja de hoy y las ventas a crédito de hoy.
- Accesos rápidos: Vender, Pedido, Cobrar y Gasto.
- Cifras: por cobrar, ganancia del mes con su comparación, pendientes y poco stock.
- Últimas ventas y próximas entregas.
- **Sin cálculos nuevos:** usa las mismas funciones de Reportes, Caja, Clientes, Pendientes e Inventario. La prueba V3 lo comprueba.

**Listas**
- Una sola estructura de fila, con el detalle en una línea y el estado en etiqueta de color.
- Ventas agrupadas por día con la cantidad y el total del día.
- Clientes con "Total por cobrar" y "Ver créditos".
- Productos con el stock en etiqueta (en stock, poco stock o sin control) y la ganancia por unidad en una línea propia. Se conserva toda la información anterior: costo, categoría, reservas y porcentaje de ganancia.
- Gastos con el resumen del mes (las mismas cifras de Reportes › Caja) y agrupados por mes.

**Detalles**
- Venta sin factura: total, estado y barra de avance de lo pagado.
- Cliente: su deuda, "Ver créditos y abonar", y botones de WhatsApp y Llamar (este último es un enlace `tel:` al número del cliente).
- Producto: precio, costo, ganancia por unidad y stock arriba.

**Reportes.** La comparación con el mes anterior aparece como etiqueta de color, y se agrega un gráfico de la ganancia de los últimos 6 meses (el mismo cálculo de "Este mes", aplicado mes por mes). Se conservan todas las cifras.

**Formularios**
- Los campos de dinero muestran el símbolo de la moneda dentro del recuadro y los de porcentaje un "%".
- Campos más altos.
- El botón del asistente de venta dice "Cobrar $ X".

**Factura A**
- Distribución de la original: logo y datos con línea negra, "FACTURA" centrado, "Facturar a" a la izquierda, y número, fecha y forma de pago a la derecha en color.
- Tabla con encabezado de color, y "Tenga en cuenta" al lado de los totales, con el gran total en franja de color y el saldo en rojo.
- Pagos recibidos, sello PAGADA, firma, pie y fotos.
- Es una hoja de 720 px que en pantalla se escala para caber, con el botón "Ver a tamaño real". Se imprime a lo ancho de la página y el PDF sale en una página.

## 2. Archivos
**Creados:** `src/features/home/index.js` (Inicio), `src/features/more/index.js` (Más), este informe.

**Modificados:**
- Marco y piezas compartidas: `src/ui/layouts/app-shell.js`, `src/ui/components/list.js`, `src/ui/components/fields.js`, `src/app.js`, `index.html` (3 íconos).
- Módulos: clientes, ventas, inventario, facturas, gastos, reportes y ajustes.
- Factura: `invoice-document.js`, `invoice-view.js`, `styles/invoice.css`, `styles/print.css`.
- Estilos: `layout.css`, `components.css`, `responsive.css`.
- PDF: `src/services/pdf.js` (solo la tolerancia de la última página).
- Pruebas: `nucleo`, `funciones`, `seguridad`, `datos`, `modulos` e `integral`.
- Versión y lista de precarga.

**No modificados:** `src/business/` (reglas y cálculos), `src/data/` (IndexedDB, almacenamiento, migraciones, respaldos) y `src/operations/` (ventas, inventario, créditos, pagos). Tampoco la app original.

## 3. Pruebas ejecutadas y resultados (todas ejecutadas)
RESULTADOS_FINALES

- **Pruebas nuevas del ajuste:**
  - V1: la distribución de la factura A, que la hoja quepa en el teléfono y "Ver a tamaño real".
  - V2: la impresión.
  - V3: que las cifras de Inicio sean las mismas de Reportes, Caja y Clientes.
  - V4: los accesos rápidos.
  - V5: los campos de dinero y porcentaje.
  - Navegación nueva: 5 destinos, "Más" con Volver, el engranaje en cada pantalla principal y la barra lateral agrupada.
  - 320 px sin desbordes, incluidos Inicio y Más.
  - Tema oscuro con contraste suficiente, incluidos Inicio y Más.
- **Lo que confirma que no cambió nada de la lógica:**
  - Las 46 operaciones de reglas y los 9 escenarios completos siguen **idénticos a la app original**.
  - Reportes, búsquedas y mensajes de WhatsApp, comparados pantalla contra pantalla, también.
  - La prueba de estrés (600 operaciones) sigue sin errores.

## 4. Problemas encontrados y corregidos
1. **Imprimir sacaba la hoja en blanco.** Venía de antes: la regla de impresión ocultaba el cuerpo de la ventana, factura incluida. Corregido, con la prueba V2.
2. **Al imprimir no salían los colores** de la factura y la hoja se cortaba por la derecha. Corregido: la factura pide imprimir sus colores y usa el ancho de la página.
3. El PDF agregaba una segunda página casi vacía. Corregido con una tolerancia sobre el margen blanco final.
4. Durante la construcción: un desborde en Inicio a 390 px, barras del gráfico sin altura y la etiqueta de ganancia cortada en pantallas angostas. Corregidos antes de las pruebas finales.
5. Ajustes de las pruebas por la navegación nueva (Inicio como primera pantalla, destinos desde "Más"). Lo que verifica cada prueba no cambió.

## 5. Confirmaciones
- La aplicación original ("Cuentas", `main` y commit `9300dfa`) **no se tocó**.
- La versión anterior de Orisma (2.0.0-rc.1) sigue intacta en su rama.
- La copia de prueba publicada en `/prueba/` sigue siendo la 2.0.0-rc.1. Actualizarla requiere otra solicitud de cambios autorizada por el dueño.
