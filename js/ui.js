// Componentes de interfaz reutilizables: overlay, segmentos, imágenes, toggles.
import { escapeHtml } from './utils.js';

export function emptyState(title, text){
  return `<div class="empty-state"><div class="stamp">${escapeHtml(title)}</div><p>${escapeHtml(text)}</p></div>`;
}
export function segHtml(group, opts, selected){
  return `<div class="seg" data-group="${group}">${opts.map(([val, label]) => `<button type="button" data-val="${val}" class="${val === selected ? 'on' : ''}">${label}</button>`).join('')}</div>`;
}

// ============================================================
// OVERLAY HELPERS
// ============================================================
export function openOverlay(innerHtml, onMount){
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `<div class="sheet">${innerHtml}</div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if(e.target === overlay) overlay.remove(); });
  const sheet = overlay.querySelector('.sheet');
  if(onMount) onMount(overlay, sheet);
  return overlay;
}

export function resizeImageFile(file, maxSize, cb){
  const reader = new FileReader();
  reader.onerror = () => cb('');
  reader.onload = (e) => {
    const img = new Image();
    img.onerror = () => cb('');
    img.onload = () => {
      let w = img.width, h = img.height;
      if(!w || !h){ cb(''); return; }
      if(w > h && w > maxSize){ h = Math.round(h * maxSize / w); w = maxSize; }
      else if(h > maxSize){ w = Math.round(w * maxSize / h); h = maxSize; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      cb(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

export function imagePickerHtml(prefix, titulo, current, vacio){
  return `
      <div class="logo-row">
        <div id="${prefix}Preview">${current ? `<img class="logo-preview" src="${current}">` : `<div class="logo-preview-empty">${vacio}</div>`}</div>
        <div style="flex:1; min-width:0;">
          <div style="font-size:12px; font-weight:600; color:var(--ink-soft); margin-bottom:6px;">${titulo}</div>
          <input type="file" accept="image/*" id="${prefix}Input" class="file-input">
          <button class="link-btn danger" id="${prefix}Remove" style="margin-top:6px; ${current ? '' : 'display:none;'}">Quitar</button>
        </div>
      </div>`;
}

export function wireImagePicker(overlay, prefix, vacio, maxSize, onChange){
  const input = overlay.querySelector('#' + prefix + 'Input');
  const preview = overlay.querySelector('#' + prefix + 'Preview');
  const removeBtn = overlay.querySelector('#' + prefix + 'Remove');
  input.addEventListener('change', () => {
    const file = input.files && input.files[0];
    input.value = '';
    if(!file) return;
    if(file.size > 15 * 1024 * 1024){ alert('La imagen es muy pesada. Elige una de menos de 15 MB.'); return; }
    resizeImageFile(file, maxSize, (dataUrl) => {
      if(!dataUrl){ alert('No pude leer esa imagen. Prueba con una foto en JPG o PNG.'); return; }
      onChange(dataUrl);
      preview.innerHTML = `<img class="logo-preview" src="${dataUrl}">`;
      removeBtn.style.display = '';
    });
  });
  removeBtn.addEventListener('click', () => {
    onChange('');
    preview.innerHTML = `<div class="logo-preview-empty">${vacio}</div>`;
    removeBtn.style.display = 'none';
  });
}

export function toggleRowHtml(id, label, checked){
  return `<label class="toggle-row"><span>${label}</span><input type="checkbox" id="${id}" ${checked ? 'checked' : ''}></label>`;
}

