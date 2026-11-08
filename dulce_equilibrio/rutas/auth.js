const express = require('express');
const Admin = require('../modelos/Admin');
const auth = require('../middleware/auth');

const router = express.Router();

// Hash de relleno para que el tiempo de respuesta sea similar aunque el usuario no exista.
const RELLENO = { salt: '00'.repeat(16), hash: '00'.repeat(64) };

router.post('/login', auth.limiteLogin, async (req, res) => {
  const usuario = String(req.body.usuario || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!usuario || !password || usuario.length > 40 || password.length > 200) {
    return res.status(400).json({ mensaje: 'Escribe tu usuario y tu contraseña.' });
  }

  const admin = await Admin.findOne({ usuario });
  const datos = admin || RELLENO;
  const correcta = await auth.verificarPassword(password, datos.salt, datos.hash);

  if (!admin || !correcta) {
    auth.registrarFallo(req);
    return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos.' });
  }

  auth.limpiarFallos(req);
  auth.iniciarSesion(res, admin._id);
  res.json({ mensaje: 'Bienvenida', usuario: admin.usuario });
});

router.post('/logout', (req, res) => {
  auth.cerrarSesion(res);
  res.json({ mensaje: 'Sesión cerrada.' });
});

router.get('/yo', async (req, res) => {
  const sesion = auth.sesionActual(req);
  if (!sesion) return res.status(401).json({ mensaje: 'Sin sesión.' });
  const admin = await Admin.findById(sesion.id).select('usuario');
  if (!admin) return res.status(401).json({ mensaje: 'Sin sesión.' });
  res.json({ usuario: admin.usuario });
});

module.exports = router;
