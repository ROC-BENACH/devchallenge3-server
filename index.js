const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;

// ---------- ESTAT DE LA PARTIDA ----------
let playersJoined = 0;

let moves = {
  1: null,
  2: null
};

const VALID_HEIGHTS = ["baixa", "mitjana", "alta"];
const VALID_DIRECTIONS = ["esquerra", "centre", "dreta"];

// ---------- FUNCIONS ----------
function isValidMove(move) {
  if (!move) return false;

  const { shot, save } = move;
  if (!shot || !save) return false;

  return (
    VALID_HEIGHTS.includes(shot.height) &&
    VALID_DIRECTIONS.includes(shot.direction) &&
    VALID_HEIGHTS.includes(save.height) &&
    VALID_DIRECTIONS.includes(save.direction)
  );
}

function calculatePoints(shot, save) {
  let points = 0;
  if (shot.height === save.height) points++;
  if (shot.direction === save.direction) points++;
  return points;
}

// ---------- ENDPOINTS ----------

// JOIN
app.post("/join", (req, res) => {
  if (playersJoined >= 2) {
    return res.status(403).json({
      error: "Ja hi ha 2 jugadors connectats"
    });
  }

  playersJoined++;
  res.json({ player: playersJoined });
});

// MOVE
app.post("/move", (req, res) => {
  const { player, shot, save } = req.body;

  if (![1, 2].includes(player)) {
    return res.status(400).json({ error: "Jugador invàlid" });
  }

  const move = { shot, save };

  if (!isValidMove(move)) {
    return res.status(400).json({
      error: "Moviment invàlid",
      validHeights: VALID_HEIGHTS,
      validDirections: VALID_DIRECTIONS
    });
  }

  moves[player] = move;

  // Esperant l'altre jugador
  if (!moves[1] || !moves[2]) {
    return res.json({
      status: "waiting",
      message: "Esperant a l'altre jugador"
    });
  }

  // Calcular punts
  const p1Points = calculatePoints(moves[2].shot, moves[1].save);
  const p2Points = calculatePoints(moves[1].shot, moves[2].save);

  let winner = "empat";
  if (p1Points > p2Points) winner = "player1";
  if (p2Points > p1Points) winner = "player2";

  res.json({
    status: "finished",
    p1Points,
    p2Points,
    winner
  });
});

// RESET
app.post("/reset", (req, res) => {
  playersJoined = 0;
  moves = { 1: null, 2: null };

  res.json({
    status: "reset",
    message: "Partida reiniciada"
  });
});

// ---------- START ----------
app.listen(PORT, () => {
  console.log(`Servidor actiu al port ${PORT}`);
});
