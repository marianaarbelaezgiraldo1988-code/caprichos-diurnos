const express = require('express');
const Producto = require('../modelos/Producto');
const { importarIniciales } = require('../scripts/importar-productos');
const { idValido, escaparRegex, paginacion, respuestaPaginada } = require('./utilidades');

const router = express.Router();

// Valida y limpia los datos que llegan del panel.
function leerProducto(body) {
  const nombre = String(body.nombre || '').trim();
  const descripcion = String(body.descripcion || '').trim();
  const categoria = String(body.categoria || 'Otros');
  const imagen = String(body.imagen || '').trim();
  const nombreCarrito = String(body.nombreCarrito || '').trim();
  const color = String(body.color || '').trim();
  const precio = Number(body.precio);
  const disponible = body.disponible !== false;

  if (nombre.length < 2 || nombre.length > 80) return { error: 'El nombre debe tener entre 2 y 80 caracteres.' };
  if (descripcion.length > 300) return { error: 'La descripción no puede pasar de 300 caracteres.' };
  if (!Producto.CATEGORIAS.includes(categoria)) return { error: 'Selecciona una categoría válida.' };
  if (!Number.isFinite(precio) || precio < 0 || precio > 10000000) return { error: 'Escribe un precio válido.' };
  if (imagen.length > 200) return { error: 'La ruta de la imagen es demasiado larga.' };
  if (nombreCarrito.length > 80) return { error: 'El nombre del carrito no puede pasar de 80 caracteres.' };
  if (color && !/^#[0-9a-fA-F]{6}$/.test(color)) return { error: 'El color no es válido.' };

  return { datos: { nombre, nombreCarrito, descripcion, categoria, precio: Math.round(precio), imagen, color, disponible } };
}

router.get('/', async (req, res) => {
  const paginas = paginacion(req.query, 20);
  const filtro = {};

  if (Producto.CATEGORIAS.includes(req.query.categoria)) filtro.categoria = req.query.categoria;
  if (req.query.disponible === 'si') filtro.disponible = true;
  if (req.query.disponible === 'no') filtro.disponible = false;

  const q = String(req.query.q || '').trim().slice(0, 80);
  if (q) filtro.nombre = new RegExp(escaparRegex(q), 'i');

  const [datos, total] = await Promise.all([
    Producto.find(filtro).sort({ categoria: 1, nombre: 1 }).skip(paginas.salto).limit(paginas.limite).lean(),
    Producto.countDocuments(filtro)
  ]);

  res.json({ ...respuestaPaginada(datos, total, paginas), categorias: Producto.CATEGORIAS });
});

// Carga los productos que ya estaban escritos en el sitio (no duplica los que ya existen).
router.post('/importar-iniciales', async (req, res) => {
  const resultado = await importarIniciales();
  res.json(resultado);
});

router.post('/', async (req, res) => {
  const { datos, error } = leerProducto(req.body);
  if (error) return res.status(400).json({ mensaje: error });
  const producto = await Producto.create(datos);
  res.status(201).json(producto);
});

router.put('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ mensaje: 'Identificador no válido.' });
  const { datos, error } = leerProducto(req.body);
  if (error) return res.status(400).json({ mensaje: error });

  const producto = await Producto.findByIdAndUpdate(req.params.id, datos, { new: true, runValidators: true }).lean();
  if (!producto) return res.status(404).json({ mensaje: 'No se encontró el producto.' });
  res.json(producto);
});

// Activar / desactivar rápidamente sin abrir el formulario.
router.patch('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ mensaje: 'Identificador no válido.' });
  if (typeof req.body.disponible !== 'boolean') return res.status(400).json({ mensaje: 'Indica la disponibilidad.' });

  const producto = await Producto.findByIdAndUpdate(req.params.id, { disponible: req.body.disponible }, { new: true }).lean();
  if (!producto) return res.status(404).json({ mensaje: 'No se encontró el producto.' });
  res.json(producto);
});

router.delete('/:id', async (req, res) => {
  if (!idValido(req.params.id)) return res.status(400).json({ mensaje: 'Identificador no válido.' });
  const borrado = await Producto.findByIdAndDelete(req.params.id);
  if (!borrado) return res.status(404).json({ mensaje: 'No se encontró el producto.' });
  res.json({ mensaje: 'Producto eliminado.' });
});

module.exports = router;
