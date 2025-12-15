const express = require('express');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

// Estat del joc en memòria
let players = [];
let moves = {};
let score = { p1: 0, p2: 0 };
let round = 0;

// Endpoint per unir-se al joc
app.post('/join', (req, res) => {
  if (players.length >= 2) {
    return res.status(400).json({ error: 'Ja hi ha dos jugadors' });
  }

  const playerNumber = players.length + 1;
  players.push(playerNumber);

  res.json({ player: playerNumber });
});

// Endpoint per fer una jugada
app.post('/move', (req, res) => {
  const { player, shot, save } = req.body;

  if (!player || !shot || !save) {
    return res.status(400).json({ error: 'Dades incompletes' });
  }

  moves[player] = { shot, save };

  // Esperem els dos jugadors
  if (!moves[1] || !moves[2]) {
    return res.json({ status: 'Esperando al otro jugador...' });
  }

  // Resolució de la ronda
  round++;

  const p1Shot = moves[1].shot;
  const p2Save = moves[2].save;

  const p2Shot = moves[2].shot;
  const p1Save = moves[1].save;

  if (p1Shot.height !== p2Save.height || p1Shot.direction !== p2Save.direction) {
    score.p1++;
  }

  if (p2Shot.height !== p1Save.height || p2Shot.direction !== p1Save.direction) {
    score.p2++;
  }

  // Reset moviments per la següent ronda
  moves = {};

  let winner = null;
  if (round >= 1) {
    if (score.p1 > score.p2) winner = 'player 1';
    else if (score.p2 > score.p1) winner = 'player 2';
    else winner = 'draw';
  }

  res.json({
    p1Points: score.p1,
    p2Points: score.p2,
    winner
  });
});

// Port dinàmic per Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
