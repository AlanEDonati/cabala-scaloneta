const express = require("express");
const db = require("./db");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

app.use(express.json());
app.use(express.static(path.join(__dirname,"public")));


app.get("/test-db", async (req, res) => {
  try {
    const result = await db.query("SELECT NOW()");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error conectando a la base de datos");
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

app.get("/users", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error obteniendo usuarios");
  }
});

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

app.get("/create-test-user", async (req, res) => {
  try {
    const result = await db.query(
      "INSERT INTO users (username) VALUES ('hincha1') RETURNING *"
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creando usuario");
  }
});

app.get("/create-test-match", async (req, res) => {
  try {
    const result = await db.query(
      "INSERT INTO matches (team_a, team_b, match_date) VALUES ('Argentina','Brasil', NOW()) RETURNING *"
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creando partido");
  }
});

app.get("/matches", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM matches");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error obteniendo partidos");
  }
});

app.get("/create-test-prediction", async (req, res) => {
  try {
    const result = await db.query(
      "INSERT INTO predictions (user_id, match_id, score_a, score_b) VALUES (1,1,2,1) RETURNING *"
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error creando predicción");
  }
});

app.get("/predictions", async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM predictions");
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error obteniendo predicciones");
  }
});

app.get("/ranking", async (req,res)=>{

const result = await db.query(`
SELECT users.username, COUNT(predictions.id) as total
FROM users
LEFT JOIN predictions
ON users.id = predictions.user_id
GROUP BY users.username
ORDER BY total DESC
`)

res.json(result.rows)

})