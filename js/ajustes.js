// Ajustes: menú y secciones de configuración.
import { renderHeader, renderList } from './app.js';
import { openCreditosAjustes, totalPorCobrarAll } from './creditos.js';
import { openRespaldoAjustes } from './respaldo.js';
import { config, save } from './state.js';
import { imagePickerHtml, openOverlay, toggleRowHtml, wireImagePicker } from './ui.js';
import { escapeHtml, money } from './utils.js';

export function openSettings(){
  const secciones = [
    { key:'usuario', icono:'◉', titulo:'Usuario', desc: (config.nombre || 'Mi negocio') + (config.fotoPerfil ? ' · con foto' : '') },
    { key:'creditos', icono:'◑', titulo:'Créditos', desc: totalPorCobrarAll() > 0 ? `Por cobrar ${money(totalPorCobrarAll())}` : 'Sin deudas pendientes' },
    { key:'factura', icono:'▦', titulo:'Factura', desc: (config.facturaTitulo || 'FACTURA') },
    { key:'productos', icono:'▤', titulo:'Productos', desc: `Poco stock desde ${config.stockMinimo} unid.` + (config.margenDefault ? ` · Ganancia por defecto ${config.margenDefault}%` : '') },
    { key:'respaldo', icono:'⤓', titulo:'Respaldo', desc: 'Descargar o restaurar tus datos' },
    { key:'ventas', icono:'⧉', titulo:'Moneda e impuestos', desc: `${config.moneda} · Impuesto ${config.impuesto}%` },
  ];
  openOverlay(`
      <div class="sheet-handle"></div>
      <h2>Ajustes</h2>
      <div class="step-note">Elige una sección para editarla.</div>
      <ul class="list" style="margin-top:6px;">
        ${secciones.map(s => `
          <li class="row" data-sec="${s.key}">
            <div class="row-main">
              <div class="row-title">${s.icono}&nbsp;&nbsp;${s.titulo}</div>
              <div class="row-sub">${escapeHtml(s.desc)}</div>
            </div>
            <div class="row-value" style="color:var(--ink-soft);">›</div>
          </li>`).join('')}
      </ul>
      <div class="sheet-actions" style="margin-top:16px;">
        <button class="btn btn-secondary" id="closeSetBtn">Cerrar</button>
      </div>
    `, (overlay) => {
    overlay.querySelector('#closeSetBtn').addEventListener('click', () => overlay.remove());
    overlay.querySelectorAll('.row[data-sec]').forEach(row => row.addEventListener('click', () => {
      overlay.remove();
      openSettingSection(row.getAttribute('data-sec'));
    }));
  });
}

export function openSettingSection(key){
  const back = () => openSettings();
  if(key === 'usuario') return openSettingsUsuario(back);
  if(key === 'creditos') return openCreditosAjustes(back);
  if(key === 'respaldo') return openRespaldoAjustes(back);
  if(key === 'factura') return openSettingsFactura(back);
  if(key === 'productos') return openSettingsProductos(back);
  if(key === 'ventas') return openSettingsVentas(back);
}

export function sectionShell(titulo, nota, fieldsHtml){
  return `
      <div class="sheet-handle"></div>
      <h2>${titulo}</h2>
      <div class="step-note">${nota}</div>
      ${fieldsHtml}
      <div class="sheet-actions">
        <button class="btn btn-secondary" id="backSetBtn">Volver</button>
        <button class="btn btn-primary" id="saveSetBtn">Guardar</button>
      </div>
    `;
}

export function wireSection(overlay, back, onSave){
  overlay.querySelector('#backSetBtn').addEventListener('click', () => { overlay.remove(); back(); });
  overlay.querySelector('#saveSetBtn').addEventListener('click', () => {
    onSave();
    renderHeader();
    renderList();
    overlay.remove();
    back();
  });
}

export function openSettingsUsuario(back){
  let logo = config.logo || '';
  let foto = config.fotoPerfil || '';
  openOverlay(sectionShell('Usuario', 'Tu foto de perfil y los datos de tu negocio.', `
      ${imagePickerHtml('foto', 'Foto de perfil', foto, 'Sin foto')}
      ${imagePickerHtml('logo', 'Logo del negocio (sale en tus facturas)', logo, 'Sin logo')}
      <div class="field"><label>Nombre del negocio</label><input type="text" id="s_nombre" value="${escapeHtml(config.nombre)}" placeholder="Mi negocio"></div>
      <div class="field"><label>Dirección</label><textarea id="s_direccion" rows="2" placeholder="Opcional">${escapeHtml(config.direccion)}</textarea></div>
      <div class="row2">
        <div class="field"><label>Teléfono</label><input type="tel" id="s_telefono" value="${escapeHtml(config.telefono)}" placeholder="Opcional"></div>
        <div class="field"><label>Correo</label><input type="email" id="s_email" value="${escapeHtml(config.email)}" placeholder="Opcional"></div>
      </div>
    `), (overlay) => {
    wireImagePicker(overlay, 'foto', 'Sin foto', 400, (d) => { foto = d; });
    wireImagePicker(overlay, 'logo', 'Sin logo', 400, (d) => { logo = d; });
    wireSection(overlay, back, () => {
      config.nombre = overlay.querySelector('#s_nombre').value.trim() || 'Mi negocio';
      config.direccion = overlay.querySelector('#s_direccion').value.trim();
      config.telefono = overlay.querySelector('#s_telefono').value.trim();
      config.email = overlay.querySelector('#s_email').value.trim();
      config.fotoPerfil = foto;
      config.logo = logo;
      save('cuentas_config', config);
    });
  });
}

