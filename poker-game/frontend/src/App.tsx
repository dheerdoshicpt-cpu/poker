import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
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

function GameRoom({ username }: { username: string }) {
  // Placeholder for now
  return <div className="min-h-screen bg-black text-white p-6">Game Room logic building next...</div>;
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
