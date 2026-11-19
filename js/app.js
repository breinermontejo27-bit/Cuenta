// Encabezado y despacho de la vista activa.
import { renderClientes } from './clientes.js';
import { bizLogoWrap, bizNameLabel, fabBtn, searchInput, searchRow, viewTitle } from './dom.js';
import { renderFacturas } from './facturas.js';
import { renderGastos } from './gastos.js';
import { renderInventario } from './inventario.js';
import { renderReportes } from './reportes.js';
import { config, ui } from './state.js';
import { escapeHtml, initials } from './utils.js';
import { renderVentas } from './ventas.js';

// ============================================================
// HEADER / NAV
// ============================================================
export function renderHeader(){
  bizNameLabel.textContent = config.nombre || 'Mi negocio';
  const avatarSrc = config.fotoPerfil || config.logo;
  bizLogoWrap.innerHTML = avatarSrc
    ? `<img class="biz-logo" src="${avatarSrc}" alt="">`
    : `<div class="biz-logo-placeholder">${escapeHtml(initials(config.nombre))}</div>`;
  viewTitle.textContent = ui.currentView;
  const placeholders = { clientes:'Buscar cliente...', inventario:'Buscar producto...', ventas:'Buscar por cliente o folio...', facturas:'Buscar factura...', gastos:'Buscar gasto...' };
  searchInput.placeholder = placeholders[ui.currentView] || 'Buscar...';
  searchRow.style.display = ui.currentView === 'reportes' ? 'none' : '';
  fabBtn.classList.toggle('hidden', ui.currentView === 'reportes' || (ui.currentView === 'inventario' && ui.invSub !== 'productos'));
}

// ============================================================
// LIST RENDER
// ============================================================
export function renderList(){
  if(ui.currentView === 'clientes') return renderClientes();
  if(ui.currentView === 'inventario') return renderInventario();
  if(ui.currentView === 'ventas') return renderVentas();
  if(ui.currentView === 'facturas') return renderFacturas();
  if(ui.currentView === 'gastos') return renderGastos();
  if(ui.currentView === 'reportes') return renderReportes();
}

