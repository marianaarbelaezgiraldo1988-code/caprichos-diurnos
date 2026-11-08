const express = require('express');
const Contacto = require('../modelos/Contacto');
const Pedido = require('../modelos/Pedido');
const Producto = require('../modelos/Producto');

const router = express.Router();

router.get('/', async (req, res) => {
  const [mensajesTotal, mensajesNoLeidos, pedidosTotal, pedidosPendientes, productosTotal, productosActivos] =
    await Promise.all([
      Contacto.countDocuments(),
      Contacto.countDocuments({ leido: false }),
      Pedido.countDocuments(),
      Pedido.countDocuments({ estado: { $in: ['pendiente', 'confirmado', 'preparando'] } }),
      Producto.countDocuments(),
      Producto.countDocuments({ disponible: true })
    ]);

  res.json({ mensajesTotal, mensajesNoLeidos, pedidosTotal, pedidosPendientes, productosTotal, productosActivos });
});

module.exports = router;
