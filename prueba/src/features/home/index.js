// Inicio (ajuste visual final, Estilo 1 aprobado): resumen del día, accesos rápidos, cifras clave, últimas ventas y
// próximas entregas. NO calcula nada nuevo: reúne cifras que la app ya calcula en Reportes (caja del día y ganancia
// del mes), Clientes (por cobrar), Pendientes e Inventario (poco stock). Los accesos abren las ventanas de cada
// módulo por su nombre (registro de hojas), sin importarlos.

import { coleccion, obtenerAjustes } from '../../core/state.js';
import { hoy } from '../../core/clock.js';
import { pedirHoja, irA } from '../../core/navigation.js';
import { html, icono, montar } from '../../ui/html.js';
import { dinero, fecha, folio, etiquetaMedio } from '../../ui/format.js';
import { fila, lista, insignia, alTocarFila } from '../../ui/components/list.js';
import { resumenCaja, rangoDia, resumenReportes } from '../../business/accounting.js';
import { totalPorCobrar, saldoVenta, deudasPorCliente } from '../../business/payments.js';
import { agruparPendientes, sumaPendiente } from '../../business/orders-rules.js';
import { pocoStock } from '../../business/inventory-rules.js';
import { filtrarVentas } from '../../business/sales-rules.js';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const fechaLarga = (iso) => { const d = new Date(iso + 'T12:00:00'); const t = `${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`; return t[0].toUpperCase() + t.slice(1); };

const ACCESOS = [
  ['vender', 'Vender', 'ventas'], ['pedido', 'Pedido', 'calendario'], ['cobrar', 'Cobrar', 'caja'], ['gasto', 'Gasto', 'gastos'],
];

function proximasEntregas(pedidos, dia) {
  const g = agruparPendientes(pedidos, dia);
  return [...g.pedidos.vencidos, ...g.pedidos.hoy, ...g.pedidos.proximos, ...g.encargos.conFecha, ...g.apartados.lista, ...g.encargos.sinFecha].slice(0, 4);
}

