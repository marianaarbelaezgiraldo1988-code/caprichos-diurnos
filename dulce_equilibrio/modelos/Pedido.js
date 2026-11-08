const mongoose = require('mongoose');

const ESTADOS = ['pendiente', 'confirmado', 'preparando', 'entregado', 'cancelado'];
const CANALES = ['WhatsApp', 'Presencial', 'Otro'];

const itemSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, maxlength: 80 },
    precio: { type: Number, required: true, min: 0 },
    cantidad: { type: Number, required: true, min: 1, max: 99 }
  },
  { _id: false }
);

const pedidoSchema = new mongoose.Schema(
  {
    cliente: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    telefono: { type: String, trim: true, maxlength: 30, default: '' },
    canal: { type: String, enum: CANALES, default: 'WhatsApp' },
    items: {
      type: [itemSchema],
      validate: [(v) => v.length >= 1 && v.length <= 50, 'El pedido debe tener entre 1 y 50 productos.']
    },
    total: { type: Number, required: true, min: 0 },
    estado: { type: String, enum: ESTADOS, default: 'pendiente' },
    notas: { type: String, trim: true, maxlength: 500, default: '' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pedido', pedidoSchema);
module.exports.ESTADOS = ESTADOS;
module.exports.CANALES = CANALES;
