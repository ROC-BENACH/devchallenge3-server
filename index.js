const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Estat en memòria
const games = {};

/**
 * Endpoint de prova
 */
app.get("/", (req, res) => {
  res.send("DevChallenge3 server OK");
});

/**
 * JOIN: crear o unir-se a una partida
 */
app.post("/join", (req, res) => {
  // Busca partida oberta
  let game = Object.values(games).find(g => g.players.length === 1);

  if (!game) {
    const gameId = uuidv4();
    game = {
      id: gameId,
      players: ["J1"],
      moves: {},
      turn: "J1",
      finished: false
    };
    games[gameId] = game;

    return res.json({ gameId, role: "J1" });
  }

  game.players.push("J2");
  return res.json({ gameId: game.id, role: "J2" });
});

/**
 * GET STATE
 */
app.get("/state/:gameId", (req, res) => {
  const game = games[req.params.gameId];
  if (!game) return res.status(404).json({ error: "Game not found" });
  res.json(game);
});

/**
 * PLAY MOVE
 */
app.post("/play", (req, res) => {
  const { gameId, player, move } = req.body;
  const game = games[gameId];

  if (!game || game.finished) {
    return res.status(400).json({ error: "Invalid game" });
  }

  if (game.turn !== player) {
    return res.status(400).json({ error: "Not your turn" });
  }

  game.moves[player] = move;
  game.turn = player === "J1" ? "J2" : "J1";

  // Si els dos han jugat, acabem
  if (game.moves["J1"] && game.moves["J2"]) {
    game.finished = true;
  }

  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log("Server OK on " + PORT);
});
