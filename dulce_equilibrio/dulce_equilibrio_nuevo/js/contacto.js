// Envía el formulario de contacto al servidor Express.
const formularioContacto = document.getElementById('contactForm');

if (formularioContacto) {
  formularioContacto.addEventListener('submit', async (event) => {
    event.preventDefault();

    const botonEnviar = formularioContacto.querySelector('button[type="submit"]');
    const estado = document.getElementById('estadoContacto');

    const datos = {
      nombre: document.getElementById('nombre').value.trim(),
      email: document.getElementById('email-2').value.trim(),
      mensaje: document.getElementById('mensaje').value.trim(),
      lugar: document.getElementById('lugar').value
    };

    if (estado) {
      estado.textContent = 'Enviando mensaje...';
      estado.setAttribute('role', 'status');
    }
    if (botonEnviar) {
      botonEnviar.disabled = true;
      botonEnviar.textContent = 'Enviando...';
    }

    // El servidor gratuito puede tardar en despertar: avisamos si demora.
    const avisoLento = setTimeout(() => {
      if (estado) estado.textContent = 'El servidor está despertando, esto puede tardar hasta un minuto...';
    }, 6000);

    try {
      const respuesta = await fetch((window.DULCE_API || '') + '/api/contacto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos)
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.mensaje || 'No se pudo enviar el mensaje.');
      }

      if (estado) estado.textContent = resultado.mensaje;
      formularioContacto.reset();
    } catch (error) {
      if (estado) {
        estado.textContent = error.message || 'No se pudo conectar con el servidor. Inténtalo de nuevo.';
      }
    } finally {
      clearTimeout(avisoLento);
      if (botonEnviar) {
        botonEnviar.disabled = false;
        botonEnviar.textContent = 'Enviar';
      }
    }
  });
}