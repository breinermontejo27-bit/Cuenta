# Cuentas

App web instalable (PWA) para llevar las cuentas de un negocio: clientes, inventario,
ventas, pedidos/apartados, facturas, gastos, créditos y reportes. Funciona sin conexión
y guarda los datos en el propio teléfono (`localStorage`).

No necesita compilación: se publica tal cual (por ejemplo en GitHub Pages).

## Estructura

```
index.html          Estructura de la página (encabezado, lista, botón +, pestañas)
manifest.json       Datos de la app instalable
sw.js               Service worker: funciona sin internet (cachea los archivos de abajo)
css/styles.css      Todos los estilos
js/
  main.js           Punto de entrada: pestañas, botón +, arranque
  state.js          Datos guardados (db), configuración (config) y estado de vistas (ui)
  dom.js            Referencias a los elementos fijos de la página
  utils.js          Utilidades: ids, formato de dinero y fechas, escapeHtml, WhatsApp
  ui.js             Piezas de interfaz reutilizables: hojas (overlay), segmentos, imágenes
  app.js            Encabezado y elección de la vista activa
  clientes.js       Lista y formulario de clientes
  inventario.js     Productos, stock, historial, poco stock y compras
  ventas.js         Lista de ventas, sub-vistas y anulación
  venta-wizard.js   Asistente para registrar una venta
  pedidos.js        Pedidos, encargos y apartados
  creditos.js       Ventas a crédito, abonos y cartera por cliente
  facturas.js       Lista, detalle, PDF y edición de facturas
  gastos.js         Gastos y compras de mercancía
  reportes.js       Reportes, caja diaria/mensual y flujo de dinero
  ajustes.js        Menú y secciones de ajustes
  respaldo.js       Exportar / importar respaldo
```

### Estado compartido

- `db.clientes`, `db.inventario`, `db.ventas`, `db.gastos`, `db.movimientos`, `db.pedidos`:
  colecciones guardadas. Se reemplazan al editar (`db.ventas = [...]`) y se guardan con
  `save('cuentas_ventas', db.ventas)`.
- `config`: ajustes del negocio (`cuentas_config`).
- `ui`: estado de navegación que no se guarda (pestaña actual, sub-vista, filtros).

Las claves de `localStorage` no cambiaron, así que los datos existentes se siguen leyendo.

## Probar en local

Los módulos de JavaScript no cargan abriendo el archivo con doble clic (`file://`);
hay que servir la carpeta, por ejemplo:

```
python3 -m http.server 8000
```

y abrir <http://localhost:8000>.

Si cambias o agregas archivos, actualiza la lista `FILES` de `sw.js` y sube el número
de `CACHE` para que los teléfonos descarguen la versión nueva.
