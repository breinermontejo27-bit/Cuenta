# Orisma 2.0 · Etapa 3 · Sistema de diseño

**Implementación de referencia:** `prototipo/tokens.css` (variables) y `prototipo/componentes.css` (componentes).
En la Etapa 4 estos archivos pasan a `styles/` sin cambios de fondo.
**Capturas:** `capturas/` (teléfono 390 px, computador 1280 px, tema claro y oscuro).

---

## 1. Principios

1. **Las cifras primero.** El dinero es lo más importante de cada pantalla: tamaño grande, números alineados
   (tabulares), color solo para significado (verde = entra o se ganó; rojo = se debe o sale; ámbar = atención).
2. **Una acción principal por pantalla**, siempre en el mismo lugar: botón flotante con texto en el teléfono,
   botón azul junto al buscador en el computador.
3. **Nada se pierde sin preguntar.** Toda eliminación pide confirmación y dice qué consecuencias tiene.
4. **Errores que se entienden.** El mensaje aparece junto al campo o en un aviso que dice qué pasó y qué hacer.
5. **El mismo proceso, mejor presentado.** Ningún cambio visual altera pasos, cálculos ni reglas (ver §10).
6. **Usable con una mano y en computador.** Áreas táctiles de 44 px; en pantallas grandes se aprovecha el ancho.

## 2. Color

Se conserva el **azul de la versión actual (`#1E4FA0`)** como color de marca, para que el negocio se reconozca
y las facturas mantengan su color por defecto.

| Variable | Claro | Oscuro | Uso |
|---|---|---|---|
| `--marca` | `#1E4FA0` | `#82A9EE` | botón principal, enlaces, pestaña activa, foco |
| `--marca-suave` | `#E8EFFA` | `#1A2944` | fondo de elemento activo, insignias informativas |
| `--fondo` | `#F4F5F7` | `#0D1015` | fondo de la app |
| `--superficie` | `#FFFFFF` | `#161A21` | tarjetas, listas, hojas |
| `--superficie-2` | `#EFF1F4` | `#1D222B` | segmentos, totales, filas al pasar |
| `--borde` / `--borde-fuerte` | `#E1E4EA` / `#C9CED7` | `#29303B` / `#3A4250` | separadores |
| `--borde-campo` | `#7F8693` | `#687182` | contorno de campos (contraste ≥ 3:1) |
| `--texto` / `-2` / `-3` | `#141820` / `#4A5261` / `#646C7A` | `#E7EAF0` / `#AAB2BF` / `#8E97A6` | principal / secundario / terciario |
| `--positivo` (+ `-suave`) | `#12733F` | `#52C48D` | cobrado, ganancia, pagada |
| `--negativo` (+ `-suave`) | `#B42318` | `#F2796D` | deuda, egreso, vencido, eliminar |
| `--aviso` (+ `-suave`) | `#8A5600` | `#E6B54A` | poco stock, precio rebajado |

**Contraste verificado** (`pruebas/contraste.js`): las 19 combinaciones usadas cumplen WCAG 2.1 AA en ambos temas
(texto ≥ 4,5:1; contornos y foco ≥ 3:1). Mínimo medido: 4,68:1 (texto terciario sobre gris).

**Tema oscuro:** automático según el teléfono, como hoy. La factura siempre se dibuja en blanco (es un documento).

## 3. Tipografía

**Fuentes del sistema** (San Francisco en iPhone, Roboto en Android, Segoe en Windows). Se dejan de descargar
Inter e IBM Plex Mono de Google: carga más rápida, funciona sin conexión y no depende de un servicio externo.
Los números usan cifras tabulares para que las columnas de dinero queden alineadas.

| Variable | Tamaño | Uso |
|---|---|---|
| `--t-2xl` | 32 px | cifra principal (ganancia, cierre de caja) |
| `--t-xl` | 26 px | título de pantalla |
| `--t-lg` | 20 px | cifras de tarjeta, total |
| `--t-md` | 17 px | título de hoja y de sección |
| `--t-base` | 15 px | texto normal |
| `--t-sm` | 13 px | detalles de fila, ayudas |
| `--t-xs` | 12 px | insignias, encabezados de grupo |

## 4. Espacio, forma y profundidad

