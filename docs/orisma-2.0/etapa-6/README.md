# Etapa 6 · Motor de reglas comerciales · Informe de cierre

## 1. Objetivo
Separar por completo las reglas comerciales de la interfaz, en funciones que se puedan probar solas, con una
sola fuente de verdad por cálculo, y demostrar que calculan **igual que la versión original**.

## 2. Análisis previo
- 92 reglas documentadas (Etapa 1, Documento 2) y su módulo asignado (Etapa 2, `03-trazabilidad.md`).
- En la versión original, parte de la lógica son funciones sueltas (se pueden copiar y ejecutar) y parte vive
  dentro de botones y formularios (solo se puede comparar operando la app). Se usaron los dos métodos.
- El dueño no respondió las 9 decisiones: **todo se conserva como funciona hoy** (Etapa 2, A7).

## 3. Archivos

**Creados**
- `src/business/`: `numbers.js`, `dates.js`, `payments.js`, `inventory-rules.js`, `sales-rules.js`,
  `orders-rules.js`, `invoicing.js`, `accounting.js`, `clients-rules.js`, `expenses-rules.js`, `validation.js`.
- `tests/business/original/funciones-originales.js` (oráculo: copia literal de 33 funciones del commit `9300dfa`),
  `tests/business/generador.js`, `diferencial.test.js`, `original.test.js`, `reglas.test.js`.
- `tests/e2e/reglas.e2e.cjs`.
- `docs/orisma-2.0/etapa-6/01-motor-de-reglas.md`.

**Modificados:** `package.json` y `src/core/config.js` (versión, comando de pruebas), `src/precache-list.js`.
**Eliminados:** ninguno.

**Cambio respecto a la estructura de la Etapa 2:** se agregan `clients-rules.js` y `expenses-rules.js` para las
reglas de clientes y gastos generales, que no encajaban en los demás archivos.

## 4. Cambios técnicos
- 101 funciones puras: reciben fecha, ajustes y generador de identificadores; no modifican lo que reciben.
- Los registros que arman (ventas, abonos, pendientes, gastos, movimientos) tienen **los mismos campos en el
  mismo orden** que en la versión original.
- Duplicaciones eliminadas: costo promedio (3 copias → 1), reservas (2 → 1), control de stock (12 → 1), etc.
- Las 9 reglas dudosas quedan aisladas con nombre propio (ver `01-motor-de-reglas.md` §2).
- Los textos que llevan dinero o fechas reciben la función de formato desde la pantalla: las reglas no formatean.

## 5. Funcionalidades conservadas
Todos los cálculos de ventas, costos, precios, descuentos, impuestos, pagos, abonos, saldos, créditos, reservas,
inventario, pendientes, entregas, cancelaciones, anulaciones, facturas, comprobantes, caja, flujo y ganancia.
**Única diferencia:** dos casos con datos que la app nunca crea (producto sin campo stock; montos guardados como
texto), en los que la original producía resultados rotos. Ver `01-motor-de-reglas.md` §3.

## 6. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `npm test` (núcleo, datos, arquitectura y reglas) | **69/69** |
| Diferencial con el oráculo: 400 conjuntos aleatorios + 400 enfocados en encargos | 16/16 pruebas |
| Copia literal del oráculo | 1/1 |
| Valores conocidos de la auditoría y diferencias de borde | 9/9 |
| `tests/e2e/reglas.e2e.cjs`: app original operada con clics vs. reglas | **46/46** |
| Mutaciones introducidas a propósito | **14/14 detectadas** (1 no se detectaba al principio: se agregaron datos enfocados en encargos) |
| Regresión: `nucleo.e2e.cjs` y `datos.e2e.cjs` | 25/25 y 17/17 |

## 7. Errores encontrados
- Ninguno en las reglas: todas las diferencias que aparecieron durante las pruebas eran de las propias pruebas
  (códigos aleatorios de un producto recién creado). Se corrigió la comparación, no las reglas.
- La prueba diferencial no detectaba un error en el orden de reserva de encargos porque los datos aleatorios casi
  nunca tenían varios encargos del mismo producto. Se agregó un generador enfocado.

## 8. Riesgos pendientes
- Las reglas todavía no las usa ninguna pantalla: se conectan en la Etapa 7. Hasta entonces la app sigue mostrando
  "Se reconstruye en la Etapa 7".
- Las 9 decisiones siguen abiertas; mientras tanto se replica el comportamiento actual, incluidos sus defectos
  conocidos (D4-01, D4-02, D4-03, D4-05, D4-07, D4-08, D4-09, D4-15, D4-20).
- Las pruebas de navegador usan Chromium; las reglas no dependen del navegador, pero el formato de fechas sí (Etapa 10).

## 9. Criterios de aceptación
- [x] Reglas separadas de la interfaz y probables de forma independiente.
- [x] Cálculos de ventas, costos, precios, descuentos, pagos, abonos, saldos, inventario y validaciones implementados.
- [x] Una única fuente de verdad por operación.
- [x] Resultados iguales a la versión original, comprobados con dos métodos y con pruebas de mutación.
- [ ] Aprobación del dueño para pasar a la Etapa 7.

## 10. Instrucciones para continuar
1. Revisar `01-motor-de-reglas.md` (§2 reglas provisionales, §3 diferencias).
2. Si quieres corregir alguna de las 9 reglas, este es el mejor momento: el cambio es una función y su prueba.
3. Autorizar la Etapa 7: reconstrucción de los módulos (pantallas conectadas a estas reglas y a los datos).
