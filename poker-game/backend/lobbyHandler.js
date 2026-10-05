const { createRoom, startGame, handleAction } = require('./gameLogic');

const rooms = {};

function setupLobbySockets(io) {
    io.on('connection', (socket) => {
        socket.on('join_lobby', () => {
            socket.emit('room_list', Object.values(rooms).map(r => ({id: r.id, host: r.host, startingChips: r.startingChips})));
        });

        socket.on('create_room', (data) => {
            const room = createRoom(data.username, data.startingChips);
            rooms[room.id] = room;
            io.emit('room_list', Object.values(rooms).map(r => ({id: r.id, host: r.host, startingChips: r.startingChips})));
            socket.emit('room_created', room.id);
        });

        socket.on('join_room', (data) => {
            const room = rooms[data.roomId];
            if (room) {
                if (room.status === 'waiting' && !room.players.find(p => p.username === data.username)) {
                   room.players.push({
                        id: socket.id,
                        username: data.username,
                        chips: room.startingChips,
                        cards: [],
                        bet: 0,
                        folded: false
                   });
                }
                // if they reconnect, update their socket id
                let p = room.players.find(p => p.username === data.username);
                if (p) p.id = socket.id;

                socket.join(room.id);
                io.to(room.id).emit('room_update', sanitizeRoom(room, data.username));
                io.emit('room_list', Object.values(rooms).map(r => ({id: r.id, host: r.host, startingChips: r.startingChips})));
            }
        });

        socket.on('start_game', (data) => {
            const room = rooms[data.roomId];
            if (room && room.host === data.username && room.status === 'waiting') {
                if(startGame(room)) {
                    broadcastRoom(io, room);
                }
            }
        });

        socket.on('next_hand', (data) => {
            const room = rooms[data.roomId];
            if (room && room.status === 'finished') {
                startGame(room);
                broadcastRoom(io, room);
            }
        });

        socket.on('player_action', (data) => {
            const room = rooms[data.roomId];
            if (room && room.status === 'active') {
                const success = handleAction(room, data.username, data.action, data.amount);
                if (success) {
                    broadcastRoom(io, room);
                }
            }
        });

        socket.on('disconnect', () => {
            // Auto fold logic on disconnect
            for (let roomId in rooms) {
                let room = rooms[roomId];
                let pIndex = room.players.findIndex(p => p.id === socket.id);
                if (pIndex !== -1 && room.status === 'active' && room.currentTurn === pIndex) {
                    handleAction(room, room.players[pIndex].username, 'fold', 0);
                    broadcastRoom(io, room);
                }
            }
        });
    });
}

function broadcastRoom(io, room) {
    room.players.forEach(p => {
        io.to(p.id).emit('room_update', sanitizeRoom(room, p.username));
    });
}

function sanitizeRoom(room, reqUsername) {
    // Hide other players cards
    const sanitized = JSON.parse(JSON.stringify(room));
    sanitized.deck = undefined; // hide deck completely
    sanitized.players.forEach(p => {
        if (p.username !== reqUsername && sanitized.status !== 'finished') {
            p.cards = p.cards.length > 0 ? ['hidden', 'hidden'] : [];
        }
    });
    return sanitized;
}

module.exports = { setupLobbySockets, rooms };
