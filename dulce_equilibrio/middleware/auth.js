// Autenticación del panel sin dependencias extra: usa solo el módulo "crypto" de Node.
//  - Contraseñas: scrypt con sal aleatoria (nunca se guarda la contraseña).
//  - Sesión: cookie firmada con HMAC (HttpOnly, SameSite=Strict).
const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

const NOMBRE_COOKIE = 'de_sesion';
const DURACION_MS = 8 * 60 * 60 * 1000; // 8 horas

function secreto() {
  return process.env.SESSION_SECRET;
}

// ---------- Contraseñas ----------
async function crearHash(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  return { salt, hash };
}

async function verificarPassword(password, salt, hashGuardado) {
  const calculado = await scrypt(password, salt, 64);
  const esperado = Buffer.from(hashGuardado, 'hex');
  return calculado.length === esperado.length && crypto.timingSafeEqual(calculado, esperado);
}

// ---------- Token de sesión ----------
function firmar(texto) {
  return crypto.createHmac('sha256', secreto()).update(texto).digest('base64url');
}

function crearToken(adminId) {
  const carga = Buffer.from(JSON.stringify({ id: String(adminId), exp: Date.now() + DURACION_MS })).toString('base64url');
  return `${carga}.${firmar(carga)}`;
}

function leerToken(token) {
  if (typeof token !== 'string') return null;
  const [carga, firma] = token.split('.');
  if (!carga || !firma) return null;

  const esperada = firmar(carga);
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

  try {
    const datos = JSON.parse(Buffer.from(carga, 'base64url').toString('utf8'));
    if (!datos.id || typeof datos.exp !== 'number' || datos.exp < Date.now()) return null;
    return datos;
  } catch {
    return null;
  }
}

// ---------- Cookies ----------
function leerCookies(req) {
  const resultado = {};
  (req.headers.cookie || '').split(';').forEach((par) => {
    const i = par.indexOf('=');
    if (i > 0) resultado[par.slice(0, i).trim()] = decodeURIComponent(par.slice(i + 1).trim());
  });
  return resultado;
}

function opcionesCookie(maxAgeMs) {
  const partes = ['Path=/', 'HttpOnly', 'SameSite=Strict', `Max-Age=${Math.floor(maxAgeMs / 1000)}`];
  if (process.env.NODE_ENV === 'production') partes.push('Secure');
  return partes.join('; ');
}

function iniciarSesion(res, adminId) {
  res.setHeader('Set-Cookie', `${NOMBRE_COOKIE}=${crearToken(adminId)}; ${opcionesCookie(DURACION_MS)}`);
}

function cerrarSesion(res) {
  res.setHeader('Set-Cookie', `${NOMBRE_COOKIE}=; ${opcionesCookie(0)}`);
}

function sesionActual(req) {
  return leerToken(leerCookies(req)[NOMBRE_COOKIE]);
}

// ---------- Protección de rutas ----------
// Para la API: responde 401 en JSON.
function requiereSesionApi(req, res, next) {
  const sesion = sesionActual(req);
  if (!sesion) return res.status(401).json({ mensaje: 'Tu sesión expiró. Inicia sesión de nuevo.' });
  req.admin = sesion;
  res.setHeader('Cache-Control', 'no-store');
  next();
}

// Para las páginas: redirige al login.
function requiereSesionPagina(req, res, next) {
  const sesion = sesionActual(req);
  if (!sesion) return res.redirect('/admin/login');
  req.admin = sesion;
  res.setHeader('Cache-Control', 'no-store');
  next();
}

// Defensa extra contra CSRF: las peticiones que modifican datos deben ser JSON
// (un formulario de otro sitio no puede enviar ese tipo de contenido).
function exigeJson(req, res, next) {
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method)) {
    const tieneCuerpo = req.method !== 'DELETE';
    if (tieneCuerpo && !req.is('application/json')) {
      return res.status(415).json({ mensaje: 'Formato no permitido.' });
    }
    if (req.headers['x-requested-with'] !== 'panel') {
      return res.status(403).json({ mensaje: 'Petición no permitida.' });
    }
  }
  next();
}

// ---------- Límite de intentos de login (en memoria) ----------
const intentos = new Map();
const MAX_INTENTOS = 5;
const VENTANA_MS = 15 * 60 * 1000;

function limiteLogin(req, res, next) {
  const ip = req.ip;
  const ahora = Date.now();
  const registro = intentos.get(ip);
  if (registro && ahora - registro.inicio > VENTANA_MS) intentos.delete(ip);

  const actual = intentos.get(ip);
  if (actual && actual.cuenta >= MAX_INTENTOS) {
    return res.status(429).json({ mensaje: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.' });
  }
  next();
}

function registrarFallo(req) {
  const registro = intentos.get(req.ip) || { cuenta: 0, inicio: Date.now() };
  registro.cuenta += 1;
  intentos.set(req.ip, registro);
}

function limpiarFallos(req) {
  intentos.delete(req.ip);
}

module.exports = {
  crearHash,
  verificarPassword,
  crearToken,
  leerToken,
  iniciarSesion,
  cerrarSesion,
  sesionActual,
  requiereSesionApi,
  requiereSesionPagina,
  exigeJson,
  limiteLogin,
  registrarFallo,
  limpiarFallos
};
