# Etapa 9 · Plan de publicación de Orisma (reemplazar la app actual sin perder nada)

**Este plan NO se ejecuta en esta etapa.** Orisma se publica solo con la aprobación del dueño, después de las
pruebas integrales de la Etapa 10.

## Cómo pasa cada teléfono de "Cuentas" a Orisma (comprobado en `migracion.e2e.cjs`, M1–M5)
1. Orisma se publica en la **misma dirección** (`breinermontejo27-bit.github.io/Cuenta/`), con el mismo
   `manifest.json` (nombre "Cuentas", `start_url` y `scope` iguales). El ícono instalado en el teléfono sigue
   funcionando y abre Orisma.
2. La próxima vez que el dueño abra la app **con conexión**, el service worker de la app anterior (que primero
   busca en internet) entrega Orisma.
3. Orisma trae los datos de `localStorage` (Etapa 5): copia literal, verificación registro por registro, sin
   borrar ni modificar nada de lo anterior.
4. El service worker de Orisma reemplaza al anterior en ese momento (primera instalación, sin esperar) y borra
   el caché viejo `cuentas-v3`. Desde ahí Orisma funciona sin conexión.
5. Si ese primer arranque es **sin conexión**, abre la app anterior tal cual (con sus datos). El paso ocurre la
   próxima vez que haya conexión.

## Si se sigue usando la app anterior después de importar
Puede pasar si un teléfono abre la app vieja sin conexión después de que otro ya pasó a Orisma, o durante
pruebas. Orisma lo detecta al abrir (compara la huella de los datos anteriores con la del momento de importar) y
avisa: **"La versión anterior de la app tiene cambios que Orisma no tiene"**. En Ajustes › Versión anterior se ve
la comparación y se pueden **traer de nuevo** los datos anteriores. Lo que había en Orisma se guarda antes en una
copia automática. Orisma no mezcla las dos versiones por su cuenta: si se registraron cosas en las dos, hay que
decidir a mano (V1–V4 en `migracion.e2e.cjs`).

## Pasos para publicar (Etapa 10, con aprobación)
0. Recomendado: probar antes la copia de prueba en el teléfono (`etapa-10/02-guia-prueba-en-telefono.md`).
1. Respaldo: el dueño descarga un respaldo desde la app actual (Ajustes › Respaldo) y lo guarda fuera del teléfono.
2. Verificar en la rama: `npm test`, `npm run verificar`, `NODE_PATH=$(npm root -g) npm run test:e2e`.
3. Unir la rama de Orisma con la rama que publica GitHub Pages (por solicitud de cambios, revisada).
4. Abrir la dirección pública en el teléfono con conexión. Debe aparecer el aviso "Se trajeron tus datos…" y
   las mismas cantidades que en la app anterior.
5. Revisar en Ajustes › Versión anterior que diga que los datos no cambiaron.
6. Usar solo Orisma desde ese momento.

## Volver atrás (si algo saliera mal)
- Los datos de la app anterior **siguen intactos** en el navegador: Orisma nunca los borra ni los modifica.
- Para volver: publicar otra vez los archivos del commit `9300dfa` (`git revert` de la unión). La app anterior
  vuelve a abrir con sus datos de siempre.
- Lo registrado en Orisma después del cambio **no** está en la app anterior. Para llevarlo: Orisma › Ajustes ›
  Respaldo › Descargar, y en la app anterior › Restaurar. El formato es compatible (comprobado en
  `datos.e2e.cjs`, B2).

## Lo que no se hace
- No se borra `localStorage`, ni ahora ni después de publicar. Ocupa poco y sirve de copia adicional. Si en el
  futuro el dueño quisiera liberarlo, sería una decisión aparte, solo después de comprobar la migración.
- No hay servidor, nube ni sincronización entre teléfonos: cada teléfono migra sus propios datos.
