const mongoose = require('mongoose');

function idValido(id) {
  return mongoose.isValidObjectId(id);
}

function escaparRegex(texto) {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Lee ?pagina= y ?limite= de forma segura.
function paginacion(query, limitePorDefecto = 15) {
  const pagina = Math.max(1, parseInt(query.pagina, 10) || 1);
  const limite = Math.min(50, Math.max(1, parseInt(query.limite, 10) || limitePorDefecto));
  return { pagina, limite, salto: (pagina - 1) * limite };
}

function respuestaPaginada(datos, total, { pagina, limite }) {
  return { datos, total, pagina, paginas: Math.max(1, Math.ceil(total / limite)) };
}

module.exports = { idValido, escaparRegex, paginacion, respuestaPaginada };
