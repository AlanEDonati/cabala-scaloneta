 // ================= CONFIGURACIÓN Y ESTADO INICIAL =================
const API_BASE_URL = "https://cabala-scaloneta-1.onrender.com";
let puntos = parseInt(localStorage.getItem("puntos")) || 0;
let cacheCabalas = null;
let todosLosProductos = [];
const sonidoGol = new Audio('https://www.soundjay.com/misc/sounds/cheering-01.mp3');

// Inicialización al cargar la página
window.onload = function() {
    cargarSelectorPartidos();
    cargarPartidos();
    verCabalas();
    verRanking();
    verHinchasActivos();
    mostrarUsuario();
    mostrarNivel();
    cargarStore();
};

// ================= SISTEMA DE PUNTOS Y NIVELES =================
function sumarPuntos(cantidad) {
    puntos += cantidad;
    localStorage.setItem("puntos", puntos);
    mostrarNivel();
}

function obtenerNivel(puntos) {
    if (puntos < 10) return "Capitán del Asado";
    if (puntos < 30) return "Hincha Fiel";
    if (puntos < 60) return "Cabulero Pro";
    return "Brujo de la Scaloneta";
}

function mostrarNivel() {
    const nivel = obtenerNivel(puntos);
    const el = document.getElementById("nivelUsuario");
    if (el) el.innerText = `Nivel: ${nivel} (${puntos} pts)`;
}

// ================= SECCIÓN USUARIOS Y NAVEGACIÓN =================
function mostrarUsuario() {
    const username = localStorage.getItem("username");
    const el = document.getElementById("usuarioActivo");
    if (el && username) el.textContent = "👤 Usuario: " + username;
}

async function crearUsuario() {
    const username = document.getElementById("username").value;
    try {
        const res = await fetch(`${API_BASE_URL}/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
        });
        const user = await res.json();
        localStorage.setItem("user_id", user.id);
        localStorage.setItem("username", user.username);
        alert("Usuario creado con éxito");
        mostrarUsuario();
    } catch (e) { console.error("Error al crear usuario", e); }
}

async function mostrarSeccion(seccion) {
    // Truco para habilitar audio en móviles
    if (sonidoGol && sonidoGol.paused) {
        sonidoGol.play().then(() => { sonidoGol.pause(); sonidoGol.currentTime = 0; }).catch(e => {});
    }

    const secciones = ["home", "predicciones", "cabalas", "ranking", "store"];
    secciones.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = "none";
    });

    const activa = document.getElementById(seccion);
    if (activa) {
        activa.style.display = "block";
        window.scrollTo(0, 0);
    }

    // Carga específica por sección
    if (seccion === 'ranking') verRanking();
    if (seccion === 'cabalas') verCabalas();
    if (seccion === 'predicciones') { cargarPartidos(); cargarSelectorPartidos(); }
}

// ================= SECCIÓN CÁBALAS =================
async function verCabalas() {
    const listaContenedor = document.getElementById("listaCabalas");
    if (!listaContenedor) return;
    listaContenedor.innerHTML = "<p>Cargando cábalas del vestuario...</p>";

    try {
        const res = await fetch(`${API_BASE_URL}/cabalas`);
        const cabalas = await res.json();

        if (!Array.isArray(cabalas) || cabalas.length === 0) {
            listaContenedor.innerHTML = "<p>No hay cábalas aún. ¡Sé el primero!</p>";
            return;
        }

        cacheCabalas = cabalas;
        renderCabalas(cabalas);
    } catch (error) {
        listaContenedor.innerHTML = `<button class="btn-filter" onclick="verCabalas()">🔄 Reintentar conexión</button>`;
    }
}

function renderCabalas(cabalas) {
    const lista = document.getElementById("listaCabalas");
    if (!lista) return;
    lista.innerHTML = "";

    const ordenadas = [...cabalas].sort((a, b) => (b.votos || 0) - (a.votos || 0));
    
    // Actualizar widgets laterales si existen
    if (typeof verCabalaTop === "function") verCabalaTop(ordenadas);
    if (typeof verCabalasTrending === "function") verCabalasTrending(ordenadas);

    ordenadas.forEach(c => {
        const item = document.createElement("div");
        item.className = "cabala-item fadeIn";
        const textoLimpio = c.descripcion ? c.descripcion.replace(/'/g, "\\'") : "";

        item.innerHTML = `
            <p><strong>${c.username || "Anónimo"}:</strong> ${c.descripcion}</p>
            <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top:10px;">
                <button id="btn-v-oc-${c.id}" class="btn-votar" ${c.ya_voto ? 'disabled' : ''}>
                    👍 <span>${c.votos || 0}</span> ${c.ya_voto ? '✔' : ''}
                </button>
                <button class="btn-filter" onclick="compartirCabala('${textoLimpio}')">Twitter</button>
                <button class="btn-filter" onclick="invitarVotarCabala('${textoLimpio}')">WhatsApp</button>
            </div>
        `;
        lista.appendChild(item);

        const btn = item.querySelector(`#btn-v-oc-${c.id}`);
        btn.onclick = () => votarCabalaLogica(c, btn);
    });
}

