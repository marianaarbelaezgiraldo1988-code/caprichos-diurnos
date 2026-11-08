// Panel de administración · Dulce Equilibrio
// Todo el contenido que viene de la base de datos se inserta con textContent
// (nunca con innerHTML), así un mensaje malicioso no puede ejecutar código.

const $ = (selector, raiz = document) => raiz.querySelector(selector);
const contenido = $('#contenido');
const titulo = $('#titulo');
const dialogo = $('#dialogo');

// ---------- Utilidades ----------
function h(etiqueta, propiedades = {}, ...hijos) {
  const e = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(propiedades)) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave === 'class') e.className = valor;
    else if (clave === 'value' || clave === 'checked') e[clave] = valor;
    else if (clave.startsWith('on')) e.addEventListener(clave.slice(2), valor);
    else e.setAttribute(clave, valor === true ? '' : valor);
  }
  hijos.flat().forEach((hijo) => {
    if (hijo === null || hijo === undefined || hijo === false) return;
    e.append(hijo.nodeType ? hijo : document.createTextNode(String(hijo)));
  });
  return e;
}

const dinero = (n) => Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const fecha = (f) => new Date(f).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
const rutaImagen = (r) => '/' + String(r).replace(/^\/+/, '');

let temporizadorAviso;
function aviso(texto, esError = false) {
  const caja = $('#aviso');
  caja.textContent = texto;
  caja.className = esError ? 'es-error' : '';
  caja.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => { caja.hidden = true; }, 3500);
}

async function api(url, { metodo = 'GET', cuerpo } = {}) {
  const respuesta = await fetch(url, {
    method: metodo,
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'panel' },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo)
  });
  if (respuesta.status === 401) {
    window.location.replace('/admin/login');
    throw new Error('Tu sesión expiró.');
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(datos.mensaje || 'Ocurrió un error.');
  return datos;
}

function consulta(parametros) {
  const p = new URLSearchParams();
  Object.entries(parametros).forEach(([k, v]) => { if (v !== '' && v !== null && v !== undefined) p.set(k, v); });
  return p.toString();
}

function debounce(fn, ms = 350) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function mostrarEstado(zona, clase, texto) {
  zona.replaceChildren(h('p', { class: clase }, texto));
}

function controlesPagina(datos, alCambiar) {
  if (datos.paginas <= 1) return null;
  return h('nav', { class: 'paginacion', 'aria-label': 'Páginas' },
    h('button', { class: 'boton boton-suave boton-chico', disabled: datos.pagina <= 1, onclick: () => alCambiar(datos.pagina - 1) }, '← Anterior'),
    h('span', { class: 'meta' }, `Página ${datos.pagina} de ${datos.paginas}`),
    h('button', { class: 'boton boton-suave boton-chico', disabled: datos.pagina >= datos.paginas, onclick: () => alCambiar(datos.pagina + 1) }, 'Siguiente →')
  );
}

// ---------- Ventana de formularios ----------
function abrirDialogo(tituloTexto, cuerpo) {
  dialogo.replaceChildren(h('div', { class: 'dialogo-interno' }, h('h2', { id: 'dialogoTitulo' }, tituloTexto), cuerpo));
  if (!dialogo.open) dialogo.showModal();
}
function cerrarDialogo() { if (dialogo.open) dialogo.close(); }
dialogo.addEventListener('click', (e) => { if (e.target === dialogo) cerrarDialogo(); });

// ---------- Insignia de mensajes sin leer ----------
async function actualizarInsignia() {
  try {
    const r = await api('/api/admin/resumen');
    const insignia = $('#insigniaMensajes');
    insignia.textContent = r.mensajesNoLeidos;
    insignia.hidden = r.mensajesNoLeidos === 0;
  } catch { /* no es crítico */ }
}

// ===========================================================================
// VISTA: RESUMEN
// ===========================================================================
async function vistaResumen() {
  mostrarEstado(contenido, 'cargando', 'Cargando...');
  const r = await api('/api/admin/resumen');
  const dato = (numero, nombre, detalle, vista) =>
    h('button', { class: 'dato', type: 'button', onclick: () => irA(vista) },
      h('span', { class: 'numero' }, numero), h('span', { class: 'nombre' }, nombre), h('span', { class: 'detalle' }, detalle));

  contenido.replaceChildren(h('div', { class: 'tarjetas-resumen' },
    dato(r.mensajesNoLeidos, 'Mensajes sin leer', `${r.mensajesTotal} en total`, 'mensajes'),
    dato(r.pedidosPendientes, 'Pedidos en curso', `${r.pedidosTotal} en total`, 'pedidos'),
    dato(r.productosActivos, 'Productos disponibles', `${r.productosTotal} registrados`, 'productos')
  ));
}

