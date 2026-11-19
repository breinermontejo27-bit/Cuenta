# Orisma 2.0 · Seguimiento del proyecto

**Referencia original:** app "Cuentas", commit `9300dfa` del repositorio (equivale al ZIP de referencia;
el dueño autorizó usar esta versión). Se conserva intacta en el historial de git:
`git archive 9300dfa | tar -x -C <carpeta>` la recupera completa.

| Etapa | Nombre | Estado | Entregable |
|---|---|---|---|
| 1 | Auditoría funcional y técnica | Aprobada (2026-11-19) | `etapa-1/` |
| 2 | Diseño de arquitectura | **Terminada — esperando aprobación** | `etapa-2/` |
| 3 | Diseño de interfaz y experiencia de uso | Pendiente | — |
| 4 | Construcción del núcleo | Pendiente | — |
| 5 | Sistema de datos y almacenamiento | Pendiente | — |
| 6 | Motor de reglas comerciales | Pendiente | — |
| 7 | Reconstrucción de módulos | Pendiente | — |
| 8 | Integración y seguridad | Pendiente | — |
| 9 | Optimización y migración | Pendiente | — |
| 10 | Pruebas integrales y estabilización | Pendiente | — |

## Decisiones pendientes del dueño

Las nueve preguntas de `etapa-1/02-reglas-comerciales.md` §15. Hasta que se respondan, Orisma 2.0 conserva el
comportamiento actual en todos esos puntos.

## Trabajo previo a este plan

Antes de recibir el documento maestro se hizo una división del `index.html` en módulos (`css/`, `js/`,
commit `1480bd7`, con comportamiento idéntico verificado en 53 pantallas). No forma parte de las etapas.
Decisión de la Etapa 2 (A9): no se usa como base; se reemplaza en la Etapa 4 y queda en el historial.

## Registro

| Fecha | Etapa | Hecho |
|---|---|---|
| 2026-11-19 | 1 | Auditoría completa: 4 documentos, 20 pruebas de ejecución, recorrido de 53 pantallas, medición de rendimiento. |
| 2026-11-19 | 2 | Arquitectura: documento maestro, estructura definitiva (87 archivos en `src/`), trazabilidad 98/98 funciones y 92/92 reglas, prueba de viabilidad de IndexedDB. |
