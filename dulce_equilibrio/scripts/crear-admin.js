// Crea la cuenta del panel o cambia su contraseña.
// Uso (Windows CMD):
//   set ADMIN_USUARIO=mariana&& set ADMIN_PASSWORD=TuClaveNueva123&& npm run crear-admin
require('dotenv').config();
const mongoose = require('mongoose');
const { establecerAdmin } = require('../middleware/crearAdmin');

(async () => {
  try {
    if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI en el archivo .env.');
    await mongoose.connect(process.env.MONGODB_URI);
    const resultado = await establecerAdmin(process.env.ADMIN_USUARIO, process.env.ADMIN_PASSWORD);
    console.log(`Cuenta ${resultado}: "${process.env.ADMIN_USUARIO}".`);
  } catch (error) {
    console.error('No se pudo:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