export default {
  id: 'inicio',
  titulo: 'Inicio',
  icono: 'inicio',
  orden: 0,
  barra: 1,
  buscador: null,
  subvistas: [],
  usa: ['ventas', 'pedidos', 'gastos', 'inventario', 'clientes'],
  accionPrincipal: { texto: 'Nueva venta', ejecutar: () => pedirHoja('venta:nueva', {}) },
  encabezado: () => ({ titulo: `Hola, ${obtenerAjustes().nombre || 'Mi negocio'}`, subtitulo: fechaLarga(hoy()) }),
  dibujar(contenedor) {
    const dia = hoy();
    const ventas = coleccion('ventas'), pedidos = coleccion('pedidos'), gastos = coleccion('gastos'), inventario = coleccion('inventario');
    const aj = obtenerAjustes();
    const caja = resumenCaja({ ventas, pedidos, gastos }, rangoDia(dia), dia);
    const ventasHoy = ventas.filter((v) => v.fecha === dia).length;
    const porCobrar = totalPorCobrar(ventas);
    const deben = [...deudasPorCliente(ventas).values()].filter((d) => d > 0).length;
    const rep = resumenReportes({ ventas, gastos, inventario }, 'mes', aj, dia);
    const cmp = rep.comparacion && !rep.comparacion.sinDatos ? `${rep.comparacion.diferencia >= 0 ? '▲' : '▼'} ${dinero(Math.abs(rep.comparacion.diferencia))} frente al mes anterior` : 'Este mes';
    const pendientes = pedidos.filter((p) => p.estado === 'pendiente');
    const g = agruparPendientes(pedidos, dia);
    const bajos = pocoStock(inventario, aj).bajos;
    const ultimas = filtrarVentas(ventas, '').slice(0, 4);
    const proximas = proximasEntregas(pedidos, dia);
    const filaVenta = (v) => fila({
      datos: { venta: v.id }, iniciales: v.clienteNombre, titulo: v.clienteNombre,
      sub: `${v.folio ? 'Factura ' + folio(v.folio) : 'Sin factura'}${etiquetaMedio(v.metodoPago) ? ' · ' + etiquetaMedio(v.metodoPago) : ''} · ${fecha(v.fecha)}`,
      valor: dinero(v.total), insignias: saldoVenta(v) > 0 ? [insignia('deuda', 'Debe ' + dinero(saldoVenta(v)))] : [],
    });
    const filaPendiente = (p) => fila({
      datos: { pendiente: p.id }, icono: p.tipo === 'apartado' ? 'caja' : p.tipo === 'encargo' ? 'inventario' : 'calendario', titulo: p.clienteNombre,
      sub: `${{ apartado: 'Apartado', encargo: 'Encargo' }[p.tipo] || 'Pedido'}${p.fechaEntrega ? ' · ' + fecha(p.fechaEntrega) : ''}`,
      valor: dinero(sumaPendiente(p)), insignias: p.fechaEntrega && p.fechaEntrega < dia && p.tipo !== 'apartado' ? [insignia('vencido', 'Vencido')] : p.fechaEntrega === dia ? [insignia('info', 'Hoy')] : [],
    });
    montar(contenedor, html`
      <section class="panel-hoy" aria-label="Hoy">
        <div><div class="etq">Vendido hoy · ${ventasHoy} ${ventasHoy === 1 ? 'venta' : 'ventas'}</div><div class="val">${dinero(caja.ventasTot)}</div></div>
        <div class="panel-hoy-pie">
          <div><span>Caja de hoy</span><b>${dinero(caja.ingresos)}</b></div>
          <div><span>Ventas a crédito hoy</span><b>${dinero(caja.creditoNuevo)}</b></div>
        </div>
      </section>
      <div class="accesos">${ACCESOS.map(([id, t, i]) => html`<button type="button" class="acceso" data-acceso="${id}"><span class="acceso-icono">${icono(i)}</span>${t}</button>`)}</div>
      <div class="kpis">
        <a class="kpi" href="#/clientes"><span class="kpi-t">${icono('caja', 'sm')}Por cobrar</span><span class="kpi-v ${porCobrar > 0 ? 'neg' : ''}">${dinero(porCobrar)}</span><span class="kpi-s">${deben ? `${deben} ${deben === 1 ? 'cliente debe' : 'clientes deben'}` : 'Nadie te debe'}</span></a>
        <a class="kpi" href="#/reportes/resumen"><span class="kpi-t">${icono('reportes', 'sm')}Ganancia del mes</span><span class="kpi-v ${rep.periodo.ganancia >= 0 ? 'pos' : 'neg'}">${dinero(rep.periodo.ganancia)}</span><span class="kpi-s">${cmp}</span></a>
        <a class="kpi" href="#/ventas/pendientes"><span class="kpi-t">${icono('calendario', 'sm')}Pendientes</span><span class="kpi-v">${pendientes.length}</span><span class="kpi-s">${g.pedidos.vencidos.length ? `${g.pedidos.vencidos.length} vencidos` : g.pedidos.hoy.length ? `${g.pedidos.hoy.length} para hoy` : 'Por entregar'}</span></a>
        <a class="kpi" href="#/inventario/productos"><span class="kpi-t">${icono('alerta', 'sm')}Poco stock</span><span class="kpi-v ${bajos.length ? 'aviso' : ''}">${bajos.length}</span><span class="kpi-s">${bajos.length ? bajos.slice(0, 2).map((p) => p.nombre).join(', ') : 'Todo en orden'}</span></a>
      </div>
      <div class="columnas-inicio">
        <section><div class="seccion-titulo">Últimas ventas <a href="#/ventas/ventas">Ver todas</a></div>
          ${ultimas.length ? lista(ultimas.map(filaVenta)) : html`<p class="nota">Aún no hay ventas. Toca "Vender" para registrar la primera.</p>`}</section>
        <section><div class="seccion-titulo">Próximas entregas <a href="#/ventas/pendientes">Ver</a></div>
          ${proximas.length ? lista(proximas.map(filaPendiente)) : html`<p class="nota">No hay pedidos, encargos ni apartados pendientes.</p>`}</section>
      </div>`);
    const accion = { vender: () => pedirHoja('venta:nueva', {}), pedido: () => pedirHoja('pendiente:nuevo', {}), cobrar: () => pedirHoja('creditos:lista', {}), gasto: () => pedirHoja('gasto:nuevo', {}) };
    contenedor.querySelectorAll('[data-acceso]').forEach((b) => b.addEventListener('click', () => accion[b.dataset.acceso]()));
    alTocarFila(contenedor, 'venta', (id) => pedirHoja('venta:ver', { ventaId: id }));
    alTocarFila(contenedor, 'pendiente', (id) => pedirHoja('pendiente:ver', { pendienteId: id }));
    contenedor.querySelectorAll('a.kpi, .seccion-titulo a').forEach((a) => a.addEventListener('click', (e) => {
      const [, mod, sub] = a.getAttribute('href').split('/');
      e.preventDefault(); irA(mod, sub || '');
    }));
  },
};
