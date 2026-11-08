require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const Contacto = require('./modelos/Contacto');
const Admin = require('./modelos/Admin');
const auth = require('./middleware/auth');
const { establecerAdmin } = require('./middleware/crearAdmin');

const app = express();
const PORT = process.env.PORT || 3000;
const FRONTEND_DIR = path.join(__dirname, 'dulce_equilibrio_nuevo');
const ADMIN_DIR = path.join(__dirname, 'admin');

// Solo activar si el sitio está detrás de un proxy (Render, Railway, Nginx...).
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// Express 5 deja req.body sin definir cuando no llega cuerpo: lo normalizamos.
app.use((req, res, next) => { req.body = req.body || {}; next(); });

//  páginas, estilos, imágenes y scripts.
app.use(express.static(FRONTEND_DIR));

// Recibe y guarda los mensajes del formulario de contacto.
app.post('/api/contacto', async (req, res) => {
  try {
    const nombre = String(req.body.nombre || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const mensaje = String(req.body.mensaje || '').trim();
    const lugar = String(req.body.lugar || '').trim();

    if (nombre.length < 3 || nombre.length > 80) {
      return res.status(400).json({ mensaje: 'Escribe un nombre de entre 3 y 80 caracteres.' });
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailValido || email.length > 120) {
      return res.status(400).json({ mensaje: 'Escribe un correo electrónico válido.' });
    }

    if (mensaje.length < 5 || mensaje.length > 1500) {
      return res.status(400).json({ mensaje: 'El mensaje debe tener entre 5 y 1500 caracteres.' });
    }

    const lugaresPermitidos = ['Medellin', 'Bogota', 'Cali'];
    if (lugar && !lugaresPermitidos.includes(lugar)) {
      return res.status(400).json({ mensaje: 'Selecciona una ciudad válida.' });
    }

    const nuevoContacto = new Contacto({ nombre, email, mensaje, lugar });
    await nuevoContacto.save();

    return res.status(201).json({
      mensaje: '¡Tu mensaje fue enviado correctamente! Gracias por contactarnos.'
    });
  } catch (error) {
    console.error('Error al guardar el contacto:', error);
    return res.status(500).json({
      mensaje: 'No pudimos guardar tu mensaje. Inténtalo nuevamente más tarde.'
    });
  }
});

// Comprueba el estado del servidor y de la conexión con MongoDB.
app.get('/api/status', (req, res) => {
  res.json({
    servidor: 'activo',
    mongodb: mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado'
  });
});

// Catálogo público de productos (lo lee el sitio).
app.use('/api/productos', require('./rutas/catalogo'));

// ---------------------------------------------------------------------------
// PANEL DE ADMINISTRACIÓN
// ---------------------------------------------------------------------------

// Cabeceras de seguridad para todo lo que cuelga de /admin y de la API privada.
function cabecerasPanel(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'"
  );
  next();
}

// API de sesión (login / logout) y API privada (exige sesión).
app.use('/api/auth', auth.exigeJson, require('./rutas/auth'));
app.use('/api/admin', auth.requiereSesionApi, auth.exigeJson);
app.use('/api/admin/resumen', require('./rutas/resumen'));
app.use('/api/admin/mensajes', require('./rutas/mensajes'));
app.use('/api/admin/productos', require('./rutas/productos'));
app.use('/api/admin/pedidos', require('./rutas/pedidos'));

// Archivos públicos del panel (CSS y JS). No contienen datos privados.
app.use('/admin/recursos', cabecerasPanel, express.static(path.join(ADMIN_DIR, 'recursos')));

// Pantalla de acceso.
app.get('/admin/login', cabecerasPanel, (req, res) => {
  if (auth.sesionActual(req)) return res.redirect('/admin');
  res.setHeader('Cache-Control', 'no-store');
  res.sendFile(path.join(ADMIN_DIR, 'login.html'));
});

// Panel: solo con sesión iniciada.
app.get('/admin', cabecerasPanel, auth.requiereSesionPagina, (req, res) => {
  res.sendFile(path.join(ADMIN_DIR, 'panel.html'));
});

// Errores: respuestas claras en JSON y sin detalles internos.
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ mensaje: 'Los datos enviados no son válidos.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ mensaje: 'Los datos enviados son demasiado grandes.' });
  }
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ mensaje: 'Revisa los datos: alguno no es válido.' });
  }
  console.error('Error no controlado:', error);
  res.status(500).json({ mensaje: 'Ocurrió un error en el servidor.' });
});

// Crea la cuenta inicial del panel si todavía no existe ninguna.
async function prepararAdministracion() {
  if (await Admin.countDocuments()) return;

  const { ADMIN_USUARIO, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USUARIO || !ADMIN_PASSWORD) {
    console.warn('Aún no hay cuenta para el panel. Agrega ADMIN_USUARIO y ADMIN_PASSWORD al archivo .env y reinicia.');
    return;
  }

  await establecerAdmin(ADMIN_USUARIO, ADMIN_PASSWORD);
  console.log(`Cuenta del panel creada: "${ADMIN_USUARIO}". Ya puedes borrar ADMIN_PASSWORD del .env.`);
}

async function iniciarServidor() {
  const mongoUri = process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error('Falta MONGODB_URI. Crea un archivo .env usando .env.example como guía.');
    process.exit(1);
  }

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    console.error('Falta SESSION_SECRET (mínimo 32 caracteres) en el archivo .env.');
    console.error('Genera una con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('MongoDB conectado correctamente.');
    await prepararAdministracion();

    app.listen(PORT, () => {
      console.log(`Dulce Equilibrio está disponible en http://localhost:${PORT}`);
      console.log(`Panel de administración: http://localhost:${PORT}/admin`);
    });
  } catch (error) {
    console.error('No se pudo iniciar el servidor:', error.message);
    process.exit(1);
  }
}

iniciarServidor();