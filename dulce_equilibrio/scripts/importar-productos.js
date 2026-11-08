// Carga en MongoDB los productos que el sitio tenía escritos a mano
// (datos guardados en catalogo-inicial.json). Se puede ejecutar varias veces:
// no duplica los productos que ya existen.
//
// Uso:  npm run importar-productos
// También se puede hacer desde el panel, en Productos → "Cargar productos del sitio".
const path = require('path');
const Producto = require('../modelos/Producto');
const iniciales = require('./catalogo-inicial.json');

async function importarIniciales() {
  let creados = 0;
  let completados = 0;

  // Uno por uno y en orden, para conservar el orden original en el sitio.
  for (const p of iniciales) {
    const existente = await Producto.findOne({ nombre: p.nombre });

    if (!existente) {
      await Producto.create(p);
      creados += 1;
    } else if (!existente.imagen && !existente.descripcion) {
      // Producto creado antes sin foto ni descripción: se completa.
      existente.set({ imagen: p.imagen, descripcion: p.descripcion, nombreCarrito: p.nombreCarrito, color: p.color });
      await existente.save();
      completados += 1;
    }
  }

  return { creados, completados };
}

module.exports = { importarIniciales };

// Si se ejecuta directamente (npm run importar-productos):
if (require.main === module) {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  const mongoose = require('mongoose');

  (async () => {
    try {
      if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI en el archivo .env.');
      await mongoose.connect(process.env.MONGODB_URI);
      const { creados, completados } = await importarIniciales();
      console.log(`Productos nuevos: ${creados}. Productos completados: ${completados}.`);
    } catch (error) {
      console.error('No se pudo importar:', error.message);
      process.exitCode = 1;
    } finally {
      await mongoose.disconnect();
    }
  })();
}
