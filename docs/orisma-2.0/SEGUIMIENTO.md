# Orisma 2.0 · Seguimiento del proyecto

**Referencia original:** app "Cuentas", commit `9300dfa` del repositorio (equivale al ZIP de referencia;
el dueño autorizó usar esta versión). Se conserva intacta en el historial de git:
`git archive 9300dfa | tar -x -C <carpeta>` la recupera completa.

| Etapa | Nombre | Estado | Entregable |
|---|---|---|---|
| 1 | Auditoría funcional y técnica | Aprobada (2026-11-19) | `etapa-1/` |
| 2 | Diseño de arquitectura | Aprobada (2026-11-19) | `etapa-2/` |
| 3 | Diseño de interfaz y experiencia de uso | Aprobada (2026-11-19) | `etapa-3/` |
| 4 | Construcción del núcleo | Aprobada (2026-11-19) | `etapa-4/` + código en la raíz |
| 5 | Sistema de datos y almacenamiento | Aprobada (2026-11-19) | `etapa-5/` + `src/data/` |
| 6 | Motor de reglas comerciales | Aprobada (2026-11-19) | `etapa-6/` + `src/business/` |
| 7 | Reconstrucción de módulos | Aprobada (2026-11-20) | `etapa-7/` + `src/features/`, `src/operations/`, `src/services/` |
| 8 | Integración y seguridad | Aprobada (2026-11-20) | `etapa-8/` |
| 9 | Optimización y migración | Aprobada (2026-11-20) | `etapa-9/` |
| 10 | Pruebas integrales y estabilización | Aprobada (2026-11-20) | `etapa-10/` |

## Decisiones pendientes del dueño

Las nueve preguntas de `etapa-1/02-reglas-comerciales.md` §15. Hasta que se respondan, Orisma 2.0 conserva el
comportamiento actual en todos esos puntos. Desde la Etapa 6 cada una está aislada en una función (`etapa-6/01-motor-de-reglas.md` §2).

## Datos confirmados por el dueño

- 2026-11-20: bloqueo con PIN opcional, apagado por defecto, que se puede quitar desde la pantalla de bloqueo escribiendo QUITAR PIN (sin borrar datos).
- La app se publica en `breinermontejo27-bit.github.io/Cuenta`. Orisma 2.0 se publicará en el mismo dominio, así que la migración podrá leer los datos actuales de `localStorage` directamente.

## Decisiones visuales pendientes

V1–V4 en `etapa-3/01-sistema-de-diseno.md` §11. Mientras no se respondan, la app instalada conserva el nombre "Cuentas" y los íconos actuales.

## Trabajo previo a este plan

Antes de recibir el documento maestro se hizo una división del `index.html` en módulos (`css/`, `js/`,
commit `1480bd7`, con comportamiento idéntico verificado en 53 pantallas). No forma parte de las etapas.
Decisión de la Etapa 2 (A9): no se usa como base; se reemplaza en la Etapa 4 y queda en el historial.

## Registro

