# Etapa 2 · Diseño de arquitectura · Informe de cierre

## 1. Objetivo
Definir la arquitectura definitiva de Orisma 2.0 antes de programar: capas, responsabilidades, comunicación
entre módulos, convenciones y estructura de carpetas.

## 2. Análisis previo
- Base: los cuatro documentos de la Etapa 1 (111 funcionalidades, 92 reglas, 98 funciones, 30 hallazgos).
- Prueba de viabilidad de IndexedDB en Chromium (`pruebas/indexeddb-spike.js`):

| Comprobación | Resultado |
|---|---|
| Transacción que escribe venta + stock y falla | se deshacen las dos; el stock queda en 10 |
| Imagen guardada como archivo binario | correcto |
| Escribir 50 MB | sin error (hoy el límite es ~5 MB) |
| Cuota disponible (Chromium de escritorio) | ~10.700 MB. En teléfonos es una parte del espacio libre; sigue siendo muy superior a 5 MB |
| Pedir almacenamiento persistente | disponible |
| `localStorage` existente | intacto |

## 3. Archivos involucrados
Solo documentación. **No se modificó ni se creó código de la app.**

## 4. Archivos creados

| Archivo | Contenido |
|---|---|
| `01-arquitectura.md` | Documento maestro: 11 decisiones de fondo, capas y reglas de dependencia, comunicación (operaciones, reglas, eventos, registro de módulos), núcleo, datos, reglas, servicios, interfaz, errores, seguridad, sin conexión, pruebas, convenciones y extensibilidad |
| `02-estructura-carpetas.md` | Estructura definitiva (87 archivos de código en `src/`), cambios respecto a la propuesta inicial con su motivo, y destino de los archivos actuales |
| `03-trazabilidad.md` | Destino de cada una de las 98 funciones originales y módulo responsable de cada una de las 92 reglas |
| `pruebas/indexeddb-spike.*` | Prueba de viabilidad de IndexedDB |
| `pruebas/verificar-documentos.py` | Verifica que no falte ninguna función ni regla y que todo archivo citado exista en la estructura |

## 5. Decisiones principales

1. **Sin framework ni compilación**: JavaScript estándar con módulos. Se publica igual que hoy.
2. **IndexedDB** como almacenamiento, con transacciones; `localStorage` no se borra hasta verificar la migración.
3. **Reglas comerciales como funciones puras** en `business/`, probables sin abrir la app.
4. **Nueva capa `operations/`**: cada acción del negocio se guarda completa o no se guarda.
5. **Mismos nombres de campos** que hoy: compatibilidad con datos y respaldos actuales.
6. **Las reglas contradictorias se conservan** con nombre propio hasta que decidas (Etapa 1, Documento 2 §15).
7. **Librerías del PDF dentro del proyecto**: el PDF funcionará sin conexión.
8. **La división en módulos del commit `1480bd7` no se usa como base**; se reemplaza en la Etapa 4.

## 6. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| Viabilidad de IndexedDB (6 comprobaciones) | 6/6 correctas |
| Trazabilidad de funciones | 98/98 con destino |
| Trazabilidad de reglas | 92/92 con módulo responsable |
| Archivos citados presentes en la estructura | 79/79 |

## 7. Riesgos pendientes
- **Dominio de publicación:** si Orisma 2.0 se publica en un dominio distinto al de la app actual, no podrá
  leer los datos actuales directamente; la migración se haría con un archivo de respaldo (`02-estructura-carpetas.md`, final).
- **Cuota en teléfonos:** se midió en escritorio. Se medirá en un teléfono real en la Etapa 5.
- **Safari/iOS:** IndexedDB funciona, pero Safari puede borrar datos de sitios no usados en 7 días si la app no
  está instalada en la pantalla de inicio. Se mitigará con almacenamiento persistente, respaldo automático y
  recordatorio de respaldo (Etapas 5 y 8).
- Las 9 decisiones de la Etapa 1 siguen abiertas; no bloquean hasta la Etapa 6.

## 8. Criterios de aceptación
- [x] Responsabilidades separadas: núcleo, interfaz, reglas, datos, almacenamiento, servicios, seguridad, validaciones, reportes, errores.
- [x] Comunicación entre módulos definida (operaciones, eventos, registro de módulos).
- [x] Convenciones de nombres, archivos, responsabilidades y dependencias.
- [x] Se puede agregar un módulo sin modificar los existentes (una línea en `src/app.js`).
- [x] Estructura definitiva de carpetas, sin carpetas vacías.
- [x] Cada función y regla original tiene destino.
- [ ] Aprobación del dueño para pasar a la Etapa 3.

## 9. Instrucciones para continuar
1. Revisar `01-arquitectura.md` (sobre todo §1, decisiones) y `02-estructura-carpetas.md`.
2. Confirmar en qué dirección está publicada hoy la app, para el punto de riesgo del dominio.
3. Autorizar la Etapa 3: sistema de diseño, componentes y prototipos de las pantallas principales.
