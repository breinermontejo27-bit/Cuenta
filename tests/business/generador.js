// Generador de datos de prueba ficticios con la misma forma que produce la versión original.
// Determinista: la misma semilla da los mismos datos.

export function crearAzar(semilla) {
  let s = semilla >>> 0 || 1;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  return {
    r,
    entero: (a, b) => a + Math.floor(r() * (b - a + 1)),
    elegir: (lista) => lista[Math.floor(r() * lista.length)],
    prob: (p) => r() < p,
  };
}

const fecha = (z, base = '2026-11-15', rango = 75) => {
  const d = new Date(base + 'T12:00:00');
  d.setDate(d.getDate() - z.entero(-15, rango));
  return d.toISOString().slice(0, 10);
};

/** Conjunto de datos aleatorio. `hoy` fijo para que las comparaciones por fecha sean reproducibles. */
export function generarDatos(semilla, { hoy = '2026-11-15' } = {}) {
  const z = crearAzar(semilla);
  const clientes = Array.from({ length: z.entero(1, 6) }, (_, i) => ({ id: 'c' + i, nombre: z.elegir(['Ana', 'Luis', 'Marta', 'Ñandú <b>', 'José "Pepe"', 'Eva']) + ' ' + i, telefono: z.prob(0.7) ? '300' + z.entero(1000000, 9999999) : '', email: '', direccion: '' }));
  const inventario = Array.from({ length: z.entero(2, 8) }, (_, i) => {
    const costo = z.prob(0.8) ? z.entero(1, 60) * 1000 : 0;
    return {
      id: 'p' + i, nombre: 'Producto ' + i, categoria: z.elegir(['', 'Ropa', 'Joyería', 'Materiales']), descripcion: z.prob(0.3) ? 'Desc ' + i : '',
      costo, margen: z.entero(0, 80), precio: costo ? Math.round(costo * (1 + z.entero(0, 90) / 100)) : z.entero(1, 50) * 1000,
      stock: z.prob(0.2) ? '' : z.entero(0, 15), foto: '',
      stockMinimo: z.prob(0.3) ? z.entero(0, 6) : '', sinAlerta: z.prob(0.15),
    };
  });
  const item = (conMateriales) => {
    const p = z.prob(0.8) ? z.elegir(inventario) : null;
    const it = { productoId: p ? p.id : null, nombre: p ? p.nombre : 'Servicio', cantidad: z.entero(1, 4), precio: p ? p.precio : z.entero(1, 30) * 1000, caracteristicas: z.prob(0.3) ? 'talla M' : '', costo: z.entero(0, 20) * 1000 };
    if (conMateriales && z.prob(0.3)) { it.productoId = null; it.nombre = 'Prenda'; it.materiales = [{ productoId: z.elegir(inventario).id, nombre: 'Material', cantidad: z.entero(1, 3) }]; }
    return it;
  };
  const metodos = ['efectivo', 'tarjeta'];
  const ventas = Array.from({ length: z.entero(0, 12) }, (_, i) => {
    const items = Array.from({ length: z.entero(1, 3) }, () => item(true));
    const suma = items.reduce((s, it) => s + it.precio * it.cantidad, 0);
    const descuentoMonto = z.prob(0.3) ? Math.round(suma * z.entero(1, 20) / 100) : 0;
    const subtotal = suma - descuentoMonto;
    const impuesto = z.prob(0.2) ? subtotal * 0.19 : 0;
    const total = subtotal + impuesto;
    const fiado = z.prob(0.35);
    const f = fecha(z);
    const abonos = fiado
      ? Array.from({ length: z.entero(0, 3) }, (_, k) => ({ id: `a${i}_${k}`, fecha: fecha(z), monto: z.entero(1, 10) * 1000, metodo: z.elegir(metodos), nota: '' }))
      : (z.prob(0.1) ? [] : [{ id: `a${i}`, fecha: f, monto: total, metodo: z.elegir(metodos), nota: '' }]);
    const cli = z.prob(0.9) ? z.elegir(clientes) : { id: 'borrado', nombre: 'Cliente borrado' };
    return { id: 'v' + i, folio: z.prob(0.5) ? i + 1 : null, creadoTs: 1000 + i, clienteId: cli.id, clienteNombre: cli.nombre, items, sumaItems: suma, descuentoTipo: 'pct', descuentoPct: 0, descuentoMonto, subtotal, impuesto, total, costoTotal: z.entero(0, 50) * 1000, gananciaEstimada: 0, notas: '', fecha: f, metodoPago: fiado ? 'credito' : 'efectivo', fiado, abonos };
  });
  const gastos = Array.from({ length: z.entero(0, 8) }, (_, i) => {
    const compra = z.prob(0.4);
    const p = z.elegir(inventario);
    return compra
      ? (z.prob(0.7) ? { id: 'g' + i, tipo: 'compra', metodo: z.elegir(metodos), productoId: p.id, cantidad: z.entero(1, 10), descripcion: `Compra de inventario: ${p.nombre}`, monto: z.entero(1, 90) * 1000, fecha: fecha(z), categoria: 'Inventario' }
        : { id: 'g' + i, descripcion: `Compra de inventario: ${p.nombre} x2`, monto: z.entero(1, 90) * 1000, fecha: fecha(z), categoria: 'Inventario' })
      : { id: 'g' + i, tipo: 'general', metodo: z.prob(0.2) ? undefined : z.elegir(metodos), descripcion: 'Gasto ' + i, monto: z.entero(1, 90) * 1000, fecha: fecha(z), categoria: z.elegir(['', 'Local', 'Devolución']) };
  });
  const movimientos = Array.from({ length: z.entero(0, 6) }, (_, i) => {
    const p = z.elegir(inventario);
    const tipo = z.elegir(['ajuste', 'alta', 'baja', 'devolucion', undefined]);
    return { id: 'm' + i, tipo, ts: z.entero(1, 9999), productoId: p.id, productoNombre: p.nombre, stockAnterior: z.entero(0, 9), stockNuevo: z.prob(0.2) ? '' : z.entero(0, 9), cantidad: z.entero(1, 5), motivo: z.prob(0.5) ? 'Conteo' : '', fecha: fecha(z) };
  });
  const pedidos = Array.from({ length: z.entero(0, 8) }, (_, i) => {
    const tipo = z.elegir(['pedido', 'encargo', 'apartado', undefined]);
    const cli = z.elegir(clientes);
    const conAbonos = z.prob(0.6);
    const abonos = conAbonos ? Array.from({ length: z.entero(0, 3) }, (_, k) => ({ id: `pa${i}_${k}`, fecha: fecha(z), monto: z.entero(1, 20) * 1000, metodo: z.elegir(metodos), nota: 'Abono' })) : [];
    const anticipo = conAbonos ? abonos.reduce((s, a) => s + a.monto, 0) : (z.prob(0.5) ? z.entero(1, 30) * 1000 : 0);
    return {
      id: 'pd' + i, clienteId: cli.id, clienteNombre: cli.nombre, tipo,
      fechaEntrega: tipo === 'apartado' ? '' : (z.prob(0.15) ? '' : fecha(z, hoy, 10)),
      abonos, anticipo, anticipoMetodo: 'efectivo', descuentoPct: z.prob(0.3) ? z.entero(1, 30) : undefined,
      fechaAnticipo: z.prob(0.8) ? fecha(z) : undefined,
      items: Array.from({ length: z.entero(1, 3) }, () => item(true)), notas: z.prob(0.3) ? 'Llamar antes' : '',
      estado: z.elegir(['pendiente', 'pendiente', 'pendiente', 'entregado', 'cancelado']), creadoTs: z.entero(1, 500),
    };
  });
  const config = { nombre: 'Prueba', moneda: '$', impuesto: z.elegir([0, 0, 19]), siguienteFolio: 50, stockMinimo: z.elegir([3, 0, 5, '']), siguienteComprobante: z.prob(0.5) ? 7 : undefined };
  return { clientes, inventario, ventas, gastos, movimientos, pedidos, config, hoy };
}

/** Datos enfocados en encargos: pocos productos y muchos encargos del mismo producto (regla RI-14, orden de llegada). */
export function generarEncargos(semilla, { hoy = '2026-11-15' } = {}) {
  const z = crearAzar(semilla * 7919);
  const d = generarDatos(semilla, { hoy });
  d.inventario = d.inventario.slice(0, 2).map((p) => ({ ...p, stock: z.entero(0, 12) }));
  const ids = d.inventario.map((p) => p.id);
  d.pedidos = Array.from({ length: z.entero(3, 9) }, (_, i) => ({
    id: 'e' + i, clienteId: d.clientes[0].id, clienteNombre: d.clientes[0].nombre,
    tipo: z.prob(0.75) ? 'encargo' : z.elegir(['pedido', 'apartado']), estado: z.prob(0.85) ? 'pendiente' : 'entregado',
    fechaEntrega: '', abonos: [], anticipo: 0, creadoTs: z.entero(1, 100),
    items: Array.from({ length: z.entero(1, 2) }, () => ({ productoId: z.elegir(ids), nombre: 'X', cantidad: z.entero(1, 6), precio: 1000 })),
  }));
  return d;
}
