const express = require('express');
const Producto = require('../modelos/Producto');

const router = express.Router();

// Catálogo público: solo productos disponibles, sin datos internos.
// Lo usa el sitio (js/catalogo.js) para dibujar las tarjetas.
router.get('/', async (req, res) => {
  const filtro = { disponible: true };
  if (Producto.CATEGORIAS.includes(req.query.categoria)) filtro.categoria = req.query.categoria;

  const productos = await Producto.find(filtro)
    .sort({ _id: 1 }) // orden de creación
    .select('nombre nombreCarrito categoria descripcion precio imagen color -_id')
    .lean();

  res.setHeader('Cache-Control', 'no-store');
  res.json(productos);
});

module.exports = router;