async function votarCabalaLogica(c, btn) {
    btn.disabled = true;
    const span = btn.querySelector("span");
    
    try {
        const res = await fetch(`${API_BASE_URL}/votar-cabala`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: c.id, user_id: localStorage.getItem("user_id") })
        });

        if (res.ok) {
            span.textContent = parseInt(span.textContent) + 1;
            btn.innerHTML = `👍 ${span.textContent} ✔`;
            sumarPuntos(1);
            if (sonidoGol) { sonidoGol.currentTime = 0; sonidoGol.play().catch(()=>{}); }
        } else {
            const msg = await res.text();
            alert(msg || "Error al votar");
            btn.disabled = false;
        }
    } catch (e) { 
        alert("Error de conexión"); 
        btn.disabled = false;
    }
}

async function guardarCabala() {
    const desc = document.getElementById("cabalaInput").value.trim();
    if (!desc) return alert("Escribí tu cábala");

    try {
        const res = await fetch(`${API_BASE_URL}/cabalas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: localStorage.getItem("user_id"),
                descripcion: desc
            })
        });

        if (res.ok) {
            sumarPuntos(5);
            document.getElementById("cabalaInput").value = "";
            mostrarModal("¡CÁBALA ACTIVADA!", "La Scaloneta te lo agradece.", "messi.jpg");
            verCabalas();
        }
    } catch (e) { alert("Error al publicar"); }
}

// ================= SECCIÓN TIENDA =================
async function cargarStore() {
    try {
        const res = await fetch(`${API_BASE_URL}/products?t=${new Date().getTime()}`);
        todosLosProductos = await res.json();
        mostrarProductos(todosLosProductos);
    } catch (e) { console.error("Error en tienda", e); }
}

function mostrarProductos(lista) {
    const contenedor = document.querySelector(".store-grid");
    if (!contenedor) return;
    contenedor.innerHTML = "";

    lista.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card";
        card.innerHTML = `
            <div class="badge">${p.category ? p.category.toUpperCase() : 'OFICIAL'}</div>
            <img src="${p.image_url}" class="product-img" onerror="this.src='https://placehold.co/400x400?text=Imagen'">
            <h3>${p.name}</h3>
            <p class="price">$${Number(p.price).toLocaleString('es-AR')}</p>
            <button class="btn-buy" onclick="comprar(${p.id})">¡LA QUIERO!</button>
        `;
        contenedor.appendChild(card);
    });
}

function filtrarProductos(categoria) {
    if (categoria === 'todos') {
        mostrarProductos(todosLosProductos);
    } else {
        mostrarProductos(todosLosProductos.filter(p => p.category === categoria));
    }
}

async function comprar(id) {
    const producto = todosLosProductos.find(p => p.id === id);
    if (!producto) return;

    const nombre = localStorage.getItem("username") || "Un hincha";
    const mensaje = encodeURIComponent(`¡Hola! Soy *${nombre}* y quiero comprar: ${producto.name} ($${producto.price})`);
    window.open(`https://wa.me/5492324687099?text=${mensaje}`, "_blank");
}

// ================= RANKING Y PARTIDOS =================
async function verRanking() {
    try {
        const res = await fetch(`${API_BASE_URL}/ranking`);
        const data = await res.json();
        const lista = document.getElementById("listaRanking");
        if (!lista) return;
        lista.innerHTML = data.map((r, i) => `
            <div class="ranking-item">
                <div class="rank-pos">${i + 1}</div>
                <div class="rank-name">${r.username}</div>
                <div class="rank-pts">${r.puntos || 0} PTS</div>
            </div>
        `).join('');
    } catch (e) {}
}

async function cargarPartidos() {
    try {
        const res = await fetch(`${API_BASE_URL}/matches`);
        const matches = await res.json();
        const lista = document.getElementById("listaPartidos");
if (lista) lista.innerHTML = matches.map(m => `
    <li>
        <strong>${m.team_a} vs ${m.team_b}</strong> 
        <small>(${new Date(m.match_date).toLocaleDateString()})</small>
    </li>
`).join('');
    } catch (e) {}
}

async function cargarSelectorPartidos() {
    try {
        const res = await fetch(`${API_BASE_URL}/matches`);
        const matches = await res.json();
        const select = document.getElementById("matchSelect");
        if (!select) return;
        select.innerHTML = matches.map(m => `<option value="${m.id}">${m.team_a} vs ${m.team_b}</option>`).join('');
    } catch (e) {}
}

// ================= UTILIDADES (MODALES, COMPARTIR) =================
function mostrarModal(titulo, mensaje, imagen) {
    const t = document.getElementById("modalTitulo");
    const m = document.getElementById("modalMensaje");
    const i = document.getElementById("imgFestejo");
    if (t) t.innerText = titulo;
    if (m) m.innerText = mensaje;
    if (i && imagen) i.src = imagen;
    
    const modal = document.getElementById("modalGol");
    if (modal) modal.style.display = "flex";
    sonidoGol.play().catch(()=>{});
}

function cerrarModal() {
    const modal = document.getElementById("modalGol");
    if (modal) modal.style.display = "none";
}

function compartirCabala(texto) {
    const url = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(`Mi cábala: "${texto}" 🇦🇷 Votá acá: ${API_BASE_URL}`);
    window.open(url, "_blank");
}

function invitarVotarCabala(texto) {
    const url = "https://wa.me/?text=" + encodeURIComponent(`¡Votá mi cábala de la Scaloneta! ⚽ "${texto}" 👇\n${API_BASE_URL}`);
    window.open(url, "_blank");
}

async function verHinchasActivos() {
    try {
        const res = await fetch(`${API_BASE_URL}/users`);
        const users = await res.json();
        const div = document.getElementById("hinchasActivos");
        if (div) div.textContent = "🔥 Hinchas activos: " + users.length;
    } catch (e) {}
}

function verCabalaTop(cabalas) {
    if (cabalas.length === 0) return;
    const div = document.getElementById("cabalaTop");
    if (div) div.textContent = `🧿 ${cabalas[0].username}: ${cabalas[0].descripcion} 👍 ${cabalas[0].votos || 0}`;
}

function verCabalasTrending(cabalas) {
    const div = document.getElementById("cabalasTrending");
    if (!div) return;
    div.innerHTML = "";
    cabalas.slice(0, 3).forEach(c => {
        const p = document.createElement("p");
        p.textContent = `🧿 ${c.username}: ${c.descripcion} 👍 ${c.votos || 0}`;
        div.appendChild(p);
    });
}