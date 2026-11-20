# Etapa 8 · Integración y seguridad · Informe de cierre

## 1. Objetivo
Unir todas las piezas en el arranque real de la app y revisar la seguridad completa: datos maliciosos, respaldos
manipulados, bloqueo local, registro de errores y funcionamiento sin conexión de punta a punta.

## 2. Análisis previo
- Pendientes de etapas anteriores: registro de errores solo en memoria (Etapa 5 §8); bloqueo "a decidir en la
  Etapa 8" (Etapa 1, Documento 4 §4); medidas de seguridad previstas en la Etapa 2 §11.
- **Decisión del dueño (2026-11-20):** PIN opcional, apagado por defecto, que se puede quitar desde la pantalla
  de bloqueo escribiendo una frase. Los datos nunca se borran.
- Revisión del código: todas las inserciones de HTML, imágenes, enlaces externos, lectura de JSON y estilos.

## 3. Archivos

**Creados (8):** `src/services/pin.js`, `src/operations/lock.js`, `src/operations/diagnostics.js`,
`src/features/settings/lock-screen.js`, `src/features/settings/lock-section.js`, `src/business/text.js`,
`tests/core/seguridad.test.js`, `tests/e2e/seguridad.e2e.cjs`. Documentos: este informe y `01-seguridad.md`.

**Modificados (32):** `index.html` (ícono de candado), `src/app.js` (arranque), `src/core/errors.js`,
`src/data/database.js` (`leerMeta`/`guardarMeta`), `src/data/schema.js`, `src/data/legacy-import.js`,
7 archivos de `src/business/` y 10 de `src/features/` (búsquedas y ordenamientos tolerantes),
`invoice-document.js` (color), `backup-section.js` (diagnóstico), `settings-menu.js`, `ui/components/fields.js`,
`ui/format.js`, `styles/components.css`, `package.json`, `src/core/config.js`, `src/precache-list.js`.

**Eliminados:** ninguno.

## 4. Cambios técnicos
- **Arranque integrado:** registro de errores guardado → importación de la versión anterior → datos en memoria →
  PIN (si está activo) → módulos y navegación → service worker. Con PIN, nada de la app se dibuja antes de escribirlo.
- **Bloqueo con PIN:** huella PBKDF2-SHA256 (150.000 iteraciones, sal al azar), espera creciente tras 5 fallos
  que sobrevive a recargar, nuevo pedido tras 5 min en segundo plano, salida "QUITAR PIN". Detalle en `01-seguridad.md`.
- **Registro de errores** persistente (50 últimos, solo en el dispositivo) y descargable en Ajustes › Respaldo.
- **Respaldos:** se rechazan claves que contaminan prototipos (`__proto__`, `constructor`, `prototype`).
- **Ajustes antiguos dañados:** un campo inválido vuelve a su valor por defecto al importar (antes impedía
  guardar ajustes, folios y comprobantes). La copia literal de lo original se conserva.
- **D4-23 corregido:** un registro antiguo sin nombre, sin fecha o sin productos ya no rompe ninguna pantalla.

## 5. Funcionalidades conservadas
Todas. Los cálculos no cambian: las pruebas que comparan con la versión original siguen idénticas (400+400
conjuntos aleatorios, 46 operaciones reales y 9 escenarios completos). Lo único nuevo es el PIN, que el dueño
aprobó, y el registro de errores descargable.

## 6. Pruebas ejecutadas (todas ejecutadas)
| Prueba | Resultado |
|---|---|
| `npm test` (incluye 6 pruebas nuevas de seguridad) | 75/75 |
| `npm run verificar` | arquitectura correcta (98 archivos), precarga al día |
| `seguridad.e2e.cjs` (nueva) | **31/31** |
| `nucleo.e2e.cjs` · `datos.e2e.cjs` · `reglas.e2e.cjs` | 25/25 · 17/17 · 46/46 |
| `modulos.e2e.cjs` (comparación con la original) | 9/9 idénticos |

`seguridad.e2e.cjs`:
- **A.** 6 tipos de inyección en todos los textos, 12 pantallas con todas sus filas abiertas, factura,
  comprobante, créditos, WhatsApp y PDF: nada se ejecuta, cero violaciones de la política de seguridad, cero
  peticiones a otros servidores. Registros incompletos: cero errores.
- **B.** 9 respaldos manipulados rechazados sin cambiar nada; uno válido sí se restaura.
- **C.** 11 casos de PIN.
- **D.** 2 casos del registro de errores.
- **E.** Recorrido completo sin conexión: importar, vender, facturar, PDF y respaldo.

## 7. Errores encontrados y corregidos
1. **Ajustes dañados de la versión anterior bloqueaban guardar** (y con ello folios y comprobantes). Lo
   encontró la prueba A3. Corregido con el saneo al importar.
2. **D4-23 seguía presente:** clientes, inventario, ventas, facturas, gastos y reportes fallaban con un
   registro sin nombre, sin fecha o sin productos. Lo encontró la prueba A7. Corregido.
3. Aviso falso del service worker cuando el navegador lo bloquea sin error. Corregido.
4. Ajustes de las propias pruebas (navegación tras recargar, grupos plegados): no eran fallos de la app.

## 8. Riesgos pendientes
- Datos y respaldos sin cifrar (D4-25): decisión del dueño, fuera de esta etapa.
- Sin `frame-ancestors` en GitHub Pages (impacto bajo, ver `01-seguridad.md`).
- Probado en Chromium de escritorio; falta teléfono real.
- Siguen abiertas las 9 decisiones comerciales y V1–V4 (se conserva el comportamiento actual).

## 9. Documentación
Este informe, `01-seguridad.md` (matriz de controles y alcance real del PIN) y `SEGUIMIENTO.md` actualizado.

## 10. Cómo continuar
1. Revisar y aprobar esta etapa.
2. Etapa 9 (optimización y migración): pantalla de migración, limpieza de imágenes sin uso, rendimiento con
   muchos datos y plan para publicar Orisma en lugar de la app actual sin perder nada.
3. Para repetir las pruebas: `npm test`, `npm run verificar` y `NODE_PATH=$(npm root -g) npm run test:e2e`.
