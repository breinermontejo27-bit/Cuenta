// Textos: conversión segura para buscar y ordenar (corrige D4-23: en la versión original, un solo registro antiguo
// sin nombre o sin fecha hacía fallar toda una pestaña). Con datos normales el resultado es el mismo.

/** Texto o '' (null/undefined → '', número → su texto). */
export function texto(x) {
  return x == null ? '' : String(x);
}

/** Compara dos textos como `a.localeCompare(b)`, aunque falte alguno. */
export function compararTexto(a, b) {
  return texto(a).localeCompare(texto(b));
}

/** ¿`campo` contiene el término (ya en minúsculas)? */
export function contiene(campo, terminoMinusculas) {
  return texto(campo).toLowerCase().includes(terminoMinusculas);
}
