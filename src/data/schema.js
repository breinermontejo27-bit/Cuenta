// Esquema de datos: almacenes de IndexedDB y forma de cada registro.
// Los campos son los de la versión original (Etapa 1, Documento 2 §1), sin renombrar (Etapa 2, A6).
// La validación tiene dos niveles:
//  - 'legado'  (datos propios de localStorage): nunca bloquea por tipos; solo informa. Se conserva todo.
//  - 'estricto' (archivo de respaldo que viene de fuera): los errores bloquean la restauración (D4-11).

export const VERSION_ESQUEMA = 1;

import { COLECCIONES } from '../core/config.js';

export { COLECCIONES };

// Campos de imagen por colección (rutas dentro del registro). Se guardan aparte, en el almacén "archivos".
export const CAMPOS_IMAGEN = {
  inventario: [['foto']],
  ventas: [['items', '*', 'foto']],
  pedidos: [['items', '*', 'foto']],
  ajustes: [['logo'], ['fotoPerfil'], ['firmaImg']],
};

// ----- Tipos de campo -----
const esNumero = (v) => typeof v === 'number' && Number.isFinite(v);
const esNumerico = (v) => esNumero(v) || (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)));
const TIPOS = {
  texto: (v) => typeof v === 'string',
  numero: (v) => esNumerico(v),
  numeroOVacio: (v) => v === '' || esNumerico(v),            // stock, stockMinimo, stockAnterior…
  numeroONulo: (v) => v === null || esNumerico(v),           // folio
  booleano: (v) => typeof v === 'boolean',
  fecha: (v) => v === '' || (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)),
  textoONulo: (v) => v === null || typeof v === 'string',    // productoId de servicios, metodo de abonos antiguos
  imagen: (v) => v === '' || esImagen(v),
  lista: (v) => Array.isArray(v),
  color: (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v),
};

export const PATRON_ID = /^[A-Za-z0-9_-]{1,64}$/;
const IMAGEN_DATOS = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/]+=*$/;
export const PREFIJO_ARCHIVO = 'archivo:';
export function esImagen(v) {
  return typeof v === 'string' && (IMAGEN_DATOS.test(v) || /^archivo:img-[0-9a-f]{16,64}$/.test(v));
}

const ABONO = { id: 'texto', fecha: 'fecha', monto: 'numero', metodo: 'textoONulo', nota: 'texto' };
const MATERIAL = { productoId: 'textoONulo', nombre: 'texto', cantidad: 'numero' };
const ITEM = {
  productoId: 'textoONulo', nombre: 'texto', precio: 'numero', cantidad: 'numero', caracteristicas: 'texto',
  foto: 'imagen', materiales: { lista: MATERIAL }, costo: 'numero',
};

export const FORMAS = {
  clientes: { _requeridos: ['id', 'nombre'], id: 'texto', nombre: 'texto', telefono: 'texto', email: 'texto', direccion: 'texto' },
  inventario: {
    _requeridos: ['id', 'nombre'], id: 'texto', nombre: 'texto', categoria: 'texto', descripcion: 'texto',
    costo: 'numero', margen: 'numeroOVacio', precio: 'numeroOVacio', stock: 'numeroOVacio', foto: 'imagen',
    stockMinimo: 'numeroOVacio', sinAlerta: 'booleano',
  },
  ventas: {
    _requeridos: ['id', 'clienteNombre', 'fecha', 'items'], id: 'texto', folio: 'numeroONulo', creadoTs: 'numero',
    clienteId: 'texto', clienteNombre: 'texto', clienteDireccion: 'texto', clienteTelefono: 'texto', clienteEmail: 'texto',
    items: { lista: ITEM }, sumaItems: 'numero', descuentoTipo: 'texto', descuentoPct: 'numero', descuentoMonto: 'numero',
    subtotal: 'numero', impuesto: 'numero', total: 'numero', costoTotal: 'numero', gananciaEstimada: 'numero',
    notas: 'texto', fecha: 'fecha', metodoPago: 'texto', fiado: 'booleano', abonos: { lista: ABONO },
  },
  gastos: {
    _requeridos: ['id', 'descripcion', 'fecha'], id: 'texto', tipo: 'texto', metodo: 'texto', descripcion: 'texto',
    monto: 'numero', fecha: 'fecha', categoria: 'texto', productoId: 'texto', cantidad: 'numero',
  },
  movimientos: {
    _requeridos: ['id'], id: 'texto', tipo: 'texto', ts: 'numero', productoId: 'texto', productoNombre: 'texto', fecha: 'fecha',
    stockAnterior: 'numeroOVacio', stockNuevo: 'numeroOVacio', cantidad: 'numero', motivo: 'texto',
  },
  pedidos: {
    _requeridos: ['id', 'clienteNombre', 'items'], id: 'texto', tipo: 'texto', estado: 'texto', clienteId: 'texto', clienteNombre: 'texto',
    fechaEntrega: 'fecha', anticipo: 'numeroOVacio', anticipoMetodo: 'texto', fechaAnticipo: 'fecha', descuentoPct: 'numero',
    abonos: { lista: ABONO }, items: { lista: ITEM }, notas: 'texto', creadoTs: 'numero', canceladoFecha: 'fecha',
  },
  ajustes: {
    _requeridos: [], nombre: 'texto', moneda: 'texto', impuesto: 'numero', siguienteFolio: 'numero', siguienteComprobante: 'numero',
    direccion: 'texto', telefono: 'texto', email: 'texto', logo: 'imagen', fotoPerfil: 'imagen', margenDefault: 'numeroOVacio',
    stockMinimo: 'numeroOVacio', facturaTitulo: 'texto', facturaPie: 'texto', colorFactura: 'color', tengaTexto: 'texto', firmaImg: 'imagen',
    mostrarDireccion: 'booleano', mostrarTelefono: 'booleano', mostrarEmail: 'booleano', mostrarTenga: 'booleano', mostrarPagos: 'booleano',
    mostrarFirma: 'booleano', mostrarPie: 'booleano', mostrarFotos: 'booleano', mostrarSello: 'booleano',
  },
};

