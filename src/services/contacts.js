// Importar un contacto del teléfono (solo navegadores con Contact Picker API, p. ej. Chrome en Android) (L1924, L1959).

export function puedeImportarContactos() {
  return typeof navigator !== 'undefined' && !!navigator.contacts && typeof navigator.contacts.select === 'function';
}

/** Devuelve { nombre, telefono, email } o null si el usuario cancela. */
export async function elegirContacto() {
  try {
    const [c] = await navigator.contacts.select(['name', 'tel', 'email'], { multiple: false });
    if (!c) return null;
    return { nombre: (c.name && c.name[0]) || '', telefono: (c.tel && c.tel[0]) || '', email: (c.email && c.email[0]) || '' };
  } catch (_) { return null; }
}
