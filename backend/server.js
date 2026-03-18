const express = require("express");
const db = require("./db");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- CONFIGURACIÓN BLINDADA DE CARPETA PUBLIC ---
const pathsAProbar = [
    path.join(__dirname, "..", "public"), 
    path.join(process.cwd(), "public"),    
    path.join(__dirname, "public")         
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
    console.error("❌ ERROR CRÍTICO: No se encontró la carpeta 'public' en ninguna ubicación.");
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
        const result = await db.query(
            "INSERT INTO users (username) VALUES ($1) RETURNING *",
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
        const result = await db.query("SELECT * FROM matches ORDER BY match_date ASC");
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
            [user_id, match_id, score_a, score_b]
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
        const result = await db.query(
            "INSERT INTO cabalas (user_id, descripcion) VALUES ($1, $2) RETURNING *",
            [user_id, descripcion]
        );
        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).send("Error al guardar cábala");
    }
});

app.get("/cabalas", async (req,res)=>{

  try{

    const result = await db.query(`
      SELECT cabalas.id, cabalas.descripcion, cabalas.votos, users.username
      FROM cabalas
      LEFT JOIN users
      ON cabalas.user_id = users.id
      ORDER BY cabalas.votos DESC
    `)

    res.json(result.rows)

  }catch(error){

    console.error("ERROR REAL:", error.message)

    res.status(500).json({
      error: error.message
    })

  }

}) // 🔥 ESTE ERA EL QUE FALTABA

app.post("/set-result", async (req, res) => {
    try {
        const { match_id, score_a, score_b } = req.body;
        await db.query(
            "UPDATE matches SET score_a = $1, score_b = $2 WHERE id = $3",
            [score_a, score_b, match_id]
        );
        res.send("Resultado guardado. ¡Puntos repartidos!");
    } catch (error) {
        console.error(error);
        res.status(500).send("Error guardando el resultado final");
    }
});

// LEVANTAR EL SERVIDOR
app.listen(PORT, () => {
    console.log(`Servidor de la Scaloneta corriendo en puerto ${PORT}`);
});

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
            [name, price, image_url, category]
        );
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).send("Error al cargar producto");
    }
});

app.post("/votar-cabala", async (req, res) => {

  try {

    const { id, user_id } = req.body

    // 1. intentar registrar voto (tabla votos)
    await db.query(
      "INSERT INTO votos (user_id, cabala_id) VALUES ($1, $2)",
      [user_id, id]
    )

    // 2. si pasa, sumamos voto
    await db.query(
      "UPDATE cabalas SET votos = votos + 1 WHERE id = $1",
      [id]
    )

    res.json({ ok: true })

  } catch (error) {

    // 🔥 caso: voto duplicado
    if (error.code === "23505") {
      return res.status(400).send("Ya votaste esta cábala")
    }

    console.error(error)
 res.status(500).json({ error: "Error votando cábala" })
  }
})
