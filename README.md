# Orisma 2.0

Reconstrucción de la app de administración del negocio (antes "Cuentas"): clientes, inventario, ventas,
pedidos/apartados, facturas, gastos, créditos y reportes. Funciona sin conexión y guarda los datos en el
propio dispositivo.

> **Estado:** en construcción por etapas. Ver [`docs/orisma-2.0/SEGUIMIENTO.md`](docs/orisma-2.0/SEGUIMIENTO.md).
> La app que se usa hoy sigue en la rama `main` (commit `9300dfa`) y no se modifica hasta la Etapa 10.

No necesita compilación: se publica tal cual (GitHub Pages).

## Estructura

```
index.html        marco de la página y política de seguridad
manifest.json     app instalable
sw.js             funcionamiento sin conexión
assets/icons/     íconos de la app
styles/           variables de diseño, base, marco, componentes, computador, impresión
src/
  app.js          arranque y lista de módulos
  core/           configuración, estado, eventos, navegación, errores, reloj
  ui/             plantillas con escape, formato, hojas, diálogos, avisos, marco
  features/       un módulo por sección (se completan en la Etapa 7)
  (data/, business/, operations/, services/ llegan en las Etapas 5–7)
tests/            pruebas de núcleo (node --test) y de extremo a extremo (Playwright)
tools/            verificación de arquitectura y lista de precarga
docs/orisma-2.0/  documentos de cada etapa
```

Arquitectura completa: [`docs/orisma-2.0/etapa-2/01-arquitectura.md`](docs/orisma-2.0/etapa-2/01-arquitectura.md).

## Trabajar en local

Los módulos de JavaScript no cargan con doble clic (`file://`); hay que servir la carpeta:

```
python3 -m http.server 8000      # y abrir http://localhost:8000
```

## Antes de publicar un cambio

```
node tools/precache.js           # actualiza la lista de archivos sin conexión (y la versión)
npm test                         # pruebas del núcleo + arquitectura
npm run verificar                # reglas de dependencia + lista de precarga al día
npm run test:e2e                 # navegador real (requiere Playwright)
```
