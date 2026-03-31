// 1. Al cargar la página, ejecutamos las funciones principales
document.addEventListener("DOMContentLoaded", () => {
    cargarStore();
    verCabalas(); 
});

// ================= SECCIÓN TIENDA (PRODUCTOS) =================
async function cargarStore() {
    try {
        const res = await fetch("/products");
        const productos = await res.json();
        const contenedor = document.querySelector(".store-grid");

        if (!contenedor) return;

        contenedor.innerHTML = productos.map(p => `
            <div class="product-card">
                <div class="badge">${p.category.toUpperCase()}</div>
                <img src="${p.image_url}" alt="${p.name}" class="product-img">
                <h3>${p.name}</h3>
                <p class="price">$${Number(p.price).toLocaleString('es-AR')}</p>
                <button class="btn-buy" onclick="comprar(${p.id})">¡La quiero!</button>
            </div>
        `).join('');
    } catch (error) {
        console.error("Error cargando tienda:", error);
    }
}

function comprar(id) {
    alert("¡Buena elección! Producto añadido al carrito de la Scaloneta.");
}

// ================= SECCIÓN CÁBALAS (OBTENER DATOS) =================
async function verCabalas() {
    const listaContenedor = document.getElementById("listaCabalas");
    if (!listaContenedor) return;

    try {
        listaContenedor.innerHTML = "<p>Cargando cábalas del vestuario...</p>";

        const res = await fetch("/cabalas");
        if (!res.ok) throw new Error("Error al conectar con el servidor");

        const cabalas = await res.json();
        
        // Si no hay nada, mostramos mensaje amigable
        if (!cabalas || cabalas.length === 0) {
            listaContenedor.innerHTML = "<p>No hay cábalas aún. ¡Sé el primero!</p>";
            return;
        }

        renderCabalas(cabalas); // <--- ACÁ SE USA LA FUNCIÓN DE ABAJO

    } catch (error) {
        console.error("Error en verCabalas:", error);
        listaContenedor.innerHTML = `
            <div style="text-align:center; padding: 20px;">
                <p>⚠️ No pudimos conectar con el vestuario</p>
                <button class="btn-filter" onclick="verCabalas()">Reintentar</button>
            </div>`;
    }
}

// ================= SECCIÓN RENDER (DIBUJAR EN PANTALLA) =================
// Esta es la función que te faltaba pegar
function renderCabalas(cabalas) {
    const lista = document.getElementById("listaCabalas");
    lista.innerHTML = ""; // Limpiamos el "Cargando..."

    // Ordenar por votos de mayor a menor
    const cabalasOrdenadas = [...cabalas].sort((a, b) => (b.votos || 0) - (a.votos || 0));

    cabalasOrdenadas.forEach(c => {
        const item = document.createElement("div");
        item.className = "cabala-item";

        const autor = c.username || "Hincha";
        const texto = c.descripcion || "";
        const totalVotos = c.votos || 0;

        // Estructura de cada cábala
        item.innerHTML = `
            <p><strong>${autor}:</strong> ${texto}</p>
            <div style="display:flex; gap:10px; margin-top:10px;">
                <button id="btn-votar-${c.id}" class="btn-votar">
                    👍 <span>${totalVotos}</span> ${c.ya_voto ? '✔' : ''}
                </button>
                <button class="btn-filter" onclick="compartirCabala('${texto}')">Compartir</button>
            </div>
        `;

        lista.appendChild(item);

        // Lógica del botón votar
        const btnVotar = item.querySelector(`#btn-votar-${c.id}`);
        if (c.ya_voto) btnVotar.disabled = true;

        btnVotar.onclick = async () => {
            btnVotar.disabled = true; // Evitar doble clic
            try {
                const res = await fetch("/votar-cabala", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: c.id, user_id: localStorage.getItem("user_id") })
                });

                if (res.ok) {
                    const span = btnVotar.querySelector("span");
                    span.textContent = parseInt(span.textContent) + 1;
                    btnVotar.innerHTML += " ✔";
                }
            } catch (err) {
                btnVotar.disabled = false;
                alert("Error al votar");
            }
        };
    });
}