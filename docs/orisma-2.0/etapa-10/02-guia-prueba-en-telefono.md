# Etapa 10 · Guía para probar Orisma en tu teléfono antes de publicarlo

Las pruebas automáticas se hicieron en el navegador Chromium de un computador. Falta lo único que no se puede
automatizar aquí: **tu teléfono real, con tus datos reales**. Esta guía sirve para eso, sin riesgo.

## Cómo funciona la copia de prueba
- Se publica Orisma en una carpeta aparte: `breinermontejo27-bit.github.io/Cuenta/prueba/`.
  **La app actual sigue igual en su dirección de siempre.**
- Al abrirla, la copia de prueba **copia** tus datos actuales a su propia base. Nunca modifica ni borra los de tu
  app actual (comprobado en `migracion.e2e.cjs`, P1–P4).
- Lo que registres en la prueba **no aparece** en tu app actual, y tampoco en el Orisma definitivo: cuando se
  publique de verdad, este traerá tus datos de ese momento.
- Arriba se ve una franja amarilla: "Copia de prueba".

Publicar la copia de prueba requiere tu autorización: solo agrega la carpeta `prueba/` al sitio.

## Qué revisar (15–20 minutos)
1. Abre la dirección de prueba en el navegador del teléfono (Chrome en Android, Safari en iPhone). No la instales
   en la pantalla de inicio.
2. Debe aparecer el aviso "Se trajeron tus datos de la versión anterior: N clientes, N productos…". Compara esas
   cantidades con tu app actual.
3. Compara con tu app actual:
   - **Clientes:** quién debe y cuánto.
   - **Inventario:** el stock de 3 o 4 productos.
   - **Reportes:** las cifras de este mes y de la caja de hoy.
   - **Facturas:** el último número.
4. Haz una venta de prueba, genera su factura y toca **Compartir PDF**. Revisa que el PDF se vea bien.
5. Toma una foto para un producto y revisa que se vea en la lista.
6. Activa el **modo avión** y vuelve a abrir la dirección de prueba: debe abrir y funcionar igual.
7. Si quieres, prueba el PIN (Ajustes › Bloqueo con PIN) y la opción "Olvidé mi PIN".
8. Anota cualquier diferencia, texto raro o algo que no funcione, con una captura si puedes.

## Cuando termines
- Si todo está bien, se sigue el plan de publicación (`etapa-9/01-plan-de-publicacion.md`). La carpeta `prueba/`
  se puede quitar después.
- Si algo falla, se corrige y se repite la prueba. Tu app actual no se habrá tocado en ningún momento.
