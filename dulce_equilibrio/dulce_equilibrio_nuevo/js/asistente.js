
document.addEventListener("DOMContentLoaded", () => {
    const consulta = document.getElementById("consulta");
    const boton = document.getElementById("btn-recomendar");
    const respuesta = document.getElementById("respuesta-asistente");

    if (!consulta || !boton || !respuesta) return;

    const categorias = [
        {
            nombre: "Postres",
            ruta: "postres/index.html",
            palabras: ["postre", "dulce", "mousse", "antojo", "chocolate"]
        },
        {
            nombre: "Galletas",
            ruta: "galletas/index.html",
            palabras: ["galleta", "galletas"]
        },
        {
            nombre: "Tortas",
            ruta: "tortas/index.html",
            palabras: ["torta", "tortas", "pastel"]
        },
        {
            nombre: "Antojos creativos",
            ruta: "antojos%20creativos/index.html",
            palabras: ["creativo", "diferente", "novedad"]
        }
    ];

    const normalizar = (texto) =>
        texto.toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

    function crearElemento(etiqueta, texto, clase) {
        const elemento = document.createElement(etiqueta);
        elemento.textContent = texto;
        if (clase) elemento.className = clase;
        return elemento;
    }

    function agregarEnlace(contenedor, texto, ruta) {
        const enlace = document.createElement("a");
        enlace.href = ruta;
        enlace.textContent = texto;
        contenedor.appendChild(enlace);
    }


    async function obtenerProductos(categoria) {
        const baseAPI = (window.DULCE_API || "").replace(/\/$/, "");

        const url = `${baseAPI}/api/productos?categoria=${encodeURIComponent(categoria)}`;

        const peticion = await fetch(url, {
            cache: "no-store"
        });

        if (!peticion.ok) {
            throw new Error(`Error al consultar productos: ${peticion.status}`);
        }

        const productos = await peticion.json();

        if (!Array.isArray(productos)) {
            throw new Error("La API no devolvió una lista de productos");
        }

        return productos;
    }



    function mostrarProductos(contenedor, productos, categoria) {
        const disponibles = productos.filter(
            producto => producto.disponible !== false
        );

        if (!disponibles.length) {
            contenedor.appendChild(
                crearElemento(
                    "p",
                    `No hay productos disponibles actualmente en ${categoria}.`
                )
            );
            return;
        }

        contenedor.appendChild(
            crearElemento("h3", `¡Mira estas opciones de ${categoria}!`)
        );

        disponibles.slice(0, 3).forEach(producto => {
            const tarjeta = document.createElement("div");
            tarjeta.className =
                "tarjeta-producto cat-" +
                categoria.toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .replace(/[^a-z0-9]+/g, "-");

            if (producto.imagen) {
                const imagen = document.createElement("img");
                const baseImagen = (window.DULCE_API || "").replace(/\/$/, "");

                imagen.src = `${baseImagen}/${producto.imagen.replace(/^\/+/, "")}`;
                imagen.alt = producto.nombre;
                imagen.className = "tarjeta-img";
                imagen.loading = "lazy";

                tarjeta.appendChild(imagen);
            }

            const informacion = document.createElement("article");
            informacion.className = "tarjeta-info";

            informacion.appendChild(
                crearElemento("h4", producto.nombre)
            );

            if (producto.descripcion) {
                informacion.appendChild(
                    crearElemento("p", producto.descripcion)
                );
            }

            const precio = document.createElement("button");
            precio.type = "button";
            precio.className = "agregar-carrito";
            precio.dataset.producto = producto.nombreCarrito || producto.nombre;
            precio.dataset.precio = producto.precio;

            precio.textContent =
                Number(producto.precio).toLocaleString("es-CO", {
                    style: "currency",
                    currency: "COP",
                    maximumFractionDigits: 0
                }) + " COP";

            informacion.appendChild(precio);
            tarjeta.appendChild(informacion);
            contenedor.appendChild(tarjeta);
        });

        const seccion = categorias.find(
            item => item.nombre === categoria
        );

        if (seccion) {
            agregarEnlace(
                contenedor,
                `Ver todos los productos de ${categoria}`,
                seccion.ruta
            );
        }
    }


    function analizarConsulta(texto) {
        const textoNormalizado = normalizar(texto);

        const resultado = {
            categorias: [],
            ejercicio: false,
            pausa: false,
            bienestar: false,
            tiempo: null,
            estado: ""
        };

        // Detectar categorías de productos.
        categorias.forEach(categoria => {
            if (
                categoria.palabras.some(palabra =>
                    textoNormalizado.includes(normalizar(palabra))
                )
            ) {
                resultado.categorias.push(categoria.nombre);
            }
        });

        // Detectar necesidades de movimiento.
        resultado.pausa = [
            "pausa activa", "descansar", "despejarme",
            "estirar", "mucho tiempo sentado"
        ].some(p => textoNormalizado.includes(p));

        resultado.ejercicio = [
            "ejercicio", "ejercitar", "moverme",
            "actividad fisica", "entrenar", "movimiento",
            "caminar", "rutina"
        ].some(p => textoNormalizado.includes(p));

        // Detectar bienestar.
        resultado.bienestar = [
            "bienestar", "salud", "habito", "cuidarme",
            "organizar", "equilibrio", "alimentacion",
            "hidratarme", "dormir"
        ].some(p => textoNormalizado.includes(p));

        // Detectar tiempo disponible.
        const tiempo = textoNormalizado.match(/(\d+)\s*(minutos|min|minuto)/);

        if (tiempo) {
            resultado.tiempo = Number(tiempo[1]);
        } else if (textoNormalizado.includes("poco tiempo")) {
            resultado.tiempo = 5;
        }

        // Detectar estado de ánimo.
        if (/estres|ansiedad|agobiad|tension/.test(textoNormalizado)) {
            resultado.estado = "estres";
        } else if (/cansad|agotad|sin energia|sueño/.test(textoNormalizado)) {
            resultado.estado = "cansancio";
        } else if (/feliz|content|animad/.test(textoNormalizado)) {
            resultado.estado = "positivo";
        }

        return resultado;
    }

    function recomendarActividad(contenedor, datos) {
        if (datos.pausa || datos.estado === "estres") {
            contenedor.appendChild(
                crearElemento("h3", "Te recomendamos una pausa activa")
            );

            contenedor.appendChild(
                crearElemento(
                    "p",
                    "Prueba una pausa de 5 minutos: levántate, mueve suavemente los hombros, estira los brazos y respira tranquilamente."
                )
            );

            agregarEnlace(
                contenedor,
                "Ver pausas activas",
                "ejercicios/index.html#pausas-activas"
            );

        } else if (datos.ejercicio || datos.estado === "cansancio") {
            contenedor.appendChild(
                crearElemento("h3", "Una idea para mantenerte en movimiento")
            );

            const actividad = datos.tiempo && datos.tiempo <= 5
                ? "Haz una caminata suave de 5 minutos o algunos movimientos de movilidad."
                : "Puedes comenzar con calentamiento, movimientos suaves y una caminata a tu propio ritmo.";

            contenedor.appendChild(
                crearElemento("p", actividad)
            );

            agregarEnlace(
                contenedor,
                "Explorar ejercicios",
                "ejercicios/index.html#movimiento-diario"
            );
        }
    }

    function recomendarBienestar(contenedor, datos) {
        if (!datos.bienestar && !datos.estado) return;

        contenedor.appendChild(
            crearElemento("h3", "Una recomendación para tu bienestar")
        );

        let mensaje =
            "Organiza pequeños momentos de descanso, mantén una hidratación adecuada y procura incluir hábitos saludables en tu rutina.";

        if (datos.estado === "estres") {
            mensaje =
                "Tómate unos minutos para respirar tranquilamente, descansar y organizar tus actividades sin exigirte demasiado.";
        }

        if (datos.estado === "cansancio") {
            mensaje =
                "Escucha a tu cuerpo, toma un descanso y procura mantener horarios de sueño regulares.";
        }

        contenedor.appendChild(crearElemento("p", mensaje));

        agregarEnlace(
            contenedor,
            "Descubrir consejos saludables",
            "consejos/index.html#habitos-bienestar"
        );
    }

    async function recomendar() {
        const texto = consulta.value.trim();

        respuesta.replaceChildren();

        if (!texto) {
            respuesta.appendChild(
                crearElemento(
                    "p",
                    "Cuéntame qué buscas para poder recomendarte algo."
                )
            );
            consulta.focus();
            return;
        }

        boton.disabled = true;
        boton.textContent = "Analizando tus preferencias...";

        respuesta.appendChild(
            crearElemento("p", "Estoy preparando recomendaciones para ti...")
        );

        try {
            const datos = analizarConsulta(texto);
            respuesta.replaceChildren();

            respuesta.appendChild(
                crearElemento("h3", "¡Estas son mis recomendaciones!")
            );

            respuesta.appendChild(
                crearElemento(
                    "p",
                    "He analizado tus preferencias y seleccionado estas opciones:"
                )
            );

            // Consultar productos reales del catálogo.
            for (const categoria of datos.categorias) {
                const productos = await obtenerProductos(categoria);
                mostrarProductos(respuesta, productos, categoria);
            }

            // Recomendaciones de actividad física.
            recomendarActividad(respuesta, datos);

            // Recomendaciones de bienestar.
            recomendarBienestar(respuesta, datos);

            if (
                datos.categorias.length === 0 &&
                !datos.ejercicio &&
                !datos.pausa &&
                !datos.bienestar &&
                !datos.estado
            ) {
                respuesta.appendChild(
                    crearElemento(
                        "p",
                        "Todavía no identifico exactamente lo que necesitas. Prueba escribiendo qué producto te gusta, si quieres hacer ejercicio o si buscas consejos de bienestar."
                    )
                );

                agregarEnlace(
                    respuesta,
                    "Explorar todos los postres",
                    "postres/index.html"
                );

                agregarEnlace(
                    respuesta,
                    "Explorar ejercicios",
                    "ejercicios/index.html"
                );

                agregarEnlace(
                    respuesta,
                    "Ver consejos",
                    "consejos/index.html"
                );
            }

            respuesta.appendChild(
                crearElemento(
                    "p",
                    "Puedes contarme otra preferencia para recibir nuevas recomendaciones."
                )
            );

        } catch (error) {
            console.error("Error en el asistente:", error);

            respuesta.replaceChildren(
                crearElemento(
                    "p",
                    "Ocurrió un inconveniente al preparar las recomendaciones. Inténtalo nuevamente."
                )
            );
        } finally {
            boton.disabled = false;
            boton.textContent = "Buscar recomendación";
        }
    }

    boton.addEventListener("click", recomendar);

    consulta.addEventListener("keydown", evento => {
        if (evento.key === "Enter") {
            recomendar();
        }
    });
});