function revisarObjeto(obj, forma, ruta, problemas) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) { problemas.push(`${ruta}: no es un registro`); return; }
  for (const req of forma._requeridos || []) {
    if (obj[req] === undefined || obj[req] === null || obj[req] === '') problemas.push(`${ruta}: falta "${req}"`);
  }
  for (const [campo, tipo] of Object.entries(forma)) {
    if (campo.startsWith('_') || obj[campo] === undefined) continue;
    const valor = obj[campo];
    if (typeof tipo === 'object') {
      if (!Array.isArray(valor)) { problemas.push(`${ruta}.${campo}: debe ser una lista`); continue; }
      valor.forEach((el, i) => revisarObjeto(el, { _requeridos: [], ...tipo.lista }, `${ruta}.${campo}[${i}]`, problemas));
    } else if (!TIPOS[tipo](valor)) {
      problemas.push(`${ruta}.${campo}: valor no válido (${tipo}): ${JSON.stringify(valor).slice(0, 40)}`);
    }
  }
}

/** Problemas de forma de un registro (lista vacía si está bien). */
export function revisarRegistro(coleccion, registro, ruta = coleccion) {
  const problemas = [];
  revisarObjeto(registro, FORMAS[coleccion], ruta, problemas);
  if (registro && typeof registro.id === 'string' && !PATRON_ID.test(registro.id)) problemas.push(`${ruta}: identificador no válido`);
  return problemas;
}

/**
 * Revisa un conjunto completo de datos.
 * @param {{ colecciones: Object<string, Array>, ajustes: Object }} datos
 * @returns {{ errores: string[], advertencias: string[], conteos: Object<string, number> }}
 *  errores: impiden guardar (en cualquier modo): listas que no son listas, ids ausentes o repetidos.
 *  advertencias: forma de campos (en modo 'estricto' se tratan como errores) y referencias huerfanas.
 */
export function revisarDatos(datos, modo = 'legado') {
  const errores = [], forma = [], huerfanas = [], conteos = {};
  for (const c of COLECCIONES) {
    const lista = datos.colecciones[c];
    if (!Array.isArray(lista)) { errores.push(`${c}: no es una lista`); continue; }
    conteos[c] = lista.length;
    const vistos = new Set();
    lista.forEach((r, i) => {
      const id = r && r.id;
      if (typeof id !== 'string' || !id) { errores.push(`${c}[${i}]: sin identificador`); return; }
      if (vistos.has(id)) errores.push(`${c}: identificador repetido "${id}"`);
      vistos.add(id);
      forma.push(...revisarRegistro(c, r, `${c}[${i}]`));
    });
  }
  if (datos.ajustes !== undefined && datos.ajustes !== null) forma.push(...revisarRegistro('ajustes', datos.ajustes, 'ajustes'));
  // Referencias: en la versión original es normal que queden huerfanas (borrar un cliente o producto no borra sus ventas).
  if (!errores.length) {
    const ids = (c) => new Set(datos.colecciones[c].map((r) => r.id));
    const clientes = ids('clientes');
    for (const c of ['ventas', 'pedidos']) {
      for (const r of datos.colecciones[c]) if (r.clienteId && !clientes.has(r.clienteId)) huerfanas.push(`${c} ${r.id}: el cliente ${r.clienteId} ya no existe`);
    }
  }
  return modo === 'estricto'
    ? { errores: [...errores, ...forma], advertencias: huerfanas, conteos }
    : { errores, advertencias: [...forma, ...huerfanas], conteos };
}
