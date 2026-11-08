const express = require('express');
const Pedido = require('../modelos/Pedido');
const { idValido, escaparRegex, paginacion, respuestaPaginada } = require('./utilidades');

const router = express.Router();

function leerPedido(body) {
  const cliente = String(body.cliente || '').trim();
  const telefono = String(body.telefono || '').trim();
  const notas = String(body.notas || '').trim();
  const canal = String(body.canal || 'WhatsApp');

  if (cliente.length < 2 || cliente.length > 80) return { error: 'El nombre del cliente debe tener entre 2 y 80 caracteres.' };
  if (telefono.length > 30) return { error: 'El teléfono es demasiado largo.' };
  if (notas.length > 500) return { error: 'Las notas no pueden pasar de 500 caracteres.' };
  if (!Pedido.CANALES.includes(canal)) return { error: 'Selecciona un canal válido.' };

  if (!Array.isArray(body.items) || body.items.length < 1 || body.items.length > 50) {
    return { error: 'Agrega entre 1 y 50 productos al pedido.' };
  }

  const items = [];
  for (const item of body.items) {
    const nombre = String(item.nombre || '').trim();
    const precio = Number(item.precio);
    const cantidad = Number(item.cantidad);
    if (!nombre || nombre.length > 80) return { error: 'Cada producto necesita un nombre.' };
    if (!Number.isFinite(precio) || precio < 0) return { error: `Precio no válido en "${nombre}".` };
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 99) return { error: `Cantidad no válida en "${nombre}".` };
    items.push({ nombre, precio: Math.round(precio), cantidad });
  }

  // El total siempre se calcula en el servidor.
  const total = items.reduce((suma, i) => suma + i.precio * i.cantidad, 0);
  return { datos: { cliente, telefono, notas, canal, items, total } };
}

router.get('/', async (req, res) => {
  const paginas = paginacion(req.query);
  const filtro = {};

  if (Pedido.ESTADOS.includes(req.query.estado)) filtro.estado = req.query.estado;

  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q) {
    const regex = new RegExp(escaparRegex(q), 'i');
    filtro.$or = [{ cliente: regex }, { telefono: regex }];
  }

  const [datos, total] = await Promise.all([
    Pedido.find(filtro).sort({ createdAt: -1 }).skip(paginas.salto).limit(paginas.limite).lean(),
    Pedido.countDocuments(filtro)
  ]);

  res.json({ ...respuestaPaginada(datos, total, paginas), estados: Pedido.ESTADOS });
});

// Registrar un pedido a mano (por ejemplo, uno que llegó por WhatsApp).
router.post('/', async (req, res) => {
  const { datos, error } = leerPedido(req.body);
  if (error) return res.status(400).json({ mensaje: error });
  const pedido = await Pedido.create(datos);
  res.status(201).json(pedido);
});

// Cambiar el estado del pedido.
router.patch('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ mensaje: 'Identificador no válido.' });
  if (!Pedido.ESTADOS.includes(req.body.estado)) return res.status(400).json({ mensaje: 'Estado no válido.' });

  const pedido = await Pedido.findByIdAndUpdate(req.params.id, { estado: req.body.estado }, { new: true }).lean();
  if (!pedido) return res.status(404).json({ mensaje: 'No se encontró el pedido.' });
  res.json(pedido);
});

router.delete('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ mensaje: 'Identificador no válido.' });
  const borrado = await Pedido.findByIdAndDelete(req.params.id);
  if (!borrado) return res.status(404).json({ mensaje: 'No se encontró el pedido.' });
  res.json({ mensaje: 'Pedido eliminado.' });
});

module.exports = router;
