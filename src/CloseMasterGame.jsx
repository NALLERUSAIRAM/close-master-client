import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const SERVERURL = 'https://close-master-server-production.up.railway.app';
const MAXPLAYERS = 7;

const GIFLIST = [
  { id: 'laugh', name: 'Laugh', file: 'gifsLaugh.gif' },
  { id: 'husky', name: 'Husky', file: 'gifsHusky.gif' },
  { id: 'monkey', name: 'Monkey', file: 'gifsmonkeyclap.gif' },
  { id: 'horse', name: 'Horse', file: 'gifsHorserun.gif' }
];

const FACELIST = [
  'gifs1.png', 'gifs2.png', 'gifs3.png', 'gifs4.png',
  'gifs5.png', 'gifs6.png', 'gifs7.png'
];

function cardTextColor(card) {
  if (!card) return 'text-white font-bold';
  if (card.rank === 'JOKER') return 'text-yellow-200 font-extrabold shadow-[0_0_20px_rgba(255,255,150,0.8)]';
  if (card.suit === '♥' || card.suit === '♦') return 'text-red-400 font-bold shadow-[0_0_20px_rgba(255,100,100,0.8)]';
  return 'text-cyan-300 font-bold shadow-[0_0_20px_rgba(100,200,255,0.8)]';
}

function NeonFloatingCards() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-[1]">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-16 h-24 rounded-3xl border border-white/20 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.6)] animate-pulse"
          style={{
            left: `${5 + Math.random() * 90}%`,
            top: `${10 + Math.random() * 80}%`,
            animationDelay: `${Math.random() * 10}s`,
            background: 'rgba(255,255,255,0.05)'
          }}
        />
      ))}
    </div>
  );
}

function getRoundPointsForPlayer(p, baseScores) {
  if (!p) return 0;
  const total = typeof p.score === 'number' ? p.score : 0;
  const base = typeof baseScores[p.id] === 'number' ? baseScores[p.id] : 0;
  return total - base > 0 ? 0 : total - base;
}

