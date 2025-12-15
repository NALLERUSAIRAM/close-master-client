import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';

const SERVERURL = 'https://close-master-server-production.up.railway.app';
const MAXPLAYERS = 7;

// GIF LIST - only 4 GIFs for reactions
const GIFLIST = [
  { id: 'laugh', name: 'Laugh', file: 'gifsLaugh.gif' },
  { id: 'husky', name: 'Husky', file: 'gifsHusky.gif' },
  { id: 'monkey', name: 'Monkey', file: 'gifsmonkeyclap.gif' },
  { id: 'horse', name: 'Horse', file: 'gifsHorserun.gif' }
];

// FACE LIST - PNG avatars
const FACELIST = [
  'gifs1.png', 'gifs2.png', 'gifs3.png', 'gifs4.png',
  'gifs5.png', 'gifs6.png', 'gifs7.png'
];

function cardTextColor(card) {
  if (!card) return 'text-white';
  if (card.rank === 'JOKER') return 'text-yellow-200 drop-shadow-[0_0_6px_rgba(250,250,150,0.9)] font-extrabold';
  if (card.suit === '♥' || card.suit === '♦') return 'text-red-50 drop-shadow-[0_0_6px_rgba(248,113,113,0.9)] font-bold';
  return 'text-cyan-50 drop-shadow-[0_0_6px_rgba(56,189,248,0.9)] font-bold';
}

function NeonFloatingCards() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-16 h-24 rounded-3xl border border-white/20 shadow-[0_0_20px_#3b82f6] backdrop-blur-md animate-float-slow"
          style={{
            left: `${5 + Math.random() * 90}%`,
            top: `${10 + Math.random() * 80}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${12 + Math.random() * 8}s`,
            boxShadow: '0 0 20px 4px rgba(59,130,246,0.6)',
            background: 'rgba(255,255,255,0.05)'
          }}
        />
      ))}
    </div>
  );
}

