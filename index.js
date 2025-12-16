import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

let waitingGame = null;

app.get("/", (req, res) => {
  res.send("DevChallenge3 server OK");
});

// 🔥 AQUESTA ÉS LA RUTA QUE FALTA
app.get("/join", (req, res) => {
  if (!waitingGame) {
    waitingGame = {
      gameId: Date.now().toString(),
      players: 1
    };

    return res.json({
      gameId: waitingGame.gameId,
      role: "player1",
      status: "waiting"
    });
  } else {
    const game = waitingGame;
    waitingGame = null;

    return res.json({
      gameId: game.gameId,
      role: "player2",
      status: "ready"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
