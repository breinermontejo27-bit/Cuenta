// PIN de bloqueo local (Etapa 8). Se guarda solo una huella (PBKDF2-SHA256 con sal al azar), nunca el PIN.
// IMPORTANTE: protege del uso casual del teléfono. NO cifra los datos: quien tenga el dispositivo desbloqueado y
// sepa usar las herramientas del navegador puede leerlos igual. Por eso la pantalla de bloqueo permite quitarlo.

export const ITERACIONES = 150000;

/** ¿El PIN tiene la forma aceptada? (4 a 8 dígitos) */
export function pinValido(pin) {
  return /^\d{4,8}$/.test(String(pin));
}

const aBase64 = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const deBase64 = (texto) => Uint8Array.from(atob(texto), (c) => c.charCodeAt(0));

async function derivar(pin, sal, iteraciones) {
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pin)), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sal, iterations: iteraciones }, clave, 256);
}

/** Crea el registro a guardar para un PIN nuevo: { alg, iteraciones, sal, huella }. */
export async function crearHuellaPin(pin) {
  if (!pinValido(pin)) throw new Error('PIN no válido');
  const sal = crypto.getRandomValues(new Uint8Array(16));
  const huella = await derivar(pin, sal, ITERACIONES);
  return { alg: 'PBKDF2-SHA256', iteraciones: ITERACIONES, sal: aBase64(sal), huella: aBase64(huella) };
}

/** ¿El PIN coincide con el registro guardado? (comparación de tiempo constante) */
export async function comprobarPin(pin, registro) {
  if (!registro || !pinValido(pin)) return false;
  const calculada = new Uint8Array(await derivar(pin, deBase64(registro.sal), registro.iteraciones));
  const guardada = deBase64(registro.huella);
  if (calculada.length !== guardada.length) return false;
  let diferencia = 0;
  for (let i = 0; i < calculada.length; i++) diferencia |= calculada[i] ^ guardada[i];
  return diferencia === 0;
}
