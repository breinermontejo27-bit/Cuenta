// Punto de entrada: navegación por pestañas y arranque.
import { openSettings } from './ajustes.js';
import { renderHeader, renderList } from './app.js';
import { openClienteForm } from './clientes.js';
import { fabBtn, gearBtn, searchInput, tabs } from './dom.js';
import { openSinFacturaPicker } from './facturas.js';
import { openGastoForm } from './gastos.js';
import { openProductoForm } from './inventario.js';
import { openNuevoPendiente } from './pedidos.js';
import { ui } from './state.js';
import { openVentaWizard } from './venta-wizard.js';

// ============================================================
// FAB dispatch
// ============================================================
function onFab(){
  if(ui.currentView === 'clientes') return openClienteForm(null);
  if(ui.currentView === 'inventario') return openProductoForm(null);
  if(ui.currentView === 'ventas') return ui.ventasVista === 'pedidos' ? openNuevoPendiente() : openVentaWizard();
  if(ui.currentView === 'facturas') return openSinFacturaPicker();
  if(ui.currentView === 'gastos') return openGastoForm(null);
}

// ============================================================
// Events
// ============================================================
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    ui.currentView = tab.getAttribute('data-view');
    searchInput.value = '';
    renderHeader();
    renderList();
  });
});

searchInput.addEventListener('input', renderList);
fabBtn.addEventListener('click', onFab);
gearBtn.addEventListener('click', openSettings);

// ---------- Init ----------
renderHeader();
renderList();