// ===========================================================================
// VISTA: MENSAJES
// ===========================================================================
const estadoMensajes = { q: '', filtro: 'todos', pagina: 1 };

async function vistaMensajes() {
  const zona = h('div', { class: 'lista' });
  const buscador = h('input', { type: 'search', placeholder: 'Buscar por nombre, correo o texto', 'aria-label': 'Buscar mensajes', value: estadoMensajes.q });
  const filtro = h('select', { 'aria-label': 'Filtrar mensajes' },
    h('option', { value: 'todos' }, 'Todos'), h('option', { value: 'no-leidos' }, 'Sin leer'), h('option', { value: 'leidos' }, 'Leídos'));
  filtro.value = estadoMensajes.filtro;

  const cargar = async () => {
    mostrarEstado(zona, 'cargando', 'Cargando mensajes...');
    try {
      const datos = await api('/api/admin/mensajes?' + consulta({ q: estadoMensajes.q, filtro: estadoMensajes.filtro, pagina: estadoMensajes.pagina }));
      if (!datos.datos.length) return mostrarEstado(zona, 'vacio', 'No hay mensajes para mostrar.');
      zona.replaceChildren(...datos.datos.map((m) => tarjetaMensaje(m, cargar)), controlesPagina(datos, (p) => { estadoMensajes.pagina = p; cargar(); window.scrollTo({ top: 0 }); }) || '');
    } catch (e) { mostrarEstado(zona, 'error-carga', e.message); }
  };

  buscador.addEventListener('input', debounce(() => { estadoMensajes.q = buscador.value.trim(); estadoMensajes.pagina = 1; cargar(); }));
  filtro.addEventListener('change', () => { estadoMensajes.filtro = filtro.value; estadoMensajes.pagina = 1; cargar(); });

  contenido.replaceChildren(h('div', { class: 'herramientas' }, buscador, filtro), zona);
  cargar();
}

function tarjetaMensaje(m, recargar) {
  const alternar = async () => {
    try { await api(`/api/admin/mensajes/${m._id}`, { metodo: 'PATCH', cuerpo: { leido: !m.leido } }); actualizarInsignia(); recargar(); }
    catch (e) { aviso(e.message, true); }
  };
  const borrar = async () => {
    if (!confirm(`¿Eliminar el mensaje de ${m.nombre}? Esta acción no se puede deshacer.`)) return;
    try { await api(`/api/admin/mensajes/${m._id}`, { metodo: 'DELETE' }); aviso('Mensaje eliminado.'); actualizarInsignia(); recargar(); }
    catch (e) { aviso(e.message, true); }
  };

  return h('article', { class: 'item' + (m.leido ? '' : ' no-leido') },
    h('div', { class: 'item-cabecera' },
      h('h3', {}, m.nombre),
      h('span', { class: 'meta' }, fecha(m.createdAt))),
    h('p', { class: 'meta' }, h('a', { href: 'mailto:' + m.email }, m.email), m.lugar ? ` · ${m.lugar}` : ''),
    h('p', { class: 'cuerpo-mensaje' }, m.mensaje),
    h('div', { class: 'acciones' },
      h('button', { class: 'boton boton-suave boton-chico', onclick: alternar }, m.leido ? 'Marcar sin leer' : 'Marcar como leído'),
      h('a', { class: 'boton boton-suave boton-chico', href: 'mailto:' + m.email + '?subject=' + encodeURIComponent('Respuesta de Dulce Equilibrio') }, 'Responder'),
      h('button', { class: 'boton boton-peligro boton-chico', onclick: borrar }, 'Eliminar')));
}

// ===========================================================================
// VISTA: PEDIDOS
// ===========================================================================
const estadoPedidos = { q: '', estado: '', pagina: 1 };
const nombreEstado = { pendiente: 'Pendiente', confirmado: 'Confirmado', preparando: 'Preparando', entregado: 'Entregado', cancelado: 'Cancelado' };

