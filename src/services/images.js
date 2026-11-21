// Imágenes elegidas por el usuario: se reducen y se convierten a JPEG (resizeImageFile, L3559; L3600).

export const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Reduce una imagen a `maxLado` píxeles en su lado mayor y la devuelve como data URL JPEG (calidad 0,85).
 * @returns {Promise<string>}  rechaza con un mensaje entendible si no se puede
 */
export function prepararImagen(archivo, maxLado) {
  return new Promise((ok, ko) => {
    if (!archivo) { ko(new Error('No elegiste ninguna imagen.')); return; }
    if (archivo.size > MAX_BYTES) { ko(new Error('La imagen es muy pesada. Elige una de menos de 15 MB.')); return; }
    const lector = new FileReader();
    lector.onerror = () => ko(new Error('No pude leer esa imagen. Prueba con una foto en JPG o PNG.'));
    lector.onload = (e) => {
      const img = new Image();
      img.onerror = () => ko(new Error('No pude leer esa imagen. Prueba con una foto en JPG o PNG.'));
      img.onload = () => {
        let w = img.width, h = img.height;
        if (!w || !h) { ko(new Error('No pude leer esa imagen. Prueba con una foto en JPG o PNG.')); return; }
        if (w > h && w > maxLado) { h = Math.round(h * maxLado / w); w = maxLado; } else if (h > maxLado) { w = Math.round(w * maxLado / h); h = maxLado; }
        const lienzo = document.createElement('canvas');
        lienzo.width = w; lienzo.height = h;
        lienzo.getContext('2d').drawImage(img, 0, 0, w, h);
        ok(lienzo.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target.result;
    };
    lector.readAsDataURL(archivo);
  });
}