- Espacios en múltiplos de 4 px (`--e-1` … `--e-10`).
- Radios: 8 px campos y botones, 12 px tarjetas y listas, 18 px hojas, píldora para buscador, chips e insignias.
- Sombras solo en elementos que flotan (botón principal, hojas, avisos). Las tarjetas usan borde.
- Área táctil mínima: **44 px** (verificado automáticamente en las 16 pantallas).

## 5. Íconos

22 íconos de trazo dibujados para Orisma (`prototipo/index.html`, bloque `<svg>`), sin librerías externas.
Reemplazan los símbolos de texto actuales (◆ ▤ ⧉ ▦ ◎ ▥ ⚙). Grosor 1,9 px, esquinas redondeadas, 22 px.
Siempre acompañados de texto o de una etiqueta accesible (`aria-label`).

## 6. Disposición por tamaño de pantalla

| | Teléfono (< 720 px) | Tableta (720–1023 px) | Computador (≥ 1024 px) |
|---|---|---|---|
| Navegación | 6 pestañas abajo, con ícono y texto | igual que teléfono | barra lateral izquierda; Ajustes al pie |
| Encabezado | negocio + botón de ajustes; título grande; buscador | igual | título, buscador y acción principal en una fila |
| Acción principal | botón flotante con texto ("Nueva venta") | igual | botón azul en el encabezado |
| Listas | filas con dos líneas de detalle | igual | tablas con columnas donde aporta (Ventas) |
| Formularios y detalles | hoja que sube desde abajo | hoja centrada | panel lateral derecho de 480 px; la lista sigue visible |
| Confirmaciones | diálogo centrado | igual | igual |
| Avisos | sobre las pestañas | igual | esquina inferior derecha |

Sin desplazamiento horizontal a 320 px de ancho (verificado en las 16 pantallas).

## 7. Componentes

| Componente | Variantes y estados | Reemplaza en la versión actual |
|---|---|---|
| **Botón** | principal (azul), secundario (borde), peligro (rojo), texto; normal, foco, deshabilitado; con ícono | `.btn-primary`, `.btn-secondary`, `.btn-danger-text`, `.link-btn` |
| **Botón flotante** | con ícono y texto | `.fab` (solo "+") |
| **Campo** | texto, número de dinero (alineado a la derecha), fecha, selección, área de texto; normal, foco, **error con mensaje** | `.field` (los errores hoy solo ponen el foco) |
| **Selector segmentado** | 2 a 4 opciones | `.seg` |
| **Chips de filtro** | activo / inactivo, desplazables | `.chip` |
| **Interruptor** | encendido / apagado | `.toggle-row` |
| **Buscador** | con ícono, foco visible | `.search-row` |
| **Fila de lista** | miniatura o iniciales, título, hasta 2 líneas de detalle, insignias, valor, flecha | `.row` |
| **Insignia** | deuda/vencido (rojo), pagado (verde), aviso (ámbar), info (azul), neutra | `.saldo-tag`, `.row-badge` |
| **Tarjeta de cifra** | etiqueta + valor | `.rep-stat` |
| **Cifra destacada** | etiqueta, valor grande, detalle, comparación | `.rep-hero` |
| **Líneas de detalle** | normal, fuerte, total | `.rep-line`, `.totals-row` |
| **Banner** | aviso, error, info; con ícono | `.summary-card` (poco stock, ventas sin factura) |
| **Sección plegable** | con contador | `details.pend-sec` |
| **Tabla** (computador) | encabezado, fila seleccionada, columnas numéricas a la derecha | — (nuevo) |
| **Hoja / panel** | cabecera fija con título, paso, atrás y cerrar; pie fijo con acciones | `.overlay .sheet` |
| **Diálogo de confirmación** | título, consecuencias, cancelar / acción | confirmaciones dentro de la hoja y `alert()` |
| **Aviso (toast)** | normal (con acción opcional), **grave** (no se cierra solo) | `alert()` (24 usos) |
| **Estado vacío** | ícono, título, ayuda | `.empty-state` |
| **Carrito** | nombre, quitar, cantidad ±, precio (marcado en ámbar si es menor al de catálogo) | `.cart-item` |
| **Totales y ganancia** | líneas + total + saldo a crédito; ganancia aparte | `.totals-box`, `.ganancia-panel` |
| **Documento de factura** | mismas secciones configurables de hoy; color elegido por el negocio | `.invoice-doc` |