async function vistaPedidos() {
  const zona = h('div', { class: 'lista' });
  const buscador = h('input', { type: 'search', placeholder: 'Buscar por cliente o teléfono', 'aria-label': 'Buscar pedidos', value: estadoPedidos.q });
  const filtro = h('select', { 'aria-label': 'Filtrar por estado' }, h('option', { value: '' }, 'Todos los estados'),
    Object.entries(nombreEstado).map(([v, t]) => h('option', { value: v }, t)));
  filtro.value = estadoPedidos.estado;

  const cargar = async () => {
    mostrarEstado(zona, 'cargando', 'Cargando pedidos...');
    try {
      const datos = await api('/api/admin/pedidos?' + consulta({ q: estadoPedidos.q, estado: estadoPedidos.estado, pagina: estadoPedidos.pagina }));
      if (!datos.datos.length) return mostrarEstado(zona, 'vacio', 'Todavía no hay pedidos. Usa “Nuevo pedido” para registrar uno.');
      zona.replaceChildren(...datos.datos.map((p) => tarjetaPedido(p, cargar)), controlesPagina(datos, (n) => { estadoPedidos.pagina = n; cargar(); window.scrollTo({ top: 0 }); }) || '');
    } catch (e) { mostrarEstado(zona, 'error-carga', e.message); }
  };

  buscador.addEventListener('input', debounce(() => { estadoPedidos.q = buscador.value.trim(); estadoPedidos.pagina = 1; cargar(); }));
  filtro.addEventListener('change', () => { estadoPedidos.estado = filtro.value; estadoPedidos.pagina = 1; cargar(); });

  contenido.replaceChildren(
    h('div', { class: 'herramientas' }, buscador, filtro,
      h('button', { class: 'boton boton-principal', onclick: () => formularioPedido(cargar) }, '+ Nuevo pedido')),
    zona);
  cargar();
}

function tarjetaPedido(p, recargar) {
  const selector = h('select', { 'aria-label': `Estado del pedido de ${p.cliente}` },
    Object.entries(nombreEstado).map(([v, t]) => h('option', { value: v }, t)));
  selector.value = p.estado;
  selector.addEventListener('change', async () => {
    try { await api(`/api/admin/pedidos/${p._id}`, { metodo: 'PATCH', cuerpo: { estado: selector.value } }); aviso('Estado actualizado.'); recargar(); }
    catch (e) { aviso(e.message, true); selector.value = p.estado; }
  });
  const borrar = async () => {
    if (!confirm(`¿Eliminar el pedido de ${p.cliente}?`)) return;
    try { await api(`/api/admin/pedidos/${p._id}`, { metodo: 'DELETE' }); aviso('Pedido eliminado.'); recargar(); }
    catch (e) { aviso(e.message, true); }
  };

  return h('article', { class: 'item' },
    h('div', { class: 'item-cabecera' },
      h('h3', {}, p.cliente),
      h('span', { class: `etiqueta-estado estado-${p.estado}` }, nombreEstado[p.estado] || p.estado)),
    h('p', { class: 'meta' }, [fecha(p.createdAt), p.canal, p.telefono].filter(Boolean).join(' · ')),
    h('ul', { class: 'lineas' }, p.items.map((i) => h('li', {}, h('span', {}, `${i.nombre} × ${i.cantidad}`), h('span', {}, dinero(i.precio * i.cantidad))))),
    h('p', { class: 'total' }, `Total: ${dinero(p.total)}`),
    p.notas ? h('p', { class: 'meta' }, `Notas: ${p.notas}`) : null,
    h('div', { class: 'acciones' }, selector, h('button', { class: 'boton boton-peligro boton-chico', onclick: borrar }, 'Eliminar')));
}

