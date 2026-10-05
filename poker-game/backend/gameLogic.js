const Hand = require('pokersolver').Hand;

function createDeck() {
    const suits = ['h', 'd', 'c', 's'];
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    let deck = [];
    for (let s of suits) {
        for (let v of values) {
            deck.push(v + s);
        }
    }
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}

function createRoom(hostUsername, startingChips) {
    return {
        id: Math.random().toString(36).substring(2, 8),
        host: hostUsername,
        players: [],
        status: 'waiting', // waiting, active, finished
        startingChips: startingChips || 1000,
        pot: 0,
        board: [],
        deck: [],
        currentTurn: 0,
        dealerPos: 0,
        minBet: 20,
        currentBet: 0,
        stage: 'preflop' // preflop, flop, turn, river, showdown
    };
}

function startGame(room) {
    if (room.players.length < 2) return false;
    room.status = 'active';
    room.deck = createDeck();
    room.board = [];
    room.pot = 0;
    room.currentBet = room.minBet;
    room.stage = 'preflop';
    
    // reset players
    room.players.forEach(p => {
        p.cards = [room.deck.pop(), room.deck.pop()];
        p.bet = 0;
        p.folded = false;
    });

    room.dealerPos = (room.dealerPos + 1) % room.players.length;
    
    // blinds
    let sbPos = (room.dealerPos + 1) % room.players.length;
    let bbPos = (room.dealerPos + 2) % room.players.length;
    
    room.players[sbPos].chips -= room.minBet / 2;
    room.players[sbPos].bet = room.minBet / 2;
    
    room.players[bbPos].chips -= room.minBet;
    room.players[bbPos].bet = room.minBet;
    
    room.pot = room.minBet * 1.5;
    room.currentTurn = (bbPos + 1) % room.players.length;
    return true;
}

function nextStage(room) {
    room.players.forEach(p => p.bet = 0);
    room.currentBet = 0;
    room.currentTurn = (room.dealerPos + 1) % room.players.length;
    
    // check if current turn player folded, if so advance
    while(room.players[room.currentTurn].folded) {
        room.currentTurn = (room.currentTurn + 1) % room.players.length;
    }

    if (room.stage === 'preflop') {
        room.stage = 'flop';
        room.board.push(room.deck.pop(), room.deck.pop(), room.deck.pop());
    } else if (room.stage === 'flop') {
        room.stage = 'turn';
        room.board.push(room.deck.pop());
    } else if (room.stage === 'turn') {
        room.stage = 'river';
        room.board.push(room.deck.pop());
    } else if (room.stage === 'river') {
        room.stage = 'showdown';
        evaluateWinners(room);
    }
}

function handleAction(room, username, action, amount) {
    const playerIndex = room.players.findIndex(p => p.username === username);
    if (playerIndex !== room.currentTurn) return false;

    const player = room.players[playerIndex];

    if (action === 'fold') {
        player.folded = true;
    } else if (action === 'call' || action === 'check') {
        const toCall = room.currentBet - player.bet;
        const actualCall = Math.min(toCall, player.chips);
        player.chips -= actualCall;
        player.bet += actualCall;
        room.pot += actualCall;
    } else if (action === 'raise') {
        const totalBet = room.currentBet + amount;
        const toAdd = totalBet - player.bet;
        if (toAdd > player.chips) return false; // Not enough chips
        player.chips -= toAdd;
        player.bet += toAdd;
        room.pot += toAdd;
        room.currentBet = totalBet;
    }

    // Move to next active player
    let nextTurn = (room.currentTurn + 1) % room.players.length;
    let activePlayers = room.players.filter(p => !p.folded);
    
    if (activePlayers.length === 1) {
        // Everyone folded, this guy wins
        activePlayers[0].chips += room.pot;
        room.status = 'finished';
        return true;
    }

    // Check if stage is complete (everyone active has called the current bet or is all in)
    let stageComplete = activePlayers.every(p => p.bet === room.currentBet || p.chips === 0);

    if (stageComplete && action !== 'fold' && room.currentBet > 0 && player.bet === room.currentBet) {
       // if all called and we cycled back
       nextStage(room);
    } else {
        while (room.players[nextTurn].folded || room.players[nextTurn].chips === 0) {
            nextTurn = (nextTurn + 1) % room.players.length;
            // safeguard infinite loop handled by activePlayers check
        }
        room.currentTurn = nextTurn;
    }

    return true;
}

function evaluateWinners(room) {
    const activePlayers = room.players.filter(p => !p.folded);
    const hands = activePlayers.map(p => {
        // Convert to format pokersolver likes
        const cards = [...p.cards, ...room.board];
        return Hand.solve(cards);
    });

    const winners = Hand.winners(hands);
    
    // find which players have the winning hand
    const winningPlayers = activePlayers.filter((p, index) => {
        return winners.includes(hands[index]);
    });

    const splitPot = Math.floor(room.pot / winningPlayers.length);
    winningPlayers.forEach(p => {
        p.chips += splitPot;
    });

    room.status = 'finished';
}

module.exports = { createRoom, startGame, handleAction };
