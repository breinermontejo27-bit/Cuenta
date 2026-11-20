// WhatsApp: enlace con el número y el texto (waUrl, L3628; RG-05).

/** Número para wa.me: solo dígitos; 10 dígitos que empiezan por 3 = Colombia (+57). */
export function numeroWhatsApp(telefono) {
  let d = String(telefono || '').replace(/\D/g, '');
  if (d.length === 10 && d.startsWith('3')) d = '57' + d;
  return d;
}

export function enlaceWhatsApp(telefono, texto) {
  return `https://wa.me/${numeroWhatsApp(telefono)}?text=${encodeURIComponent(texto)}`;
}

/** Abre el chat en otra pestaña (sin dar acceso a esta página: D4-26). */
export function abrirWhatsApp(telefono, texto) {
  window.open(enlaceWhatsApp(telefono, texto), '_blank', 'noopener');
}
