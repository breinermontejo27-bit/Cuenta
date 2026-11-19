# Etapa 4 · Construcción del núcleo · Informe de cierre

## 1. Objetivo
Construir la base de Orisma 2.0: arranque, configuración, navegación, estado, eventos, errores, avisos y
comunicación entre módulos, sin reglas comerciales. Resultado: una app que abre, navega y funciona sin conexión.

## 2. Análisis previo
- Arquitectura (Etapa 2): capas, reglas de dependencia, registro de módulos, eventos fijos.
- Diseño (Etapa 3): variables y componentes del prototipo, verificados en contraste y tamaño táctil.
- Nada de datos todavía: las colecciones arrancan vacías. La carga desde IndexedDB y la migración son de la Etapa 5.

## 3. Archivos

**Creados**

| Archivo | Responsabilidad |
|---|---|
| `index.html` | marco, política de seguridad de contenido (sin código ni estilos en línea, sin recursos externos), íconos |
| `sw.js` | sin conexión: precarga versionada, navegación con la página guardada, **nunca** devuelve `index.html` a un archivo (D4-12), actualización solo al aceptar |
| `src/app.js` | arranque y lista de módulos |
| `src/core/config.js` | constantes, colecciones, ajustes por defecto copiados de la versión original |
| `src/core/state.js` | datos en memoria, ajustes de solo lectura, estado de la interfaz |
| `src/core/events.js` | 5 eventos con nombre fijo |
| `src/core/navigation.js` | rutas `#/modulo/subvista`, pila de hojas con el historial (botón atrás) |
| `src/core/errors.js` | tipos de error, captura global, registro de los últimos 50, mensajes entendibles |
| `src/core/clock.js` | fecha de hoy (fijable en pruebas) |
| `src/ui/html.js` | plantillas con escape automático, imágenes solo propias (D4-11) |
| `src/ui/format.js` | dinero, fechas, folio, iniciales, medio de pago: **idénticos** a la versión original |
| `src/ui/overlays/sheet.js`, `dialog.js` | hojas/paneles y confirmaciones: foco, Escape, tocar fuera, atrás |
| `src/ui/notifications/toast.js` | avisos (reemplazan `alert`); los graves no se cierran solos |
| `src/ui/layouts/app-shell.js` | marco: barra lateral, encabezado, buscador, acción principal, pestañas, subvistas |
| `src/ui/components/list.js` | estado vacío |
| `src/features/*/index.js`, `settings/settings-menu.js` | registro de los 7 módulos (pestaña, subvistas, buscador, acción); pantalla "se reconstruye en la Etapa 7" |
| `src/precache-list.js` | generado: archivos y versión para el service worker |
| `styles/*.css` (6) | sistema de diseño de la Etapa 3 |
| `tools/check-architecture.js`, `tools/precache.js` | verificaciones automáticas |
| `tests/core/*.test.js`, `tests/arquitectura.test.js`, `tests/e2e/nucleo.e2e.cjs` | pruebas |
| `package.json` | solo comandos (sin dependencias) |
| `docs/package.json` | mantiene en formato CommonJS los scripts de pruebas de las Etapas 1–3 |

**Modificados:** `manifest.json` (rutas de íconos; orientación libre para tableta/computador), `README.md`.
**Movidos:** íconos a `assets/icons/`.
**Eliminados (autorizado en la Etapa 2, A9):** `css/` y `js/` del commit `1480bd7`. Siguen en el historial de git.

## 4. Cambios respecto a lo diseñado

| Diseño | Implementado | Motivo |
|---|---|---|
| `tests/business/` | `tests/core/` por ahora | aún no hay reglas; `tests/business/` llega en la Etapa 6 |
| `src/precache-list.js` como módulo | script clásico (`self.ORISMA_PRECACHE`) | el service worker lo carga con `importScripts` |
| No estaba previsto | `package.json` sin dependencias | permite `npm test` y que Node lea los módulos |
| Al fallar el registro del service worker | se anota en el registro, sin aviso rojo | la app funciona igual; un aviso grave asustaría sin motivo (encontrado en las pruebas) |

