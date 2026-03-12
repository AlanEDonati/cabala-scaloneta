const express = require("express");
const db = require("./db");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

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

SELECT
u.username,

SUM(
CASE
WHEN p.score_a = m.score_a AND p.score_b = m.score_b THEN 3
WHEN
(p.score_a > p.score_b AND m.score_a > m.score_b) OR
(p.score_a < p.score_b AND m.score_a < m.score_b) OR
(p.score_a = p.score_b AND m.score_a = m.score_b)
THEN 1
ELSE 0
END
) as puntos

FROM predictions p

JOIN matches m ON p.match_id = m.id
JOIN users u ON p.user_id = u.id

GROUP BY u.username
ORDER BY puntos DESC

`)

res.json(result.rows)

})

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});

app.post("/set-result", async (req,res)=>{

try{

const {match_id, score_a, score_b} = req.body

await db.query(
"UPDATE matches SET score_a=$1, score_b=$2 WHERE id=$3",
[score_a, score_b, match_id]
)

res.send("Resultado guardado")

}catch(error){

console.error(error)
res.status(500).send("Error guardando resultado")

}

})

app.post("/cabalas", async (req,res)=>{

try{

const { user_id, descripcion } = req.body

const result = await db.query(
"INSERT INTO cabalas (user_id, descripcion) VALUES ($1,$2) RETURNING *",
[user_id, descripcion]
)

res.json(result.rows[0])

}catch(error){

console.error(error)
res.status(500).send("Error guardando cábala")

}

})


app.get("/cabalas", async (req,res)=>{

try{

const result = await db.query(`
SELECT cabalas.descripcion, users.username
FROM cabalas
JOIN users
ON cabalas.user_id = users.id
ORDER BY cabalas.id DESC
`)

res.json(result.rows)

}catch(error){

console.error(error)
res.status(500).send("Error obteniendo cábalas")

}

})