Componentes que se mantienen funcionalmente igual y se diseñan en la Etapa 7 con estas mismas piezas:
selector de imagen, recuadro de firma, selector de materiales de prenda a medida.

## 8. Lenguaje

- Se trata al usuario de **tú**, como hoy.
- Botones con verbo: "Guardar", "Registrar abono", "Marcar entregado", "Revisar y cobrar".
- Confirmaciones con la consecuencia concreta: "Tiene una deuda de $ 240.000,00 y 1 pedido pendiente. Esta
  acción no se puede deshacer."
- Errores que dicen qué hacer: "Escribe el nombre del cliente." / "No se pudo guardar. El almacenamiento del
  teléfono está lleno. Tus datos anteriores están a salvo. [Descargar respaldo]".
- Formato de dinero **igual que hoy**: `$ 1.234,50` (RG-02).
- Fechas: "19 nov 2026" en textos; en los campos de fecha, el formato del teléfono.

## 9. Accesibilidad

| Requisito | Cómo |
|---|---|
| Contraste AA | verificado por script (§2) |
| Áreas táctiles ≥ 44 px | verificado por script en 16 pantallas |
| Foco visible | anillo azul de 3 px en todo elemento interactivo |
| Lectores de pantalla | hojas con `role="dialog"`, confirmaciones con `role="alertdialog"`, avisos graves con `role="alert"`, íconos con etiqueta |
| Errores de formulario | `aria-invalid` y mensaje asociado al campo |
| Movimiento reducido | se desactivan las transiciones si el teléfono lo pide |
| Tamaño de texto | todo en px relativos al texto base; la app no bloquea el zoom |

## 10. Qué cambia y qué no

Cada cambio de interfaz está clasificado. Ninguno altera cálculos ni reglas.

| Cambio | Tipo |
|---|---|
| Íconos, colores, tipografía, espaciado, tema oscuro rediseñado | Solo visual |
| Títulos con mayúscula ("Clientes" en vez de "clientes") | Solo visual |
| Botón + con texto de la acción ("Nueva venta") | Solo visual; misma acción por pestaña |
| Barra lateral, tablas y panel lateral en computador | Solo visual |
| Lista de ventas agrupada por fecha (Hoy, Esta semana…) | Solo visual; mismo orden |
| Saldo pendiente visible en la lista de ventas y estado "Pagada/Con saldo" en facturas | Información adicional calculada con la regla existente (RC-02) |
| Ganancia por unidad en pesos además del % en Inventario | Ya existe hoy en la fila ("+71% · $50.000") |
| `alert()` reemplazados por avisos y diálogos propios | Presentación; mismos mensajes y momentos |
| Mensaje de error junto al campo (hoy solo se enfoca el campo) | Presentación; mismas validaciones |
| Botón "atrás" del teléfono cierra la hoja abierta | Navegación; hoy cierra la app |
| Confirmación antes de eliminar cliente y gasto | Protección (D4-06, D4-13). No cambia qué se elimina. **Impedir** eliminar clientes con deuda sí requiere autorización (decisión 8) |
| Fuentes del sistema en lugar de Google Fonts | Técnico/visual |
| Ajustes como pantalla propia (en computador, al pie de la barra lateral) | Navegación; mismas secciones |

## 11. Decisiones visuales para el dueño

| # | Pregunta | Propuesta |
|---|---|---|
| V1 | ¿El nombre de la app instalada pasa de "Cuentas" a "Orisma"? (el ícono y el nombre en el teléfono) | Sí, "Orisma" |
| V2 | ¿Se rediseñan los íconos de la app (los que se ven en la pantalla de inicio)? | Sí, en azul de marca con la "O" |
| V3 | ¿Se siguen mostrando siempre los decimales (`$ 35.000,00`)? Solo afecta cómo se ve, no los cálculos. | Mantener como hoy salvo que prefieras ocultarlos cuando son ",00" |
| V4 | ¿Se mantiene el azul `#1E4FA0` como color de marca? | Sí (continuidad y es el color por defecto de la factura) |
