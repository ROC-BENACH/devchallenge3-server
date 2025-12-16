const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 10000;

// ================== CONFIG ==================
const MAX_ROUNDS = 3;
const VALID_HEIGHTS = ["baixa", "mitjana", "alta"];
const VALID_DIRECTIONS = ["esquerra", "centre", "dreta"];

// ================== ESTADO ==================
let waitingPlayer = null; // { token }
let games = new Map(); // gameId -> gameState

// ================== UTILS ==================
function isValidMove(move) {
  if (!move) return false;
  const { shot, save } = move;

  return (
    shot &&
    save &&
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

// ================== ENDPOINTS ==================

// -------- JOIN --------
app.post("/join", (req, res) => {
  const playerToken = crypto.randomUUID();

  // Si hay alguien esperando -> crear partida
  if (waitingPlayer) {
    const gameId = crypto.randomUUID();

    games.set(gameId, {
      gameId,
      round: 1,
      maxRounds: MAX_ROUNDS,
      scores: { p1: 0, p2: 0 },
      players: {
        p1: waitingPlayer.token,
        p2: playerToken
      },
      moves: { p1: null, p2: null },
      status: "playing"
    });

    waitingPlayer = null;

    return res.json({
      status: "matched",
      player: 2,
      playerToken,
      gameId
    });
  }

  // Si no hay nadie esperando -> esperar
  waitingPlayer = { token: playerToken };

  res.json({
    status: "waiting",
    player: 1,
    playerToken,
    gameId: null
  });
});

// -------- GAME STATE --------
app.get("/game-state", (req, res) => {
  const { gameId, playerToken } = req.query;

  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: "Partida no encontrada" });

  const isP1 = game.players.p1 === playerToken;
  const isP2 = game.players.p2 === playerToken;

  if (!isP1 && !isP2)
    return res.status(403).json({ error: "No perteneces a esta partida" });

  res.json({
    status: game.status,
    round: game.round,
    maxRounds: game.maxRounds,
    p1Points: game.scores.p1,
    p2Points: game.scores.p2,
    yourMoveDone: isP1 ? !!game.moves.p1 : !!game.moves.p2
  });
});

// -------- MOVE --------
app.post("/move", (req, res) => {
  const { gameId, playerToken, shot, save } = req.body;

  const game = games.get(gameId);
  if (!game) return res.status(404).json({ error: "Partida no encontrada" });

  let playerKey = null;
  if (game.players.p1 === playerToken) playerKey = "p1";
  if (game.players.p2 === playerToken) playerKey = "p2";

  if (!playerKey)
    return res.status(403).json({ error: "No perteneces a esta partida" });

  const move = { shot, save };
  if (!isValidMove(move))
    return res.status(400).json({
      error: "Movimiento inválido",
      validHeights: VALID_HEIGHTS,
      validDirections: VALID_DIRECTIONS
    });

  if (game.moves[playerKey])
    return res.status(400).json({ error: "Ya has jugado esta ronda" });

  game.moves[playerKey] = move;

  // Esperar al otro jugador
  if (!game.moves.p1 || !game.moves.p2) {
    return res.json({
      status: "waiting",
      message: "Esperando al otro jugador"
    });
  }

  // Calcular puntos
  const p1Points = calculatePoints(game.moves.p2.shot, game.moves.p1.save);
  const p2Points = calculatePoints(game.moves.p1.shot, game.moves.p2.save);

  game.scores.p1 += p1Points;
  game.scores.p2 += p2Points;

  // Siguiente ronda o fin
  if (game.round >= game.maxRounds) {
    game.status = "game_over";

    let winner = "draw";
    if (game.scores.p1 > game.scores.p2) winner = "player1";
    if (game.scores.p2 > game.scores.p1) winner = "player2";

    return res.json({
      status: "game_over",
      p1Points: game.scores.p1,
      p2Points: game.scores.p2,
      winner
    });
  }

  game.round++;
  game.moves = { p1: null, p2: null };
  game.status = "playing";

  res.json({
    status: "round_finished",
    p1Points: game.scores.p1,
    p2Points: game.scores.p2,
    nextRound: game.round
  });
});

// -------- RESET (debug) --------
app.post("/reset", (req, res) => {
  waitingPlayer = null;
  games.clear();

  res.json({
    status: "reset",
    message: "Servidor reiniciado"
  });
});

// ================== START ==================
app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});

