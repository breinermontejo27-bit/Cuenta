// Ajustes › Versión anterior (Etapa 9): estado de la migración desde "Cuentas" y, si la versión anterior cambió
// después de traer los datos, la opción de traerlos de nuevo. Nunca borra los datos de la versión anterior.

import { informarError } from '../../core/errors.js';
import { html } from '../../ui/html.js';
import { abrirHoja } from '../../ui/overlays/sheet.js';
import { confirmar } from '../../ui/overlays/dialog.js';
import { notificar } from '../../ui/notifications/toast.js';
import { lineas, nota, banner } from '../../ui/components/cards.js';
import { coleccion } from '../../core/state.js';
import { estadoMigracion, traerDeNuevoDatosAnteriores } from '../../operations/migration.js';

const NOMBRES = { clientes: 'Clientes', inventario: 'Productos', ventas: 'Ventas', gastos: 'Gastos', pedidos: 'Pendientes', movimientos: 'Movimientos' };
const fechaHora = (iso) => new Date(iso).toLocaleString('es', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** ¿Hay algo que mostrar? (se importó algo o hay datos de la versión anterior en este navegador) */
export async function hayMigracion() {
  try { const e = await estadoMigracion(); return !!(e.importado || e.hayLegado); } catch (_) { return false; }
}

/** Avisa al abrir si la versión anterior cambió después de traer los datos. */
export async function avisarSiCambioLaVersionAnterior() {
  let e;
  try { e = await estadoMigracion(); } catch (err) { informarError(err, 'revisar versión anterior'); return; }
  if (!e.cambiado) return;
  notificar('La versión anterior de la app tiene cambios que Orisma no tiene. Revisa qué hacer.', {
    tipo: 'grave', accion: { texto: 'Revisar', alPulsar: abrirMigracion },
  });
}

export async function abrirMigracion() {
  let e;
  try { e = await estadoMigracion(); } catch (err) { informarError(err, 'versión anterior'); return; }
  const filas = (conteos) => Object.entries(NOMBRES).map(([c, n]) => [n, String((conteos && conteos[c]) ?? 0)]);
  const ahora = Object.fromEntries(Object.keys(NOMBRES).map((c) => [c, coleccion(c).length]));
  let cuerpo;
  if (!e.importado) {
    cuerpo = nota('En este navegador hay datos de la versión anterior que todavía no se trajeron. Se traen solos la próxima vez que abras la app con la base vacía.');
  } else {
    cuerpo = html`
      <div class="tarjeta">${lineas([['Datos traídos el', fechaHora(e.importado.fecha)], ...filas(e.importado.conteos)])}</div>
      ${e.cambiado ? html`
        ${banner('aviso', 'La versión anterior cambió después de traer los datos.', ' Probablemente se siguió usando la app anterior en este teléfono.')}
        <section class="seccion"><h3 class="seccion-titulo">Comparación</h3>
          <div class="tarjeta">${lineas(Object.entries(NOMBRES).map(([c, n]) => [n, `Anterior ${e.conteosLegado[c] ?? 0} · Orisma ${ahora[c]}`]))}</div></section>
        ${nota('Si los datos buenos son los de la versión anterior, puedes traerlos de nuevo. Lo que hay ahora en Orisma se guarda antes en una copia automática (Ajustes › Respaldo). Si registraste cosas en las dos apps, descarga primero un respaldo y pide ayuda: no se mezclan solas.')}
        <button type="button" class="btn btn-peligro btn-bloque" data-accion="traer">Traer de nuevo los datos anteriores</button>`
    : nota(e.hayLegado
      ? 'Los datos de la versión anterior no cambiaron desde que se trajeron. Siguen guardados en este navegador como copia adicional: Orisma nunca los borra ni los modifica.'
      : 'Este navegador ya no tiene datos de la versión anterior. Orisma conserva una copia literal de ellos.')}`;
  }
  const capa = abrirHoja({ titulo: 'Versión anterior', paso: 'Datos traídos de la app "Cuentas"', cuerpo });
  const boton = capa.elemento.querySelector('[data-accion="traer"]');
  if (boton) boton.addEventListener('click', async () => {
    const si = await confirmar({ titulo: '¿Reemplazar los datos de Orisma?', mensaje: `Se reemplazarán los datos actuales de Orisma por los de la versión anterior (${e.conteosLegado.clientes ?? 0} clientes, ${e.conteosLegado.ventas ?? 0} ventas). Antes se guardará una copia automática de lo actual.`, aceptar: 'Sí, traer de nuevo', peligro: true });
    if (!si) return;
    boton.disabled = true;
    try {
      const r = await traerDeNuevoDatosAnteriores();
      if (r.estado !== 'importado') {
        notificar('No se pudieron traer los datos. No se cambió nada.', { tipo: 'grave' });
        informarError(new Error(r.errores.slice(0, 3).join(' | ')), 'traer de nuevo');
        boton.disabled = false;
        return;
      }
      await capa.cerrar();
      notificar('Datos de la versión anterior traídos de nuevo. La copia de lo anterior está en Ajustes › Respaldo.', { tipo: 'exito', duracion: 9000 });
    } catch (err) { boton.disabled = false; informarError(err, 'traer de nuevo'); }
  });
}
