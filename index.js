const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

/**
 * Games memory store
 * gameId -> {
 *   players: [{ id, role }],
 *   turn: "J1" | "J2",
 *   finished: boolean,
 *   scores: { J1: number, J2: number }
 * }
 */
const games = {};

/* ======================
   HEALTH CHECK
====================== */
app.get("/", (req, res) => {
  res.send("DevChallenge3 server OK");
});

/* ======================
   JOIN GAME
====================== */
app.post("/join", (req, res) => {
  let game = Object.values(games).find(g => g.players.length < 2);

  if (!game) {
    const gameId = uuidv4();
    game = {
      gameId,
      players: [],
      turn: "J1",
      finished: false,
      scores: { J1: 0, J2: 0 }
    };
    games[gameId] = game;
  }

  const role = game.players.length === 0 ? "J1" : "J2";
  const playerId = uuidv4();

  game.players.push({ id: playerId, role });

  res.json({
    gameId: game.gameId,
    playerId,
    role
  });
});

/* ======================
   GET GAME STATE
====================== */
app.get("/state/:gameId", (req, res) => {
  const game = games[req.params.gameId];
  if (!game) return res.status(404).end();

  res.json({
    players: game.players,
    turn: game.turn,
    finished: game.finished,
    scores: game.scores
  });
});

/* ======================
   PLAY MOVE
====================== */
app.post("/play", (req, res) => {
  const { gameId, player, move } = req.body;
  const game = games[gameId];

  if (!game || game.finished) {
    return res.status(400).json({ error: "Invalid game" });
  }

  if (game.turn !== player) {
    return res.status(400).json({ error: "Not your turn" });
  }

  // Random goal / save (simple logic)
  const goal = Math.random() < 0.5;

  if (goal) {
    game.scores[player]++;
  }

  // Change turn
  game.turn = player === "J1" ? "J2" : "J1";

  // End game after 10 shots total
  const totalShots = game.scores.J1 + game.scores.J2;
  if (totalShots >= 10) {
    game.finished = true;
  }

  res.json({
    goal,
    scores: game.scores,
    nextTurn: game.turn,
    finished: game.finished
  });
});

/* ======================
   START SERVER (IMPORTANT)
====================== */
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Server OK on " + PORT);
});
