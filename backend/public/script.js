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
    verHinchasActivos(); // Esta es la carga inicial
    mostrarUsuario();
    mostrarNivel();
    cargarStore();

    // --- PUNTO 2: ACTUALIZACIÓN AUTOMÁTICA ---
    // Esto hace que verHinchasActivos se ejecute solo cada 30 segundos
    setInterval(verHinchasActivos, 30000); 
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

    // --- 🚀 TRUCO DE DESBLOQUEO PARA LA MÚSICA RETRO ---
    // La arrancamos y pausamos al instante para que el navegador nos dé permiso
    // de usarla después en el setTimeout sin problemas.
    if (musicaRetro) {
        musicaRetro.play().then(() => {
            musicaRetro.pause();
            musicaRetro.currentTime = 0;
        }).catch(e => console.warn("Esperando permiso para audio retro"));
    }

    // 2. Iniciamos la música retro de fondo después del delay
    setTimeout(() => {
        if (musicaRetro && musicaRetro.paused) { 
            // Subimos un poquito el volumen por si acaso
            musicaRetro.volume = 0.20; 
            musicaRetro.play().catch(e => console.error("No se pudo iniciar el audio retro:", e));
        }
    }, 4000);

    // 3. "Pre-cargamos" los efectos
    sonidoGol.load();
    sonidoGritoGol.load();
    sonidoClick.load();

    // 4. Efecto visual de desaparición
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
    
    // 1. Efecto de brillo y escala en el texto del nivel
    const elPuntos = document.getElementById("nivelUsuario");
    if (elPuntos) {
        // Quitamos la clase por si ya estaba (para poder reiniciar la animación)
        elPuntos.classList.remove("animar-puntos");
        
        // Truco técnico: forzamos un "reflow" para que el navegador note que sacamos la clase
        void elPuntos.offsetWidth; 
        
        // Volvemos a agregar la clase para que brille
        elPuntos.classList.add("animar-puntos");
    }

    // 2. Animación visual de los puntos voladores (+5 PTS)
    crearAnimacionPuntos(cantidad, evento);
    
    // 3. Actualizamos la barra de progreso y el texto
    mostrarNivel();
}

function obtenerNivel(pts) {
    if (pts < 20) return "Capitán del Asado 🥩";
    if (pts < 50) return "Hincha Fiel 🏟️";
    if (pts < 100) return "Cabulero Pro 🧿";
    return "Brujo de la Scaloneta 🧙‍♂️";
}

function mostrarNivel() {
    const info = calcularNivel(puntos);
    const el = document.getElementById("nivelUsuario"); // Corregido: antes decía usuarioActivoNivel
    const barra = document.getElementById("barraProgreso");
    
    if (el) el.innerText = `Nivel: ${info.nombre} (${puntos} pts)`;
    if (barra) barra.style.width = info.porcentaje + "%";
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
    const usernameInput = document.getElementById("username");
    const username = usernameInput ? usernameInput.value.trim() : "";
    
    if (!username) return alert("⚠️ ¡Escribí un nombre, pibe! No podés ser un jugador anónimo.");

    try {
        const res = await fetch(`${API_BASE_URL}/users`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username })
        });

        // --- MANEJO DE ERRORES (Nombres repetidos, etc.) ---
        if (!res.ok) {
            if (res.status === 400 || res.status === 409) {
                return alert("❌ ¡Ese nombre ya está en la lista de buena fe! Elegí otro apodo.");
            }
            throw new Error("Error en el servidor");
        }

        const user = await res.json();

        // 1. Guardamos en la memoria del navegador (Persistencia)
        localStorage.setItem("user_id", user.id);
        localStorage.setItem("username", user.username);
        localStorage.setItem("puntos", user.puntos || 0);

        // 2. Sincronizamos la variable global de puntos
        // Esto es CLAVE para que mostrarNivel() no lea el valor viejo
        puntos = parseInt(user.puntos) || 0;

        // 3. Feedback visual (Papelitos)
        if (typeof lanzarPapelitos === "function") lanzarPapelitos();
        
        alert(`🇦🇷 ¡Bienvenido a la Scaloneta, ${user.username}!`);
        
        // 4. Actualizamos la interfaz inmediatamente
        mostrarUsuario(); // Muestra el nombre en el header
        mostrarNivel();   // Dibuja la barra de progreso y el rango (Paso 3 corregido)
        
        // 5. Movemos al usuario a la sección principal
        mostrarSeccion('home'); 

    } catch (e) { 
        console.error("Error al crear usuario", e);
        alert("❌ No se pudo unir a la Scaloneta. Revisá tu conexión o intentá más tarde.");
    }
}