async function formularioPedido(alGuardar) {
  let catalogo = [];
  try { catalogo = (await api('/api/admin/productos?limite=50&disponible=si')).datos; } catch { /* se puede escribir a mano */ }

  const nombreVenta = (p) => p.nombreCarrito || p.nombre;
  const lista = h('datalist', { id: 'listaProductos' }, catalogo.map((p) => h('option', { value: nombreVenta(p) })));
  const filas = h('div');
  const totalTexto = h('p', { class: 'total' });
  const error = h('p', { class: 'mensaje-error', role: 'alert', hidden: true });

  const recalcular = () => {
    let suma = 0;
    filas.querySelectorAll('.fila-item').forEach((f) => {
      suma += (Number($('[name=precio]', f).value) || 0) * (Number($('[name=cantidad]', f).value) || 0);
    });
    totalTexto.textContent = `Total: ${dinero(suma)}`;
  };

  const agregarFila = () => {
    const nombre = h('input', { name: 'nombre', list: 'listaProductos', placeholder: 'Producto', 'aria-label': 'Producto', maxlength: 80, required: true });
    const precio = h('input', { name: 'precio', type: 'number', min: 0, step: 100, placeholder: 'Precio', 'aria-label': 'Precio', inputmode: 'numeric' });
    const cantidad = h('input', { name: 'cantidad', type: 'number', min: 1, max: 99, value: 1, 'aria-label': 'Cantidad', inputmode: 'numeric' });
    nombre.addEventListener('input', () => {
      const encontrado = catalogo.find((p) => nombreVenta(p) === nombre.value);
      if (encontrado) { precio.value = encontrado.precio; recalcular(); }
    });
    const fila = h('div', { class: 'fila-item' }, nombre, precio, cantidad,
      h('button', { type: 'button', class: 'boton boton-suave quitar', 'aria-label': 'Quitar producto', onclick: () => { if (filas.children.length > 1) { fila.remove(); recalcular(); } } }, '×'));
    fila.addEventListener('input', recalcular);
    filas.append(fila);
  };
  agregarFila();

  const cliente = h('input', { name: 'cliente', required: true, minlength: 2, maxlength: 80, autocomplete: 'off' });
  const telefono = h('input', { name: 'telefono', type: 'tel', maxlength: 30 });
  const canal = h('select', { name: 'canal' }, ['WhatsApp', 'Presencial', 'Otro'].map((c) => h('option', { value: c }, c)));
  const notas = h('textarea', { name: 'notas', maxlength: 500 });

  const formulario = h('form', { novalidate: true },
    lista,
    h('div', { class: 'dos-columnas' },
      h('div', {}, h('label', { for: 'pCliente' }, 'Cliente'), Object.assign(cliente, { id: 'pCliente' })),
      h('div', {}, h('label', { for: 'pTelefono' }, 'Teléfono'), Object.assign(telefono, { id: 'pTelefono' }))),
    h('label', { for: 'pCanal' }, 'Canal'), Object.assign(canal, { id: 'pCanal' }),
    h('label', {}, 'Productos'), filas,
    h('button', { type: 'button', class: 'boton boton-suave boton-chico', onclick: () => { agregarFila(); } }, '+ Agregar producto'),
    totalTexto,
    h('label', { for: 'pNotas' }, 'Notas (opcional)'), Object.assign(notas, { id: 'pNotas' }),
    error,
    h('div', { class: 'dialogo-pie' },
      h('button', { type: 'button', class: 'boton boton-suave', onclick: cerrarDialogo }, 'Cancelar'),
      h('button', { type: 'submit', class: 'boton boton-principal' }, 'Guardar pedido')));

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    const items = [...filas.querySelectorAll('.fila-item')].map((f) => ({
      nombre: $('[name=nombre]', f).value.trim(),
      precio: Number($('[name=precio]', f).value),
      cantidad: Number($('[name=cantidad]', f).value)
    }));
    try {
      await api('/api/admin/pedidos', { metodo: 'POST', cuerpo: { cliente: cliente.value, telefono: telefono.value, canal: canal.value, notas: notas.value, items } });
      cerrarDialogo(); aviso('Pedido guardado.'); alGuardar();
    } catch (err) { error.textContent = err.message; error.hidden = false; }
  });

  recalcular();
  abrirDialogo('Nuevo pedido', formulario);
}

// ===========================================================================
// VISTA: PRODUCTOS
// ===========================================================================
const estadoProductos = { q: '', categoria: '', pagina: 1 };

