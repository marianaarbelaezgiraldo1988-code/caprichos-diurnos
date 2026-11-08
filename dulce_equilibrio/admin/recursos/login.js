const formulario = document.getElementById('formLogin');
const error = document.getElementById('errorLogin');
const boton = document.getElementById('botonEntrar');
const clave = document.getElementById('password');
const verClave = document.getElementById('verClave');

verClave.addEventListener('click', () => {
  const visible = clave.type === 'text';
  clave.type = visible ? 'password' : 'text';
  verClave.textContent = visible ? 'Mostrar' : 'Ocultar';
  verClave.setAttribute('aria-pressed', String(!visible));
});

function mostrarError(texto) {
  error.textContent = texto;
  error.hidden = false;
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  error.hidden = true;

  const usuario = formulario.usuario.value.trim();
  const password = formulario.password.value;
  if (!usuario || !password) return mostrarError('Escribe tu usuario y tu contraseña.');

  boton.disabled = true;
  boton.textContent = 'Entrando...';

  try {
    const respuesta = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'panel' },
      body: JSON.stringify({ usuario, password })
    });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) throw new Error(datos.mensaje || 'No se pudo iniciar sesión.');
    window.location.replace('/admin');
  } catch (e) {
    mostrarError(e.message || 'No se pudo conectar con el servidor.');
    boton.disabled = false;
    boton.textContent = 'Entrar';
  }
});
