// Estado de la app: datos guardados (db), configuración y estado de las vistas (ui).
import { todayStr } from './utils.js';

// ---------- Storage helpers ----------
export function load(key, fallback){
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch(e){ return fallback; }
}
export function save(key, value){
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch(e){ console.warn('No se pudo guardar', e); }
}
export const config = load('cuentas_config', {
  nombre: 'Mi negocio', moneda: '$', impuesto: 0, siguienteFolio: 1,
  direccion: '', telefono: '', email: '', logo: ''
});
export const CONFIG_DEFAULTS = { impuesto: 0, siguienteFolio: 1, direccion: '', telefono: '', email: '', logo: '', fotoPerfil: '', margenDefault: '', stockMinimo: 3, facturaTitulo: 'FACTURA', facturaPie: 'Gracias por su compra', mostrarDireccion: true, mostrarTelefono: true, mostrarEmail: true, colorFactura: '#1E4FA0', mostrarTenga: true, mostrarPagos: true, mostrarFirma: true, mostrarPie: true, mostrarFotos: false, mostrarSello: true, firmaImg: '', tengaTexto: '' };
Object.keys(CONFIG_DEFAULTS).forEach(k => {
  if(config[k] === undefined) config[k] = CONFIG_DEFAULTS[k];
});

// Colecciones guardadas en localStorage (se reasignan al editar).
export const db = {
  clientes: load('cuentas_clientes', []),
  inventario: load('cuentas_inventario', []),
  ventas: load('cuentas_ventas', []),
  gastos: load('cuentas_gastos', []),
  movimientos: load('cuentas_movimientos', []),
  pedidos: load('cuentas_pedidos', []),
};

// Estado de navegación de las vistas (no se guarda).
export const ui = {
  currentView: 'clientes',
  categoriaFiltro: '',
  invSub: 'productos',
  ventasVista: 'ventas',
  repVista: 'resumen',
  cajaModo: 'dia',
  cajaFecha: todayStr(),
  cajaMes: todayStr().slice(0,7),
};
