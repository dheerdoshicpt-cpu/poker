function createRoom(hostUsername, startingChips) {
    return {
        id: Math.random().toString(36).substring(2, 8),
        host: hostUsername,
        players: [],
        status: 'waiting', // waiting, active
        startingChips: startingChips || 1000,
        pot: 0,
        board: [],
        deck: [],
        currentTurn: 0,
        dealerPos: 0,
        minBet: 20
    };
}

module.exports = { createRoom };
