// Eventos entre módulos. Pocos y con nombre fijo (Etapa 2, §3.4).

export const EVENTOS = Object.freeze({
  DATOS_CAMBIADOS: 'datos:cambiados',     // detalle: { colecciones: [...] }
  AJUSTES_CAMBIADOS: 'ajustes:cambiados',
  NAVEGACION: 'navegacion:cambio',        // detalle: { modulo, sub }
  ERROR: 'app:error',                     // detalle: { error, mensaje }
  ACTUALIZACION: 'app:actualizacion',     // hay una versión nueva esperando
});

const NOMBRES = new Set(Object.values(EVENTOS));

/** Crea un emisor independiente (útil en pruebas). */
export function crearEmisor() {
  const oyentes = new Map();
  return {
    /** Se suscribe a un evento. Devuelve la función para cancelar la suscripción. */
    escuchar(nombre, fn) {
      if (!NOMBRES.has(nombre)) throw new Error(`Evento desconocido: ${nombre}`);
      if (!oyentes.has(nombre)) oyentes.set(nombre, new Set());
      oyentes.get(nombre).add(fn);
      return () => oyentes.get(nombre).delete(fn);
    },
    /** Avisa a todos los suscritos. Un oyente que falla no impide que los demás reciban el evento. */
    emitir(nombre, detalle = {}) {
      if (!NOMBRES.has(nombre)) throw new Error(`Evento desconocido: ${nombre}`);
      const errores = [];
      for (const fn of [...(oyentes.get(nombre) || [])]) {
        try { fn(detalle); } catch (e) { errores.push(e); }
      }
      if (errores.length) setTimeout(() => { throw errores[0]; });
    },
  };
}

export const eventos = crearEmisor();
