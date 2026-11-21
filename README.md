# Orisma 2.0

Reconstrucción de la app de administración del negocio (antes "Cuentas"): clientes, inventario, ventas,
pedidos/encargos/apartados, facturas, gastos, créditos y reportes. Funciona sin conexión y guarda los datos en
el propio dispositivo. No usa servidores, cuentas ni nube.

> **Estado:** versión candidata `2.0.0-rc.1`, terminada y probada (Etapa 10). Todavía **no** reemplaza a la app
> publicada: la app que se usa hoy sigue en `main` (commit `9300dfa`). Cómo publicarla y cómo volver atrás:
> [`docs/orisma-2.0/etapa-9/01-plan-de-publicacion.md`](docs/orisma-2.0/etapa-9/01-plan-de-publicacion.md).
> Avance por etapas: [`docs/orisma-2.0/SEGUIMIENTO.md`](docs/orisma-2.0/SEGUIMIENTO.md).

No necesita compilación: se publica tal cual (GitHub Pages).

## Estructura

```
index.html        marco de la página y política de seguridad (CSP)
manifest.json     app instalable (mismo nombre e íconos que la app anterior)
sw.js             funcionamiento sin conexión y actualizaciones
assets/           íconos y librerías del PDF (html2canvas, jsPDF) incluidas en el proyecto
styles/           variables de diseño, base, marco, componentes, factura, computador, impresión
src/
  app.js          arranque: datos → PIN → módulos → service worker → mantenimiento
  core/           configuración, estado, eventos, navegación, errores, reloj
  data/           IndexedDB, esquema, importación de la versión anterior, respaldos, imágenes
  business/       reglas comerciales puras (cálculos idénticos a la versión original)
  operations/     cada acción del usuario: valida, calcula y guarda en una sola transacción
  services/       imágenes, PDF, WhatsApp, contactos, descargas, PIN
  ui/             plantillas con escape, formato, hojas, diálogos, avisos, componentes
  features/       un módulo por sección (clientes, inventario, ventas, facturas, gastos, reportes, ajustes…)
tests/            pruebas unitarias (node --test), de navegador (Playwright) y de rendimiento
tools/            verificación de arquitectura y lista de precarga
docs/orisma-2.0/  documentos de cada etapa
```

Arquitectura: [`docs/orisma-2.0/etapa-2/01-arquitectura.md`](docs/orisma-2.0/etapa-2/01-arquitectura.md).
Seguridad: [`docs/orisma-2.0/etapa-8/01-seguridad.md`](docs/orisma-2.0/etapa-8/01-seguridad.md).

## Trabajar en local

Los módulos de JavaScript no cargan con doble clic (`file://`); hay que servir la carpeta:

```
python3 -m http.server 8000      # y abrir http://localhost:8000
```

## Antes de publicar un cambio

```
node tools/precache.js                     # actualiza la lista de archivos sin conexión (y la versión)
npm test                                   # reglas, datos, núcleo, seguridad y arquitectura
npm run verificar                          # reglas de dependencia + lista de precarga al día
NODE_PATH=$(npm root -g) npm run test:e2e  # navegador real; compara con la app original (requiere Playwright y git)
NODE_PATH=$(npm root -g) npm run rendimiento
```
