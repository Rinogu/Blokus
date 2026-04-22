const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

let gameState = {
    board: Array(20).fill().map(() => Array(20).fill(0)),
    turn: 1,
    maxPlayers: 4,
    activePlayers: [1, 2, 3, 4],
    inventories: {
        1: Array.from({length: 21}, (_, i) => i),
        2: Array.from({length: 21}, (_, i) => i),
        3: Array.from({length: 21}, (_, i) => i),
        4: Array.from({length: 21}, (_, i) => i)
    }
};

function getNextTurn(currentTurn, passedPlayer = null) {
    let tempPlayers = [...gameState.activePlayers];
    if (tempPlayers.length === 0) return 0;

    let currentIndex = tempPlayers.indexOf(currentTurn);
    if (currentIndex === -1) currentIndex = 0;

    let nextIndex = (currentIndex + 1) % tempPlayers.length;
    let nextPlayer = tempPlayers[nextIndex];

    if (passedPlayer !== null) {
        gameState.activePlayers = gameState.activePlayers.filter(p => p !== passedPlayer);
    }

    if (gameState.activePlayers.length === 0) return 0;

    if (nextPlayer === passedPlayer) {
        return gameState.activePlayers[0];
    }

    return nextPlayer;
}

io.on('connection', (socket) => {
    socket.emit('update_all', gameState);

    socket.on('start_game', (max) => {
        gameState.maxPlayers = max;
        gameState.activePlayers = [];
        for(let i=1; i<=max; i++) gameState.activePlayers.push(i);
        gameState.turn = 1;
        gameState.board = Array(20).fill().map(() => Array(20).fill(0));
        gameState.inventories = {
            1: Array.from({length: 21}, (_, i) => i),
            2: Array.from({length: 21}, (_, i) => i),
            3: Array.from({length: 21}, (_, i) => i),
            4: Array.from({length: 21}, (_, i) => i)
        };
        io.emit('update_all', gameState);
    });

    socket.on('place_piece', (data) => {
        if (data.player !== gameState.turn) return;

        for (let r = 0; r < data.piece.length; r++) {
            for (let c = 0; c < data.piece[r].length; c++) {
                if (data.piece[r][c] === 1) {
                    gameState.board[data.y + r][data.x + c] = data.player;
                }
            }
        }

        gameState.inventories[data.player] = gameState.inventories[data.player].filter(idx => idx !== data.pieceIndex);

        gameState.turn = getNextTurn(gameState.turn);
        io.emit('update_all', gameState);
    });

    socket.on('pass_turn', (player) => {
        if (player !== gameState.turn) return; 
        
        gameState.turn = getNextTurn(gameState.turn, player);
        io.emit('update_all', gameState);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});