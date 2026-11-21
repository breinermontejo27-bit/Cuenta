// Operaciones de gastos generales.

import { coleccion } from '../core/state.js';
import { guardarCambios } from '../data/database.js';
import { gastoGeneral, editarGasto as reglaEditar } from '../business/expenses-rules.js';
import { contexto } from './contexto.js';
import { exigir, buscar, reemplazar } from './comun.js';

export async function crearGasto(formulario) {
  const { gasto } = exigir(gastoGeneral(formulario, contexto()));
  await guardarCambios({ colecciones: { gastos: [...coleccion('gastos'), gasto] } });
  return gasto;
}

export async function editarGasto(id, formulario) {
  const { gasto } = exigir(reglaEditar(buscar('gastos', id), formulario, contexto()));
  await guardarCambios({ colecciones: { gastos: reemplazar(coleccion('gastos'), gasto) } });
  return gasto;
}

export async function eliminarGasto(id) {
  buscar('gastos', id);
  await guardarCambios({ colecciones: { gastos: coleccion('gastos').filter((g) => g.id !== id) } });
}
