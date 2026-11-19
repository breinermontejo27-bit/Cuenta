// Guardar ajustes: se combinan con los actuales (cada sección cambia solo sus campos).

import { obtenerAjustes } from '../core/state.js';
import { guardarCambios } from '../data/database.js';

export async function guardarAjustes(cambios) {
  await guardarCambios({ ajustes: { ...obtenerAjustes(), ...cambios } });
}
