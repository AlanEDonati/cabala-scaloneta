const express = require("express");
const db = require("./db");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 🛡️ CONFIGURACIÓN FILTRO ATP (ANTI-INSULTOS)
// ==========================================
const palabrasProhibidas = [
    "boludo", "pelotudo", "mierda", "concha", "hdp", "puto", "puta", "pija",
    "forro", "orto", "cagon", "pajero", "trolo", "malparido", "culiado", "chupala"
]; 

function esAptoParaTodoPublico(texto) {
    if (!texto) return false;
    const textoBajo = texto.toLowerCase();
    
    // 1. Buscamos si el texto contiene alguna de las palabras prohibidas
    const contieneInsulto = palabrasProhibidas.some(palabra => textoBajo.includes(palabra));
    
    // 2. Filtro de longitud (evita mensajes vacíos o de una sola letra)
    const esMuyCorto = texto.trim().length < 5;
    
    return !contieneInsulto && !esMuyCorto;
}

app.use(express.json());

// --- CONFIGURACIÓN BLINDADA DE CARPETA PUBLIC ---
const pathsAProbar = [
  path.join(__dirname, "..", "public"),
  path.join(process.cwd(), "public"),
  path.join(__dirname, "public"),
];

let publicPath = "";

for (const p of pathsAProbar) {
  if (fs.existsSync(p)) {
    publicPath = p;
    console.log("✅ Carpeta public encontrada en:", p);
    break;
  }
}

if (!publicPath) {
  console.error(
    "❌ ERROR CRÍTICO: No se encontró la carpeta 'public' en ninguna ubicación.",
  );
} else {
  app.use(express.static(publicPath));

  app.get("/", (req, res) => {
    res.sendFile(path.join(publicPath, "index.html"));
  });

  app.get("/admin", (req, res) => {
    res.sendFile(path.join(publicPath, "admin.html"));
  });
}

// --- RUTAS DE LA API ---

app.post("/users", async (req, res) => {
  try {
    const { username } = req.body;
    
    // 🛡️ Filtro de seguridad para nombres
    if (!esAptoParaTodoPublico(username)) {
      return res.status(400).send("Nombre no permitido (muy corto o contiene insultos).");
    }

    const result = await db.query(
      "INSERT INTO users (username, puntos) VALUES ($1, 0) RETURNING *",
      [username]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creando usuario");
  }
});

app.get("/users", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users ORDER BY id DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).send("Error obteniendo usuarios");
  }
});

app.get("/matches", async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM matches ORDER BY match_date ASC",
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).send("Error obteniendo partidos");
  }
});

app.post("/predictions", async (req, res) => {
  try {
    const { user_id, match_id, score_a, score_b } = req.body;
    const result = await db.query(
      `INSERT INTO predictions (user_id, match_id, score_a, score_b) 
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, match_id) 
             DO UPDATE SET score_a = EXCLUDED.score_a, score_b = EXCLUDED.score_b
             RETURNING *`,
      [user_id, match_id, score_a, score_b],
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al guardar predicción");
  }
});

app.get("/ranking", async (req, res) => {
  try {
    const result = await db.query(`
            SELECT u.username, 
            COALESCE(SUM(
                CASE 
                    WHEN p.score_a = m.score_a AND p.score_b = m.score_b THEN 3
                    WHEN (p.score_a > p.score_b AND m.score_a > m.score_b) OR 
                         (p.score_a < p.score_b AND m.score_a < m.score_b) OR 
                         (p.score_a = p.score_b AND m.score_a = m.score_b) THEN 1
                    ELSE 0 
                END
            ), 0) as puntos
            FROM users u
            LEFT JOIN predictions p ON u.id = p.user_id
            LEFT JOIN matches m ON p.match_id = m.id
            GROUP BY u.username
            ORDER BY puntos DESC;
        `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error en el ranking");
  }
});

app.post("/cabalas", async (req, res) => {
  try {
    const { user_id, descripcion } = req.body;
    const descLimpia = descripcion ? descripcion.trim() : "";

    // 1. FILTRO ATP (Lo que definimos arriba)
    if (!esAptoParaTodoPublico(descLimpia)) {
      return res.status(400).send("¡Epa! Ese mensaje no es apto para la Scaloneta o es muy corto.");
    }

    // 2. LÍMITE DE 1 CÁBALA POR USUARIO
    const yaTiene = await db.query("SELECT id FROM cabalas WHERE user_id = $1", [user_id]);
    if (yaTiene.rows.length >= 1) {
      return res.status(403).send("Ya aportaste tu cábala sagrada. ¡No la quemes!");
    }

    // 3. EVITAR CÁBALAS IDÉNTICAS (Mística original)
    const repetida = await db.query(
      "SELECT id FROM cabalas WHERE LOWER(descripcion) = LOWER($1)", 
      [descLimpia]
    );
    if (repetida.rows.length > 0) {
      return res.status(400).send("Esa cábala ya existe en el muro. ¡Buscá otra forma de ayudar al equipo!");
    }

    // SI PASA LOS 3 FILTROS, RECIÉN AHÍ INSERTAMOS
    const result = await db.query(
      "INSERT INTO cabalas (user_id, descripcion) VALUES ($1, $2) RETURNING *",
      [user_id, descLimpia]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error("Error en DB:", error);
    res.status(500).send("Error al procesar la cábala");
  }
});

app.get("/cabalas", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        cabalas.id, 
        cabalas.descripcion, 
        COALESCE(cabalas.votos, 0) as votos, 
        users.username 
      FROM cabalas
      LEFT JOIN users ON cabalas.user_id = users.id
      ORDER BY cabalas.votos DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("ERROR EN GET CABALAS:", error.message);
    res.status(500).json({ error: error.message });
  }
}); // 🔥 ESTE ERA EL QUE FALTABA

// Obtener todos los productos del Store
app.get("/products", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM products ORDER BY id DESC");
    res.json(result.rows);
  } catch (error) {
    res.status(500).send("Error obteniendo productos");
  }
});

