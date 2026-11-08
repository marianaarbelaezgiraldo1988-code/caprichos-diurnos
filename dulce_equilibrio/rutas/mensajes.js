const express = require('express');
const Contacto = require('../modelos/Contacto');
const { idValido, escaparRegex, paginacion, respuestaPaginada } = require('./utilidades');

const router = express.Router();

// Lista de mensajes del formulario de contacto.
// ?filtro=todos|no-leidos|leidos   ?q=texto a buscar   ?pagina=1
router.get('/', async (req, res) => {
  const paginas = paginacion(req.query);
  const filtro = {};

  if (req.query.filtro === 'no-leidos') filtro.leido = false;
  if (req.query.filtro === 'leidos') filtro.leido = true;

  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q) {
    const regex = new RegExp(escaparRegex(q), 'i');
    filtro.$or = [{ nombre: regex }, { email: regex }, { mensaje: regex }];
  }

  const [datos, total] = await Promise.all([
    Contacto.find(filtro).sort({ createdAt: -1 }).skip(paginas.salto).limit(paginas.limite).lean(),
    Contacto.countDocuments(filtro)
  ]);

  res.json(respuestaPaginada(datos, total, paginas));
});

// Marcar como leído / no leído.
router.patch('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ mensaje: 'Identificador no válido.' });
  if (typeof req.body.leido !== 'boolean') return res.status(400).json({ mensaje: 'Indica si el mensaje está leído.' });

  const mensaje = await Contacto.findByIdAndUpdate(req.params.id, { leido: req.body.leido }, { new: true }).lean();
  if (!mensaje) return res.status(404).json({ mensaje: 'No se encontró el mensaje.' });
  res.json(mensaje);
});

router.delete('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ mensaje: 'Identificador no válido.' });
  const borrado = await Contacto.findByIdAndDelete(req.params.id);
  if (!borrado) return res.status(404).json({ mensaje: 'No se encontró el mensaje.' });
  res.json({ mensaje: 'Mensaje eliminado.' });
});

module.exports = router;
