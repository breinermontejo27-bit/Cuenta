// Créditos: hojas que piden otros módulos (no tiene pestaña).
//  'credito:abono'    { ventaId, alVolver }  abono a una venta fiada (openAbonoForm, L559–622)
//  'creditos:lista'   { alVolver }           clientes con deuda (openCreditosAjustes, L3675–3711)
//  'creditos:cliente' { clienteId, alVolver } deuda de un cliente, abonar, liquidar, WhatsApp (L3713–3787)

import { abrirAbono } from './payment-form.js';
import { abrirDeudores, abrirDeudaCliente } from './credits-view.js';

export default {
  id: 'creditos',
  hojas: {
    'credito:abono': ({ ventaId, alVolver }) => abrirAbono(ventaId, alVolver),
    'creditos:lista': ({ alVolver }) => abrirDeudores(alVolver),
    'creditos:cliente': ({ clienteId, alVolver }) => abrirDeudaCliente(clienteId, alVolver),
  },
};