| Fecha | Etapa | Hecho |
|---|---|---|
| 2026-11-19 | 1 | Auditoría completa: 4 documentos, 20 pruebas de ejecución, recorrido de 53 pantallas, medición de rendimiento. |
| 2026-11-19 | 2 | Arquitectura: documento maestro, estructura definitiva (87 archivos en `src/`), trazabilidad 98/98 funciones y 92/92 reglas, prueba de viabilidad de IndexedDB. |
| 2026-11-19 | 3 | Sistema de diseño, 16 pantallas prototipadas, 25 capturas; contraste 38/38 AA, sin errores ni desbordes. |
| 2026-11-19 | 4 | Núcleo: app base navegable en teléfono y computador, sin conexión y con actualización controlada; 29/29 pruebas de núcleo y 25/25 de extremo a extremo. Se eliminan `css/` y `js/` (A9). |
| 2026-11-19 | 5 | Datos: IndexedDB con transacciones, imágenes aparte, importación verificada registro por registro sin tocar localStorage, respaldos compatibles en ambos sentidos con la app original; 43/43 pruebas, 17/17 de datos y 25/25 de núcleo en navegador. |
| 2026-11-19 | 6 | Motor de reglas: 101 funciones puras; iguales a la versión original en 400+400 conjuntos aleatorios (oráculo literal) y 46 operaciones reales en la app original; 14/14 mutaciones detectadas; 69/69 pruebas. |
| 2026-11-19 | 7 | Módulos reconstruidos (55 archivos nuevos): 9/9 escenarios con datos idénticos a la versión original operando ambas apps; 69/69, 25/25, 17/17 y 46/46 pruebas; recorrido sin errores en teléfono y computador. |
| 2026-11-20 | 8 | Integración y seguridad: arranque integrado, PIN opcional, registro de errores persistente, saneo de ajustes dañados, D4-23 corregido; 31/31 pruebas de seguridad, 75/75 unitarias y todas las anteriores iguales. |
| 2026-11-20 | 9 | Optimización y migración: listas 10–20 veces más rápidas que la original con 5.000 ventas; paso real desde la app instalada comprobado; aviso y "traer de nuevo" si la versión anterior cambia; limpieza de imágenes sin uso; plan de publicación y de vuelta atrás. 13/13 de migración, 77/77 unitarias y todas las anteriores iguales. |
| 2026-11-20 | 10 | Pruebas integrales: 111/111 funciones con prueba ejecutada; reportes, búsquedas y mensajes idénticos a la original pantalla contra pantalla; estrés de 600 operaciones; 3 rondas completas sin fallos; copia de prueba para el teléfono. Versión 2.0.0-rc.1, lista para publicar con autorización. |
| 2026-11-20 | 10 | El dueño aprueba la Etapa 10 y autoriza la copia de prueba. Solicitud de cambios #2 (rama `claude/copia-de-prueba`): agrega solo `prueba/` a `main`; la app actual no cambia. Pendiente: que el dueño la una y pruebe en su teléfono. La publicación definitiva de Orisma requiere otra autorización. |
| 2026-11-21 | Ajuste visual | Estilo 1 y factura A aprobados por el dueño y aplicados (rama `claude/orisma-ajuste-visual`, 2.0.0-rc.2): Inicio, navegación de 5 destinos, listas, detalles, reportes, formularios y factura como hoja. Se corrigió la impresión (salía en blanco). Reglas, cálculos y datos sin cambios: todas las pruebas, incluidas las comparaciones con la original, pasan. Informe en `ajuste-visual/`. |
| 2026-11-21 | Ajuste visual | Solicitud de cambios #3 (rama `claude/copia-de-prueba-rc2`): actualiza solo `prueba/` a la 2.0.0-rc.2. Corrige además el aviso falso de "versión nueva" en la primera instalación. Pendiente: que el dueño la una y revise en su teléfono. |
| 2026-11-21 | Ajuste visual | Dos ajustes autorizados por el dueño (2.0.0-rc.3): producto nuevo con 0 unidades (no se vende sin stock; casilla "Es un servicio") y forma de pago visible en el detalle de pedidos y encargos. Todas las pruebas pasan (24/24 funciones; comparaciones con la original idénticas). |
| 2026-11-21 | Ajuste visual | El dueño unió la #3 (copia 2.0.0-rc.2). Solicitud de cambios #4 (rama `claude/copia-de-prueba-rc3`): actualiza solo `prueba/` a la 2.0.0-rc.3. |
| 2026-11-21 | Instalación | El dueño autoriza instalar. La prueba del escenario real encontró un aviso falso de "versión nueva" y un caché viejo que reaparecía; corregidos en la 2.0.0-rc.4 con una prueba nueva (instalación 9/9). Toda la batería pasa. Solicitud de instalación preparada (rama `claude/instalar-orisma`). |
| 2026-11-21 | Instalación | Solicitud de cambios #5 (rama `claude/instalar-orisma`): instala Orisma 2.0.0-rc.4 en la dirección principal. Escenario real comprobado 9/9 contra el `main` actual. Pendiente: respaldo del dueño y unión. |
| 2026-11-27 | Actualización contable | Rama `claude/estado-resultados` (2.0.0-rc.5): la compra desde el producto se registra como compra de inventario (ya no resta utilidad), con forma de pago; botón "Estado de resultados" en Reportes › Resumen con comparación mensual, PDF, compartir e impresión. Registros antiguos detectados, sin modificar (requiere autorización). Toda la batería pasa, más 13 unitarias y 16 de navegador nuevas. Informe en `actualizacion-contable/`. Sin unir a `main`. |
| 2026-11-27 | Instalación | Autorizada por el dueño. Solicitud #6 (rama `claude/instalar-rc5`, 13 archivos de la app) unida a `main`: Orisma 2.0.0-rc.5 publicada en la dirección principal (GitHub Pages correcto). Actualización desde la rc.4 probada: aviso de versión nueva y datos intactos. `prueba/` sin cambios. |