## 5. Funcionalidades conservadas
Ninguna regla comercial cambia en esta etapa (no hay reglas todavía). Lo que sí se conserva y se verificó:
- **Formato de dinero, fechas, iniciales y escape de texto idénticos a la versión original**: comparados con copias
  literales de `money`, `fmtDate`, `initials` y `escapeHtml` en 20.000 montos y 1.095 fechas.
- **Ajustes por defecto idénticos** (`completarAjustes` = configuración inicial + `CONFIG_DEFAULTS`).
- Mismas 6 secciones, mismas subvistas, mismos textos del buscador y misma regla de cuándo se ve el botón
  principal (oculto en Reportes y en Inventario › Stock/Historial).

## 6. Pruebas ejecutadas

| Prueba | Resultado |
|---|---|
| `npm test`: núcleo (eventos, estado, ajustes, reloj, errores, rutas, plantillas, formato) + arquitectura | **29/29** |
| `npm run verificar`: reglas de dependencia en 22 archivos y lista de precarga | correcto |
| Verificador de arquitectura con infracciones puestas a propósito | detecta las 4 |
| `npm run test:e2e` (Chromium, teléfono 390 px, computador 1280 px, 320 px) | **25/25** |

Casos de extremo a extremo: arranque sin errores ni bloqueos de seguridad; 6 pestañas; subvistas; buscador y
botón por pantalla; ruta inválida; búsqueda recordada; atrás entre pantallas; recargar conserva la pantalla;
hojas (foco, botón atrás, X, Escape, tocar fuera, botón propio, sin dejar historial basura); confirmación
(aceptar, cancelar, Escape, atrás); avisos normal y grave; error no controlado avisado; Ajustes con resúmenes
reales; cambio de ajustes reflejado; nombres accesibles; disposición de computador; cambiar de sección con hoja
abierta; sin desborde a 320 px; **sin conexión** (abre, navega, y un archivo inexistente no recibe `index.html`);
**versión nueva** (avisa, no se activa sola, al aceptar recarga con la nueva).

## 7. Errores encontrados y corregidos durante la etapa
1. Las rutas sin subvista (`#/inventario`) no se normalizaban (`#/inventario/productos`). Corregido en `navigation.js`.
2. Si el navegador no permite el service worker, aparecía "Algo salió mal". Ahora se anota sin alarmar.
3. Las pruebas de extremo a extremo tenían esperas insuficientes tras navegar (la app estaba bien; la prueba se adelantaba).

## 8. Riesgos pendientes
- Las colecciones están vacías hasta la Etapa 5: la app **todavía no sirve para trabajar**. La versión actual
  sigue en `main`.
- Probado solo en Chromium. Falta un teléfono real (Android y iPhone).
- Decisiones visuales V1–V4 abiertas: el nombre instalado sigue siendo "Cuentas" y los íconos son los actuales.
- `tools/precache.js` debe ejecutarse antes de publicar; si se olvida, `npm test` falla (está cubierto por una prueba).

## 9. Criterios de aceptación
- [x] Inicialización, configuración, navegación, estado, eventos, errores, avisos y comunicación entre módulos.
- [x] El núcleo no contiene reglas comerciales.
- [x] App base funcional y navegable en teléfono y computador, también sin conexión.
- [x] Sin errores de sintaxis; dependencias conectadas y verificadas; módulos se inicializan; pruebas ejecutadas.
- [ ] Aprobación del dueño para pasar a la Etapa 5.

## 10. Instrucciones para continuar
1. Probar la base en el navegador (ver `README.md` de la raíz).
2. Autorizar la Etapa 5: sistema de datos (IndexedDB, esquema, migraciones, importación desde `localStorage`
   sin borrarlo, imágenes y respaldos).
