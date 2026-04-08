// ================= CONFIGURACIÓN Y ESTADO INICIAL =================
const API_BASE_URL = "https://cabala-scaloneta-1.onrender.com";
let puntos = parseInt(localStorage.getItem("puntos")) || 0;
let cacheCabalas = null;
let todosLosProductos = [];


// --- 🎶 LA BANDA SONORA DE LA SCALONETA ---

// Definición de archivos
const gritoMundial = new Audio("./hit_mundial.mp3"); // El hit de YouTube (reemplaza al viejo himno)
const musicaRetro = new Audio("./retro.mp3");       // El archivo arcade que subiste (fondo)
const sonidoGol = new Audio("./muchachos.mp3");     // Para momentos de gloria
const sonidoGritoGol = new Audio("./gol.mp3");      // Para predicciones
const sonidoClick = new Audio("./click.mp3");       // Feedback de botones

// --- 🎚️ AJUSTES DE VOLUMEN Y REPRODUCCIÓN ---

// Música de fondo (Arcade)
musicaRetro.loop = true;          // Se repite infinitamente
musicaRetro.volume = 0.15;        // Muy bajito para no molestar

// Sonidos de impacto (Gritos y efectos)
gritoMundial.volume = 0.8;        // Entrada potente
sonidoGol.volume = 1.0; 
sonidoGritoGol.volume = 0.8;
sonidoClick.volume = 0.4;

// Nota: musicaAmbiente ya no se usa, ahora usamos musicaRetro para el fondo general.

// --- 🚀 CARGA DE LA APP ---
window.onload = function() {
    cargarSelectorPartidos();
    cargarPartidos();
    verCabalas();
    verRanking();
    verHinchasActivos();
    mostrarUsuario();
    mostrarNivel();
    cargarStore();
    
    // NOTA: El audio no arranca acá porque el navegador lo bloquea.
    // Arrancará cuando el usuario toque el botón "¡VAMOS ARGENTINA!" del modal.
};

function detenerMusica() {
    // Incluimos las nuevas variables: gritoMundial y musicaRetro
    const audios = [gritoMundial, musicaRetro, sonidoGol, sonidoGritoGol];
    
    audios.forEach(audio => {
        if (audio) {
            audio.pause(); 
            audio.currentTime = 0; // Corta el audio de raíz
        }
    });
}

function entrarAApp() {
    // 1. Iniciamos el hit del mundial (Grito de la hinchada)
    if (gritoMundial) {
        gritoMundial.play().catch(error => console.warn("Error al iniciar audio:", error));
    }

    // 2. Iniciamos la música retro de fondo después de un breve delay (ej. 4 segundos)
    // para que no se tapen entre sí al principio
   setTimeout(() => {
    // Solo arranca si musicaRetro existe y NO se está reproduciendo ya algo más
    if (musicaRetro && musicaRetro.paused) { 
        musicaRetro.play().catch(() => {});
    }
}, 4000);

    // 3. "Pre-cargamos" los efectos para que no haya delay en los botones
    sonidoGol.load();
    sonidoGritoGol.load();
    sonidoClick.load();

    // 4. Efecto visual de desaparición de la bienvenida
    const bienvenida = document.getElementById("pantallaBienvenida");
    if (bienvenida) {
        bienvenida.style.transition = "opacity 0.5s ease";
        bienvenida.style.opacity = "0";
        setTimeout(() => {
            bienvenida.style.display = "none";
        }, 500);
    }
    
    console.log("⚽ Mística retro activada y audio desbloqueado.");
}

function tocarClick() {
    sonidoClick.currentTime = 0;
    sonidoClick.play().catch(() => {}); 
}
// ================= SISTEMA DE PUNTOS Y NIVELES =================
function sumarPuntos(cantidad, evento) {
    puntos += cantidad;
    localStorage.setItem("puntos", puntos);
    
    // Animación visual de +PTS
    crearAnimacionPuntos(cantidad, evento);
    mostrarNivel();
}

function obtenerNivel(pts) {
    if (pts < 20) return "Capitán del Asado 🥩";
    if (pts < 50) return "Hincha Fiel 🏟️";
    if (pts < 100) return "Cabulero Pro 🧿";
    return "Brujo de la Scaloneta 🧙‍♂️";
}

