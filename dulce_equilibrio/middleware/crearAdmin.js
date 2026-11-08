const Admin = require('../modelos/Admin');
const { crearHash } = require('./auth');

// Crea la persona administradora o, si ya existe, le cambia la contraseña.
async function establecerAdmin(usuario, password) {
  usuario = String(usuario || '').trim().toLowerCase();
  password = String(password || '');

  if (usuario.length < 3 || usuario.length > 40) {
    throw new Error('El usuario debe tener entre 3 y 40 caracteres.');
  }
  if (password.length < 8 || password.length > 200) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.');
  }

  const { salt, hash } = await crearHash(password);
  const existente = await Admin.findOne({ usuario });

  if (existente) {
    existente.salt = salt;
    existente.hash = hash;
    await existente.save();
    return 'actualizado';
  }

  await Admin.create({ usuario, salt, hash });
  return 'creado';
}

module.exports = { establecerAdmin };