export default function CloseMasterGame() {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState('welcome');
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [game, setGame] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFace, setSelectedFace] = useState('');
  const [turnTimeLeft, setTurnTimeLeft] = useState(20);
  const turnTimerRef = useRef(null);
  const [showGifPickerFor, setShowGifPickerFor] = useState(null);
  const [activeReactions, setActiveReactions] = useState({});
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [winnerName, setWinnerName] = useState('');
  const [roundBaseScores, setRoundBaseScores] = useState({});
  const prevStartedRef = useRef(false);

  const [playerId] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        let id = localStorage.getItem('cmp-playerid');
        if (!id) {
          id = window.crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
          localStorage.setItem('cmp-playerid', id);
        }
        return id;
      } catch {
        return 'unknown';
      }
    }
    return 'unknown';
  });

  useEffect(() => {
    const storedName = localStorage.getItem('cmp-playername');
    if (storedName) setPlayerName(storedName);
  }, []);

  useEffect(() => {
    const s = io(SERVERURL, {
      transports: ['websocket'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: Infinity
    });

    s.on('connect', () => {
      console.log('Connected');
      const roomId = localStorage.getItem('cmp-roomid');
      const name = localStorage.getItem('cmp-playername');
      if (roomId && name) {
        setTimeout(() => s.emit('rejoin-room', { roomId, name, playerId }), 500);
      }
    });

    s.on('game-state', (state) => {
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setScreen(state.started ? 'game' : 'lobby');
      setLoading(false);
    });

    s.on('rejoin-success', (state) => {
      setGame(state);
      setScreen(state.started ? 'game' : 'lobby');
    });

    s.on('gif-play', (targetId, gifId) => {
      if (!targetId || !gifId) return;
      setActiveReactions(prev => {
        const copy = { ...prev, [targetId]: gifId };
        setTimeout(() => {
          setActiveReactions(p => {
            const c = { ...p };
            delete c[targetId];
            return c;
          });
        }, 4000);
        return copy;
      });
    });

    setSocket(s);
    return () => s.disconnect();
  }, [playerId]);

  useEffect(() => {
    if (game?.roomId && playerName) {
      localStorage.setItem('cmp-roomid', game.roomId);
      localStorage.setItem('cmp-playername', playerName);
    }
  }, [game?.roomId, playerName]);

  useEffect(() => {
    const startedNow = !!game?.started;
    if (startedNow && !prevStartedRef.current) {
      const base = {};
      game.players?.forEach(p => {
        base[p.id] = typeof p.score === 'number' ? p.score : 0;
      });
      setRoundBaseScores(base);
    }
    prevStartedRef.current = startedNow;
  }, [game?.started, game?.players]);

  useEffect(() => {
    if (!game?.closeCalled) return;
    const closer = game.players[game.currentIndex || 0];
    setWinnerName(closer?.name || 'Winner');
    setShowResultOverlay(true);
  }, [game?.closeCalled]);

  // Turn timer logic
  useEffect(() => {
    const started = !!game?.started;
    const currentPlayer = game?.players[game?.currentIndex || 0];
    const isMyTurn = started && currentPlayer?.id === game?.youId;

    if (!started || !currentPlayer) {
      setTurnTimeLeft(20);
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      return;
    }

    if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    setTurnTimeLeft(20);

    turnTimerRef.current = setInterval(() => {
      setTurnTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(turnTimerRef.current);
          if (isMyTurn && socket && game?.roomId) {
            socket.emit('turn-timeout', { roomId: game.roomId });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, [game?.started, game?.currentIndex, game?.youId]);

  const roomId = game?.roomId;
  const youId = game?.youId;
  const players = game?.players || [];
  const discardTop = game?.discardTop;
  const currentIndex = game?.currentIndex ?? 0;
  const started = game?.started;
  const currentPlayer = players[currentIndex];
  const myTurn = started && currentPlayer?.id === youId;
  const me = players.find(p => p.id === youId);
  const hasDrawn = me?.hasDrawn || false;
  const selectedCards = me ? me.hand.filter(c => selectedIds.includes(c.id)) : [];
  const allowDrop = selectedCards.length > 0 && myTurn;
  const closeDisabled = !myTurn || hasDrawn || (discardTop?.rank !== '7');

  const createRoom = () => {
    if (!socket || !playerName.trim() || !selectedFace) {
      alert('Name and face select cheyali!');
      return;
    }
    setLoading(true);
    socket.emit('create-room', { name: playerName.trim(), playerId, face: selectedFace });
  };

  const joinRoom = () => {
    if (!socket || !playerName.trim() || !joinCode.trim() || !selectedFace) {
      alert('Name, Room ID and face select cheyali!');
      return;
    }
    setLoading(true);
    socket.emit('join-room', { 
      name: playerName.trim(), 
      roomId: joinCode.toUpperCase().trim(), 
      playerId, 
      face: selectedFace 
    });
  };

  const startRound = () => {
    if (!socket || !roomId || !isHost || players.length < 2) return;
    socket.emit('start-round', { roomId });
  };

  const drawCard = (fromDiscard = false) => {
    if (!socket || !roomId || !myTurn) return;
    socket.emit('action-draw', { roomId, fromDiscard });
  };

  const dropCards = () => {
    if (!socket || !roomId || !myTurn || !allowDrop) return;
    socket.emit('action-drop', { roomId, selectedIds });
  };

  const callClose = () => {
    if (!socket || !roomId || !myTurn) return;
    if (!confirm('CLOSE cheyala?')) return;
    socket.emit('action-close', { roomId });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const exitGame = () => {
    if (confirm('Game exit cheyala?')) {
      localStorage.removeItem('cmp-roomid');
      socket?.disconnect();
      setScreen('welcome');
      setGame(null);
      setSelectedIds([]);
      setIsHost(false);
      setShowPoints(false);
      setShowResultOverlay(false);
      setSelectedFace('');
    }
  };

  const handleSelectGif = (gifId) => {
    if (!socket || !roomId || !showGifPickerFor) return;
    socket.emit('send-gif', { roomId, targetId: showGifPickerFor, gifId });
    setShowGifPickerFor(null);
  };

  const ResultOverlay = () => {
    if (!showResultOverlay || !game?.closeCalled) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
        <div className="bg-black/90 rounded-3xl border-4 border-yellow-400 p-8 max-w-md w-11/12 text-center shadow-2xl shadow-yellow-500/50">
          <h2 className="text-3xl font-black text-yellow-400 mb-4 tracking-wider">ROUND WINNER</h2>
          <p className="text-4xl font-black text-yellow-300 mb-6">{winnerName}</p>
          <img src="/gifs/chimpanzee.gif" alt="Winner" className="w-32 h-32 mx-auto rounded-2xl mb-6 shadow-2xl" />
          <div className="bg-white/10 rounded-2xl p-4 mb-6 max-h-48 overflow-y-auto">
            <h3 className="text-yellow-200 font-bold mb-3 text-center">ROUND POINTS</h3>
            {players.map(p => (
              <div key={p.id} className="flex justify-between text-sm mb-2">
                <span className="flex items-center gap-2">
                  <img src={p.face} className="w-6 h-6 rounded-full" alt={p.name} />
                  {p.name}
                </span>
                <span className="font-bold text-lg">{getRoundPointsForPlayer(p, roundBaseScores)}</span>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setShowResultOverlay(false)}
            className="w-full py-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold rounded-2xl text-lg hover:scale-105 shadow-xl"
          >
            CONTINUE
          </button>
        </div>
      </div>
    );
  };

  if (screen === 'welcome') {
    const canCreate = !!playerName.trim() && !!selectedFace && !loading;
    const canJoin = !!playerName.trim() && !!joinCode.trim() && !!selectedFace && !loading;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex items-center justify-center p-4 relative overflow-hidden">
        <NeonFloatingCards />
        <ResultOverlay />
        <div className="bg-black/80 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl">
          <h1 className="text-5xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent text-center mb-8 drop-shadow-2xl">
            CLOSE MASTER
          </h1>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-200 mb-3">Name</label>
              <input
                type="text"
                className="w-full p-4 bg-black/50 border-2 border-gray-600 rounded-2xl text-lg font-bold text-white placeholder-gray-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/30 transition-all"
                placeholder="Enter name"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                maxLength={15}
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-200 mb-3">Choose Avatar</label>
              <div className="grid grid-cols-4 gap-3">
                {FACELIST.map(f => (
                  <img
                    key={f}
                    src={f}
                    onClick={() => setSelectedFace(f)}
                    className={`w-16 h-16 rounded-full cursor-pointer border-4 p-1 transition-all hover:scale-110 ${
                      selectedFace === f ? 'border-emerald-400 shadow-2xl shadow-emerald-500/50 scale-110' : 'border-transparent hover:border-blue-400 opacity-70 hover:opacity-100'
                    }`}
                    alt=""
                  />
                ))}
              </div>
              {!selectedFace && <p className="text-red-400 text-xs mt-2">Select face to continue</p>}
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-200 mb-3">Room ID</label>
              <input
                type="text"
                className="w-full p-4 bg-black/50 border-2 border-gray-600 rounded-2xl text-lg font-bold text-white placeholder-gray-400 uppercase focus:border-sky-400 focus:ring-4 focus:ring-sky-400/30 transition-all"
                placeholder="ABCD"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
              />
            </div>

            <button
              onClick={createRoom}
              disabled={!canCreate}
              className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all ${
                canCreate
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:scale-105 shadow-emerald-500/50'
                  : 'bg-gray-800/50 border-2 border-gray-600 cursor-not-allowed opacity-50'
              }`}
            >
              {loading ? 'Creating...' : 'CREATE ROOM'}
            </button>

            <button
              onClick={joinRoom}
              disabled={!canJoin}
              className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all ${
                canJoin
                  ? 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 hover:scale-105 shadow-sky-500/50'
                  : 'bg-gray-800/50 border-2 border-gray-600 cursor-not-allowed opacity-50'
              }`}
            >
              {loading ? 'Joining...' : 'JOIN ROOM'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LOBBY & GAME SCREENS (SHORTENED FOR DEPLOY)
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/30 to-blue-900/30 text-white p-6 flex flex-col items-center gap-6 relative overflow-hidden">
      <NeonFloatingCards />
      <ResultOverlay />
      
      {/* TURN TIMER */}
      {started && (
        <div className="flex flex-col items-center gap-2">
          <div className={`w-24 h-24 rounded-full border-4 flex items-center justify-center font-bold text-2xl ${
            myTurn ? 'border-yellow-400 animate-ping shadow-2xl shadow-yellow-500/50' : 'border-gray-600'
          }`}>
            {turnTimeLeft}s
          </div>
          <p className="text-yellow-300 font-bold text-center">
            {myTurn ? 'Your Turn!' : `${currentPlayer?.name}'s Turn`}
          </p>
        </div>
      )}

      {/* ROOM INFO */}
      <div className="w-full max-w-4xl bg-black/50 backdrop-blur-xl rounded-3xl p-6 border border-emerald-500/30 shadow-2xl text-center">
        <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent mb-4">
          Room: {roomId?.toUpperCase()}
        </h1>
        {me && (
          <div className="flex items-center justify-center gap-3 mb-6">
            <img src={me.face} className="w-12 h-12 rounded-full border-4 border-emerald-400" alt="" />
            <span className="text-xl font-bold text-emerald-400">{me.name}</span>
            {isHost && <span className="px-4 py-2 bg-yellow-500 text-black font-bold rounded-full animate-pulse">HOST</span>}
          </div>
        )}
        
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          {isHost && players.length >= 2 && (
            <button onClick={startRound} className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl font-bold text-xl hover:scale-105 shadow-xl shadow-emerald-500/50">
              START GAME ({players.length}/{MAXPLAYERS})
            </button>
          )}
          <button onClick={() => setShowPoints(true)} className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl font-bold text-xl hover:scale-105 shadow-xl">
            SCORES
          </button>
          <button onClick={exitGame} className="px-8 py-4 bg-gradient-to-r from-gray-700 to-gray-800 rounded-2xl font-bold text-xl hover:scale-105 shadow-xl">
            EXIT
          </button>
        </div>
      </div>

      {/* PLAYERS GRID */}
      <div className="w-full max-w-5xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {players.map(p => {
          const isYou = p.id === youId;
          const isTurn = currentPlayer?.id === p.id;
          const activeGif = GIFLIST.find(g => g.id === activeReactions[p.id]);
          return (
            <div key={p.id} className={`relative p-4 rounded-2xl shadow-xl border-4 transition-all ${
              isYou ? 'border-emerald-400 bg-emerald-900/40 scale-105' :
              isTurn ? 'border-yellow-400 bg-yellow-900/40' :
              'border-gray-700 bg-gray-900/40'
            } ${activeGif ? 'ring-4 ring-yellow-400/50 animate-pulse' : ''}`}>
              {activeGif && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full overflow-hidden border-4 border-white shadow-lg">
                  <img src={activeGif.file} alt={activeGif.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex flex-col items-center gap-2">
                <img src={p.face} className="w-12 h-12 rounded-full border-4 border-white shadow-lg" alt={p.name} />
                <p className="font-bold text-lg">{p.name}</p>
                <p className="text-sm text-gray-400">{p.handSize || 0} cards | {p.score || 0} pts</p>
                {p.hasDrawn && <p className="text-emerald-400 text-xs font-bold">Drew</p>}
              </div>
              <button 
                onClick={() => setShowGifPickerFor(p.id)}
                className="mt-2 px-3 py-1 bg-black/50 border border-white/30 rounded-full text-xs hover:bg-white/20 transition-all"
              >
                GIF
              </button>
            </div>
          );
        })}
      </div>

      {/* OPEN CARD */}
      {started && (
        <div className="text-center">
          <h3 className="text-2xl font-bold mb-6 text-white drop-shadow-2xl">OPEN CARD</h3>
          {discardTop ? (
            <button
              onClick={() => drawCard(true)}
              disabled={!myTurn || hasDrawn}
              className={`relative w-32 h-44 rounded-3xl border-4 p-4 flex flex-col justify-between shadow-2xl transition-all backdrop-blur-xl ${
                !myTurn || hasDrawn 
                  ? 'opacity-60 cursor-not-allowed border-gray-500 bg-white/10' 
                  : 'cursor-pointer hover:scale-105 border-blue-400 bg-white/20 shadow-[0_0_40px_rgba(59,130,246,0.8)]'
              }`}
            >
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-blue-500/30 to-transparent shadow-[0_0_40px_rgba(59,130,246,0.6)]" />
              <div className="relative z-10 font-black text-2xl text-right drop-shadow-2xl shadow-[0_0_20px_currentColor]">
                {discardTop.rank}
              </div>
              <div className="relative z-20 flex-1 flex items-center justify-center">
                {discardTop.rank !== 'JOKER' && (
                  <span className={`text-5xl drop-shadow-4xl shadow-[0_0_40px_currentColor] ${cardTextColor(discardTop)} animate-pulse`}>
                    {discardTop.suit}
                  </span>
                )}
              </div>
              <div className="relative z-10 font-black text-2xl drop-shadow-2xl shadow-[0_0_20px_currentColor]">
                {discardTop.rank}
              </div>
            </button>
          ) : (
            <div className="w-32 h-44 bg-gray-800 border-2 border-dashed border-gray-500 rounded-3xl flex items-center justify-center text-gray-500">
              Empty
            </div>
          )}
        </div>
      )}

      {/* YOUR HAND */}
      {me && started && (
        <div className="w-full max-w-6xl">
          <h3 className="text-3xl font-bold text-emerald-400 text-center mb-8 drop-shadow-2xl">
            Your Hand ({me.hand.length} cards)
          </h3>
          <div className="flex flex-wrap gap-4 justify-center p-6 bg-black/30 backdrop-blur-xl rounded-3xl">
            {me.hand.map(c => {
              const selected = selectedIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  disabled={!myTurn}
                  className={`relative w-24 h-36 rounded-3xl border-4 p-3 flex flex-col justify-between shadow-2xl transition-all duration-300 backdrop-blur-xl hover:shadow-[0_0_50px_rgba(59,130,246,0.8)] ${
                    selected 
                      ? 'scale-110 border-cyan-400 shadow-cyan-500/50 ring-4 ring-cyan-400/50' 
                      : myTurn 
                        ? 'border-blue-400/50 hover:scale-105 hover:shadow-[0_0_40px_rgba(59,130,246,0.6)]' 
                        : 'border-white/30 opacity-70'
                  }`}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                  }}
                >
                  <div className="absolute inset-0 rounded-3xl bg-gradient-radial from-blue-500/40 to-transparent shadow-[0_0_30px_rgba(59,130,246,0.7)]" />
                  <div className="relative z-20 font-black text-xl drop-shadow-2xl shadow-[0_0_20px_currentColor] text-left">
                    {c.rank}
                  </div>
                  <div className="relative z-30 flex-1 flex items-center justify-center">
                    {c.rank !== 'JOKER' && (
                      <span className={`text-4xl drop-shadow-4xl shadow-[0_0_40px_currentColor] animate-pulse ${cardTextColor(c)}`}>
                        {c.suit}
                      </span>
                    )}
                  </div>
                  <div className="relative z-20 font-black text-xl drop-shadow-2xl shadow-[0_0_20px_currentColor] text-right rotate-180">
                    {c.rank}
                  </div>
                  {selected && (
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-400/40 to-blue-500/40 animate-ping" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      {myTurn && started && (
        <div className="flex flex-wrap gap-4 justify-center p-8 bg-black/40 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl">
          <button
            onClick={() => drawCard(false)}
            disabled={hasDrawn}
            className={`px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl transition-all ${
              hasDrawn
                ? 'bg-gray-700/50 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 hover:scale-105 shadow-purple-500/50'
            }`}
          >
            DECK
          </button>
          <button
            onClick={dropCards}
            disabled={!allowDrop}
            className={`px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl transition-all ${
              allowDrop
                ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:scale-105 shadow-green-500/50'
                : 'bg-gray-700/50 cursor-not-allowed opacity-50'
            }`}
          >
            DROP ({selectedIds.length})
          </button>
          <button
            onClick={callClose}
            disabled={closeDisabled}
            className={`px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl transition-all ${
              closeDisabled
                ? 'bg-gray-700/50 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:scale-105 shadow-red-500/50'
            }`}
          >
            CLOSE
          </button>
        </div>
      )}

      {/* SCORES MODAL */}
      {showPoints && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl p-8 max-w-md w-full border-4 border-gray-200 shadow-2xl">
            <h2 className="text-3xl font-black text-center mb-8 bg-gradient-to-r from-gray-200 to-gray-100 bg-clip-text text-transparent">SCORES</h2>
            <div className="space-y-4 mb-8">
              {players.map((p, i) => (
                <div key={p.id} className={`flex justify-between p-4 rounded-2xl font-bold text-xl ${
                  i === 0 ? 'bg-emerald-500/90 text-white shadow-emerald-500/50' : 'bg-gray-800/50'
                }`}>
                  <span className="flex items-center gap-3">
                    <img src={p.face} className="w-10 h-10 rounded-full" alt={p.name} />
                    {p.name}
                  </span>
                  <span>{p.score || 0}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowPoints(false)}
              className="w-full py-4 bg-gray-800 hover:bg-gray-700 rounded-2xl font-bold text-xl border-2 border-gray-600 transition-all"
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}

      {/* GIF PICKER */}
      {showGifPickerFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-black/90 border-2 border-white/20 rounded-3xl p-6 w-80 max-w-sm">
            <h3 className="text-2xl font-bold text-center mb-4 text-white">Send GIF</h3>
            <p className="text-gray-300 text-center mb-6">
              To: {players.find(p => p.id === showGifPickerFor)?.name}
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {GIFLIST.map(gif => (
                <button
                  key={gif.id}
                  onClick={() => handleSelectGif(gif.id)}
                  className="p-3 bg-gray-800/50 hover:bg-gray-700 rounded-2xl transition-all hover:scale-105"
                >
                  <img src={gif.file} alt={gif.name} className="w-24 h-24 object-cover rounded-xl mx-auto" />
                  <p className="text-center text-sm mt-2 font-bold">{gif.name}</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowGifPickerFor(null)}
              className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-2xl font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <button 
        onClick={exitGame}
        className="px-12 py-4 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-gray-800 rounded-3xl font-bold text-xl shadow-2xl mt-8 hover:scale-105"
      >
        EXIT GAME
      </button>
    </div>
  );
}
