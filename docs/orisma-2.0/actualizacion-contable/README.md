# Actualización contable y Estado de resultados · Informe

**Rama:** `claude/estado-resultados`, creada desde `main` (commit `753da05`, Orisma 2.0.0-rc.4 instalada).
**Versión resultante:** 2.0.0-rc.5. **Sin unir a `main` ni publicar:** eso requiere la autorización del dueño.

## 1. Corrección contable: compras desde Inventario

**El problema**
- La compra hecha desde un producto (Inventario › producto › "Registrar compra") se guardaba sin `tipo`, `metodo`, `productoId` ni `cantidad`.
- La app original lo hacía igual (hallazgo D4-01), y Orisma lo había conservado a propósito.
- Por eso `gananciaDe()`, que solo descuenta como "compra" lo que tiene `tipo: 'compra'`, la restaba como si fuera un gasto operativo.
- Resultado: la utilidad del mes salía más baja de lo real. En cambio, la compra hecha desde Gastos sí se guardaba bien.

**La corrección** (`src/business/inventory-rules.js`, `compraDesdeProducto`)
- La compra desde el producto guarda ahora exactamente los mismos campos y en el mismo orden que la de Gastos: `tipo: 'compra'`, `metodo`, `productoId` y `cantidad`, además de descripción, monto, fecha y categoría.
- El formulario de compra desde el producto tiene ahora **"Forma de pago" (Efectivo / Tarjeta)**, igual que en Gastos.
- Por defecto queda **Efectivo**, que es como la caja ya trataba estas compras: la caja del día no cambia.
- El stock y el costo promedio se calculan igual que antes.
- No hay duplicados: se guarda un solo registro por compra, como antes.
- **La fórmula de ganancia (`gananciaDe`) no se tocó.** Solo se corrigió el registro defectuoso.

**Efecto adicional (deseado):** como ahora llevan el producto, estas compras aparecen también en el historial de compras del producto y en el historial de inventario.

### Registros históricos (no se modificaron)
Las compras hechas desde un producto **antes** de esta versión siguen guardadas sin `tipo` y siguen restando utilidad en los meses donde ocurrieron.

**No se cambió ningún dato.** Se agregó solo la función que las detecta, `comprasAntiguasSinMarcar()`. Para cada registro, la función:
- reconoce la descripción `Compra de inventario: <producto> x<cantidad>` en la categoría Inventario y sin `tipo`;
- busca el producto por nombre;
- propone el registro corregido: los mismos datos más `tipo`, `metodo`, `productoId` y `cantidad`;
- marca como **no confiable** el registro cuyo producto ya no existe o cuyo nombre se repite. En ese caso no propone corrección.

**Propuesta para corregirlos (requiere su autorización):**
1. Un botón en Ajustes, "Revisar compras antiguas", que muestre la lista con fecha, producto, cantidad y monto.
2. Antes de cambiar nada, hacer un respaldo automático.
3. Corregir solo los registros confiables, con el medio "Efectivo", que es el que la caja ya les daba.
4. Los no confiables se dejan como están y se muestran aparte.
5. Al terminar, la utilidad de esos meses sube exactamente en el monto de esas compras. Las ventas, la caja y el stock no cambian.

## 2. Botón "Estado de resultados"

**Dónde está:** en Reportes › Resumen, arriba a la derecha de "Este mes / Mes anterior / Todo". No es un módulo, pestaña ni subvista nueva.

**La ventana** (igual que la de generar factura)
- Título: «Estado de resultados».
- Selector de mes y año. Llega hasta el mes actual y permite meses anteriores.
- Tarjeta con el **período analizado** y **con qué mes se compara**. Se actualiza al cambiar el mes.
- Botones Cancelar y **«Generar estado de resultados»**.

**El documento** (dos hojas, con el nombre, el logo y los colores del negocio)
- **Hoja 1:**
  - encabezado y período;
  - resumen con ventas, utilidad bruta, gastos operativos y utilidad neta;
  - detalle con ventas, menos el costo de la mercancía vendida, la utilidad bruta, menos los gastos operativos y la utilidad neta;
  - franja de **utilidad neta** (en rojo si hay pérdida);
  - **compras de inventario** aparte, con la aclaración de que no son gasto operativo;
  - aviso cuando las ventas incluyen impuesto.
- **Hoja 2:**
  - **comparación con el mes anterior**: actual, anterior, diferencia y variación %.
    - El % se muestra solo cuando la base es válida. Con base 0 se muestra "—".
    - Si el mes anterior no tiene datos, lo dice y no muestra porcentajes.
  - **Información complementaria:**
    - número de ventas;
    - margen bruto y neto;
    - dinero recibido en efectivo y en tarjeta;
    - abonos a créditos;
    - salidas de dinero;
  - productos más vendidos;
  - nota al pie.
- **Acciones:** Imprimir, Descargar PDF y Compartir PDF.
  - Usan `crearPdf()` y `compartirArchivo()` de `src/services/pdf.js`.
  - Si el teléfono no permite compartir, descarga el PDF.
  - El archivo se llama `Estado-de-resultados-AAAA-MM.pdf`.

**Sin fórmulas nuevas.** `estadoDeResultados()` (`src/business/accounting.js`) toma todas sus cifras de las funciones existentes:
- `resumenReportes()` y, a través de ella, `gananciaDe()`;
- `resumenCaja()`.

Las pruebas comprueban que las cifras son las mismas de Reportes.

