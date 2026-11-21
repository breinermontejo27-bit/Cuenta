# Etapa 3 · Diseño de interfaz y experiencia de uso · Informe de cierre

## 1. Objetivo
Diseñar el sistema visual completo de Orisma 2.0 (colores, tipografía, componentes, disposición en teléfono y
computador) y prototipar las pantallas principales, sin alterar ningún proceso comercial.

## 2. Análisis previo
- Interfaz actual (Etapa 1): una columna de 560 px, símbolos de texto como íconos, 24 `alert()`, errores sin
  mensaje, sin diseño para computador, botón atrás que cierra la app.
- Restricciones de la Etapa 2: sin librerías externas, funcionamiento sin conexión, escape automático, CSP.

## 3. Archivos involucrados
Solo documentación y prototipo. **No se modificó el código de la app.**

## 4. Archivos creados

| Archivo | Contenido |
|---|---|
| `01-sistema-de-diseno.md` | principios, color, tipografía, espacios, íconos, disposición por tamaño, 22 componentes, lenguaje, accesibilidad, qué cambia y qué no, 4 decisiones visuales |
| `02-pantallas-y-flujos.md` | 16 pantallas prototipadas con su funcionalidad de origen, flujos principales comparados con hoy, mapa de navegación |
| `prototipo/tokens.css` | variables de diseño (claro y oscuro) |
| `prototipo/componentes.css` | componentes y marco adaptable |
| `prototipo/index.html`, `prototipo.js` | prototipo navegable con datos ficticios y 22 íconos propios |
| `capturas/` | 25 capturas: 16 de teléfono, 5 de computador, 4 en tema oscuro |
| `pruebas/contraste.js` | verificación de contraste WCAG |
| `pruebas/capturas.js` | capturas + verificación de errores, desborde a 320 px y tamaño de controles |

## 5. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| Contraste WCAG 2.1 AA, 19 combinaciones × 2 temas | 38/38 cumplen (mínimo 4,68:1 en texto; 3,24:1 en contornos) |
| Errores de JavaScript en 16 pantallas | ninguno |
| Desplazamiento horizontal a 320 px de ancho | ninguno |
| Controles tocables de menos de 32 px | ninguno (los 4 encontrados en la primera versión se corrigieron) |
| Revisión visual de las capturas | corregidos: botón duplicado en teléfono, textos cortados, montos partidos en dos líneas, choque de nombres de estilo en la insignia de poco stock |

Entorno: Chromium (390 × 844 y 1280 × 800). No se probó en un teléfono real ni en Safari.

## 6. Riesgos pendientes
- Los campos de fecha muestran el formato del navegador; en las capturas aparece en inglés porque el navegador
  de pruebas está en inglés. En un teléfono en español se verá en español.
- Las pantallas no prototipadas (lista en `02-pantallas-y-flujos.md` §1) se diseñan en la Etapa 7 con estos componentes.
- Decisiones visuales V1–V4 (`01-sistema-de-diseno.md` §11) y las 9 decisiones de reglas de la Etapa 1 siguen abiertas.

## 7. Criterios de aceptación
- [x] Sistema visual completo: color, tipografía, espacio, íconos, componentes, estados.
- [x] Adaptación a teléfono y computador definida y probada.
- [x] Prototipos de las pantallas principales.
- [x] Ventanas emergentes, confirmaciones y mensajes de error uniformes.
- [x] Cada cambio clasificado; ninguno altera procesos comerciales.
- [x] Accesibilidad verificada (contraste, tamaño táctil, foco, roles).
- [ ] Aprobación del dueño para pasar a la Etapa 4.

## 8. Instrucciones para continuar
1. Ver las capturas en `capturas/` (o abrir el prototipo).
2. Responder las decisiones visuales V1–V4.
3. Autorizar la Etapa 4: construcción del núcleo (primera etapa con código).
