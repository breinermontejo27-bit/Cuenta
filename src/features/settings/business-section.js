// Ajustes › Negocio: foto de perfil, logo, nombre y datos de contacto (openSettingsUsuario, L3944–3969).

import { obtenerAjustes } from '../../core/state.js';
import { informarError } from '../../core/errors.js';
import { html } from '../../ui/html.js';
import { campo, filaCampos, valor } from '../../ui/components/fields.js';
import { selectorImagen, conectarSelectorImagen } from '../../ui/components/image-picker.js';
import { prepararImagen } from '../../services/images.js';
import { abrirSeccion } from './section.js';

export function abrirNegocio() {
  const aj = obtenerAjustes();
  let foto = aj.fotoPerfil || '', logo = aj.logo || '';
  abrirSeccion({
    titulo: 'Negocio', nota: 'Tu foto de perfil y los datos de tu negocio.',
    campos: html`
      ${selectorImagen('foto', 'Foto de perfil', foto, 'Sin foto')}
      ${selectorImagen('logo', 'Logo del negocio (sale en tus facturas)', logo, 'Sin logo')}
      ${campo({ id: 's_nombre', etiqueta: 'Nombre del negocio', valor: aj.nombre, placeholder: 'Mi negocio' })}
      ${campo({ id: 's_direccion', etiqueta: 'Dirección', tipo: 'textarea', valor: aj.direccion, placeholder: 'Opcional' })}
      ${filaCampos(campo({ id: 's_telefono', etiqueta: 'Teléfono', tipo: 'tel', valor: aj.telefono, placeholder: 'Opcional' }), campo({ id: 's_email', etiqueta: 'Correo', tipo: 'email', valor: aj.email, placeholder: 'Opcional' }))}`,
    alMontar: (el) => {
      const falla = (e) => informarError(e, 'imagen');
      conectarSelectorImagen(el, 'foto', 'Sin foto', { procesar: (a) => prepararImagen(a, 400), alCambiar: (d) => { foto = d; }, alFallar: falla });
      conectarSelectorImagen(el, 'logo', 'Sin logo', { procesar: (a) => prepararImagen(a, 400), alCambiar: (d) => { logo = d; }, alFallar: falla });
    },
    leer: (el) => ({
      nombre: valor(el, 's_nombre').trim() || 'Mi negocio', direccion: valor(el, 's_direccion').trim(),
      telefono: valor(el, 's_telefono').trim(), email: valor(el, 's_email').trim(), fotoPerfil: foto, logo,
    }),
  });
}