Capturas:
- `ventana-y-documento.png`: Resumen con el botón, la ventana y el documento.
- `pdf-paginas.png`: las dos páginas del PDF.
- `impresion.png`: las dos hojas al imprimir, con sus colores.
- Ejemplo de PDF: `ejemplo-estado-de-resultados.pdf`.

## 3. Archivos

**Nuevos**
- `src/features/reports/income-statement.js`: la ventana y el documento.
- `src/ui/components/document-viewer.js`: el visor de hoja escalada con "Ver a tamaño real". Antes estaba dentro de la factura; ahora lo comparten la factura y el estado de resultados, sin cambio de comportamiento.
- `tests/business/contable.test.js`: 13 pruebas unitarias.
- `tests/e2e/contable.e2e.cjs`: 16 casos en el navegador.
- Este informe y sus capturas.

**Modificados**
- `src/business/inventory-rules.js`: la corrección del registro y la detección de compras antiguas.
- `src/business/accounting.js`: agrega `estadoDeResultados()`. Las funciones existentes no cambiaron.
- `src/features/inventory/purchase-form.js`: "Forma de pago".
- `src/features/reports/summary-view.js`: el botón.
- `src/features/invoices/invoice-view.js`: usa el visor compartido.
- `src/services/pdf.js`: un documento de varias hojas sale con una hoja por página. La factura, de una sola hoja, sigue igual.
- Estilos: `styles/invoice.css`, `styles/components.css` y `styles/print.css` (cada hoja empieza en una página nueva al imprimir).
- Pruebas `reglas`, `modulos` e `instalacion`; versión (`package.json`, `src/core/config.js`); lista de precarga.

**No modificados:**
- la estructura de IndexedDB y los datos;
- las migraciones;
- las demás reglas y cálculos;
- los demás módulos;
- el nombre;
- la app original;
- `main` y GitHub Pages.

## 4. Pruebas (todas ejecutadas en esta versión)

| Prueba | Resultado |
|---|---|
| Unitarias (`npm test`), incluidas las 13 nuevas | 90/90 |
| Arquitectura y lista sin conexión | correctas |
| Núcleo | 28/28 |
| Datos | 17/17 |
| Reglas: 46 operaciones contra la original | 46/46 (*) |
| Módulos: 9 escenarios contra la original | 9/9 (*) |
| Seguridad | 31/31 |
| Migración | 17/17 |
| Integral: reportes, búsquedas y WhatsApp contra la original | 19/19 idénticos |
| Funciones | 24/24 |
| Instalación | 9/9 |
| **Contable (nueva)** | **16/16** |

(*) **Única diferencia con la original, y es intencional:** la compra desde el producto lleva ahora `tipo`, `metodo`, `productoId` y `cantidad`. Las pruebas comprueban esos cuatro campos y que todo lo demás del registro sigue idéntico a la original.

**Lo que cubren las pruebas nuevas, por cada punto pedido**

1. **Compras equivalentes por las dos rutas:** mismos campos y en el mismo orden, en el navegador y en las reglas.
2. **Las compras no reducen la utilidad:** la ganancia del Resumen no cambia tras dos compras.
3. **Los gastos operativos sí la reducen:** baja exactamente en el monto del gasto.
4. **Stock y costo:**
   - stock 10 → 15;
   - costo promedio ponderado;
   - la compra aparece en el historial del producto;
   - la caja da lo mismo que antes.
5. **Meses anteriores:** se elige el mes anterior y el documento muestra sus cifras.
6. **Comparación:** diferencias y porcentajes correctos (+25 % ventas, +50 % utilidad).
7. **Mes anterior sin datos:** lo indica y no muestra porcentajes.
8. **Porcentajes válidos:**
   - se calculan solo con base distinta de 0;
   - con base negativa se usa su valor absoluto.
9. **Generación del PDF:** dos páginas, con el nombre correcto.
10. **Descarga, compartir e impresión:**
    - descarga del archivo;
    - "compartir" del teléfono con el archivo y el nombre del negocio;
    - si no hay "compartir", descarga;
    - al imprimir, abre el diálogo, cada hoja en su página, con colores y sin la app alrededor.
11. **Los reportes actuales siguen funcionando:**
    - Resumen, Caja y Flujo se dibujan sin errores;
    - las 3 subvistas siguen igual;
    - la comparación integral con la original sigue idéntica.

Además se probó a 320 px de ancho (sin desbordes) y se revisaron las capturas, el PDF y la impresión como imágenes.

## 5. Riesgos y limitaciones pendientes
1. **Compras antiguas sin corregir:** mientras no se autorice la corrección del punto 1, los meses anteriores a esta versión siguen mostrando una utilidad más baja si tuvieron compras hechas desde el producto.
2. **Las ventas incluyen el impuesto** (como en la app original y en Reportes, D4-05). El documento lo advierte cuando hay impuesto configurado.
3. **Caja (RK-02, de la original):** las ventas sin abonos que no son a crédito se cuentan como efectivo. Afecta solo al "dinero recibido" de la hoja 2.
4. Cada hoja está pensada para una página. Su contenido tiene un tamaño fijo (los productos más vendidos son como máximo 5, los mismos de Reportes), así que no se espera que se desborde. Aun así, un nombre de negocio o de producto muy largo ocupa más líneas.
5. El selector de mes es el del navegador o teléfono, así que su aspecto cambia según el equipo.
6. La compra desde el producto con "Tarjeta" cuenta como pago con tarjeta en la caja. Antes no existía esa opción y todo contaba como efectivo.
