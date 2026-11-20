# Etapa 10 · Pruebas integrales y estabilización · Informe de cierre

## 1. Objetivo
Comprobar Orisma completo, función por función y pantalla por pantalla contra la app original, corregir lo que
apareciera, verificar que las pruebas son estables y dejar todo listo para publicar. **Publicar requiere la
aprobación del dueño.**

## 2. Análisis previo
- Se cruzaron las 111 funciones del inventario de la Etapa 1 con las pruebas existentes. Huecos encontrados:
  - los reportes y las búsquedas no se comparaban pantalla contra pantalla con la original;
  - los mensajes de WhatsApp tampoco;
  - faltaban pruebas de tema oscuro, contactos, poco stock, detalles del asistente, imprimir, compartir PDF,
    fotos, eliminar cliente y búsqueda en el historial;
  - no había una prueba de uso prolongado (muchas operaciones seguidas).
- Riesgo principal pendiente: nunca se probó en un teléfono real.

## 3. Archivos
**Creados (2 de código):** `tests/e2e/integral.e2e.cjs` y `tests/e2e/funciones.e2e.cjs`.
**Documentos:** este informe, `01-cobertura.md` y `02-guia-prueba-en-telefono.md`.

**Modificados:**
- `src/core/config.js`: versión `2.0.0-rc.1` y modo de copia de prueba.
- `sw.js`: cachés separados para la copia de prueba.
- `src/ui/layouts/app-shell.js` y `styles/components.css`: aviso de copia de prueba.
- `src/ui/components/list.js`: atributo propio del botón "Mostrar más".
- `src/features/inventory/history-view.js`: búsqueda tolerante (D4-23).
- `tests/e2e/migracion.e2e.cjs`: casos P1–P4.
- `README.md`, `package.json`, `src/precache-list.js`, `etapa-9/01-plan-de-publicacion.md`.

**Eliminados:** ninguno.

## 4. Cambios técnicos
- **Copia de prueba:** si la app se abre desde `/prueba/`, usa su propia base de datos (`orisma-prueba`) y su
  propio caché, y muestra un aviso. Sirve para probar en el teléfono con los datos reales sin gastar la migración
  definitiva ni tocar la app actual.
- Dos correcciones pequeñas que encontraron las pruebas (ver §7).

## 5. Funcionalidades conservadas
**111 de 111** funciones del inventario original tienen al menos una prueba ejecutada (`01-cobertura.md`).
- Reemplazadas a propósito en etapas anteriores: el almacenamiento (`localStorage` → IndexedDB) y el service worker.
- No aplica fuera del entorno donde se creó la app original: las descargas mediante `window.claude`.

## 6. Pruebas ejecutadas (todas ejecutadas; resultados de 3 rondas completas seguidas)
| Prueba | Casos | Ronda 1 | Ronda 2 | Ronda 3 |
|---|---|---|---|---|
| Unitarias (`npm test`) | 77 | 77/77 | 77/77 | 77/77 |
| Núcleo | 25 | 25/25 | 25/25 | 25/25 |
| Datos (con la original) | 17 | 17/17 | 17/17 | 17/17 |
| Reglas (46 operaciones en las dos apps) | 46 | 46/46 | 46/46 | 46/46 |
| Módulos (9 escenarios en las dos apps) | 9 | 9/9 | 9/9 | 9/9 |
| Seguridad | 31 | 31/31 | 31/31 | 31/31 |
| Migración (incluida la copia de prueba) | 17 | 17/17 | 17/17 | 17/17 |
| **Integral (pantalla contra pantalla)** | 19 | 19/19 | 19/19 | 19/19 |
| **Funciones y estrés** | 16 | 16/16 | 16/16 | 16/16 |

Lo más importante de las pruebas nuevas:
- **Reportes:** con 12 conjuntos de datos al azar, Resumen (este mes, mes anterior y todo), Caja (día y mes) y
  Flujo muestran **exactamente las mismas cifras** que la app original.
- **Búsquedas:** en clientes, productos, ventas, pendientes, facturas y gastos, 10 búsquedas distintas encuentran
  los mismos registros que la original.
- **WhatsApp:** los recordatorios de pedido, encargo, apartado y deuda tienen el mismo número y el mismo texto.
- **Estrés:** 600 operaciones al azar de 19 tipos (543 hechas y 57 rechazadas por reglas del negocio, como falta
  de stock). Después de cada una los datos siguieron siendo válidos, y al final recargar y respaldar/restaurar no
  cambió nada.
- **Teléfono angosto (320 px)**, tema oscuro con contraste suficiente, imprimir, PDF con y sin "compartir",
  fotos de 300 y 400 px.

## 7. Errores encontrados y corregidos
1. La búsqueda del historial de inventario todavía podía fallar con un producto sin nombre (otro caso de
   D4-23). Corregida.
2. El botón "Mostrar más" usaba el mismo atributo que el "+" del carrito. No interferían (están en zonas
   distintas), pero se separaron para evitar errores futuros.
3. Ajustes de las propias pruebas: selectores, datos sin variedad suficiente y la fila de categorías, que se
   desliza a propósito.

**Comportamiento curioso de la app original, conservado:** un pedido sin fecha de entrega cuenta en "Pedidos (N)"
pero no aparece en ningún grupo de la lista. Orisma hace lo mismo (Etapa 2: no cambiar comportamientos sin
autorización). Con la app normal no ocurre, porque el pedido exige fecha. Es candidato a corregir si lo autorizas.

## 8. Riesgos pendientes
- **No probado en un teléfono real** (Android ni iPhone). Mitigación: copia de prueba y `02-guia-prueba-en-telefono.md`.
- Siguen abiertas las 9 decisiones comerciales y V1–V4: se conserva el comportamiento actual.
- Datos sin cifrar (D4-25), como en la original.

## 9. Documentación
- Este informe y `01-cobertura.md`, con las 111 funciones y la prueba de cada una.
- `02-guia-prueba-en-telefono.md`.
- El plan de publicación actualizado y el `README.md` del proyecto.

## 10. Cómo continuar (cada paso requiere autorización)
1. **Copia de prueba:** publicar la carpeta `prueba/` en el sitio para probar en el teléfono. No toca la app actual.
2. **Prueba en el teléfono** con la guía. Corregir lo que aparezca.
3. **Publicación** según `etapa-9/01-plan-de-publicacion.md`: unir la rama con la que publica GitHub Pages,
   con respaldo previo y con la vuelta atrás documentada.
