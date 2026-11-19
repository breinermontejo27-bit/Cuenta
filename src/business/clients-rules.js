// Clientes (formulario y lista, L624–643, L1968–1981).

/** Guarda un cliente desde su formulario. Nombre obligatorio (RG-06). */
export function guardarCliente(anterior, { nombre, telefono, email, direccion }, { nuevoId }) {
  const n = String(nombre || '').trim();
  if (!n) return { ok: false, campo: 'nombre' };
  return { ok: true, cliente: { id: anterior ? anterior.id : nuevoId(), nombre: n, telefono: String(telefono || '').trim(), email: String(email || '').trim(), direccion: String(direccion || '').trim() } };
}

/** Búsqueda por nombre, en el orden en que se registraron (L626). */
export function filtrarClientes(clientes, termino) {
  const t = String(termino || '').trim().toLowerCase();
  return clientes.filter((c) => c.nombre.toLowerCase().includes(t));
}
