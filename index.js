const WebSocket = require('ws');
const http = require('http');

const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Penaltis Game Server');
});

const wss = new WebSocket.Server({ server });

const games = new Map();

function generateGameId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on('connection', (ws, req) => {
    console.log('New connection');
    let currentGameId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received:', data);

            switch (data.type) {
                case 'CREATE':
                    const gameId = generateGameId();
                    games.set(gameId, {
                        p1: ws,
                        p2: null,
                        p1Name: data.username || 'Player 1',
                        p2Name: null,
                        p1Move: null,
                        p2Move: null,
                        p1Score: 0,
                        p2Score: 0,
                        shotsTaken: { p1: 0, p2: 0 },
                        currentShooter: 'p1', // p1 starts shooting
                        round: 1,
                        isSuddenDeath: false
                    });
                    currentGameId = gameId;
                    ws.send(JSON.stringify({ type: 'GAME_CREATED', gameId: gameId }));
                    console.log(`Game created: ${gameId} by ${data.username}`);
                    break;

                case 'JOIN':
                    const id = data.gameId;
                    const game = games.get(id);
                    if (game && !game.p2) {
                        game.p2 = ws;
                        game.p2Name = data.username || 'Player 2';
                        currentGameId = id;
                        
                        // Notify both players
                        startGame(game, id);
                        console.log(`Game started: ${id}. ${game.p1Name} vs ${game.p2Name}`);
                    } else {
                        ws.send(JSON.stringify({ type: 'ERROR', message: 'Game not found or full' }));
                    }
                    break;

                case 'MOVE':
                    if (currentGameId) {
                        const g = games.get(currentGameId);
                        if (g) {
                            if (ws === g.p1) {
                                g.p1Move = { height: data.height, direction: data.direction };
                                if (g.p2) g.p2.send(JSON.stringify({ type: 'OPPONENT_MOVED' }));
                            } else if (ws === g.p2) {
                                g.p2Move = { height: data.height, direction: data.direction };
                                if (g.p1) g.p1.send(JSON.stringify({ type: 'OPPONENT_MOVED' }));
                            }

                            // Check if both moved
                            if (g.p1Move && g.p2Move) {
                                processResult(g, currentGameId);
                            }
                        }
                    }
                    break;
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('close', () => {
        console.log('Connection closed');
        if (currentGameId) {
            const g = games.get(currentGameId);
            if (g) {
                // Notify other player?
                if (ws === g.p1 && g.p2) g.p2.close();
                if (ws === g.p2 && g.p1) g.p1.close();
                games.delete(currentGameId);
            }
        }
    });
});

function startGame(game, gameId) {
    // Determine roles based on currentShooter
    const p1Role = game.currentShooter === 'p1' ? 'SHOOTER' : 'KEEPER';
    const p2Role = game.currentShooter === 'p2' ? 'SHOOTER' : 'KEEPER';

    game.p1.send(JSON.stringify({ 
        type: 'GAME_STARTED', 
        role: p1Role,
        round: game.round,
        p1Score: game.p1Score,
        p2Score: game.p2Score,
        p1Name: game.p1Name,
        p2Name: game.p2Name
    }));
    game.p2.send(JSON.stringify({ 
        type: 'GAME_STARTED', 
        role: p2Role,
        round: game.round,
        p1Score: game.p1Score,
        p2Score: game.p2Score,
        p1Name: game.p1Name,
        p2Name: game.p2Name
    }));
}

function processResult(game, gameId) {
    const shooter = game.currentShooter === 'p1' ? game.p1 : game.p2;
    const keeper = game.currentShooter === 'p1' ? game.p2 : game.p1;
    
    const shooterMove = game.currentShooter === 'p1' ? game.p1Move : game.p2Move;
    const keeperMove = game.currentShooter === 'p1' ? game.p2Move : game.p1Move;

    console.log(`Processing result for ${gameId}: Shooter(${game.currentShooter}) ${JSON.stringify(shooterMove)} vs Keeper ${JSON.stringify(keeperMove)}`);

    let keeperPoints = 0;
    let isGoal = true;

    if (shooterMove.height === keeperMove.height && shooterMove.direction === keeperMove.direction) {
        keeperPoints = 2;
        isGoal = false; // Saved!
    } else if (shooterMove.height === keeperMove.height || shooterMove.direction === keeperMove.direction) {
        keeperPoints = 1;
        isGoal = true; // Goal, but keeper gets 1 point
    } else {
        keeperPoints = 0;
        isGoal = true; // Goal, keeper gets 0 points
    }

    // Add points to the KEEPER
    if (game.currentShooter === 'p1') {
        // P1 is shooter, P2 is keeper
        game.p2Score += keeperPoints;
    } else {
        // P2 is shooter, P1 is keeper
        game.p1Score += keeperPoints;
    }

    // Increment shots taken for the shooter
    game.shotsTaken[game.currentShooter]++;

    const resultMsg = {
        type: 'RESULT',
        isGoal: isGoal,
        p1Score: game.p1Score,
        p2Score: game.p2Score,
        shooter: game.currentShooter === 'p1' ? game.p1Name : game.p2Name,
        p1Name: game.p1Name,
        p2Name: game.p2Name
    };

    game.p1.send(JSON.stringify(resultMsg));
    game.p2.send(JSON.stringify(resultMsg));

    // Reset moves
    game.p1Move = null;
    game.p2Move = null;

    // Check Win Condition
    const winner = checkWinCondition(game);

    if (winner) {
        const gameOverMsg = {
            type: 'GAME_OVER',
            winner: winner,
            p1Score: game.p1Score,
            p2Score: game.p2Score,
            p1Name: game.p1Name,
            p2Name: game.p2Name
        };
        setTimeout(() => {
            game.p1.send(JSON.stringify(gameOverMsg));
            game.p2.send(JSON.stringify(gameOverMsg));
            games.delete(gameId);
        }, 2000);
    } else {
        // Prepare next round
        game.currentShooter = game.currentShooter === 'p1' ? 'p2' : 'p1';
        game.round++;

        setTimeout(() => {
            startGame(game, gameId);
        }, 2000);
    }
}

function checkWinCondition(game) {
    const p1Shots = game.shotsTaken.p1;
    const p2Shots = game.shotsTaken.p2;
    const p1Score = game.p1Score;
    const p2Score = game.p2Score;

    // Phase 1: First 5 shots each
    if (p1Shots < 5 || p2Shots < 5) {
        // Check mathematical impossibility
        // P1 gets points when P2 shoots (P1 is keeper)
        // P2 gets points when P1 shoots (P2 is keeper)
        
        // Remaining shots for P1 (opportunities for P2 to get points)
        const p1RemainingShots = 5 - p1Shots;
        // Remaining shots for P2 (opportunities for P1 to get points)
        const p2RemainingShots = 5 - p2Shots;

        const maxPointsForP1 = p2RemainingShots * 2;
        const maxPointsForP2 = p1RemainingShots * 2;

        if (p1Score > p2Score + maxPointsForP2) return game.p1Name;
        if (p2Score > p1Score + maxPointsForP1) return game.p2Name;
        
        return null; // Continue
    }

    // End of 5 shots each
    if (p1Shots === 5 && p2Shots === 5) {
        if (p1Score > p2Score) return game.p1Name;
        if (p2Score > p1Score) return game.p2Name;
        // Tie -> Sudden Death
        game.isSuddenDeath = true;
        return null;
    }

    // Phase 2: Sudden Death
    // We only check after both have taken the same number of shots (end of a round)
    if (game.isSuddenDeath && p1Shots === p2Shots) {
        if (p1Score > p2Score) return game.p1Name;
        if (p2Score > p1Score) return game.p2Name;
    }

    return null;
}

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`WebSocket Server running on port ${PORT}`);
});
