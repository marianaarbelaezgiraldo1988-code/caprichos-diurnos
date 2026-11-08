// MENÚ DESPLEGABLE
const botonMenu = document.getElementById("botonMenu");
const navegacion = document.getElementById("navegacion");
if (botonMenu && navegacion) {
  botonMenu.addEventListener("click", () => {
    navegacion.classList.toggle("visible");
    botonMenu.setAttribute("aria-expanded", navegacion.classList.contains("visible"));
  });
}

const WHATSAPP_NUMBER = "573017528235";

// CARRITO COMPARTIDO ENTRE LAS PÁGINAS
const CLAVE_CARRITO = "carritoDulceEquilibrio";
let carrito = [];
try {
  const guardado = JSON.parse(localStorage.getItem(CLAVE_CARRITO) || "[]");
  carrito = Array.isArray(guardado) ? guardado : [];
} catch (error) {
  carrito = [];
}

const botonCarrito = document.getElementById("botonCarrito");
const panelCarrito = document.getElementById("panelCarrito");
const cerrarCarrito = document.getElementById("cerrarCarrito");
const fondoPanel = document.getElementById("fondoPanel");
const listaCarrito = document.getElementById("listaCarrito");
const cantidadCarrito = document.getElementById("cantidadCarrito");
const vaciarCarrito = document.getElementById("vaciarCarrito");
const totalCarrito = document.getElementById("totalCarrito");
const pedirWhatsApp = document.getElementById("pedirWhatsApp");

function formatoPrecio(precio) {
  return Number(precio || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0
  });
}

function guardarCarrito() {
  try {
    localStorage.setItem(CLAVE_CARRITO, JSON.stringify(carrito));
  } catch (error) {
    console.warn("No se pudo guardar el carrito:", error);
  }
}

function abrirCarrito() {
  if (panelCarrito && fondoPanel) {
    panelCarrito.classList.add("abierto");
    fondoPanel.classList.add("visible");
  }
}

function cerrarPanel() {
  if (panelCarrito && fondoPanel) {
    panelCarrito.classList.remove("abierto");
    fondoPanel.classList.remove("visible");
  }
}

function obtenerProductosAgrupados() {
  const grupos = new Map();
  carrito.forEach(producto => {
    const nombre = producto.nombre || "Producto";
    const precio = Number(producto.precio) || 0;
    const clave = `${nombre}__${precio}`;
    if (!grupos.has(clave)) grupos.set(clave, { nombre, precio, cantidad: 0 });
    grupos.get(clave).cantidad += 1;
  });
  return Array.from(grupos.values());
}

function actualizarCarrito() {
  if (cantidadCarrito) cantidadCarrito.textContent = carrito.length;

  const total = carrito.reduce((suma, p) => suma + (Number(p.precio) || 0), 0);
  if (totalCarrito) totalCarrito.textContent = formatoPrecio(total);

  if (listaCarrito) {
    listaCarrito.innerHTML = "";
    if (!carrito.length) {
      const vacio = document.createElement("li");
      vacio.className = "carrito-vacio";
      vacio.textContent = "Todavía no has agregado elementos.";
      listaCarrito.appendChild(vacio);
    } else {
      obtenerProductosAgrupados().forEach(producto => {
        const li = document.createElement("li");
        li.append(document.createTextNode(
          `${producto.nombre} × ${producto.cantidad} — ${formatoPrecio(producto.precio * producto.cantidad)}`
        ));
        listaCarrito.appendChild(li);
      });
    }
  }

  if (pedirWhatsApp) pedirWhatsApp.disabled = carrito.length === 0;
  guardarCarrito();
}

function prepararPedidoWhatsApp() {
  if (!carrito.length) {
    alert("Agrega al menos un producto antes de realizar el pedido.");
    return;
  }

  if (!/^\d{10,15}$/.test(WHATSAPP_NUMBER) || WHATSAPP_NUMBER.includes("X")) {
    alert("Antes de usar Pedir, configura el número de WhatsApp del negocio en js/script.js.");
    return;
  }

  const productos = obtenerProductosAgrupados();
  const total = carrito.reduce((suma, p) => suma + (Number(p.precio) || 0), 0);

  const lineas = [
    "¡Hola! Quiero realizar este pedido en Dulce Equilibrio:",
    "",
    ...productos.map(p =>
      `• ${p.nombre} x${p.cantidad}: ${formatoPrecio(p.precio * p.cantidad)}`
    ),
    "",
    `Total: ${formatoPrecio(total)}`,
    "",
    "¿Me confirman la disponibilidad y los detalles de entrega?"
  ];

  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lineas.join("\n"))}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// Un solo escuchador para todos los botones, incluso los que dibuja catalogo.js después.
document.addEventListener("click", evento => {
  const boton = evento.target.closest(".agregar-carrito");
  if (!boton) return;
  carrito.push({
    nombre: (boton.dataset.producto || "Producto").trim(),
    precio: Number(boton.dataset.precio) || 0
  });
  actualizarCarrito();
  abrirCarrito();
});

if (botonCarrito) botonCarrito.addEventListener("click", abrirCarrito);
if (cerrarCarrito) cerrarCarrito.addEventListener("click", cerrarPanel);
if (fondoPanel) fondoPanel.addEventListener("click", cerrarPanel);
if (vaciarCarrito) {
  vaciarCarrito.addEventListener("click", () => {
    carrito = [];
    actualizarCarrito();
  });
}
if (pedirWhatsApp) pedirWhatsApp.addEventListener("click", prepararPedidoWhatsApp);

actualizarCarrito();
