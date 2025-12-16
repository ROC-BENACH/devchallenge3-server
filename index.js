const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

/* 👉 AIXÒ ÉS EL QUE FALTAVA */
app.get("/", (req, res) => {
  res.send("DevChallenge3 server OK");
});

/* ====== JOC ONLINE ====== */

let games = {};

app.post("/join", (req, res) => {
  let game = Object.values(games).find(g => g.players.length < 2);

  if (!game) {
    const gameId = Math.random().toString(36).substring(2, 9);
    game = {
      id: gameId,
      players: ["P1"],
      turn: "P1",
      finished: false,
      score: { P1: 0, P2: 0 }
    };
    games[gameId] = game;
    return res.json({ gameId, role: "P1" });
  } else {
    game.players.push("P2");
    return res.json({ gameId: game.id, role: "P2" });
  }
});

app.get("/state/:gameId", (req, res) => {
  const game = games[req.params.gameId];
  if (!game) return res.status(404).end();
  res.json(game);
});

app.post("/play", (req, res) => {
  const { gameId, player } = req.body;
  const game = games[gameId];
  if (!game || game.finished) return res.status(400).end();

  if (player !== game.turn) return res.status(403).end();

  game.score[player]++;
  game.turn = player === "P1" ? "P2" : "P1";

  if (game.score[player] >= 3) {
    game.finished = true;
  }

  res.json({ ok: true, game });
});

/* ======================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server OK on ${PORT}`);
});