async function mostrarSeccion(seccion) {
    // 0. CORTAR EL AUDIO ANTERIOR
    detenerMusica();

    // 1. DESBLOQUEO DE AUDIO (Feedback sonoro de navegación)
    if (typeof tocarClick === "function") tocarClick();

    // 2. LÓGICA DE VISIBILIDAD
    // Agregamos 'grupos' a la lista de secciones para que también se oculte
    const secciones = ["home", "predicciones", "cabalas", "ranking", "store", "grupos"];
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
    if (seccion === 'ranking') {
        // Por defecto, al entrar a Ranking, mostramos el General
        cargarRanking('general'); 
    }
    
    if (seccion === 'cabalas') {
        verCabalas();
    }
    
    if (seccion === 'predicciones') { 
        cargarPartidos(); 
        cargarSelectorPartidos(); 
    }

    if (seccion === 'grupos') {
        // Por defecto mostramos el formulario de "Unirse"
        if (typeof toggleFormGrupo === "function") toggleFormGrupo('unirse');
    }

    if (seccion === 'store') {
        cargarStore();
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
            
            // 4. CAMBIO DE SECCIÓN
            mostrarSeccion('cabalas');
            
            // 5. PAUSA DE SEGURIDAD (500ms)
            setTimeout(() => {
                verCabalas(); // Refrescamos la lista de fondo
                
                // --- 🎉 ¡LANZAMOS LOS PAPELITOS AQUÍ! ---
                lanzarPapelitos(); 
                
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
    } catch (e) {
        console.error("Error en ranking:", e);
    }
}

// Switch entre Crear y Unirse en Grupos
function toggleFormGrupo(modo) {
    const unirse = document.getElementById('formUnirseGrupo');
    const crear = document.getElementById('formCrearGrupo');
    const btnUnirse = document.getElementById('btnTabUnirse');
    const btnCrear = document.getElementById('btnTabCrear');

    if (modo === 'unirse') {
        unirse.style.display = 'block';
        crear.style.display = 'none';
        btnUnirse.style.background = 'var(--oro)';
        btnCrear.style.background = 'rgba(255,255,255,0.1)';
    } else {
        unirse.style.display = 'none';
        crear.style.display = 'block';
        btnCrear.style.background = 'var(--oro)';
        btnUnirse.style.background = 'rgba(255,255,255,0.1)';
    }
}

// Switch entre los 3 Rankings
async function cargarRanking(tipo) {
    // 1. ACTUALIZAR ESTADO DE LOS BOTONES
    document.querySelectorAll('.btn-nav-rank').forEach(b => b.classList.remove('active'));
    
    const tabs = { 'general': 'tabGen', 'cabalas': 'tabCab', 'grupos': 'tabGru' };
    const tabActiva = document.getElementById(tabs[tipo]);
    if (tabActiva) tabActiva.classList.add('active');

    // 2. ACTUALIZAR TEXTO DE PREMIOS
    const info = document.getElementById('infoPremio');
    const textosPremios = {
        'general': "🏆 VIAJE AL MUNDIAL para el #1. Sorteo entre el Top 100.",
        'cabalas': "✨ VIAJE AL MUNDIAL para la Cábala más votada (Mística).",
        'grupos': "👥 Merch AFA y Sponsors para el grupo con mejor promedio."
    };
    if (info) info.innerText = textosPremios[tipo];

    // 3. PREPARAR CONTENEDOR Y URL
    const lista = document.getElementById("listaRanking");
    if (!lista) return;
    lista.innerHTML = `<p style="text-align:center; opacity:0.6; padding:20px;">Buscando en la base de datos...</p>`;

    let endpoint = "/ranking"; 
    if (tipo === 'cabalas') endpoint = "/ranking-mistica";
    if (tipo === 'grupos') endpoint = "/ranking-grupos";

    try {
        const res = await fetch(`${API_BASE_URL}${endpoint}`);

        // --- 🛡️ MEJORA DE SEGURIDAD: Validar respuesta ---
        if (!res.ok) {
            // Si el servidor tira 404 o 500, lanzamos error para que lo atrape el catch
            throw new Error(`Servidor respondió con status ${res.status}`);
        }

        const data = await res.json(); 

        if (!Array.isArray(data) || data.length === 0) {
            lista.innerHTML = `<p style="text-align:center; padding:20px;">Aún no hay datos para este ranking.</p>`;
            return;
        }

        // 4. RENDERIZAR RESULTADOS
        lista.innerHTML = data.map((item, i) => {
            let claseEspecial = "";
            if (i === 0) {
                claseEspecial = (tipo === 'cabalas') ? "mystic-glow" : "gold-glow";
            }

            const nombre = item.username || item.group_name || "Sin nombre";
            const puntosDisplay = item.puntos || item.votos || 0;
            const unidad = (tipo === 'cabalas') ? "VOTOS" : "PTS";

            return `
                <div class="ranking-item ${claseEspecial} fadeIn">
                    <div class="rank-pos">${i + 1}</div>
                    <div class="rank-name">${nombre}</div>
                    <div class="rank-pts"><strong>${puntosDisplay}</strong> ${unidad}</div>
                </div>
            `;
        }).join('');

    } catch (e) {
        console.error("Error cargando ranking:", e);
        // Si el error es el de JSON Parse o 404, mostramos un mensaje amigable
        lista.innerHTML = `
            <div style="text-align:center; padding:20px;">
                <p style="color: #ff6b6b;">⚠️ El ranking de ${tipo.toUpperCase()} todavía está en el vestuario.</p>
                <p style="font-size:0.8rem; opacity:0.6;">(Estará disponible pronto)</p>
            </div>`;
    }
}
async function cargarPartidos() {
    try {
        const res = await fetch(`${API_BASE_URL}/matches`);
        if (!res.ok) throw new Error("No se pudieron cargar los partidos");
        
        const matches = await res.json();
        const lista = document.getElementById("listaPartidos");
        if (!lista) return;

        const banderas = {
            "argentina": "ar", "méxico": "mx", "polonia": "pl",
            "arabia saudita": "sa", "francia": "fr", "australia": "au",
            "dinamarca": "dk", "túnez": "tn", "brasil": "br",
            "serbia": "rs", "portugal": "pt", "ghana": "gh",
            "uruguay": "uy", "corea del sur": "kr", "ecuador": "ec", "senegal": "sn"
        };

        lista.innerHTML = matches.map(m => {
            const codeA = banderas[m.team_a.toLowerCase()] || 'un';
            const codeB = banderas[m.team_b.toLowerCase()] || 'un';
            
            const fecha = new Date(m.match_date).toLocaleDateString('es-AR', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            });

            // AQUÍ ESTABA EL ERROR: Faltaba cerrar el string y el div
            return `
            <div class="match-card" style="position: relative; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.08); margin-bottom: 12px; padding: 20px 15px 25px 15px; border-radius: 15px; border: 1px solid rgba(212, 175, 55, 0.2); backdrop-filter: blur(5px); color: white;">
                <div style="flex: 1; text-align: right; display: flex; align-items: center; justify-content: flex-end; gap: 10px;">
                    <span style="font-weight: bold; font-size: 0.9rem;">${m.team_a}</span>
                    <img src="https://flagcdn.com/w40/${codeA}.png" width="30" style="border-radius: 3px;">
                </div>
                <div style="padding: 0 15px; color: #D4AF37; font-weight: 900; font-size: 1.1rem;">VS</div>
                <div style="flex: 1; text-align: left; display: flex; align-items: center; justify-content: flex-start; gap: 10px;">
                    <img src="https://flagcdn.com/w40/${codeB}.png" width="30" style="border-radius: 3px;">
                    <span style="font-weight: bold; font-size: 0.9rem;">${m.team_b}</span>
                </div>
                <div style="position: absolute; bottom: 6px; left: 0; width: 100%; font-size: 0.7rem; opacity: 0.6; text-align: center;">
                    ${fecha} hs
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        console.error("Error al cargar partidos:", e);
    }
}

async function cargarSelectorPartidos() {
    try {
        const res = await fetch(`${API_BASE_URL}/matches`);
        const matches = await res.json();
        const select = document.getElementById("matchSelect");
        if (!select) return;
        
        // Agregamos un option inicial neutro
        select.innerHTML = '<option value="" disabled selected>Seleccioná un partido</option>' + 
            matches.map(m => `<option value="${m.id}">${m.team_a} vs ${m.team_b}</option>`).join('');
    } catch (e) {
        console.error("Error en selector:", e);
    }
}
// ================= UTILIDADES (MODALES, COMPARTIR) =================
function mostrarModal(titulo, mensaje, imagen) {
    const t = document.getElementById("modalTitulo");
    const m = document.getElementById("modalMensaje");
    const i = document.getElementById("imgFestejo");
    const modal = document.getElementById("modalGol");

    // 1. Cargamos textos
    if (t) t.innerText = titulo;
    if (m) m.innerText = mensaje;
    
    // 2. Cargamos la imagen con control total
    if (i) {
        if (imagen) {
            i.src = imagen;
            i.style.display = "block";
            i.style.maxHeight = "40vh";
            i.style.objectFit = "contain";
            i.style.margin = "0 auto 15px"; // Centrado automático
        } else {
            i.style.display = "none"; // Si no hay imagen, la ocultamos para no ver el icono roto
        }
    }
    
    // 3. Mostramos el modal
    if (modal) {
        modal.style.display = "flex";
    }

    // 4. LÓGICA DE AUDIO
    // Usamos sonidoGol si existe, o sonidoGritoGol según como lo tengas declarado
    const audioAReproducir = typeof sonidoGol !== 'undefined' ? sonidoGol : null;

    if (audioAReproducir) {
        audioAReproducir.muted = false; 
        audioAReproducir.volume = 1.0; 
        audioAReproducir.currentTime = 0; 

        // El delay de 200ms ayuda a que el modal cargue antes que el sonido
        setTimeout(() => {
            audioAReproducir.play().catch(error => {
                console.warn("Bloqueo de audio: el usuario debe interactuar primero.", error);
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
    // Limpiamos el texto para que la URL sea válida
    const textoSeguro = encodeURIComponent(`Mi cábala para la Scaloneta: "${texto}" 🇦🇷 Votá la mía acá:`);
    const urlApp = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${textoSeguro}&url=${urlApp}`, "_blank");
}

function invitarVotarCabala(texto) {
    const textoSeguro = encodeURIComponent(`¡Votá mi cábala de la Scaloneta! ⚽\n\n"${texto}"\n\nEntrá acá 👇\n${window.location.href}`);
    window.open(`https://wa.me/?text=${textoSeguro}`, "_blank");
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

// ================= GUARDAR PREDICCIÓN (CORREGIDO) =================
async function guardarPrediccion() {
    // 0. Sonido de click al tocar el botón
    if (typeof tocarClick === "function") tocarClick();

    // 1. Verificación de usuario
    const userId = localStorage.getItem("user_id");
    if (!userId) {
        alert("⚠️ ¡Epa! Tenés que unirte a la Scaloneta primero para predecir.");
        mostrarSeccion('home');
        return;
    }

    // 2. Captura de elementos
    const selectEl = document.getElementById("matchSelect");
    const inputA = document.getElementById("scoreA");
    const inputB = document.getElementById("scoreB");

    // Verificamos que los elementos existan en el HTML
    if (!selectEl || !inputA || !inputB) {
        console.error("Error: No se encontraron los inputs en el HTML.");
        return;
    }

    const matchId = selectEl.value;
    const scoreA = inputA.value;
    const scoreB = inputB.value;

    // 3. Validación de campos vacíos (Permite el 0)
    if (!matchId) {
        return alert("⚠️ Seleccioná un partido, ¡no te hagas el distraído!");
    }

    if (scoreA === "" || scoreB === "") {
        return alert("⚠️ Poné los goles, ¡no seas pecho frío! (Aunque sea un 0)");
    }

    try {
        // Usamos parseInt para asegurar que viajen como números al servidor
        const res = await fetch(`${API_BASE_URL}/predictions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                user_id: parseInt(userId),
                match_id: parseInt(matchId),
                score_a: parseInt(scoreA),
                score_b: parseInt(scoreB)
            })
        });

        if (res.ok) {
            // --- ⚽ EFECTOS DE VICTORIA ---
            if (typeof sonidoGritoGol !== 'undefined') {
                sonidoGritoGol.currentTime = 0;
                sonidoGritoGol.play().catch(e => console.warn("Audio bloqueado"));
            }

            if (typeof lanzarPapelitos === "function") {
                lanzarPapelitos();
            }

            // Animación de puntos (si tenés la función sumarPuntos definida)
            if (typeof sumarPuntos === "function") {
                sumarPuntos(5, window.event);
            }
            
            alert("✅ ¡Predicción guardada! Sumaste puntos por participar.");
            
            // Limpiamos los inputs para la próxima
            inputA.value = "";
            inputB.value = "";

        } else {
            const errorMsg = await res.text();
            alert("❌ " + (errorMsg || "Error al guardar."));
        }
    } catch (e) {
        console.error("Error en la predicción:", e);
        alert("❌ Error de conexión. Revisá que el servidor esté prendido.");
    }
}

function lanzarPapelitos() {
    const duration = 3 * 1000; // 3 segundos de gloria
    const end = Date.now() + duration;

    (function frame() {
        // Lanzamiento desde la izquierda (Celeste y Blanco)
        confetti({
            particleCount: 15, // Subimos de 3 a 10 por ráfaga
            angle: 60,
            spread: 60,
            origin: { x: 0, y: 0.7 },
            colors: ['#74ACDF', '#ffffff', '#D4AF37']
        });

        // Lanzamiento desde la derecha (Celeste y Blanco)
        confetti({
            particleCount: 10, // Subimos de 3 a 10 por ráfaga
            angle: 120,
            spread: 60,
            origin: { x: 1, y: 0.7 },
            colors: ['#74ACDF', '#ffffff', '#D4AF37']
        });

        // Lanzamiento aleatorio central para llenar huecos
        if (Math.random() > 0.7) {
            confetti({
                particleCount: 10,
                velocity: 30,
                spread: 360,
                origin: { x: Math.random(), y: Math.random() - 0.2 },
                colors: ['#74ACDF', '#D4AF37']
            });
        }

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}

function calcularNivel(puntos) {
    // Definimos los niveles: nombre y puntos mínimos para llegar
    const niveles = [
        { nombre: "Hincha de Sillón", min: 0 },
        { nombre: "Cabulero Iniciado", min: 50 },
        { nombre: "Místico de la Tribuna", min: 150 },
        { nombre: "Estratega de Scaloni", min: 300 },
        { nombre: "Guardián de las 3 Estrellas", min: 500 }
    ];

    // Buscamos en qué nivel está el usuario
    let nivelActual = niveles[0];
    let siguienteNivel = niveles[1];

    for (let i = 0; i < niveles.length; i++) {
        if (puntos >= niveles[i].min) {
            nivelActual = niveles[i];
            siguienteNivel = niveles[i + 1] || null; // Por si llega al nivel máximo
        }
    }

    // Calculamos el porcentaje para la barra
    let porcentaje = 100;
    if (siguienteNivel) {
        const rango = siguienteNivel.min - nivelActual.min;
        const progresoEnRango = puntos - nivelActual.min;
        porcentaje = (progresoEnRango / rango) * 100;
    }

    return { 
        nombre: nivelActual.nombre, 
        porcentaje: porcentaje,
        puntosFaltantes: siguienteNivel ? siguienteNivel.min - puntos : 0
    };
}

document.addEventListener("DOMContentLoaded", () => {
    // Cambié "nombre_hincha" por "username" para que coincida con crearUsuario
    const nombreGuardado = localStorage.getItem("username");
    const idGuardado = localStorage.getItem("user_id");

    if (nombreGuardado && idGuardado) {
        const homeDiv = document.getElementById("home");
        if(homeDiv) {
            homeDiv.innerHTML = `
                <div class="fadeIn" style="text-align:center; padding: 20px;">
                    <h2>¡Hola de nuevo, ${nombreGuardado}! 🇦🇷</h2>
                    <p>Ya sos parte de la mística. ¡A sumar puntos!</p>
                    <button onclick="cerrarSesion()" class="btn-filter" style="margin-top:10px">Cambiar de Usuario</button>
                </div>
            `;
        }
        // Llamamos a mostrarNivel que ya tiene los puntos del localStorage
        mostrarNivel();
    }
});

function cerrarSesion() {
    // Usamos un mensaje bien futbolero
    if(confirm("¿Seguro que querés abandonar la concentración? Se borrarán los datos de esta sesión.")) {
        
        // 1. Borramos solo lo que pertenece a la Scaloneta
        localStorage.removeItem("user_id");
        localStorage.removeItem("username");
        localStorage.removeItem("puntos");
        
        // Opcional: Si tenés un token de sesión o algo más, lo borrás acá
        
        // 2. Efecto visual opcional antes de recargar
        document.body.style.opacity = "0.5";
        document.body.style.transition = "opacity 0.5s";

        // 3. Reiniciamos la app
        setTimeout(() => {
            location.reload(); 
        }, 300);
    }
}

async function crearGrupo() {
    const nombre = document.getElementById("newGroupName").value.trim();
    const pass = document.getElementById("newGroupPass").value.trim();
    const userId = localStorage.getItem("user_id");

    if (!nombre || !pass) return alert("Poné nombre y clave para el grupo.");

    try {
        const res = await fetch(`${API_BASE_URL}/groups`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: nombre, password: pass, creator_id: userId })
        });
        if (res.ok) {
            alert("¡Grupo creado! Pasale el nombre y la clave a tus amigos.");
            toggleFormGrupo('unirse');
        } else {
            alert("Ese nombre de grupo ya existe.");
        }
    } catch (e) { alert("Error de conexión"); }
}

async function unirseAGrupo() {
    const nombre = document.getElementById("joinGroupName").value.trim();
    const pass = document.getElementById("joinGroupPass").value.trim();
    const userId = localStorage.getItem("user_id");

    try {
        const res = await fetch(`${API_BASE_URL}/groups/join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: nombre, password: pass, user_id: userId })
        });
        if (res.ok) {
            alert("¡Ya sos parte de la banda!");
            mostrarSeccion('home'); // O refrescar para mostrar el ranking del grupo
        } else {
            alert("Nombre o clave incorrectos.");
        }
    } catch (e) { alert("Error al unirse"); }
}

// Función para tirar papelitos y mostrar puntos flotantes
function efectoPuntos(cantidad, evento) {
    const span = document.createElement("span");
    span.innerText = `+${cantidad} PTS`;
    span.className = "puntos-flotantes";
    
    // Si el usuario hizo click, sale de ahí, si no, del centro
    span.style.left = (evento ? evento.pageX : window.innerWidth / 2) + "px";
    span.style.top = (evento ? evento.pageY : window.innerHeight / 2) + "px";
    
    document.body.appendChild(span);
    
    // Confetti si es un puntaje alto
    if(cantidad >= 10) {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#74ACDF', '#ffffff', '#D4AF37']
        });
    }

    setTimeout(() => span.remove(), 1200);
}