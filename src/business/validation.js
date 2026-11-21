// Mensajes de validación comerciales (Etapa 2, §6). Las reglas devuelven { ok: false, campo } o un código de error;
// aquí está el texto que verá el usuario. La versión original solo ponía el cursor en el campo, sin explicar.

/** Texto para cada campo o código de error. */
export const MENSAJES = Object.freeze({
  nombre: 'Escribe el nombre.',
  cliente: 'Elige un cliente.',
  fecha: 'Elige la fecha.',
  items: 'Agrega al menos un producto.',
  cantidad: 'La cantidad debe ser mayor que 0.',
  monto: 'El monto debe ser mayor que 0.',
  descripcion: 'Escribe en qué se gastó.',
  nombreNuevo: 'Escribe el nombre del producto nuevo.',
  sinClientes: 'Primero registra un cliente en la pestaña Clientes.',
  'mayor-que-suma': 'El total no puede ser mayor que la suma de productos.',
});

/** Mensaje para un error de abono de pendiente (L1339, L1514). `dinero` formatea el saldo. */
export function mensajeAbono(error, saldo, dinero) {
  if (error === 'mayor-que-saldo') return `El abono es mayor que el saldo (${dinero(saldo)}).`;
  return MENSAJES[error] || '';
}
