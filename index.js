const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

let players = [];
let moves = {};

app.post("/join", (req, res) => {
  if (players.length >= 2) {
    return res.json({ error: "Partida completa" });
  }
  const playerId = players.length + 1;
  players.push(playerId);
  res.json({ player: playerId });
});

app.post("/move", (req, res) => {
  const { player, shot, save } = req.body;

  if (!player || !shot || !save) {
    return res.status(400).json({ error: "Datos incompletos" });
  }

  moves[player] = { shot, save };

  if (Object.keys(moves).length < 2) {
    return res.json({ status: "Esperando al otro jugador..." });
  }

  let p1Points = 0;
  let p2Points = 0;

  if (
    moves[1].shot.height !== moves[2].save.height ||
    moves[1].shot.direction !== moves[2].save.direction
  ) {
    p1Points++;
  }

  if (
    moves[2].shot.height !== moves[1].save.height ||
    moves[2].shot.direction !== moves[1].save.direction
  ) {
    p2Points++;
  }

  const winner =
    p1Points > p2Points ? "player 1" :
    p2Points > p1Points ? "player 2" :
    "empate";

  moves = {};

  res.json({ p1Points, p2Points, winner });
});

app.listen(3000, () => {
  console.log("Servidor activo en puerto 3000");
});
