// Visor de documentos (factura, comprobante, estado de resultados). El documento es una o varias hojas de ancho
// fijo (720 px). En pantalla se escalan para caber en la ventana; "Ver a tamaño real" las deja al 100 % con
// desplazamiento lateral para leer de cerca. Al imprimir y en el PDF se usan a su tamaño (styles/print.css, pdf.js).
// Marcado esperado: .visor-doc > .escala-doc > hojas, y un botón con data-accion="ampliar".

export function conectarVisor(el) {
  const visor = el.querySelector('.visor-doc');
  const escala = el.querySelector('.escala-doc');
  const boton = el.querySelector('[data-accion="ampliar"]');
  let ampliado = false;
  const ajustar = () => {
    if (!visor.isConnected) { removeEventListener('resize', ajustar); return; }
    const k = ampliado ? 1 : Math.min(1, (visor.clientWidth - 24) / escala.scrollWidth);
    escala.style.transform = k === 1 ? '' : `scale(${k})`;
    escala.style.height = `${escala.scrollHeight * k}px`;
    visor.classList.toggle('ampliado', ampliado);
    if (boton) boton.textContent = ampliado ? 'Ver la hoja completa' : 'Ver a tamaño real';
  };
  if (boton) boton.addEventListener('click', () => { ampliado = !ampliado; escala.style.height = ''; ajustar(); });
  addEventListener('resize', () => { escala.style.height = ''; ajustar(); });
  requestAnimationFrame(ajustar);
}

/** Aplica el color del documento (solo "#rrggbb"; si no, el azul de Orisma) a las hojas dentro de `contenedor`. */
export function colorDocumento(contenedor, color) {
  const c = /^#[0-9a-fA-F]{6}$/.test(String(color)) ? color : '#1E4FA0';
  contenedor.querySelectorAll('.documento').forEach((d) => d.style.setProperty('--color-factura', c));
}
