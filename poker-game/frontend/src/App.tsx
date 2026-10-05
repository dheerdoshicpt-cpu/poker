import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import axios from 'axios';
import './index.css';

const SOCKET_URL = 'http://localhost:3000';
let socket: Socket;

function Login({ setAuth }: { setAuth: any }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const endpoint = isRegister ? '/register' : '/login';
    try {
      const res = await axios.post(`http://localhost:3000${endpoint}`, { username, password });
      if (isRegister) {
        setIsRegister(false);
      } else {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('username', res.data.username);
        setAuth(res.data.username);
      }
    } catch (err) {
      alert('Error authenticating');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center text-white">
      <form onSubmit={handleSubmit} className="bg-gray-900 p-8 rounded border border-gray-700 w-80">
        <h2 className="text-2xl mb-4 font-bold text-center uppercase tracking-widest">{isRegister ? 'Register' : 'Login'}</h2>
        <input className="w-full bg-black border border-gray-700 p-2 mb-4 text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
        <input className="w-full bg-black border border-gray-700 p-2 mb-4 text-white placeholder-gray-500 focus:outline-none focus:border-white transition-colors" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <button className="w-full bg-white text-black p-2 font-bold hover:bg-gray-200 transition-colors">{isRegister ? 'Create Account' : 'Enter'}</button>
        <p className="mt-4 text-center text-sm text-gray-400 cursor-pointer hover:text-white" onClick={() => setIsRegister(!isRegister)}>
          {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
        </p>
      </form>
    </div>
  );
}

function Lobby({ username }: { username: string }) {
  const [rooms, setRooms] = useState<any[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    socket = io(SOCKET_URL);
    socket.emit('join_lobby');
    socket.on('room_list', (roomsData) => setRooms(roomsData));
    socket.on('room_created', (id) => navigate(`/room/${id}`));
    return () => { socket.disconnect(); };
  }, []);

  const createRoom = () => {
    const chips = prompt('Starting chips for room? (default 1000)', '1000');
    socket.emit('create_room', { username, startingChips: parseInt(chips || '1000') });
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-gray-800 pb-4">
          <h1 className="text-3xl font-bold uppercase tracking-widest">Lobby</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">User: <span className="text-white font-bold">{username}</span></span>
            <button onClick={createRoom} className="bg-white text-black px-4 py-2 font-bold hover:bg-gray-200 transition-colors">Create Room</button>
          </div>
        </div>
        
        <div className="grid gap-4">
          {rooms.length === 0 ? (
            <div className="text-center text-gray-600 py-10 border border-gray-800 rounded">No active rooms found.</div>
          ) : (
            rooms.map(room => (
              <div key={room.id} className="bg-gray-900 border border-gray-700 p-4 rounded flex justify-between items-center hover:border-gray-500 transition-colors">
                <div>
                  <h3 className="font-bold text-lg">Room {room.id}</h3>
                  <p className="text-sm text-gray-400">Host: {room.host} | Chips: {room.startingChips}</p>
                </div>
                <button 
                  onClick={() => navigate(`/room/${room.id}`)}
                  className="bg-transparent border border-white text-white px-6 py-2 hover:bg-white hover:text-black transition-colors"
                >
                  Join
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function Card({ cardStr }: { cardStr: string }) {
  if (!cardStr || cardStr === 'hidden') return (
    <div className="w-10 h-14 sm:w-12 sm:h-16 bg-gray-700 border-2 border-gray-500 rounded flex items-center justify-center m-1 shadow-lg">
      <div className="w-8 h-12 bg-gray-800 rounded-sm"></div>
    </div>
  );

  const value = cardStr[0];
  const suit = cardStr[1];
  
  let suitIcon = '';
  let colorClass = 'text-white';
  
  if (suit === 'h') { suitIcon = '♥'; colorClass = 'text-white'; }
  if (suit === 'd') { suitIcon = '♦'; colorClass = 'text-white'; }
  if (suit === 'c') { suitIcon = '♣'; colorClass = 'text-gray-400'; }
  if (suit === 's') { suitIcon = '♠'; colorClass = 'text-gray-400'; }
  
  return (
    <div className={`w-10 h-14 sm:w-12 sm:h-16 bg-white rounded flex items-center justify-center m-1 shadow-lg border border-gray-400 ${colorClass}`}>
      <span className="text-xl sm:text-2xl font-bold">{value}{suitIcon}</span>
    </div>
  );
}

function GameRoom({ username }: { username: string }) {
  const { id } = useParams();
  const [room, setRoom] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    socket = io(SOCKET_URL);
    socket.emit('join_room', { roomId: id, username });
    
    socket.on('room_update', (data) => {
      setRoom(data);
    });

    return () => { socket.disconnect(); };
  }, [id, username]);

  if (!room) return <div className="min-h-screen bg-black text-white p-6">Loading...</div>;

  const handleAction = (action: string, amount: number = 0) => {
    socket.emit('player_action', { roomId: id, username, action, amount });
  };

  const startGame = () => {
    socket.emit('start_game', { roomId: id, username });
  };

  const nextHand = () => {
    socket.emit('next_hand', { roomId: id, username });
  };

  const myPlayerIndex = room.players.findIndex((p: any) => p.username === username);
  const myPlayer = myPlayerIndex !== -1 ? room.players[myPlayerIndex] : null;
  const isMyTurn = room.status === 'active' && room.currentTurn === myPlayerIndex;
  
  const toCall = myPlayer ? Math.max(0, room.currentBet - myPlayer.bet) : 0;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center">
      
      {/* Header */}
      <div className="w-full flex justify-between p-4 border-b border-gray-800">
        <div className="font-bold tracking-widest uppercase">Room {id}</div>
        <button className="text-gray-400 hover:text-white" onClick={() => navigate('/')}>Leave</button>
      </div>

      {/* Main Table Area */}
      <div className="flex-grow flex flex-col items-center justify-center w-full max-w-4xl p-4">
        
        {/* Pot & Board */}
        <div className="bg-gray-900 border border-gray-700 w-full md:w-2/3 h-48 md:h-64 rounded-full flex flex-col items-center justify-center relative mb-8">
            <div className="text-gray-400 text-sm uppercase tracking-widest mb-2">Pot</div>
            <div className="text-3xl font-bold mb-4">{room.pot}</div>
            
            <div className="flex">
              {room.board.map((card: string, i: number) => <Card key={i} cardStr={card} />)}
            </div>
        </div>

        {/* Players */}
        <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-4 mb-20">
          {room.players.map((p: any, i: number) => (
            <div key={p.username} className={`p-3 rounded border ${room.currentTurn === i && room.status === 'active' ? 'border-white bg-gray-800' : 'border-gray-800 bg-black'} ${p.folded ? 'opacity-50' : ''}`}>
              <div className="flex justify-between mb-2">
                <span className="font-bold truncate">{p.username}</span>
                <span className="text-gray-400">{p.chips}</span>
              </div>
              <div className="flex justify-center mb-2 h-16">
                 {p.cards.map((c: string, ci: number) => <Card key={ci} cardStr={c} />)}
              </div>
              <div className="text-center text-sm text-gray-500 h-5">
                {p.bet > 0 ? `Bet: ${p.bet}` : ''}
                {p.folded ? 'Folded' : ''}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Action Bar (Fixed at bottom for mobile) */}
      <div className="fixed bottom-0 w-full bg-gray-900 border-t border-gray-700 p-4">
        <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-2 md:gap-4 items-center">
            
            {room.status === 'waiting' && room.host === username && (
              <button onClick={startGame} className="bg-white text-black px-6 py-3 font-bold hover:bg-gray-200">Start Game</button>
            )}

            {room.status === 'finished' && room.host === username && (
              <button onClick={nextHand} className="bg-white text-black px-6 py-3 font-bold hover:bg-gray-200">Next Hand</button>
            )}

            {room.status === 'active' && isMyTurn && (
              <>
                <button onClick={() => handleAction('fold')} className="border border-gray-500 text-gray-300 px-4 py-2 hover:bg-gray-800">Fold</button>
                <button onClick={() => handleAction(toCall > 0 ? 'call' : 'check')} className="border border-white text-white px-6 py-2 hover:bg-white hover:text-black">
                  {toCall > 0 ? `Call ${toCall}` : 'Check'}
                </button>
                <button 
                  onClick={() => {
                    const r = parseInt(prompt(`Raise to total amount? (Min: ${room.currentBet * 2})`, (room.currentBet * 2).toString()) || '0');
                    if(r > room.currentBet) handleAction('raise', r - room.currentBet);
                  }}
                  className="bg-white text-black px-4 py-2 font-bold hover:bg-gray-200">Raise</button>
              </>
            )}

            {(!isMyTurn || room.status !== 'active') && myPlayer && (
              <div className="text-gray-500">Waiting for turn...</div>
            )}
            
        </div>
      </div>
      
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(localStorage.getItem('username') || '');

  if (!auth) return <Login setAuth={setAuth} />;

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Lobby username={auth} />} />
        <Route path="/room/:id" element={<GameRoom username={auth} />} />
      </Routes>
    </Router>
  );
}
