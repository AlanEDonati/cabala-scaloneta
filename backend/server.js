const express = require("express");
const db = require("./db");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 1. SERVIR ARCHIVOS ESTÁTICOS
// Esto debe ir al principio para que encuentre el CSS y JS
app.use(express.static(path.join(__dirname, "..", "public")));

// 2. RUTAS DE NAVEGACIÓN (HTMLs)
app.get("/debug-ruta", (req, res) => {
    const fs = require("fs");
    const path = require("path");
    const rutaPublic = path.join(__dirname, "..", "public");
    
    let contenido = "";
    try {
        contenido = fs.readdirSync(rutaPublic);
    } catch (e) {
        contenido = "ERROR: No se encuentra la carpeta public en " + rutaPublic;
    }

    res.json({
        dirActual: __dirname,
        buscandoEn: rutaPublic,
        archivosEncontrados: contenido
    });
});

app.get("/admin", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "public", "admin.html"));
});

// --- RUTAS DE LA API (JSON) ---

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

app.get("/cabalas", async (req, res) => {
    try {
        const result = await db.query(`
            SELECT c.descripcion, u.username 
            FROM cabalas c 
            JOIN users u ON c.user_id = u.id 
            ORDER BY c.id DESC
        `);
        res.json(result.rows);
    } catch (error) {
        res.status(500).send("Error obteniendo cábalas");
    }
});

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

// 3. LEVANTAR EL SERVIDOR (Siempre al final)
app.listen(PORT, () => {
    console.log(`Servidor de la Scaloneta corriendo en puerto ${PORT}`);
});