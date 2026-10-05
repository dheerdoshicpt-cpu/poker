const { createRoom } = require('./gameLogic');

const rooms = {};

function setupLobbySockets(io) {
    io.on('connection', (socket) => {
        socket.on('join_lobby', () => {
            socket.emit('room_list', Object.values(rooms));
        });

        socket.on('create_room', (data) => {
            const room = createRoom(data.username, data.startingChips);
            rooms[room.id] = room;
            io.emit('room_list', Object.values(rooms));
            socket.emit('room_created', room.id);
        });

        socket.on('join_room', (data) => {
            const room = rooms[data.roomId];
            if (room && room.status === 'waiting') {
                if (!room.players.find(p => p.username === data.username)) {
                   room.players.push({
                        id: socket.id,
                        username: data.username,
                        chips: room.startingChips,
                        cards: [],
                        bet: 0,
                        folded: false
                   });
                }
                socket.join(room.id);
                io.to(room.id).emit('room_update', room);
                io.emit('room_list', Object.values(rooms));
            }
        });
    });
}

module.exports = { setupLobbySockets, rooms };
