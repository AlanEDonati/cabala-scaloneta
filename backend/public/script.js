// 1. Al cargar la página, ejecutamos las funciones principales
document.addEventListener("DOMContentLoaded", () => {
    // Verificación de seguridad: Si no hay user_id, asignamos uno temporal o pedimos registro
    if (!localStorage.getItem("user_id")) {
        console.warn("User ID no encontrado. Usando ID temporal para pruebas.");
        // localStorage.setItem("user_id", "1"); // Descomenta esto para probar localmente
    }
    
    cargarStore();
    verCabalas(); 
});

// ================= SECCIÓN TIENDA (PRODUCTOS) =================
async function cargarStore() {
    try {
        const res = await fetch("/products");
        if (!res.ok) throw new Error("Error al obtener productos");
        
        const productos = await res.json();
        const contenedor = document.querySelector(".store-grid");

        if (!contenedor) return;

        contenedor.innerHTML = productos.map(p => `
            <div class="product-card">
                <div class="badge">${(p.category || 'General').toUpperCase()}</div>
                <img src="${p.image_url || 'https://via.placeholder.com/150'}" alt="${p.name}" class="product-img">
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
        listaContenedor.innerHTML = "<p class='loading-text'>Cargando cábalas del vestuario...</p>";

        // Usamos la ruta relativa que configuraste en server.js
        const res = await fetch("/cabalas");
        
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(errorText || "Error en el servidor");
        }

        const cabalas = await res.json();
        
        if (!cabalas || cabalas.length === 0) {
            listaContenedor.innerHTML = "<p>No hay cábalas aún. ¡Sé el primero!</p>";
            return;
        }

        renderCabalas(cabalas);

    } catch (error) {
        console.error("Error en verCabalas:", error);
        listaContenedor.innerHTML = `
            <div style="text-align:center; padding: 20px; color: white;">
                <p>⚠️ No pudimos conectar con el vestuario</p>
                <p style="font-size:10px; opacity:0.6;">${error.message}</p>
                <button class="btn-filter" onclick="verCabalas()" style="margin-top:10px;">Reintentar</button>
            </div>`;
    }
}

// ================= SECCIÓN RENDER (DIBUJAR EN PANTALLA) =================
function renderCabalas(cabalas) {
    const lista = document.getElementById("listaCabalas");
    if (!lista) return;
    lista.innerHTML = ""; 

    // Ordenar por votos de mayor a menor de forma segura
    const cabalasOrdenadas = [...cabalas].sort((a, b) => (Number(b.votos) || 0) - (Number(a.votos) || 0));

    cabalasOrdenadas.forEach(c => {
        const item = document.createElement("div");
        item.className = "cabala-item";

        const autor = c.username || "Hincha";
        const texto = c.descripcion || "Sin descripción";
        const totalVotos = Number(c.votos) || 0;

        item.innerHTML = `
            <p><strong>${autor}:</strong> ${texto}</p>
            <div style="display:flex; gap:10px; margin-top:10px; align-items: center;">
                <button id="btn-votar-${c.id}" class="btn-votar" ${c.ya_voto ? 'disabled' : ''}>
                    👍 <span>${totalVotos}</span> ${c.ya_voto ? '✔' : ''}
                </button>
                <button class="btn-filter" onclick="compartirCabala('${texto.replace(/'/g, "\\'")}')">Compartir</button>
            </div>
        `;

        lista.appendChild(item);

        const btnVotar = item.querySelector(`#btn-votar-${c.id}`);

        btnVotar.onclick = async () => {
            const userId = localStorage.getItem("user_id");
            
            if (!userId) {
                alert("Debes estar registrado para votar.");
                return;
            }

            btnVotar.disabled = true; 
            
            try {
                const res = await fetch("/votar-cabala", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: c.id, user_id: userId })
                });

                if (res.ok) {
                    const span = btnVotar.querySelector("span");
                    span.textContent = parseInt(span.textContent) + 1;
                    btnVotar.innerHTML = `👍 <span>${span.textContent}</span> ✔`;
                    // Opcional: sonido de gol
                    if(window.sonidoGol) sonidoGol.play().catch(()=>{});
                } else {
                    const msg = await res.text();
                    alert(msg || "No se pudo registrar el voto");
                    btnVotar.disabled = false;
                }
            } catch (err) {
                console.error("Error al votar:", err);
                btnVotar.disabled = false;
                alert("Error de conexión al votar");
            }
        };
    });
}

// Función auxiliar para compartir (asegurate de tenerla)
function compartirCabala(texto) {
    const url = window.location.href;
    const shareText = `¡Mira esta cábala para la Scaloneta!: "${texto}"`;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText + " " + url)}`, '_blank');
}