// Números: conversión segura y sumas. Base de todas las reglas.

/** Número o 0 (equivale a `Number(x) || 0` de la versión original). */
export function num(x) {
  return Number(x) || 0;
}

/** Suma de `fn(elemento)` sobre una lista (lista ausente = 0). */
export function sumar(lista, fn) {
  return (lista || []).reduce((s, el) => s + fn(el), 0);
}

/** Limita un número entre mínimo y máximo. */
export function limitar(x, min, max) {
  return Math.min(max, Math.max(min, x));
}
