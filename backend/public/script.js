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
    // 0. Sonido de click al tocar el botón
    if (typeof tocarClick === "function") tocarClick();

    // 1. Verificación de usuario
    const userId = localStorage.getItem("user_id");
    if (!userId) {
        alert("⚠️ ¡Epa! Tenés que unirte a la Scaloneta primero para predecir.");
        mostrarSeccion('home');
        return;
    }

    // 2. Captura de elementos con validación de existencia (los "escudos")
    const selectEl = document.getElementById("matchSelect");
    const inputA = document.getElementById("scoreA");
    const inputB = document.getElementById("scoreB");

    // Verificamos que el selector de partido tenga un valor
    if (!selectEl || !selectEl.value) {
        return alert("⚠️ Seleccioná un partido, ¡no te hagas el distraído!");
    }

    const matchId = selectEl.value;
    const scoreA = inputA ? inputA.value : "";
    const scoreB = inputB ? inputB.value : "";

    // 3. Validación de campos vacíos
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
            // --- ⚽ EFECTOS DE VICTORIA ---
            if (typeof sonidoGritoGol !== 'undefined') {
                sonidoGritoGol.currentTime = 0;
                sonidoGritoGol.play().catch(e => console.warn("Audio bloqueado por el navegador"));
            }

            if (typeof lanzarPapelitos === "function") {
                lanzarPapelitos();
            }

            // Sumamos puntos y animamos
            sumarPuntos(5, window.event);
            
            alert("✅ ¡Predicción guardada! Sumaste puntos por participar.");
            
            // Limpiamos los inputs
            if (inputA) inputA.value = "";
            if (inputB) inputB.value = "";

        } else {
            // Manejo de errores del servidor (ej: ya predijo ese partido)
            const errorMsg = await res.text();
            alert("❌ " + (errorMsg || "Ya enviaste una predicción para este partido."));
        }
    } catch (e) {
        console.error("Error en la predicción:", e);
        alert("❌ Error de conexión con el servidor. Intentá de nuevo en un ratito.");
    }
}

function lanzarPapelitos() {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#74ACDF', '#ffffff', '#D4AF37'] // Celeste, blanco y oro
        });
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#74ACDF', '#ffffff', '#D4AF37']
        });

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
    if(confirm("¿Seguro que querés salir de la Scaloneta?")) {
        localStorage.clear();
        location.reload(); // Reinicia la app para pedir el nombre de nuevo
    }
}