// Descargar archivos generados por la app (respaldos; en la Etapa 7 también PDF).
// Sin dependencias del entorno donde se creó la app original (window.claude).

/** Descarga un archivo con el nombre indicado. */
export function descargar(contenido, nombre, tipo = 'application/octet-stream') {
  const blob = contenido instanceof Blob ? contenido : new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