function mostrarNivel() {
    const nivel = obtenerNivel(puntos);
    const el = document.getElementById("usuarioActivoNivel"); // Asegurate que el ID coincida con tu HTML
    const barra = document.getElementById("barraProgreso");
    
    if (el) el.innerText = `Rango: ${nivel} (${puntos} pts)`;
    
    if (barra) {
        // --- 🎯 EL CAMBIO ESTÁ ACÁ ---
        // Usamos el símbolo '%' (módulo) para que la barra siempre 
        // represente el progreso hacia los próximos 100 puntos.
        let progreso = (puntos % 100); 
        
        // Si justo tenés 0 puntos, le ponemos un mínimo de 2% para que se vea un poquito de color
        if (progreso === 0 && puntos > 0) progreso = 100; 

        barra.style.width = progreso + "%";
    }
}
function crearAnimacionPuntos(cantidad, e) {
    const span = document.createElement("span");
    span.className = "puntos-flotantes";
    span.innerText = `+${cantidad} PTS`;
    
    // Si hay un evento de click, sale de ahí, sino del centro
    const x = e ? e.clientX : window.innerWidth / 2;
    const y = e ? e.clientY : window.innerHeight / 2;
    
    span.style.left = x + "px";
    span.style.top = y + "px";
    
    document.body.appendChild(span);
    setTimeout(() => span.remove(), 1200);
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
    // 0. CORTAR EL AUDIO ANTERIOR
    // Esto evita que el himno o el arcade de inicio se pisen con los sonidos de la app
    detenerMusica();

    // 1. DESBLOQUEO DE AUDIO (Cebado)
    // Aprovechamos el click del menú para que el navegador nos dé permiso eterno
    if (sonidoGol) {
        sonidoGol.muted = true; 
        sonidoGol.play().then(() => {
            sonidoGol.pause();
            sonidoGol.muted = false; 
            sonidoGol.currentTime = 0;
        }).catch(e => {
            console.log("Esperando interacción para habilitar audio");
        });
    }

    // 2. LÓGICA DE VISIBILIDAD
    const secciones = ["home", "predicciones", "cabalas", "ranking", "store"];
    secciones.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = "none";
    });

    const activa = document.getElementById(seccion);
    if (activa) {
        activa.style.display = "block";
        activa.classList.add('fadeIn'); 
        window.scrollTo(0, 0);
    }

    // 3. CARGA DE DATOS POR SECCIÓN
    if (seccion === 'ranking') verRanking();
    if (seccion === 'cabalas') verCabalas();
    if (seccion === 'predicciones') { 
        cargarPartidos(); 
        cargarSelectorPartidos(); 
    }
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
    // 1. Verificamos si hay usuario ANTES de hacer nada
    const userId = localStorage.getItem("user_id");
    if (!userId) {
        alert("⚠️ ¡Epa! Tenés que unirte a la Scaloneta primero para sumar puntos.");
        mostrarSeccion('home');
        return;
    }

    btn.disabled = true;
    const span = btn.querySelector("span");
    
    try {
        const res = await fetch(`${API_BASE_URL}/votar-cabala`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                id: c.id, 
                user_id: userId 
            })
        });

        if (res.ok) {
            // Actualizamos el número de votos en la interfaz
            const nuevosVotos = parseInt(span.textContent) + 1;
            btn.innerHTML = `👍 ${nuevosVotos} ✔`;
            
            // 2. Sumamos puntos y pasamos el evento para la animación voladora
            sumarPuntos(1, window.event);
            
            if (sonidoGol) { 
                sonidoGol.currentTime = 0; 
                sonidoGol.play().catch(()=>{}); 
            }
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
    // 1. Verificamos si hay usuario ANTES de publicar
    const userId = localStorage.getItem("user_id");
    if (!userId) {
        alert("⚠️ ¡Epa! Tenés que unirte a la Scaloneta primero para publicar.");
        mostrarSeccion('home');
        return;
    }

    const desc = document.getElementById("cabalaInput").value.trim();
    if (!desc) return alert("Escribí tu cábala");

    try {
        const res = await fetch(`${API_BASE_URL}/cabalas`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userId,
                descripcion: desc
            })
        });

        if (res.ok) {
            // 2. Sumamos 5 puntos con animación voladora
            sumarPuntos(5, window.event);
            
            // 3. Limpiamos el input
            document.getElementById("cabalaInput").value = "";
            
            // 4. CAMBIO DE SECCIÓN (Importante: esto va PRIMERO)
            // Nos movemos a cábalas para que Messi no aparezca sobre el Store
            mostrarSeccion('cabalas');
            
            // 5. PAUSA DE SEGURIDAD (500ms)
            // Esperamos medio segundo para que la pantalla se acomode antes del festejo
            setTimeout(() => {
                verCabalas(); // Refrescamos la lista de fondo
                
                // 6. LANZAMOS A MESSI Y EL SONIDO
                mostrarModal(
                    "¡CÁBALA ACTIVADA!", 
                    "La Scaloneta te lo agradece, pibe.", 
                    "https://upload.wikimedia.org/wikipedia/commons/b/b4/Lionel-Messi-Argentina-2022-FIFA-World-Cup_%28cropped%29.jpg"
                );
            }, 500);

        } else {
            alert("❌ Hubo un problema al guardar la cábala.");
        }
    } catch (e) { 
        alert("❌ Error de conexión al publicar."); 
    }
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
    const formatoMoneda = new Intl.NumberFormat('es-AR', {
        style: 'currency', currency: 'ARS', minimumFractionDigits: 0
    });
    lista.forEach(p => {
        const card = document.createElement("div");
        card.className = "product-card fadeIn";
        card.innerHTML = `
            <div class="product-badge">${p.category ? p.category.toUpperCase() : 'AFA'}</div>
            <img src="${p.image_url}" class="product-img" onerror="this.src='https://placehold.co/400x400?text=AFA+OFICIAL'">
            <h3>${p.name}</h3>
            <p class="price">${formatoMoneda.format(p.price)}</p>
            <button class="btn-buy btn-full" onclick="comprar(${p.id})">¡LO QUIERO!</button>
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
    const modal = document.getElementById("modalGol");

    // 1. Cargamos textos (siempre verificando que existan los elementos)
    if (t) t.innerText = titulo;
    if (m) m.innerText = mensaje;
    
    // 2. Cargamos la imagen con los estilos de control
    if (i && imagen) {
        i.src = imagen;
        i.style.display = "block";
        // Aseguramos que no se deforme (esto ayuda por si el CSS falla)
        i.style.maxHeight = "40vh";
        i.style.objectFit = "contain";
    }
    
    // 3. Mostramos el modal
    if (modal) {
        modal.style.display = "flex";
    }

    // 4. LÓGICA DE AUDIO (Usando el objeto 'new Audio' que creamos arriba)
    if (sonidoGol) {
        sonidoGol.muted = false; 
        sonidoGol.volume = 1.0; 
        sonidoGol.currentTime = 0; 

        // Un pequeño delay de 200ms es el estándar de oro para móviles
        setTimeout(() => {
            sonidoGol.play().catch(error => {
                console.warn("El audio requiere un toque previo en la pantalla.", error);
            });
        }, 200); 
    }
}
function cerrarModal() {
    // 1. Ocultamos el cartel (el modal)
    const modal = document.getElementById("modalGol");
    if (modal) {
        modal.style.display = "none";
    }

    // 2. DETENEMOS EL AUDIO
    if (sonidoGol) {
        sonidoGol.pause();         // Frena la música
        sonidoGol.currentTime = 0; // La rebobina al principio para la próxima
    }
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

// ================= GUARDAR PREDICCIÓN (FALTANTE) =================
async function guardarPrediccion() {
    // 0. Sonido de click al tocar el botón (Feedback inmediato)
    if (typeof tocarClick === "function") tocarClick();

    // 1. Verificación de usuario con redirección
    const userId = localStorage.getItem("user_id");
    if (!userId) {
        alert("⚠️ ¡Epa! Tenés que unirte a la Scaloneta primero para predecir.");
        mostrarSeccion('home');
        return;
    }

    const matchId = document.getElementById("matchSelect").value;
    const scoreA = document.getElementById("scoreA")?.value; 
    const scoreB = document.getElementById("scoreB")?.value;

    // Validación de campos vacíos
    if (scoreA === "" || scoreB === "") {
        return alert("⚠️ Poné los goles, ¡no seas pecho frío!");
    }

    try {
        const res = await fetch(`${API_BASE_URL}/predictions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: userId,
                match_id: matchId,
                score_a: parseInt(scoreA),
                score_b: parseInt(scoreB)
            })
        });

        if (res.ok) {
            // --- ⚽ ¡MOMENTO DE GLORIA! ⚽ ---
            if (sonidoGritoGol) {
                sonidoGritoGol.currentTime = 0; // Reiniciamos por si acaso
                sonidoGritoGol.play().catch(e => console.warn("El audio falló:", e));
            }

            // 2. Sumamos 5 puntos con animación voladora (+5 PTS)
            sumarPuntos(5, window.event);
            
            alert("✅ ¡Predicción guardada! Sumaste puntos por participar.");
            
            // Limpiamos los inputs para la próxima
            document.getElementById("scoreA").value = "";
            document.getElementById("scoreB").value = "";
        } else {
            const errorMsg = await res.text();
            alert("❌ " + (errorMsg || "Ya enviaste una predicción para este partido."));
        }
    } catch (e) {
        alert("❌ Error de conexión con el servidor.");
    }
}
