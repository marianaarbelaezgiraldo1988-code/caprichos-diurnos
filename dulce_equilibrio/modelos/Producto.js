const mongoose = require('mongoose');

const CATEGORIAS = ['Tortas', 'Postres', 'Galletas', 'Antojos creativos', 'Otros'];

const productoSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    descripcion: { type: String, trim: true, maxlength: 300, default: '' },
    categoria: { type: String, enum: CATEGORIAS, default: 'Otros' },
    // Nombre que aparece en el carrito y en el mensaje de WhatsApp (si se deja vacío, se usa el nombre).
    nombreCarrito: { type: String, trim: true, maxlength: 80, default: '' },
    precio: { type: Number, required: true, min: 0, max: 10000000 },
    // Ruta relativa dentro del sitio, por ejemplo: assets/img/torta-naranja.jpg
    imagen: { type: String, trim: true, maxlength: 200, default: '' },
    // Color de fondo de la tarjeta en el sitio (formato #rrggbb). Vacío = el color de la categoría.
    color: { type: String, trim: true, default: '' },
    disponible: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Producto', productoSchema);
module.exports.CATEGORIAS = CATEGORIAS;
