const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

// 🔥 MEMÒRIA GLOBAL (IMPORTANT)
const games = {};

// ✅ HEALTH CHECK (OBLIGATORI)
app.get("/", (req, res) => {
  res.send("DevChallenge3 server OK");
});

// ✅ JOIN (POST)
app.post("/join", (req, res) => {
  console.log("POST /join");

  let game = Object.values(games).find(g => g.players.length < 2);

  if (!game) {
    const gameId = uuidv4();
    games[gameId] = {
      id: gameId,
      players: ["P1"],
      finished: false
    };

    console.log("Created game", gameId);

    return res.json({
      gameId,
      role: "P1"
    });
  }

  game.players.push("P2");
  console.log("Joined game", game.id);

  res.json({
    gameId: game.id,
    role: "P2"
  });
});

// ✅ STATE
app.get("/state/:gameId", (req, res) => {
  const game = games[req.params.gameId];
  if (!game) return res.status(404).json({ error: "Game not found" });
  res.json(game);
});

// ✅ PLAY (encara no fa res, però no peta)
app.post("/play", (req, res) => {
  console.log("POST /play", req.body);
  res.json({ ok: true });
});

// 🔥 PORT DINÀMIC (OBLIGATORI PER RENDER)
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log("Server OK on", PORT);
});