export function openSettingsFactura(back){
  openOverlay(sectionShell('Factura', 'Cómo se ve tu factura y qué datos incluye.', `
      <div class="field"><label>Título del documento</label><input type="text" id="sf_titulo" value="${escapeHtml(config.facturaTitulo || '')}" placeholder="FACTURA"></div>
      ${toggleRowHtml('sf_pieOn', 'Mostrar pie de página', config.mostrarPie !== false)}
      <div id="sf_pieWrap">
        <div class="field"><label>Pie de página</label><input type="text" id="sf_pie" value="${escapeHtml(config.facturaPie || '')}" placeholder="Ej. Gracias por su compra"></div>
      </div>
      <div class="row2">
        <div class="field"><label>Color de la factura</label><input type="color" id="sf_color" value="${config.colorFactura || '#1E4FA0'}" style="height:44px; padding:4px;"></div>
      </div>
      ${toggleRowHtml('sf_tenga', 'Mostrar Tenga en cuenta en la factura', config.mostrarTenga !== false)}
      <div id="sf_tengaWrap">
        <div class="field"><label>Texto en "Tenga en cuenta" (opcional)</label><textarea id="sf_tengaTxt" rows="2" placeholder="Ej. Cambios y devoluciones dentro de 8 días con factura">${escapeHtml(config.tengaTexto || '')}</textarea></div>
      </div>
      <div class="section-label" style="margin:14px 0 4px;">Datos del negocio en el encabezado</div>
      ${toggleRowHtml('sf_dir', 'Mostrar dirección', config.mostrarDireccion !== false)}
      ${toggleRowHtml('sf_tel', 'Mostrar teléfono', config.mostrarTelefono !== false)}
      ${toggleRowHtml('sf_mail', 'Mostrar correo', config.mostrarEmail !== false)}
      <div class="section-label" style="margin:14px 0 4px;">Secciones de la factura</div>
      ${toggleRowHtml('sf_pagos', 'Tabla de pagos recibidos', config.mostrarPagos !== false)}
      ${toggleRowHtml('sf_selloOn', 'Mostrar sello PAGADA', config.mostrarSello !== false)}
      ${toggleRowHtml('sf_fotos', 'Foto de cada producto', config.mostrarFotos === true)}
      <details id="sf_firmaDetalle" style="margin-top:14px; border:1px solid var(--border); border-radius:12px; padding:10px 12px; background:var(--surface);">
        <summary style="cursor:pointer; font-weight:700; font-size:14px; padding:4px 0;">Firma para la factura</summary>
        <div style="margin-top:10px;">
          ${toggleRowHtml('sf_firma', 'Mostrar firma en la factura', config.mostrarFirma !== false)}
          <canvas id="sf_firmaCanvas" style="display:block; width:100%; height:150px; margin-top:8px; border:1px dashed var(--border); border-radius:10px; background:#fff; touch-action:none;"></canvas>
          <div class="sheet-actions" style="margin-top:8px;"><button class="btn btn-secondary" id="sf_firmaClear" type="button">Borrar firma</button></div>
          <div class="step-note">Firma con el dedo o el mouse dentro del recuadro. Aparecerá encima de la línea de firma en la factura.</div>
        </div>
      </details>
    `), (overlay) => {
    const atarMostrar = (toggleId, wrapId) => {
      const t = overlay.querySelector('#' + toggleId);
      const w = overlay.querySelector('#' + wrapId);
      const sync = () => { w.style.display = t.checked ? '' : 'none'; };
      t.addEventListener('change', sync);
      sync();
    };
    atarMostrar('sf_pieOn', 'sf_pieWrap');
    atarMostrar('sf_tenga', 'sf_tengaWrap');
    const cv = overlay.querySelector('#sf_firmaCanvas');
    const cx = cv.getContext('2d');
    let firmaCambiada = false, firmaVacia = false, dibujando = false, cvListo = false;
    const ratio = window.devicePixelRatio || 1;
    const prepararCanvas = () => {
      if (cvListo) return;
      const rc = cv.getBoundingClientRect();
      if (!rc.width) return;
      cvListo = true;
      cv.width = Math.round(rc.width * ratio); cv.height = Math.round(rc.height * ratio);
      cx.setTransform(ratio, 0, 0, ratio, 0, 0);
      cx.lineWidth = 2.4; cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.strokeStyle = '#111';
      if (config.firmaImg) {
        const im = new Image();
        im.onload = () => {
          const sc = Math.min(rc.width / im.width, rc.height / im.height);
          cx.drawImage(im, (rc.width - im.width * sc) / 2, (rc.height - im.height * sc) / 2, im.width * sc, im.height * sc);
        };
        im.src = config.firmaImg;
      }
    };
    const detalleFirma = overlay.querySelector('#sf_firmaDetalle');
    detalleFirma.addEventListener('toggle', () => { if (detalleFirma.open) prepararCanvas(); });
    const posCv = (e) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener('pointerdown', (e) => {
      prepararCanvas();
      dibujando = true; firmaCambiada = true; firmaVacia = false;
      cv.setPointerCapture(e.pointerId);
      const q = posCv(e); cx.beginPath(); cx.moveTo(q.x, q.y);
    });
    cv.addEventListener('pointermove', (e) => {
      if (!dibujando) return;
      const q = posCv(e); cx.lineTo(q.x, q.y); cx.stroke();
    });
    const acabar = () => { dibujando = false; };
    cv.addEventListener('pointerup', acabar);
    cv.addEventListener('pointercancel', acabar);
    overlay.querySelector('#sf_firmaClear').addEventListener('click', () => {
      cx.save(); cx.setTransform(1, 0, 0, 1, 0, 0); cx.clearRect(0, 0, cv.width, cv.height); cx.restore();
      firmaCambiada = true; firmaVacia = true;
    });
    wireSection(overlay, back, () => {
      config.tengaTexto = overlay.querySelector('#sf_tengaTxt').value.trim();
      if (firmaCambiada) config.firmaImg = firmaVacia ? '' : cv.toDataURL('image/png');
      config.facturaTitulo = overlay.querySelector('#sf_titulo').value.trim() || 'FACTURA';
      config.facturaPie = overlay.querySelector('#sf_pie').value.trim();
      config.colorFactura = overlay.querySelector('#sf_color').value || '#1E4FA0';
      config.mostrarDireccion = overlay.querySelector('#sf_dir').checked;
      config.mostrarTelefono = overlay.querySelector('#sf_tel').checked;
      config.mostrarEmail = overlay.querySelector('#sf_mail').checked;
      config.mostrarTenga = overlay.querySelector('#sf_tenga').checked;
      config.mostrarPagos = overlay.querySelector('#sf_pagos').checked;
      config.mostrarFirma = overlay.querySelector('#sf_firma').checked;
      config.mostrarPie = overlay.querySelector('#sf_pieOn').checked;
      config.mostrarSello = overlay.querySelector('#sf_selloOn').checked;
      config.mostrarFotos = overlay.querySelector('#sf_fotos').checked;
      save('cuentas_config', config);
    });
  });
}

