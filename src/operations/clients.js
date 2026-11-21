// Operaciones de clientes.

import { coleccion } from '../core/state.js';
import { guardarCambios } from '../data/database.js';
import { guardarCliente as reglaGuardar } from '../business/clients-rules.js';
import { contexto } from './contexto.js';
import { exigir, buscar, reemplazar } from './comun.js';

export async function guardarCliente(id, formulario) {
  const anterior = id ? buscar('clientes', id) : null;
  const { cliente } = exigir(reglaGuardar(anterior, formulario, contexto()));
  const lista = coleccion('clientes');
  await guardarCambios({ colecciones: { clientes: anterior ? reemplazar(lista, cliente) : [...lista, cliente] } });
  return cliente;
}

/** Elimina un cliente (sus ventas y pendientes se conservan, como en la versión original). */
export async function eliminarCliente(id) {
  buscar('clientes', id);
  await guardarCambios({ colecciones: { clientes: coleccion('clientes').filter((c) => c.id !== id) } });
}