async function vistaProductos() {
  const zona = h('div', { class: 'cuadricula' });
  const pie = h('div');
  let categorias = ['Tortas', 'Postres', 'Galletas', 'Antojos creativos', 'Otros'];
  const buscador = h('input', { type: 'search', placeholder: 'Buscar producto', 'aria-label': 'Buscar productos', value: estadoProductos.q });
  const filtro = h('select', { 'aria-label': 'Filtrar por categoría' }, h('option', { value: '' }, 'Todas las categorías'), categorias.map((c) => h('option', { value: c }, c)));
  filtro.value = estadoProductos.categoria;

  const cargar = async () => {
    mostrarEstado(zona, 'cargando', 'Cargando productos...');
    try {
      const datos = await api('/api/admin/productos?' + consulta({ q: estadoProductos.q, categoria: estadoProductos.categoria, pagina: estadoProductos.pagina }));
      categorias = datos.categorias;
      if (!datos.datos.length) {
        pie.replaceChildren();
        const sinFiltros = datos.total === 0 && !estadoProductos.q && !estadoProductos.categoria;
        const mensaje = sinFiltros ? 'Aún no hay productos. Puedes cargar los que ya tenía el sitio o crear uno nuevo.' : 'No se encontraron productos con ese filtro.';
        const cuadro = h('div', { class: 'vacio' }, h('p', {}, mensaje));
        if (sinFiltros) {
          cuadro.append(h('button', { class: 'boton boton-principal', type: 'button', onclick: async (e) => {
            e.target.disabled = true; e.target.textContent = 'Cargando...';
            try { const r = await api('/api/admin/productos/importar-iniciales', { metodo: 'POST', cuerpo: {} }); aviso(`Listo: ${r.creados} productos cargados.`); cargar(); }
            catch (err) { aviso(err.message, true); e.target.disabled = false; e.target.textContent = 'Cargar productos del sitio'; }
          } }, 'Cargar productos del sitio'));
        }
        return zona.replaceChildren(cuadro);
      }
      zona.replaceChildren(...datos.datos.map((p) => tarjetaProducto(p, cargar, () => categorias)));
      pie.replaceChildren(controlesPagina(datos, (n) => { estadoProductos.pagina = n; cargar(); window.scrollTo({ top: 0 }); }) || '');
    } catch (e) { mostrarEstado(zona, 'error-carga', e.message); }
  };

  buscador.addEventListener('input', debounce(() => { estadoProductos.q = buscador.value.trim(); estadoProductos.pagina = 1; cargar(); }));
  filtro.addEventListener('change', () => { estadoProductos.categoria = filtro.value; estadoProductos.pagina = 1; cargar(); });

  contenido.replaceChildren(
    h('div', { class: 'herramientas' }, buscador, filtro,
      h('button', { class: 'boton boton-principal', onclick: () => formularioProducto(null, categorias, cargar) }, '+ Nuevo producto')),
    zona, pie);
  cargar();
}

function tarjetaProducto(p, recargar, obtenerCategorias) {
  const alternar = async () => {
    try { await api(`/api/admin/productos/${p._id}`, { metodo: 'PATCH', cuerpo: { disponible: !p.disponible } }); recargar(); }
    catch (e) { aviso(e.message, true); }
  };
  const borrar = async () => {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    try { await api(`/api/admin/productos/${p._id}`, { metodo: 'DELETE' }); aviso('Producto eliminado.'); recargar(); }
    catch (e) { aviso(e.message, true); }
  };

  const imagen = p.imagen
    ? h('img', { src: rutaImagen(p.imagen), alt: '', loading: 'lazy' })
    : h('div', { class: 'sin-foto', 'aria-hidden': 'true' }, '🍰');

  return h('article', { class: 'item producto' + (p.disponible ? '' : ' inactivo') },
    imagen,
    h('div', { class: 'cuerpo' },
      h('div', { class: 'item-cabecera' }, h('h3', {}, p.nombre), h('span', { class: 'precio' }, dinero(p.precio))),
      h('p', { class: 'meta' }, p.categoria, ' ', h('span', { class: 'etiqueta-estado' + (p.disponible ? '' : ' agotado') }, p.disponible ? 'Disponible' : 'No disponible')),
      p.descripcion ? h('p', { class: 'meta' }, p.descripcion) : null,
      h('div', { class: 'acciones' },
        h('button', { class: 'boton boton-suave boton-chico', onclick: () => formularioProducto(p, obtenerCategorias(), recargar) }, 'Editar'),
        h('button', { class: 'boton boton-suave boton-chico', onclick: alternar }, p.disponible ? 'Desactivar' : 'Activar'),
        h('button', { class: 'boton boton-peligro boton-chico', onclick: borrar }, 'Eliminar'))));
}

