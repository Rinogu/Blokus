const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static(__dirname + '/public'));

// --- ゲームの世界の記憶 ---
let gameState = {
    board: Array(20).fill().map(() => Array(20).fill(0)),
    turn: 1,
    maxPlayers: 4,
    activePlayers: [1, 2, 3, 4], // パスしていないプレイヤーのリスト
    inventories: {
        1: Array.from({length: 21}, (_, i) => i), // 0番〜20番のピースを持っているという記憶
        2: Array.from({length: 21}, (_, i) => i),
        3: Array.from({length: 21}, (_, i) => i),
        4: Array.from({length: 21}, (_, i) => i)
    }
};

function getNextTurn(current) {
    if (gameState.activePlayers.length === 0) return 0; // 全員パスならゲーム終了（ターン0）
    let currentIndex = gameState.activePlayers.indexOf(current);
    if (currentIndex === -1) currentIndex = 0;
    
    // 次のプレイヤーを探す
    let nextIndex = (currentIndex + 1) % gameState.activePlayers.length;
    return gameState.activePlayers[nextIndex];
}

io.on('connection', (socket) => {
    // 接続した人に今の状態を渡す
    socket.emit('update_all', gameState);

    // --- ゲーム設定の変更 ---
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

    // --- ピースを置いた時 ---
    socket.on('place_piece', (data) => {
        if (data.player !== gameState.turn) return;

        // 盤面を更新
        for (let r = 0; r < data.piece.length; r++) {
            for (let c = 0; c < data.piece[r].length; c++) {
                if (data.piece[r][c] === 1) {
                    gameState.board[data.y + r][data.x + c] = data.player;
                }
            }
        }

        // 使ったピースをサーバーの記憶からも消す
        gameState.inventories[data.player] = gameState.inventories[data.player].filter(idx => idx !== data.pieceIndex);

        // 次の人の番へ
        gameState.turn = getNextTurn(gameState.turn);
        io.emit('update_all', gameState);
    });

    // --- パスした時 ---
    socket.on('pass_turn', (player) => {
        // パスした人をリストから除外
        gameState.activePlayers = gameState.activePlayers.filter(p => p !== player);
        gameState.turn = getNextTurn(gameState.turn);
        io.emit('update_all', gameState);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`listening on *:${PORT}`);
});