// Agregar un nuevo producto (Solo desde el Panel de Admin)
app.post("/products", async (req, res) => {
  try {
    const { name, price, image_url, category } = req.body;
    const result = await db.query(
      "INSERT INTO products (name, price, image_url, category) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, price, image_url, category],
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al cargar producto");
  }
});

// RUTA PARA ELIMINAR PRODUCTOS
// RUTA CORREGIDA PARA ELIMINAR PRODUCTOS
app.delete("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // Usamos "db" que es tu constante configurada arriba
    await db.query("DELETE FROM products WHERE id = $1", [id]);

    res.json({ message: "Producto eliminado con éxito" });
  } catch (err) {
    console.error("Error al eliminar:", err);
    res.status(500).send("Error al eliminar el producto");
  }
});
app.post("/votar-cabala", async (req, res) => {
  try {
    const { id, user_id } = req.body;

    // 1. intentar registrar voto (tabla votos)
    await db.query("INSERT INTO votos (user_id, cabala_id) VALUES ($1, $2)", [
      user_id,
      id,
    ]);

    // 2. si pasa, sumamos voto
    await db.query("UPDATE cabalas SET votos = votos + 1 WHERE id = $1", [id]);

    res.json({ ok: true });
  } catch (error) {
    // 🔥 caso: voto duplicado
    if (error.code === "23505") {
      return res.status(400).send("Ya votaste esta cábala");
    }

    console.error(error);
    res.status(500).json({ error: "Error votando cábala" });
  }
});

// RUTA PARA EDITAR UN PRODUCTO
app.put("/products/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, image_url, category } = req.body;

    await db.query(
      "UPDATE products SET name = $1, price = $2, image_url = $3, category = $4 WHERE id = $5",
      [name, price, image_url, category, id],
    );

    res.json({ message: "Producto actualizado con éxito" });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error al editar el producto");
  }
});

// --- RANKING DE MÍSTICA (Cábalas más votadas) ---
app.get("/ranking-mistica", async (req, res) => {
  try {
    const result = await db.query(`
            SELECT u.username, c.descripcion, COALESCE(c.votos, 0) as votos
            FROM cabalas c
            JOIN users u ON c.user_id = u.id
            ORDER BY c.votos DESC
            LIMIT 10
        `);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error en ranking mística" });
  }
});

// --- RANKING DE GRUPOS ---
// --- RANKING DE GRUPOS (Versión Final y Optimizada) ---
app.get("/ranking-grupos", async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        g.nombre as group_name, 
        SUM(u.puntos) as puntos
      FROM grupos g
      JOIN usuarios_grupos ug ON g.id = ug.grupo_id
      JOIN users u ON ug.user_id = u.id
      GROUP BY g.id, g.nombre
      ORDER BY puntos DESC
      LIMIT 10
    `);
    
    // Si la consulta no trae nada, devolvemos un array vacío para evitar errores en el front
    res.json(result.rows || []);
    
  } catch (error) {
    console.error("Error en ranking de grupos:", error);
    res.status(500).send("Error al cargar ranking de grupos");
  }
});

app.post("/set-result", async (req, res) => {
  const { match_id, score_a, score_b } = req.body;
  try {
    // 1. Actualizar el partido y marcarlo como jugado
    await db.query(
      "UPDATE matches SET score_a = $1, score_b = $2, played = true WHERE id = $3",
      [score_a, score_b, match_id]
    );

    // 2. Exactos (+10 pts): El marcador es idéntico
    await db.query(`
      UPDATE users SET puntos = puntos + 10 
      WHERE id IN (
        SELECT user_id FROM predictions 
        WHERE match_id = $1 AND score_a = $2 AND score_b = $3
      )`, [match_id, score_a, score_b]);

    // 3. Ganador o Empate (+5 pts): No es exacto, pero adivinó quién ganaba
    // Usamos SIGN para comparar la diferencia de goles
    await db.query(`
      UPDATE users SET puntos = puntos + 5 
      WHERE id IN (
        SELECT user_id FROM predictions 
        WHERE match_id = $1 
        AND NOT (score_a = $2 AND score_b = $3)
        AND SIGN(score_a - score_b) = SIGN($2 - $3)
      )`, [match_id, score_a, score_b]);

    res.send("¡Puntos repartidos!");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error al procesar los puntos");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor de la Scaloneta corriendo en puerto ${PORT}`);
});
