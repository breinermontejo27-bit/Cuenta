# Etapa 5 · Sistema de datos y almacenamiento · Informe de cierre

## 1. Objetivo
Una capa de datos independiente y confiable: IndexedDB como almacenamiento principal, acceso centralizado,
transacciones, validación, migraciones de estructura, imágenes, respaldos e importación de los datos actuales
sin borrar `localStorage`.

## 2. Análisis previo
- Problemas a resolver (Etapa 1): pérdida silenciosa al llenarse el almacenamiento (D4-10, crítico), respaldo
  manipulado que ejecuta código (D4-11, crítico), restauración sin copia previa (D4-14), sin transacciones ni
  versión de esquema.
- Viabilidad de IndexedDB comprobada en la Etapa 2.

## 3. Archivos

**Creados:** `src/data/schema.js`, `database.js`, `migrations.js`, `files.js`, `legacy-import.js`, `backup.js`;
`src/operations/backup.js`; `src/services/export.js`; `src/features/settings/backup-section.js`;
`tests/data/data.test.js`; `tests/e2e/datos.e2e.cjs`; `docs/orisma-2.0/etapa-5/01-sistema-de-datos.md`.

**Modificados:** `src/app.js` (carga de datos al arrancar), `src/core/state.js` (direcciones de imágenes),
`src/ui/html.js` (`imagenSegura` acepta referencias `archivo:`), `src/features/settings/settings-menu.js`
(abre Respaldo), `src/core/config.js` y `package.json` (versión), `styles/components.css` (3 estilos),
`src/precache-list.js` (regenerado).

**Eliminados:** ninguno.

## 4. Cambios técnicos
Detalle completo en `01-sistema-de-datos.md`. En resumen:
- Una fila por registro con su posición: se conserva el orden de las listas de la versión original.
- `guardarCambios()`: recibe listas completas (como el código original), escribe solo lo que cambió, todo en una
  transacción; la memoria se actualiza solo si se confirma.
- Imágenes aparte, en binario, deduplicadas por huella; nunca se alteran.
- Importación con los 8 pasos del documento maestro y verificación registro por registro.
- Respaldo formato 3, legible por la app original (camino de regreso); acepta el formato 2.
- Validación estricta de respaldos externos; copia automática antes de restaurar (últimas 5).
- Errores de almacenamiento siempre visibles.
- Ajustes › Respaldo ya funciona: cantidades guardadas, espacio usado, origen de los datos, descargar, restaurar
  y copias automáticas.

## 5. Funcionalidades conservadas
- **Mismos campos y valores** en todos los registros: lo importado es idéntico al original (comprobado).
- **Mismo orden** de las listas.
- **Respaldo:** mismo requisito mínimo para aceptar un archivo (RB-02), misma confirmación con cantidades (RB-04)
  y misma mezcla de configuración al restaurar (RB-03, incluido que restaurar un respaldo con firma vacía
  borra la firma, como en la original).
- Los respaldos de la versión original se pueden restaurar en Orisma y los de Orisma en la versión original.

## 6. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `npm test` (núcleo + datos + arquitectura) | **43/43** |
| `tests/e2e/datos.e2e.cjs`, app original y Orisma en el mismo dominio | **17/17** |
| `tests/e2e/nucleo.e2e.cjs` (núcleo, repetida con la carga de datos) | **25/25** |
| Verificación de arquitectura | 31 archivos, sin infracciones |

Casos de datos destacados:
- La **app original** crea datos reales (cliente nuevo, producto con **foto subida por su formulario**, venta a
  crédito con abono) y Orisma los importa **idénticos registro por registro**, con caracteres `< " >`, orden y fotos.
- `localStorage` queda **byte a byte igual**; la copia original de las 7 claves es literal.
- Reabrir no vuelve a importar ni duplica.
- Respaldo de Orisma → **restaurado en la app original** con los mismos datos.
- Respaldo de la app original → restaurado en Orisma, con copia automática previa y mezcla de ajustes igual que la original.
- Respaldo manipulado (`onerror`, ids con comillas): rechazado, sin ejecutar código, sin cambiar nada.
- `localStorage` con JSON dañado o ids repetidos: no importa nada, avisa, deja todo intacto.
- Escritura con error a mitad: no queda nada guardado ni cambia la memoria.
- **Volumen:** 1.500 clientes, 1.000 productos con 200 fotos y 5.000 ventas (3,5 millones de caracteres,
  casi el límite de `localStorage`): migración, verificación y carga en **≈1,1 s**, idéntica, 200 fotos guardadas una vez.

Entorno: Chromium de escritorio. **No probado aún en un teléfono real** (Android ni iPhone).

## 7. Errores encontrados y corregidos durante la etapa
1. Al restaurar, los ajustes actuales tenían sus imágenes como referencias que dejan de existir al reemplazar
   todo. Se corrigió antes de probar: se mezclan con la copia completa (con imágenes).
2. `detectarOrigen` contaba como presente una clave ausente (`undefined`). Corregido.

## 8. Riesgos pendientes
- **La importación ya se ejecuta al abrir esta rama.** Mientras Orisma no se publique (Etapa 10) no afecta a la
  app en uso. Después de importar, lo que se haga en Orisma ya no se refleja en `localStorage` (y viceversa):
  durante la transición se debe usar una sola de las dos apps. La Etapa 9 añade una pantalla de migración.
- Imágenes que dejan de usarse no se borran todavía (limpieza en la Etapa 9).
- El registro de errores sigue en memoria (se guardará en la Etapa 8).
- Safari/iOS puede borrar datos de sitios no instalados: se pide almacenamiento persistente; falta probar en iPhone.
- Decisión 9 (mezclar o reemplazar ajustes al restaurar) sigue abierta; se conserva el comportamiento original.

## 9. Criterios de aceptación
- [x] Acceso centralizado, estructura de almacenes, identificadores únicos, relaciones verificadas.
- [x] Validaciones, transacciones, control de errores, migraciones de estructura.
- [x] Imágenes y archivos; sistema de respaldo.
- [x] Datos locales, sin nube ni servicios externos.
- [x] `localStorage` no se borra ni se modifica; la migración se verifica registro por registro.
- [ ] Aprobación del dueño para pasar a la Etapa 6.

## 10. Instrucciones para continuar
1. Revisar `01-sistema-de-datos.md`.
2. Autorizar la Etapa 6: motor de reglas comerciales (`src/business/`), con pruebas que comparan cada cálculo
   con la versión original. Es buen momento para responder las 9 decisiones de la Etapa 1 (Documento 2 §15),
   porque ahí se implementan.
