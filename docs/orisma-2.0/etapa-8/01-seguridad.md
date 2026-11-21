# Etapa 8 · Revisión de seguridad

Alcance: la app corre entera en el teléfono o computador del dueño, sin servidor, sin cuentas y sin nube. Los
riesgos reales son: (1) datos con código malicioso (en la versión anterior o en un respaldo recibido de otra
persona), (2) archivos de respaldo manipulados, (3) otra persona que abre la app en el teléfono, (4) código de
terceros, y (5) fallas que dejan una pantalla inutilizable o hacen perder datos.

**Lo que esta app NO puede proteger** (y no se promete): a alguien que tiene el teléfono desbloqueado y sabe usar
las herramientas del navegador. Puede leer IndexedDB directamente, con o sin PIN. Los datos no están cifrados
(D4-25). Un respaldo descargado es un archivo de texto con los datos de los clientes: hay que guardarlo con cuidado.

## Matriz de controles

| Riesgo | Control | Dónde | Comprobado con |
|---|---|---|---|
| Código inyectado en textos (D4-11) | Toda inserción pasa por `html```, que escapa; `montar()` no acepta texto sin escapar; no hay `seguro()` con datos | `src/ui/html.js` | A1–A3, A7: 6 tipos de inyección en todos los campos; 12 pantallas y todas sus filas abiertas, factura, comprobante, créditos |
| Imágenes falsas (`javascript:`, `data:text/html`, atributos) | `imagenSegura()`: solo `data:image/png|jpeg|webp|gif`, `blob:` o referencia interna | `src/ui/html.js` | A2–A3 (logo, foto, firma dañados), B (respaldo) |
| Color de factura con reglas de estilo | Solo `#rrggbb`; si no, el color por defecto | `invoice-document.js` | A3 |
| Política de seguridad de contenido | `script-src 'self'`, sin código ni estilos en línea, `object-src 'none'`, `form-action 'none'`, imágenes solo propias | `index.html` | A2–A5: cero violaciones en todo el recorrido, incluido el PDF |
| Respaldos manipulados | Validación estricta antes de restaurar; claves `__proto__`/`constructor`/`prototype` rechazadas; esquema futuro rechazado; respaldo automático previo | `src/data/schema.js`, `backup.js` | B: 9 respaldos dañados rechazados sin cambiar nada; el válido sí se restaura |
| Contaminación de prototipos | Claves prohibidas en respaldos y en ajustes antiguos | `schema.js` | B, prueba unitaria |
| Ajustes antiguos dañados bloqueaban guardar (folios, comprobantes) | Al importar, el campo inválido vuelve a su valor por defecto; la copia literal se conserva | `sanearAjustesLegado` | A1, A3 (comprobante con ajustes dañados), prueba unitaria |
| Un registro antiguo incompleto rompía una pestaña (D4-23) | Búsquedas y ordenamientos con `texto()`/`compararTexto()`; listas ausentes tratadas como vacías | `src/business/text.js` y las reglas y pantallas que buscan u ordenan | A7: registros sin nombre, sin fecha, sin productos, con números como texto; cero errores |
| Librerías de terceros desde internet (D4-24) | html2canvas y jsPDF dentro del proyecto, cargadas desde el mismo origen | `assets/vendor/` | A6: cero peticiones a otros servidores; E1: PDF sin conexión |
| Enlaces externos (D4-26) | WhatsApp con `noopener` y número reducido a dígitos | `services/whatsapp.js` | A4 |
| Uso casual del teléfono | PIN opcional (ver abajo) | `services/pin.js`, `operations/lock.js`, `features/settings/lock-*.js` | C1–C11 |
| Errores que solo quedaban en memoria | Registro de diagnóstico guardado en el dispositivo (50 últimos), descargable; nunca se envía | `core/errors.js`, `operations/diagnostics.js` | D1–D2 |

## Bloqueo con PIN (decisión del dueño: "PIN opcional con salida")

- Apagado por defecto. Se activa en Ajustes › Bloqueo con PIN (4 a 8 números, escrito dos veces).
- Se guarda solo una huella PBKDF2-SHA256 con 150.000 iteraciones y sal al azar; nunca el PIN.
- Se pide al abrir la app y al volver tras 5 minutos en segundo plano. Mientras tanto la app no se dibuja:
  ningún dato está en la página (C4) y lo demás queda inerte.
- 5 intentos libres; luego espera de 30 s que se duplica hasta 15 min. La espera se guarda: recargar no la reinicia.
- Cambiar o quitar el PIN desde Ajustes exige el PIN actual.
- "Olvidé mi PIN": escribiendo QUITAR PIN se desactiva el bloqueo. **No borra datos.** Es la salida elegida por
  el dueño. Por eso el PIN es solo contra el uso casual: quien conozca esta salida puede entrar, pero el dueño lo
  notará porque el PIN aparecerá desactivado.
- El PIN no viaja en los respaldos (es del dispositivo, no de los datos) (C11).

## Riesgos que quedan

- Sin cifrado de datos ni de respaldos (D4-25). Cifrar con una contraseña es posible, pero si se olvida, los
  datos se pierden. Se deja como decisión del dueño, fuera de esta etapa.
- GitHub Pages no permite cabeceras propias: no hay `frame-ancestors` (otra web podría mostrar la app dentro de
  un marco). Impacto bajo: la app no tiene sesiones ni acciones que se puedan disparar desde fuera, y los datos
  de cada sitio están separados por el navegador.
- Pruebas hechas en Chromium de escritorio. Falta un teléfono real (Android y iPhone).