function formularioProducto(producto, categorias, alGuardar) {
  const p = producto || {};
  const error = h('p', { class: 'mensaje-error', role: 'alert', hidden: true });
  const nombre = h('input', { id: 'fNombre', required: true, minlength: 2, maxlength: 80, value: p.nombre || '' });
  const nombreCarrito = h('input', { id: 'fCarrito', maxlength: 80, placeholder: 'Si lo dejas vacío, se usa el nombre', value: p.nombreCarrito || '' });
  const colorCustom = h('input', { id: 'fColorOn', type: 'checkbox', checked: !!p.color });
  const color = h('input', { id: 'fColor', type: 'color', value: p.color || '#ebdc99', disabled: !p.color });
  colorCustom.addEventListener('change', () => { color.disabled = !colorCustom.checked; });
  const descripcion = h('textarea', { id: 'fDescripcion', maxlength: 300, value: p.descripcion || '' });
  const categoria = h('select', { id: 'fCategoria' }, categorias.map((c) => h('option', { value: c }, c)));
  categoria.value = p.categoria || categorias[0];
  const precio = h('input', { id: 'fPrecio', type: 'number', min: 0, step: 100, inputmode: 'numeric', required: true, value: p.precio ?? '' });
  const imagen = h('input', { id: 'fImagen', maxlength: 200, placeholder: 'assets/img/torta-naranja.jpg', value: p.imagen || '' });
  const disponible = h('input', { id: 'fDisponible', type: 'checkbox', checked: p.disponible !== false });

  const formulario = h('form', { novalidate: true },
    h('label', { for: 'fNombre' }, 'Nombre'), nombre,
    h('label', { for: 'fDescripcion' }, 'Descripción'), descripcion,
    h('div', { class: 'dos-columnas' },
      h('div', {}, h('label', { for: 'fCategoria' }, 'Categoría'), categoria),
      h('div', {}, h('label', { for: 'fPrecio' }, 'Precio (COP)'), precio)),
    h('label', { for: 'fCarrito' }, 'Nombre en el carrito y en el pedido (opcional)'), nombreCarrito,
    h('label', { for: 'fImagen' }, 'Imagen (ruta dentro del sitio)'), imagen,
    h('div', { class: 'fila-check' }, colorCustom, h('label', { for: 'fColorOn' }, 'Color de tarjeta personalizado')), color,
    h('div', { class: 'fila-check' }, disponible, h('label', { for: 'fDisponible' }, 'Disponible para la venta')),
    error,
    h('div', { class: 'dialogo-pie' },
      h('button', { type: 'button', class: 'boton boton-suave', onclick: cerrarDialogo }, 'Cancelar'),
      h('button', { type: 'submit', class: 'boton boton-principal' }, 'Guardar')));

  formulario.addEventListener('submit', async (e) => {
    e.preventDefault();
    error.hidden = true;
    const cuerpo = { nombre: nombre.value, nombreCarrito: nombreCarrito.value, color: colorCustom.checked ? color.value : '', descripcion: descripcion.value, categoria: categoria.value, precio: precio.value, imagen: imagen.value, disponible: disponible.checked };
    try {
      if (producto) await api(`/api/admin/productos/${producto._id}`, { metodo: 'PUT', cuerpo });
      else await api('/api/admin/productos', { metodo: 'POST', cuerpo });
      cerrarDialogo(); aviso('Producto guardado.'); alGuardar();
    } catch (err) { error.textContent = err.message; error.hidden = false; }
  });

  abrirDialogo(producto ? 'Editar producto' : 'Nuevo producto', formulario);
}

// ===========================================================================
// NAVEGACIÓN
// ===========================================================================
const vistas = {
  resumen: { titulo: 'Resumen', abrir: vistaResumen },
  mensajes: { titulo: 'Mensajes', abrir: vistaMensajes },
  pedidos: { titulo: 'Pedidos', abrir: vistaPedidos },
  productos: { titulo: 'Productos', abrir: vistaProductos }
};

function irA(nombre) {
  if (location.hash !== '#' + nombre) location.hash = nombre; // dispara "hashchange"
  else mostrarVista();
}

async function mostrarVista() {
  const nombre = vistas[location.hash.slice(1)] ? location.hash.slice(1) : 'resumen';
  titulo.textContent = vistas[nombre].titulo;
  document.title = `${vistas[nombre].titulo} | Panel Dulce Equilibrio`;
  document.querySelectorAll('.menu button').forEach((b) => {
    const activo = b.dataset.vista === nombre;
    b.classList.toggle('activo', activo);
    if (activo) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  cerrarDialogo();
  try { await vistas[nombre].abrir(); }
  catch (e) { mostrarEstado(contenido, 'error-carga', e.message); }
  actualizarInsignia();
}

document.querySelectorAll('.menu button').forEach((b) => b.addEventListener('click', () => irA(b.dataset.vista)));
window.addEventListener('hashchange', mostrarVista);

$('#botonSalir').addEventListener('click', async () => {
  try { await api('/api/auth/logout', { metodo: 'POST', cuerpo: {} }); } catch { /* da igual */ }
  window.location.replace('/admin/login');
});

mostrarVista();