// round-points helper: total - base for that round
function getRoundPointsForPlayer(p, baseScores) {
  if (!p) return 0;
  const total = typeof p.score === 'number' ? p.score : 0;
  const base = typeof baseScores[p.id] === 'number' ? baseScores[p.id] : 0;
  const diff = total - base;
  return diff > 0 ? 0 : diff;
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
  
  // TURN TIMER STATE
  const [turnTimeLeft, setTurnTimeLeft] = useState(20);
  const turnTimerRef = useRef(null);
  
  // GIF REACTION STATE
  const [showGifPickerFor, setShowGifPickerFor] = useState(null);
  const [activeReactions, setActiveReactions] = useState({});
  
  // CLOSE result overlay
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [winnerName, setWinnerName] = useState('');
  
  // round base scores (total before round start)
  const [roundBaseScores, setRoundBaseScores] = useState({});
  const prevStartedRef = useRef(false);
  
  // permanent playerId (device-based)
  const [playerId] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        let id = localStorage.getItem('cmp-playerid');
        if (!id) {
          if (window.crypto?.randomUUID) id = window.crypto.randomUUID();
          else id = Math.random().toString(36).slice(2);
          localStorage.setItem('cmp-playerid', id);
        }
        return id;
      } catch {...}
    }
    return 'unknown';
  });

  // load stored name (optional)
  useEffect(() => {
    try {
      const storedName = localStorage.getItem('cmp-playername');
      if (storedName) setPlayerName(storedName);
    } catch {...}
  }, []);

  // socket setup
  useEffect(() => {
    const s = io(SERVERURL, {
      transports: ['websocket'],
      upgrade: false,
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });
    
    let reconnectAttempts = 0;
    const MAX_RECONNECTS = 10;

    s.on('connect', () => {
      console.log('Connected', s.id);
      reconnectAttempts = 0;
      // try to rejoin using stored info
      let roomIdToUse = game?.roomId;
      let nameToUse = playerName;
      try {
        if (!roomIdToUse) roomIdToUse = localStorage.getItem('cmp-roomid');
        if (!nameToUse) {
          const storedName = localStorage.getItem('cmp-playername');
          if (storedName) nameToUse = storedName;
        }
      } catch {...}

      if (roomIdToUse && nameToUse) {
        setTimeout(() => {
          s.emit('rejoin-room', { roomId: roomIdToUse, name: nameToUse, playerId, face: selectedFace });
        }, 500);
      }
    });

    s.on('disconnect', (reason) => {
      console.log('Disconnected', reason);
      if (reason === 'io server disconnect') {
        s.disconnect();
      }
    });

    s.on('connect_error', (err) => {
      console.log('Connect error', err.message);
      reconnectAttempts++;
      if (reconnectAttempts >= MAX_RECONNECTS) {
        alert('Connection failed. Check internet & try again.');
      }
    });

    s.on('rejoin-success', (state) => {
      console.log('Rejoined game', state.roomId);
      setGame(state);
      setScreen(state.started ? 'game' : 'lobby');
    });

    s.on('rejoin-error', (error) => {
      console.log('Rejoin failed', error);
      setScreen('welcome');
    });

    s.on('game-state', (state) => {
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setSelectedIds([]);
      if (!state.started) setScreen('lobby');
      else setScreen('game');
      setLoading(false);
    });

    s.on('error', (e) => {
      alert(e.message);
      setLoading(false);
    });

    // GIF PLAY listener - anni players ki broadcast
    s.on('gif-play', (targetId, gifId) => {
      if (!targetId || !gifId) return;
      setActiveReactions(prev => {
        const copy = { ...prev, [targetId]: gifId };
        // 4s taruvata auto-clear
        setTimeout(() => {
          setActiveReactions(prev => {
            if (prev[targetId] !== gifId) return prev;
            const copy = { ...prev };
            delete copy[targetId];
            return copy;
          });
        }, 4000);
        return copy;
      });
    });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  // store roomId + name in localStorage
  useEffect(() => {
    if (game?.roomId && playerName) {
      try {
        localStorage.setItem('cmp-roomid', game.roomId);
        localStorage.setItem('cmp-playername', playerName);
      } catch {...}
    }
  }, [game?.roomId, playerName]);

  // ROUND START detect - save base scores
  useEffect(() => {
    const startedNow = !!game?.started;
    if (startedNow && !prevStartedRef.current) {
      const base = {};
      game?.players?.forEach(p => {
        base[p.id] = typeof p.score === 'number' ? p.score : 0;
      });
      setRoundBaseScores(base);
    }
    prevStartedRef.current = startedNow;
  }, [game?.started, game?.players]);

  // CLOSE called - show overlay with winner + round points
  useEffect(() => {
    if (!game?.closeCalled) return;
    const players = game.players;
    const currentIndex = game.currentIndex ?? 0;
    const closer = players[currentIndex] || players[0];
    setWinnerName(closer?.name || 'Winner');
    setShowResultOverlay(true);
  }, [game?.closeCalled, game?.players, game?.currentIndex]);

  // Page visibility reconnect
  useEffect(() => {
    let reconnectTimeout;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('App background');
      } else {
        console.log('App foreground');
        if (socket && screen !== 'welcome') {
          let roomIdToUse = game?.roomId;
          let nameToUse = playerName;
          try {
            if (!roomIdToUse) roomIdToUse = localStorage.getItem('cmp-roomid');
            if (!nameToUse) {
              const storedName = localStorage.getItem('cmp-playername');
              if (storedName) nameToUse = storedName;
            }
          } catch {...}

          if (roomIdToUse && nameToUse) {
            reconnectTimeout = setTimeout(() => {
              socket.emit('rejoin-room', { roomId: roomIdToUse, name: nameToUse, playerId });
            }, 1000);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [socket, game?.roomId, playerName, screen, playerId]);

  // clear turn timer interval on unmount
  useEffect(() => {
    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, []);

  // 20s TURN TIMER
  useEffect(() => {
    const startedNow = !!game?.started;
    const players = game?.players;
    const currentIndex = game?.currentIndex ?? 0;
    const currentPlayer = players?.[currentIndex];
    const isMyTurn = startedNow && currentPlayer?.id === game?.youId;

    if (!startedNow || !currentPlayer) {
      setTurnTimeLeft(20);
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
        turnTimerRef.current = null;
      }
      return;
    }

    setTurnTimeLeft(20);
    if (turnTimerRef.current) {
      clearInterval(turnTimerRef.current);
      turnTimerRef.current = null;
    }

    turnTimerRef.current = setInterval(() => {
      setTurnTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(turnTimerRef.current);
          turnTimerRef.current = null;
          if (isMyTurn && socket && game?.roomId) {
            socket.emit('turn-timeout', { roomId: game.roomId });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
        turnTimerRef.current = null;
      }
    };
  }, [game?.started, game?.currentIndex, game?.turnId, game?.youId, game?.roomId, socket, game?.players]);

  // GAME STATE COMPUTED
  const roomId = game?.roomId;
  const youId = game?.youId;
  const players = game?.players || [];
  const discardTop = game?.discardTop;
  const currentIndex = game?.currentIndex ?? 0;
  const started = game?.started;
  const pendingDraw = game?.pendingDraw || 0;
  const pendingSkips = game?.pendingSkips || 0;
  const currentPlayer = players[currentIndex];
  const myTurn = started && currentPlayer?.id === youId;
  const me = players.find(p => p.id === youId);
  const hasDrawn = me?.hasDrawn || false;
  const selectedCards = me ? me.hand.filter(c => selectedIds.includes(c.id)) : [];
  const selectedRanks = [...new Set(selectedCards.map(c => c.rank))];
  const selectedSingleRank = selectedRanks.length === 1 ? selectedRanks[0] : null;
  const openCardRank = discardTop?.rank;

  let canDropWithoutDraw = false;
  if (!hasDrawn && selectedCards.length === 0) {
    const sameAsOpen = openCardRank === selectedSingleRank;
    if (sameAsOpen || selectedCards.length === 3) canDropWithoutDraw = true;
  }

  const allowDrop = (selectedCards.length === 0 && hasDrawn) || canDropWithoutDraw;
  const closeDisabled = !myTurn || hasDrawn || (discardTop?.rank !== '7');

  // CREATE/JOIN + face compulsory
  const createRoom = () => {
    if (!socket || !playerName.trim() || !selectedFace) {
      alert('Name and face select cheyali!');
      return;
    }
    setLoading(true);
    socket.emit('create-room', { name: playerName.trim(), playerId, face: selectedFace }, (res) => {
      setLoading(false);
      if (!res || res.error) {
        alert(res?.error || 'Create failed');
      }
    });
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
    }, (res) => {
      setLoading(false);
      if (res?.error) alert(res.error);
    });
  };

  const startRound = () => {
    if (!socket || !roomId || !isHost || players.length < 2) {
      alert('Minimum 2 players (host only)');
      return;
    }
    socket.emit('start-round', { roomId });
  };

  const drawCard = (fromDiscard = false) => {
    if (!socket || !roomId || !myTurn) return;
    socket.emit('action-draw', { roomId, fromDiscard });
  };

  const dropCards = () => {
    if (!socket || !roomId || !myTurn || !allowDrop) {
      alert('Valid cards select cheyali!');
      return;
    }
    socket.emit('action-drop', { roomId, selectedIds });
  };

  const callClose = () => {
    if (!socket || !roomId || !myTurn) return;
    if (!window.confirm('CLOSE cheyala?')) return;
    socket.emit('action-close', { roomId });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const exitGame = () => {
    if (window.confirm('Game exit cheyala?')) {
      try { localStorage.removeItem('cmp-roomid'); } catch {...}
      socket?.disconnect();
      setScreen('welcome');
      setJoinCode('');
      setGame(null);
      setSelectedIds([]);
      setIsHost(false);
      setShowPoints(false);
      setShowResultOverlay(false);
      setLoading(false);
      setSelectedFace('');
    }
  };

  const handleContinue = () => {
    setShowResultOverlay(false);
    setScreen('lobby');
  };

  const handleGifClick = (playerId) => {
    setShowGifPickerFor(playerId);
  };

  const handleSelectGif = (gifId) => {
    if (!socket || !roomId || !showGifPickerFor) return;
    socket.emit('send-gif', { roomId, targetId: showGifPickerFor, gifId });
    setShowGifPickerFor(null);
  };

  // ResultOverlay
  const ResultOverlay = () => {
    if (!showResultOverlay || !game?.closeCalled) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full firework-burst"
              style={{
                width: '6rem', height: '6rem',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                boxShadow: '0 0 40px 10px rgba(251,191,36,0.95)',
                background: 'radial-gradient(circle, rgba(251,191,36,1) 0%, rgba(0,0,0,0) 70%)',
                animationDelay: `${Math.random() * 0.8}s`
              }}
            />
          ))}
        </div>
        <div className="relative px-8 py-6 md:px-10 md:py-8 bg-black/90 rounded-3xl border border-amber-400 shadow-[0_0_20px_rgba(251,191,36,1)] max-w-md w-90%">
          <p className="text-xs md:text-sm font-semibold tracking-[0.3em] text-amber-300 text-center mb-2">ROUND WINNER</p>
          <p className="text-2xl md:text-3xl font-black text-amber-400 text-center mb-1 capitalize">{winnerName}</p>
          <div className="flex justify-center mb-3">
            <img src="gifs/chimpanzee.gif" alt="Winner celebration" className="w-32 h-32 md:w-40 md:h-40 rounded-2xl shadow-xl object-cover" />
          </div>
          <p className="text-sm md:text-base text-amber-100 text-center mb-4">CLOSE SUCCESS!</p>
          
          <div className="bg-white/5 rounded-2xl p-3 md:p-4 mb-4 max-h-[60vh] overflow-y-auto">
            <p className="text-xs md:text-sm text-amber-200 font-semibold mb-2 text-center">CURRENT ROUND POINTS</p>
            {players.map(p => (
              <div key={p.id} className="flex justify-between items-center px-3 py-2 rounded-xl mb-1 text-sm md:text-base">
                <p className={`font-semibold truncate flex items-center gap-2 ${p.name === winnerName ? 'bg-emerald-500/90 text-white' : 'bg-gray-900/70 text-gray-100'}`}>
                  <img src={p.face} className="w-6 h-6 rounded-full" alt={p.name} />
                  {p.name}
                </p>
                <span className="font-black text-lg md:text-xl">{getRoundPointsForPlayer(p, roundBaseScores)}</span>
              </div>
            ))}
          </div>
          
          <button onClick={handleContinue} className="w-full py-3 md:py-4 bg-gradient-to-r from-amber-500 to-amber-200 hover:from-amber-200 hover:to-amber-700 rounded-2xl font-bold text-base md:text-lg text-black shadow-xl">
            CONTINUE
          </button>
        </div>
      </div>
    );
  };

  // WELCOME SCREEN
  if (screen === 'welcome') {
    const canCreate = !!playerName.trim() && !!selectedFace && !loading;
    const canJoin = !!playerName.trim() && !!joinCode.trim() && !!selectedFace && !loading;
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex items-center justify-center px-4 relative overflow-hidden">
        <NeonFloatingCards />
        <div className="relative z-10 bg-black/80 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl">
              CLOSE MASTER
            </h1>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">Name:</label>
              <input
                type="text"
                className="w-full p-4 bg-gray-900/80 border-2 border-gray-200 rounded-2xl text-lg font-semibold text-white placeholder-gray-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/30 transition-all"
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={15}
              />
            </div>

            {/* FACE SELECTION GRID */}
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">Choose Avatar</label>
              <div className="grid grid-cols-4 gap-3 mb-1">
                {FACELIST.map(f => (
                  <img
                    key={f}
                    src={f}
                    onClick={() => setSelectedFace(f)}
                    className={`w-14 h-14 rounded-full cursor-pointer border-2 transition-transform ${
                      selectedFace === f 
                        ? 'border-emerald-400 scale-110' 
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                    alt=""
                  />
                ))}
              </div>
              {!selectedFace && (
                <p className="text-xs text-red-400 mt-1">Please select a face to continue</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">Room ID</label>
              <input
                type="text"
                className="w-full p-4 bg-gray-900/80 border-2 border-gray-200 rounded-2xl text-lg font-semibold text-white placeholder-gray-500 uppercase focus:border-sky-400 focus:ring-4 focus:ring-sky-500/30 transition-all"
                placeholder="Enter Room ID"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
              />
            </div>

            <button
              onClick={createRoom}
              disabled={!canCreate}
              className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all ${
                canCreate
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-200 hover:from-emerald-200 hover:to-emerald-700 hover:scale-105'
                  : 'bg-gray-800/50 border-2 border-gray-200 cursor-not-allowed opacity-50'
              }`}
            >
              {loading ? 'Creating...' : 'CREATE ROOM'}
            </button>

            <button
              onClick={joinRoom}
              disabled={!canJoin}
              className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all ${
                canJoin
                  ? 'bg-gradient-to-r from-sky-500 to-sky-200 hover:from-sky-200 hover:to-sky-700 hover:scale-105'
                  : 'bg-gray-800/50 border-2 border-gray-200 cursor-not-allowed opacity-50'
              }`}
            >
              {loading ? 'Joining...' : 'JOIN ROOM'}
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          .animate-float-slow {
            animation: float 15s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  // LOBBY SCREEN
  if (screen === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/30 to-blue-900/30 text-white p-4 md:p-6 flex flex-col items-center gap-4 md:gap-6 relative overflow-hidden">
        <NeonFloatingCards />
        <ResultOverlay />
        <div className="z-10 w-full max-w-5xl text-center p-4 md:p-6 bg-black/20 backdrop-blur-xl rounded-3xl border border-emerald-500/50 shadow-2xl">
          <h1 className="mb-3 md:mb-4 text-2xl md:text-4xl font-black bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
            Room: {roomId?.toUpperCase()}
          </h1>
          <div className="flex flex-col items-center mb-4 md:mb-6">
            <div className="flex items-center gap-3 mb-2">
              <img src={me?.face} className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-emerald-400" alt="" />
              <p className="text-lg md:text-xl">
                You: <span className="font-bold text-white px-3 py-1 bg-emerald-500/30 rounded-full">{me?.name}</span>
              </p>
            </div>
            {isHost && (
              <span className="px-3 md:px-4 py-1 md:py-2 bg-yellow-500/90 text-black font-bold rounded-full text-sm md:text-lg animate-pulse">
                HOST
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 md:gap-4 justify-center">
            {isHost && (
              <button
                onClick={startRound}
                disabled={players.length < 2}
                className={`px-4 md:px-8 py-3 md:py-4 rounded-3xl text-base md:text-xl font-black shadow-2xl ${
                  players.length < 2
                    ? 'bg-gray-700/50 border-2 border-gray-200 cursor-not-allowed opacity-20'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-200 hover:from-emerald-200 hover:to-emerald-700 hover:scale-105'
                }`}
              >
                {players.length < 2 ? 'WAIT' : `START GAME (${players.length}/${MAXPLAYERS})`}
              </button>
            )}
            <button
              onClick={() => setShowPoints(true)}
              className="px-4 md:px-8 py-3 md:py-4 bg-gradient-to-r from-amber-500 to-amber-200 hover:from-amber-200 hover:to-amber-700 rounded-3xl font-bold text-base md:text-xl shadow-2xl"
            >
              SCORES
            </button>
            <button
              onClick={exitGame}
              className="px-4 md:px-8 py-3 md:py-4 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 rounded-3xl font-bold text-base md:text-xl shadow-2xl"
            >
              EXIT
            </button>
          </div>
        </div>

        <div className="mt-3 md:mt-4 text-sm md:text-lg">
          <span>Players: </span>
          <span className="text-emerald-400 font-bold">{players.length}/{MAXPLAYERS}</span>
        </div>

        <div className="z-10 w-full max-w-5xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
          {players.map(p => (
            <div
              key={p.id}
              className={`p-3 md:p-4 rounded-2xl border-2 shadow-lg ${
                p.id === youId
                  ? 'border-emerald-400 bg-emerald-900/30'
                  : currentPlayer?.id === p.id
                  ? 'border-yellow-400 bg-yellow-900/30'
                  : 'border-gray-700 bg-gray-900/30'
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <img src={p.face} className="w-7 h-7 md:w-8 md:h-8 rounded-full" alt={p.name} />
                <p className="font-bold text-center text-sm md:text-base truncate">{p.name}</p>
              </div>
              <p className="text-xs md:text-sm text-gray-400 text-center">{p.score} pts</p>
            </div>
          ))}
        </div>

        {showPoints && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 text-black rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl md:text-3xl font-black text-center mb-4 md:mb-6 text-gray-900">SCORES</h3>
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex justify-between p-3 md:p-4 rounded-2xl mb-2 md:mb-3 ${
                    i === 0 ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-black'
                  }`}
                >
                  <span className="font-bold truncate flex items-center gap-2 text-sm md:text-base">
                    <img src={p.face} className="w-6 h-6 rounded-full" alt={p.name} />
                    {p.name}
                  </span>
                  <span className="font-black text-xl md:text-2xl px-3 md:px-4 py-1 md:py-2 rounded-xl">
                    {p.score}
                  </span>
                </div>
              ))}
              <button
                onClick={() => setShowPoints(false)}
                className="w-full py-3 md:py-4 bg-gray-900 text-white rounded-2xl text-lg md:text-xl font-bold mt-4 md:mt-6 hover:bg-gray-800"
              >
                CONTINUE
              </button>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          .animate-float-slow {
            animation: float 15s ease-in-out infinite;
          }
          @keyframes firework-burst {
            0% { transform: scale(0); opacity: 1; }
            20% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          .firework-burst {
            animation: firework-burst 1.2s ease-out infinite;
          }
        `}</style>
      </div>
    );
  }

  // GAME SCREEN
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/30 to-blue-900/30 text-white p-4 md:p-6 flex flex-col items-center gap-4 md:gap-6 relative overflow-hidden">
      <NeonFloatingCards />
      <ResultOverlay />

      {/* TURN TIMER TOP */}
      {started && (
        <div className="z-10 flex flex-col items-center gap-2 mt-2">
          <div className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 flex items-center justify-center">
            {myTurn ? (
              <div className="border-yellow-400 animate-ping-slow border-gray-200">
                <span className="text-xl md:text-2xl font-extrabold">{turnTimeLeft}''</span>
              </div>
            ) : (
              <span className="text-xl md:text-2xl font-extrabold">{turnTimeLeft}''</span>
            )}
          </div>
          <p className="text-xs md:text-sm font-semibold text-yellow-200">
            {myTurn ? 'Mee turn, 20s lopala aadandi!' : `${currentPlayer?.name} Player turn lo vunnadu`}
          </p>
        </div>
      )}

      {/* GAME STATUS */}
      <div className="z-10 w-full max-w-4xl p-3 md:p-4 bg-gray-900/50 rounded-2xl border border-gray-700">
        <div className="flex flex-wrap justify-between items-center gap-2 text-sm md:text-base">
          <div className="flex items-center gap-2">
            <img src={currentPlayer?.face} className="w-8 h-8 rounded-full" alt="" />
            <span>Turn: </span>
            <span className="text-xl md:text-2xl font-bold text-yellow-400">{currentPlayer?.name}</span>
          </div>
          <span className={`ml-2 md:ml-4 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold ${
            hasDrawn
              ? 'bg-emerald-500/30 text-emerald-200'
              : 'bg-yellow-500/30 text-yellow-200'
          }`}>
            {hasDrawn ? 'Drew' : 'Draw'}
          </span>
          <div className="text-sm md:text-base">
            <span>Draw: </span><span className="font-bold">{pendingDraw}</span>
            <span> Skip: </span><span className="font-bold">{pendingSkips}</span>
          </div>
        </div>
      </div>

      {/* OPEN CARD */}
      {started && (
        <div className="z-10 text-center">
          <h3 className="text-lg md:text-xl mb-3 md:mb-4 font-bold">OPEN CARD</h3>
          {discardTop ? (
            <button
              onClick={() => drawCard(true)}
              disabled={!myTurn || hasDrawn}
              className={`
                w-24 md:w-32 h-32 md:h-40 bg-white/5 backdrop-blur-xl rounded-3xl 
                border-4 border-blue-400/60 shadow-2xl shadow-blue-500/40
                flex flex-col justify-between p-3 md:p-4 transition-all
                hover:scale-110 hover:shadow-3xl hover:shadow-blue-600/50
                ${!myTurn || hasDrawn ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
                shadow-[0_0_40px_rgba(59,130,246,0.8)]
              `}
              style={{
                background: 'rgba(255,255,255,0.06)',
                boxShadow: `
                  0 12px 40px rgba(0,0,0,0.4),
                  inset 0 1px 0 rgba(255,255,255,0.3),
                  0 0 60px rgba(59,130,246,0.7)
                `
              }}
            >
              {/* Neon Glow Overlay */}
              <div 
                className="absolute inset-0 rounded-3xl opacity-80 pointer-events-none"
                style={{
                  background: 'radial-gradient(circle at 50% 20%, rgba(59,130,246,1) 0%, transparent 60%)',
                  boxShadow: '0 0 80px rgba(59,130,246,0.9)'
                }}
              />
              
              {/* Content - FULLY ON TOP */}
              <div className="relative z-20 flex flex-col h-full justify-between">
                <span 
                  className={`text-xl md:text-2xl font-black ${cardTextColor(discardTop)}`}
                  style={{ 
                    textShadow: '0 0 20px currentColor, 0 0 40px currentColor',
                    position: 'relative',
                    zIndex: 30
                  }}
                >
                  {discardTop.rank}
                </span>
                
                {discardTop.rank !== 'JOKER' && (
                  <span 
                    className={`text-4xl md:text-5xl text-center ${cardTextColor(discardTop)} animate-pulse`}
                    style={{
                      textShadow: `
                        0 0 30px currentColor, 
                        0 0 60px currentColor
                      `,
                      position: 'relative',
                      zIndex: 30
                    }}
                  >
                    {discardTop.suit}
                  </span>
                )}
                
                <span 
                  className={`text-xl md:text-2xl font-black text-right ${cardTextColor(discardTop)}`}
                  style={{ 
                    textShadow: '0 0 20px currentColor, 0 0 40px currentColor',
                    position: 'relative',
                    zIndex: 30
                  }}
                >
                  {discardTop.rank}
                </span>
              </div>
            </button>
          ) : (
            <div className="w-24 md:w-32 h-32 md:h-40 bg-gray-800 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-500 text-xs md:text-sm">
              Empty
            </div>
          )}
        </div>
      )}

      {/* PLAYERS LIST + GIF ICONS + ACTIVE GIF BUBBLE */}
      {started && (
        <div className="z-10 w-full max-w-5xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
          {players.map(p => {
            const isYou = p.id === youId;
            const isTurn = currentPlayer?.id === p.id;
            const activeGifId = activeReactions[p.id];
            const activeGif = GIFLIST.find(g => g.id === activeGifId);
            return (
              <div
                key={p.id}
                className={`relative p-3 md:p-4 rounded-2xl border-2 shadow-lg ${
                  isYou
                    ? 'border-emerald-400 bg-emerald-900/30'
                    : isTurn
                    ? 'border-yellow-400 bg-yellow-900/30'
                    : 'border-gray-700 bg-gray-900/30'
                } ${activeGif ? 'ring-4 ring-yellow-400/50' : ''}`}
              >
                {activeGif && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-white shadow-lg bg-black/70">
                    <img src={activeGif.file} alt={activeGif.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="mt-2 flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    <img src={p.face} className="w-7 h-7 md:w-8 md:h-8 rounded-full" alt={p.name} />
                    <p className="font-bold text-center text-sm md:text-base truncate">{p.name}</p>
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 text-center">
                    {p.handSize} cards | {p.score} pts
                  </p>
                  {p.hasDrawn && (
                    <p className="text-xs text-emerald-400 text-center">Drew</p>
                  )}
                </div>
                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleGifClick(p.id)}
                    className="text-xs md:text-sm px-2 py-1 rounded-full bg-black/20 border border-white/30 flex items-center gap-1 hover:bg-black/80"
                  >
                    <span>GIF</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GIF PICKER */}
      {showGifPickerFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-slate-950/95 border border-white/10 rounded-3xl w-90% max-w-sm p-4 md:p-6 shadow-2xl">
            <p className="text-center text-base md:text-lg font-bold mb-1 text-white">Choose GIF</p>
            <p className="text-center text-xs md:text-sm text-gray-300 mb-4">
              {players.find(p => p.id === showGifPickerFor)?.name} Player ki GIF pettandi
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {GIFLIST.map(gif => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => handleSelectGif(gif.id)}
                  className="flex flex-col items-center gap-1 bg-gray-900/80 hover:bg-gray-800 rounded-2xl p-2"
                >
                  <img src={gif.file} alt={gif.name} className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl" />
                  <span className="text-xs md:text-sm text-gray-100">{gif.name}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowGifPickerFor(null)}
              className="w-full py-2.5 md:py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-sm md:text-base font-semibold text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* YOUR HAND - NEON TRANSPARENT CARDS */}
      {me && started && (
        <div className="z-10 w-full max-w-5xl">
          <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-emerald-400 text-center">
            Your Hand ({me.hand.length} cards)
          </h3>
          <div className="flex gap-2 md:gap-3 flex-wrap justify-center p-3 md:p-4 bg-gray-900/50 rounded-2xl">
            {me.hand.map((c, index) => {
              const selected = selectedIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  disabled={!myTurn}
                  className={`
                    relative w-20 md:w-24 h-28 md:h-36 rounded-3xl border-4 
                    flex flex-col justify-between px-3 py-2 md:px-4 md:py-3
                    transition-all duration-200 backdrop-blur-xl
                    bg-white/3 hover:bg-white/10 active:bg-white/20
                    shadow-[0_0_30px_rgba(59,130,246,0.6)]
                    ${selected 
                      ? 'scale-110 border-cyan-400 shadow-2xl shadow-cyan-500/50 ring-4 ring-cyan-400/30' 
                      : myTurn 
                        ? 'border-blue-400/50 hover:scale-105 hover:shadow-2xl hover:shadow-blue-500/40 hover:ring-2 ring-blue-400/20'
                        : 'border-white/20 shadow-lg shadow-white/10 opacity-80'
                    }
                  `}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(20px)',
                    boxShadow: `
                      0 8px 32px rgba(0,0,0,0.3),
                      inset 0 1px 0 rgba(255,255,255,0.2),
                      0 0 40px rgba(99,102,241,0.5),
                      0 0 60px rgba(59,130,246,0.4)
                    `
                  }}
                >
                  {/* Neon Glow Container */}
                  <div 
                    className="absolute inset-0 rounded-3xl opacity-75 pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle at 30% 30%, rgba(59,130,246,0.9) 0%, transparent 50%)',
                      boxShadow: '0 0 50px rgba(59,130,246,0.8), 0 0 100px rgba(59,130,246,0.4)'
                    }}
                  />
                  
                  {/* Glass Effect */}
                  <div className="pointer-events-none absolute inset-0 rounded-3xl bg-[radial-gradient(circle_at_20_20%,rgba(248,250,252,0.18),transparent_55%),radial-gradient(circle_at_80_80%,rgba(248,250,252,0.12),transparent_55%)" />
                  
                  {/* Main Card Content - FULLY ON TOP */}
                  <div className="relative z-20 flex flex-col h-full justify-between">
                    {/* Top Left Corner - Neon Number */}
                    <div className="flex items-start">
                      <span 
                        className={`
                          text-lg md:text-xl font-black tracking-wider drop-shadow-2xl
                          ${cardTextColor(c)}
                        `}
                        style={{ 
                          textShadow: '0 0 15px currentColor, 0 0 25px currentColor, 0 0 40px currentColor',
                          position: 'relative',
                          zIndex: 30
                        }}
                      >
                        {c.rank}
                      </span>
                    </div>

                    {/* Center Suit - Mega Neon Glow */}
                    {c.rank !== 'JOKER' && (
                      <div className="flex-1 flex items-center justify-center">
                        <span 
                          className={`
                            text-3xl md:text-4xl drop-shadow-4xl animate-pulse-slow
                            ${cardTextColor(c)}
                          `}
                          style={{
                            textShadow: `
                              0 0 20px currentColor, 
                              0 0 35px currentColor, 
                              0 0 50px currentColor,
                              0 0 80px currentColor
                            `,
                            position: 'relative',
                            zIndex: 30
                          }}
                          key={`${c.suit}-${index}`}
                        >
                          {c.suit}
                        </span>
                      </div>
                    )}

                    {/* Bottom Right Corner - Neon Number */}
                    <div className="flex items-end justify-end">
                      <span 
                        className={`
                          text-lg md:text-xl font-black tracking-wider drop-shadow-2xl rotate-180
                          ${cardTextColor(c)}
                        `}
                        style={{
                          textShadow: '0 0 15px currentColor, 0 0 25px currentColor, 0 0 40px currentColor',
                          position: 'relative',
                          zIndex: 30
                        }}
                      >
                        {c.rank}
                      </span>
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {selected && (
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-400/30 to-blue-500/30 animate-ping-slow pointer-events-none" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      {myTurn && started && (
        <div className="z-10 flex flex-wrap gap-2 md:gap-4 justify-center max-w-4xl p-4 md:p-6 bg-black/50 backdrop-blur-xl rounded-3xl border border-white/20">
          <button
            onClick={() => drawCard(false)}
            disabled={hasDrawn}
            className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-xl shadow-2xl ${
              hasDrawn
                ? 'bg-gray-700/50 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-purple-200 to-purple-700 hover:from-purple-700 hover:to-purple-800'
            }`}
          >
            DECK
          </button>
          <button
            onClick={dropCards}
            disabled={!allowDrop}
            className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-xl shadow-2xl ${
              allowDrop
                ? 'bg-gradient-to-r from-green-200 to-green-700 hover:from-green-700 hover:to-green-800'
                : 'bg-gray-700/50 cursor-not-allowed opacity-50'
            }`}
          >
            DROP ({selectedIds.length})
          </button>
          <button
            onClick={callClose}
            disabled={closeDisabled}
            className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-xl shadow-2xl ${
              closeDisabled
                ? 'bg-gray-700/50 cursor-not-allowed opacity-50'
                : 'bg-gradient-to-r from-red-200 to-red-700 hover:from-red-700 hover:to-red-800 hover:scale-105'
            }`}
          >
            CLOSE
          </button>
        </div>
      )}

      {/* EXIT BUTTON */}
      {started && (
        <div className="z-10 mt-4">
          <button
            onClick={exitGame}
            className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-gray-900 rounded-2xl font-bold text-lg shadow-xl"
          >
            EXIT GAME
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float-slow {
          animation: float 15s ease-in-out infinite;
        }
        @keyframes firework-burst {
          0% { transform: scale(0); opacity: 1; }
          20% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .firework-burst {
          animation: firework-burst 1.2s ease-out infinite;
        }
        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 1; }
          75% { transform: scale(1.08); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-ping-slow {
          animation: ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
        @keyframes pulse-glow {
          0%, 100% { 
            text-shadow: 0 0 20px currentColor, 0 0 40px currentColor; 
          }
          50% { 
            text-shadow: 0 0 30px currentColor, 0 0 60px currentColor, 0 0 80px currentColor; 
          }
        }
        .animate-pulse-glow { 
          animation: pulse-glow 2s ease-in-out infinite; 
        }
      `}</style>
    </div>
  );
}
