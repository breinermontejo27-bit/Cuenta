# Etapa 1 · Auditoría funcional y técnica · Informe de cierre

## 1. Objetivo
Estudiar por completo la aplicación original y documentar sus funcionalidades, reglas comerciales,
dependencias y problemas, separando lo comprobado al ejecutar de lo solo leído en el código.

## 2. Análisis previo
- Fuente: commit `9300dfa` (`index.html` de 4.141 líneas, `sw.js`, `manifest.json`, 3 íconos). El ZIP de
  referencia no llegó a la sesión; el dueño autorizó usar esta versión.
- Lectura completa del JavaScript (L450–4138) y revisión del CSS.
- Grafo de llamadas generado automáticamente: 98 funciones de nivel superior, 27 variables.

## 3. Archivos involucrados
Solo lectura: `index.html`, `sw.js`, `manifest.json` de `9300dfa`. **No se modificó código.**

## 4. Archivos creados

| Archivo | Contenido |
|---|---|
| `01-inventario-funcionalidades.md` | 111 funcionalidades en 10 áreas, cada una con ubicación y nivel de verificación |
| `02-reglas-comerciales.md` | modelo de datos y ~90 reglas con su fórmula, ubicación y verificación; 9 decisiones para el dueño |
| `03-mapa-dependencias.md` | relaciones entre datos, qué escribe cada operación, qué lee cada pantalla, dependencias externas, duplicaciones y grafo completo de funciones |
| `04-diagnostico-tecnico.md` | 30 hallazgos (2 críticos, 5 altos, 13 medios, 10 bajos), rendimiento medido, lo que conviene conservar y oportunidades de mejora |
| `pruebas/probes.js` | 20 pruebas de ejecución sobre la app original |
| `pruebas/resultados-pruebas.json` | resultado de cada prueba |
| `pruebas/recorrido.js` | recorrido comparativo de 53 pantallas (servirá en las Etapas 7 y 10 para comparar con Orisma 2.0) |
| `pruebas/perf.js` | medición de tiempos con 1.000 y 5.000 ventas |
| `pruebas/graph.js` | generador del grafo de funciones |
| `../SEGUIMIENTO.md` | estado de las 10 etapas |

Todos los datos de prueba son ficticios. No hay datos de clientes reales en el repositorio.

## 5. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| 15 pruebas de hallazgos (T1–T15) | 15 confirmados |
| 5 pruebas de reglas de dinero (R1–R5: crédito, mixto, folio, cancelación, costo promedio) | 5 se comportan como se documenta |
| Recorrido de 53 pantallas con datos de ejemplo | 0 errores de JavaScript |
| Rendimiento con 1.000 y 5.000 ventas | ver Documento 4 §6 |

Entorno: Chromium de escritorio con ventana de 400 px. **No** se probó en un teléfono real ni en Safari/iOS.

## 6. Errores encontrados (resumen)
Críticos: pérdida silenciosa de datos con almacenamiento lleno (D4-10) y ejecución de código desde un respaldo
manipulado (D4-11). Altos: compras desde el producto que restan de la ganancia (D4-01), total de pendientes
calculado de tres formas (D4-02), descuento perdido en pendientes (D4-03), ganancia con impuesto (D4-05) y
anulación que reescribe la caja (D4-08). Detalle completo en el Documento 4.

## 7. Riesgos pendientes
- 28 funcionalidades solo inspeccionadas: necesitan prueba antes de reconstruirlas (lista al final del Documento 1).
- Nueve reglas dudosas esperan decisión del dueño (Documento 2 §15). Mientras tanto se conservan como están.
- Mientras se use la app original, siguen activos los dos riesgos críticos. Recomendación inmediata, sin tocar
  código: descargar un respaldo con frecuencia y no restaurar respaldos de terceros.

## 8. Criterios de aceptación de la etapa
- [x] Todos los módulos y funcionalidades identificados con su ubicación.
- [x] Reglas comerciales documentadas con fórmula.
- [x] Dependencias y relaciones mapeadas.
- [x] Diagnóstico con evidencia; cada hallazgo indica si corregirlo cambia una regla.
- [x] Separado lo probado de lo solo inspeccionado.
- [x] Código original sin modificar.
- [ ] Aprobación del dueño para pasar a la Etapa 2.

## 9. Instrucciones para continuar
1. Revisar los cuatro documentos, en especial el Documento 2 §15 (decisiones) y el Documento 4.
2. Responder las decisiones que se quieran tomar ya (pueden quedar abiertas hasta la Etapa 6).
3. Autorizar el inicio de la Etapa 2 (diseño de arquitectura).

Para repetir las pruebas:
```
git archive 9300dfa | tar -x -C /tmp/orig
npm install playwright acorn eslint-scope@7
node docs/orisma-2.0/etapa-1/pruebas/probes.js /tmp/orig
```
