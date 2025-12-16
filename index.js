const express = require("express");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

let waitingPlayer = null;
let matches = {};

// root
app.get("/", (req, res) => {
  res.send("DevChallenge3 server OK");
});

// JOIN — GET (per navegador i Android)
app.get("/join", (req, res) => {
  const playerId = uuidv4();

  if (!waitingPlayer) {
    waitingPlayer = playerId;
    return res.json({
      status: "waiting",
      playerId
    });
  }

  const matchId = uuidv4();

  matches[matchId] = {
    p1: waitingPlayer,
    p2: playerId
  };

  waitingPlayer = null;

  res.json({
    status: "matched",
    matchId,
    playerId
  });
});

// STATUS
app.get("/status/:playerId", (req, res) => {
  const { playerId } = req.params;

  for (const matchId in matches) {
    const m = matches[matchId];
    if (m.p1 === playerId || m.p2 === playerId) {
      return res.json({ status: "matched", matchId });
    }
  }

  res.json({ status: "waiting" });
});

app.listen(PORT, () => {
  console.log("Server OK on", PORT);
});