export function openSettingsProductos(back){
  openOverlay(sectionShell('Productos', 'Valores que la app usa al crear y revisar tus productos.', `
      <div class="row2">
        <div class="field mono"><label>Ganancia por defecto (%)</label><input type="number" inputmode="decimal" id="s_margenDefault" value="${config.margenDefault || ''}" placeholder="Ej. 40"></div>
        <div class="field mono"><label>Avisar poco stock desde</label><input type="number" inputmode="numeric" id="s_stockMin" value="${config.stockMinimo}" placeholder="3"></div>
      </div>
      <div class="step-note">Al crear un producto nuevo se usará esta ganancia para calcular su precio de venta. Te avisaremos cuando el stock llegue a esta cantidad o menos.</div>
    `), (overlay) => {
    wireSection(overlay, back, () => {
      const m = overlay.querySelector('#s_margenDefault').value;
      config.margenDefault = m === '' ? '' : Number(m);
      const s = overlay.querySelector('#s_stockMin').value;
      config.stockMinimo = s === '' ? 3 : Number(s);
      save('cuentas_config', config);
    });
  });
}

export function openSettingsVentas(back){
  openOverlay(sectionShell('Moneda e impuestos', 'Se aplican a tus ventas y facturas.', `
      <div class="row2">
        <div class="field mono"><label>Símbolo de moneda</label><input type="text" id="s_moneda" value="${escapeHtml(config.moneda)}" placeholder="$"></div>
        <div class="field mono"><label>Impuesto (%)</label><input type="number" inputmode="decimal" id="s_impuesto" value="${config.impuesto}" placeholder="0"></div>
      </div>
    `), (overlay) => {
    wireSection(overlay, back, () => {
      config.moneda = overlay.querySelector('#s_moneda').value.trim() || '$';
      config.impuesto = Number(overlay.querySelector('#s_impuesto').value) || 0;
      save('cuentas_config', config);
    });
  });
}

