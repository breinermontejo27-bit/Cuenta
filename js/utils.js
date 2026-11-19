// Utilidades puras: ids, dinero, fechas, texto, WhatsApp.
import { config } from './state.js';

export function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
export function money(n){
  const num = Number(n) || 0;
  const abs = Math.abs(num).toFixed(2);
  const [ent, dec] = abs.split('.');
  const grupos = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return config.moneda + ' ' + (num < 0 ? '-' : '') + grupos + ',' + dec;
}
export function escapeHtml(s){
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function initials(name){
  return (name||'?').trim().split(/\s+/).slice(0,2).map(w => w[0]).join('').toUpperCase();
}
export function todayStr(){ const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
export function fmtDate(iso){
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' });
}
export function monthKey(iso){ return iso.slice(0,7); }

// ---------- Medios de pago ----------
export const METODOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', credito: 'A crédito', mixto: 'Mixto' };
export function metodoLabel(v){ return v.metodoPago ? (METODOS[v.metodoPago] || '') : ''; }

// ============================================================
// COMPARTIR (WhatsApp)
// ============================================================
export function waUrl(telefono, texto){
  let d = String(telefono || '').replace(/\D/g, '');
  if(d.length === 10 && d.startsWith('3')) d = '57' + d;
  return `https://wa.me/${d}?text=${encodeURIComponent(texto)}`;
}

