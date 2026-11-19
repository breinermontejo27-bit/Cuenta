// Constantes de la aplicación. Sin lógica: solo valores que el resto de módulos consulta.

export const NOMBRE_APP = 'Orisma';
export const VERSION_APP = '2.0.0-etapa7';

// Base de datos (se usa desde la Etapa 5).
export const NOMBRE_BD = 'orisma';

// Colecciones del negocio. Los nombres coinciden con las claves de la versión original
// (`cuentas_<coleccion>`) para que la migración no tenga que renombrar nada (Etapa 2, A6).
export const COLECCIONES = Object.freeze(['clientes', 'inventario', 'ventas', 'gastos', 'movimientos', 'pedidos']);

// Valores por defecto de los ajustes. Copia exacta de la versión original:
// configuración inicial (index.html L465) + CONFIG_DEFAULTS (L474).
export const AJUSTES_INICIALES = Object.freeze({
  nombre: 'Mi negocio', moneda: '$', impuesto: 0, siguienteFolio: 1,
  direccion: '', telefono: '', email: '', logo: '',
});
export const CONFIG_DEFAULTS = Object.freeze({
  impuesto: 0, siguienteFolio: 1, direccion: '', telefono: '', email: '', logo: '', fotoPerfil: '',
  margenDefault: '', stockMinimo: 3, facturaTitulo: 'FACTURA', facturaPie: 'Gracias por su compra',
  mostrarDireccion: true, mostrarTelefono: true, mostrarEmail: true, colorFactura: '#1E4FA0',
  mostrarTenga: true, mostrarPagos: true, mostrarFirma: true, mostrarPie: true, mostrarFotos: false,
  mostrarSello: true, firmaImg: '', tengaTexto: '',
});

/** Completa unos ajustes con los valores por defecto, igual que la versión original (L475–477). */
export function completarAjustes(ajustes) {
  const resultado = { ...AJUSTES_INICIALES, ...(ajustes || {}) };
  for (const clave of Object.keys(CONFIG_DEFAULTS)) {
    if (resultado[clave] === undefined) resultado[clave] = CONFIG_DEFAULTS[clave];
  }
  return resultado;
}
