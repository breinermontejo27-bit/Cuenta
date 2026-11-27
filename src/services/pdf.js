// PDF de facturas y comprobantes (compartirFacturaPDF, L3467–3514). Usa html2canvas y jsPDF incluidos en el
// proyecto (assets/vendor): funciona sin conexión (D4-12). Se cargan solo la primera vez que se piden.

let carga = null;
function cargarScript(src) {
  return new Promise((ok, ko) => {
    const s = document.createElement('script');
    s.src = src;
    s.onload = ok;
    s.onerror = () => ko(new Error('No se pudo cargar el generador de PDF.'));
    document.head.appendChild(s);
  });
}
function cargarLibrerias() {
  if (window.jspdf && window.html2canvas) return Promise.resolve();
  if (!carga) carga = cargarScript('assets/vendor/html2canvas.min.js').then(() => cargarScript('assets/vendor/jspdf.umd.min.js')).catch((e) => { carga = null; throw e; });
  return carga;
}

/**
 * Convierte un elemento (ya armado, fuera de pantalla) en un PDF A4 de una o varias páginas.
 * @returns {Promise<Blob>}
 */
export async function crearPdf(elemento) {
  await cargarLibrerias();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  // Documento de varias hojas (p. ej. el estado de resultados): cada hoja va en su propia página, así ninguna tabla
  // queda partida entre páginas. Un documento de una sola hoja (factura) sigue el camino de siempre.
  const hojas = [...elemento.querySelectorAll(':scope > .documento')];
  if (hojas.length > 1) {
    for (const [i, hoja] of hojas.entries()) {
      const c = await window.html2canvas(hoja, { scale: 2, backgroundColor: '#ffffff' });
      const w = 210 - 16, h = c.height * w / c.width;
      if (i > 0) pdf.addPage();
      pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 8, 8, w, Math.min(h, 297 - 16));
    }
    return pdf.output('blob');
  }
  const lienzo = await window.html2canvas(elemento, { scale: 2, backgroundColor: '#ffffff' });
  const margen = 8, anchoPag = 210, altoPag = 297;
  const imgW = anchoPag - margen * 2;
  const imgH = lienzo.height * imgW / lienzo.width;
  const altoUtil = altoPag - margen * 2;
  const imagen = lienzo.toDataURL('image/jpeg', 0.92);
  // La hoja termina con un margen blanco de 44 px (unos 12 mm en el PDF). Si lo único que no cabe en la página es
  // parte de ese margen (hasta 8 mm), no se agrega una segunda página vacía.
  const TOLERANCIA_MM = 8;
  for (let k = 0; k * altoUtil < imgH - TOLERANCIA_MM; k++) {
    if (k > 0) pdf.addPage();
    pdf.addImage(imagen, 'JPEG', margen, margen - k * altoUtil, imgW, imgH);
  }
  return pdf.output('blob');
}

/** Comparte el PDF con el sistema del teléfono si se puede; si no, devuelve false (la pantalla lo descarga). */
export async function compartirArchivo(blob, nombre, texto) {
  const archivo = new File([blob], nombre, { type: 'application/pdf' });
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    await navigator.share({ files: [archivo], title: nombre, text: texto });
    return true;
  }
  return false;
}
