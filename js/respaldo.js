// Ajustes › Respaldo: exportar e importar datos.
import { renderHeader, renderList } from './app.js';
import { CONFIG_DEFAULTS, config, db, save } from './state.js';
import { openOverlay } from './ui.js';
import { todayStr } from './utils.js';

// ============================================================
// AJUSTES › RESPALDO
// ============================================================
export function openRespaldoAjustes(back){
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>Respaldo</h2>
      <div class="step-note">Tus datos se guardan en este navegador. Descarga un respaldo de vez en cuando para no perder nada si cambias de teléfono o borras el navegador.</div>
      <button class="btn btn-primary" id="resExport" style="width:100%;">Descargar respaldo</button>
      <div class="section-label" style="margin-top:18px;">Restaurar desde un respaldo</div>
      <div class="step-note">Al importar, tus datos actuales se reemplazan por los del archivo.</div>
      <input type="file" accept="application/json,.json" id="resFile" class="file-input">
      <div id="resConfirm"></div>
      <div class="sheet-actions" style="margin-top:16px;"><button class="btn btn-secondary" id="resVolver" style="flex:1;">Volver</button></div>
    `, (overlay) => {
    overlay.querySelector('#resVolver').addEventListener('click', () => { overlay.remove(); back(); });
    overlay.querySelector('#resExport').addEventListener('click', async () => {
      const data = JSON.stringify({ app: 'cuentas', version: 2, fecha: todayStr(), datos: { clientes: db.clientes, inventario: db.inventario, ventas: db.ventas, gastos: db.gastos, movimientos: db.movimientos, pedidos: db.pedidos, config } });
      const dl = (window.claude && typeof window.claude.use === 'function') ? await window.claude.use('downloads') : null;
      if(!dl){
        try {
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `cuentas-respaldo-${todayStr()}.json`;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          alert('Respaldo descargado. Revisa la carpeta de Descargas de tu celular.');
        } catch(err){ alert('No se pudo guardar el respaldo. Intenta de nuevo.'); }
        return;
      }
      try {
        await dl.save({ filename: `cuentas-respaldo-${todayStr()}.json`, data });
        alert('Respaldo guardado.');
      } catch(err){
        if(err && err.code === 'declined') return;
        alert('No se pudo guardar el respaldo. Intenta de nuevo.');
      }
    });
    overlay.querySelector('#resFile').addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        let d = null;
        try { d = JSON.parse(reader.result).datos; } catch(err) { d = null; }
        if(!d || !Array.isArray(d.clientes) || !Array.isArray(d.inventario) || !Array.isArray(d.ventas) || !Array.isArray(d.gastos)){
          overlay.querySelector('#resConfirm').innerHTML = `<p style="color:var(--danger); font-size:14px; margin-top:12px;">Ese archivo no es un respaldo válido de Cuentas.</p>`;
          return;
        }
        overlay.querySelector('#resConfirm').innerHTML = `
            <div class="rep-card" style="margin-top:12px; padding:14px;">
              <p style="font-size:14px; line-height:1.5; margin-bottom:12px;">Se reemplazarán tus datos actuales (${d.clientes.length} clientes, ${d.inventario.length} productos, ${d.ventas.length} ventas, ${d.gastos.length} gastos). ¿Continuar?</p>
              <div class="sheet-actions" style="margin-top:0;">
                <button class="btn btn-secondary" id="resNo">No</button>
                <button class="btn btn-primary" id="resSi" style="background:var(--danger);">Sí, reemplazar</button>
              </div>
            </div>`;
        overlay.querySelector('#resNo').addEventListener('click', () => { overlay.querySelector('#resConfirm').innerHTML = ''; });
        overlay.querySelector('#resSi').addEventListener('click', () => {
          db.clientes = d.clientes;
          db.inventario = d.inventario;
          db.ventas = d.ventas;
          db.gastos = d.gastos;
          db.pedidos = Array.isArray(d.pedidos) ? d.pedidos : [];
          db.movimientos = Array.isArray(d.movimientos) ? d.movimientos : [];
          if(d.config) Object.assign(config, d.config);
          Object.keys(CONFIG_DEFAULTS).forEach(k => { if(config[k] === undefined) config[k] = CONFIG_DEFAULTS[k]; });
          save('cuentas_clientes', db.clientes);
          save('cuentas_inventario', db.inventario);
          save('cuentas_ventas', db.ventas);
          save('cuentas_pedidos', db.pedidos);
          save('cuentas_gastos', db.gastos);
          save('cuentas_movimientos', db.movimientos);
          save('cuentas_config', config);
          overlay.remove();
          renderHeader();
          renderList();
          alert('Datos restaurados.');
        });
      };
      reader.readAsText(file);
    });
  });
}

