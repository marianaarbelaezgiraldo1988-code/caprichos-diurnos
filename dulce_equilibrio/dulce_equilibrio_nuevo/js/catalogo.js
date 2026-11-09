


(() => {
const secciones = document.querySelectorAll('[data-categoria]');
if (!secciones.length) return;

  // Raíz del sitio, calculada desde la ubicación de este archivo (…/js/catalogo.js).
const raiz = new URL('../', document.currentScript.src);
const formatoPrecio = (n) => Number(n || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const claseCategoria = (c) => 'cat-' + c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');

  // Dirección del servidor (ver js/config.js). Vacía = el mismo sitio.
const urlApi = (ruta) => (window.DULCE_API ? window.DULCE_API + ruta : new URL(ruta.slice(1), raiz).href);

function urlImagen(ruta) {
    if (!ruta) return null;
    try {
    const url = new URL(String(ruta).replace(/^\/+/, ''), raiz);
      return url.origin === location.origin ? url.href : null; // solo imágenes del propio sitio
    } catch { return null; }
}

function crearTarjeta(p) {
    const tarjeta = document.createElement('div');
    tarjeta.className = 'tarjeta-producto ' + claseCategoria(p.categoria);

    const src = urlImagen(p.imagen);
    if (src) {
    const img = document.createElement('img');
    img.className = 'tarjeta-img';
    img.src = src;
    img.alt = p.nombre;
    img.loading = 'lazy';
    tarjeta.append(img);
    } else {
    const vacio = document.createElement('div');
    vacio.className = 'tarjeta-img tarjeta-sin-foto';
    vacio.setAttribute('aria-hidden', 'true');
    vacio.textContent = '🍰';
    tarjeta.append(vacio);
    }

    const info = document.createElement('article');
    info.className = 'tarjeta-info';
    if (/^#[0-9a-fA-F]{6}$/.test(p.color || '')) info.style.backgroundColor = p.color;

    const titulo = document.createElement('h4');
    titulo.textContent = p.nombre;
    info.append(titulo);

    if (p.descripcion) {
    const texto = document.createElement('p');
    texto.textContent = p.descripcion;
    info.append(texto);
    }

    const boton = document.createElement('button');
    boton.type = 'button';
    boton.className = 'agregar-carrito';
    boton.dataset.producto = p.nombreCarrito || p.nombre;
    boton.dataset.precio = p.precio;
    boton.textContent = formatoPrecio(p.precio) + ' COP';
    info.append(boton);

    tarjeta.append(info);
    return tarjeta;
}

  // Guardamos la última lista buena para que el sitio también se vea sin conexión.
  const guardar = (clave, datos) => { try { localStorage.setItem(clave, JSON.stringify(datos)); } catch { /* sin espacio */ } };
  const leer = (clave) => { try { return JSON.parse(localStorage.getItem(clave) || 'null'); } catch { return null; } };

async function cargarSeccion(seccion) {
    const categoria = seccion.dataset.categoria;
    const clave = 'catalogoDulceEquilibrio:' + categoria;

    let productos = null;
    try {
          const respuesta = await fetch(urlApi('/api/productos') + '?categoria=' + encodeURIComponent(categoria));
    if (!respuesta.ok) throw new Error('Respuesta ' + respuesta.status);
    productos = await respuesta.json();
    guardar(clave, productos);
    } catch (error) {
    productos = leer(clave);
    }

    seccion.replaceChildren();
    seccion.removeAttribute('aria-busy');

    if (!Array.isArray(productos)) {
    const aviso = document.createElement('p');
    aviso.className = 'catalogo-aviso';
    aviso.textContent = 'No pudimos cargar los productos en este momento. Inténtalo de nuevo en unos minutos.';
    return seccion.append(aviso);
    }
    if (!productos.length) {
    const aviso = document.createElement('p');
    aviso.className = 'catalogo-aviso';
    aviso.textContent = 'Pronto tendremos productos disponibles aquí.';
    return seccion.append(aviso);
}
productos.forEach((p) => seccion.append(crearTarjeta(p)));
}

secciones.forEach((s) => { s.setAttribute('aria-busy', 'true'); cargarSeccion(s); });
})();