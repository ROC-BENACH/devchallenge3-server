const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const games = {};

// JOIN
app.post("/join", (req, res) => {
  let waitingGame = Object.values(games).find(g => g.players.length === 1);

  if (!waitingGame) {
    const gameId = uuidv4();
    games[gameId] = {
      id: gameId,
      players: ["P1"],
      turn: "P1",
      plays: [],
      finished: false
    };
    return res.json({ gameId, role: "P1", status: "waiting" });
  }

  waitingGame.players.push("P2");
  return res.json({
    gameId: waitingGame.id,
    role: "P2",
    status: "matched"
  });
});

// STATE
app.get("/state/:id", (req, res) => {
  const game = games[req.params.id];
  if (!game) return res.status(404).json({ error: "Game not found" });
  res.json(game);
});

// PLAY
app.post("/play", (req, res) => {
  const { gameId, player, move } = req.body;
  const game = games[gameId];

  if (!game || game.finished)
    return res.status(400).json({ error: "Invalid game" });

  if (game.turn !== player)
    return res.status(400).json({ error: "Not your turn" });

  game.plays.push({ player, move });
  game.turn = player === "P1" ? "P2" : "P1";

  if (game.plays.length >= 10) game.finished = true;

  res.json(game);
});

app.listen(3000, () => console.log("Server OK on 3000"));
