import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

// ✅ YOUR SERVER URL
const SERVER_URL = "https://site--close-master-server--t29zpf96vfqv.code.run";

const MAX_PLAYERS = 7;

// 🎥 BACKGROUND THEMES
const BG_THEMES = [
  { id: "t15", name: "Theme 15", file: "/gifs/15.mp4" },
  { id: "t16", name: "Theme 16", file: "/gifs/16.mp4" },
  { id: "t17", name: "Theme 17", file: "/gifs/17.mp4" },
];

function cardTextColor(card) {
  if (!card) return "text-white";
  if (card.rank === "JOKER")
    return "text-yellow-100 drop-shadow-[0_0_12px_rgba(255,255,0,1)] font-extrabold";
  if (card.suit === "♥" || card.suit === "♦")
    return "text-pink-300 drop-shadow-[0_0_12px_rgba(255,0,255,1)] font-bold";
  return "text-cyan-300 drop-shadow-[0_0_12px_rgba(0,255,255,1)] font-bold";
}

export default function CloseMasterGame() {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState("welcome");
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [game, setGame] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bgTheme, setBgTheme] = useState(BG_THEMES[0]);
  const [turnTimeLeft, setTurnTimeLeft] = useState(20);
  const turnTimerRef = useRef(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [winnerName, setWinnerName] = useState("");
  const [roundBaseScores, setRoundBaseScores] = useState({});
  const prevStartedRef = useRef(false);
  
  // 🔄 ROUND NUMBER TRACKING
  const [roundNum, setRoundNum] = useState(0);

  const [playerId] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      let id = localStorage.getItem("cmp_player_id");
      if (!id) {
        id = window.crypto?.randomUUID ? window.crypto.randomUUID() : Math.random().toString(36).slice(2);
        localStorage.setItem("cmp_player_id", id);
      }
      return id;
    } catch { return ""; }
  });

  useEffect(() => {
    try {
      const storedName = localStorage.getItem("cmp_player_name");
      if (storedName) setPlayerName(storedName);
    } catch {}
  }, []);

  // 🔌 SOCKET SETUP
  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ["polling", "websocket"], 
      upgrade: true,
      reconnection: true,
    });

    s.on("connect", () => {
      let roomIdToUse = game?.roomId || localStorage.getItem("cmp_room_id");
      let nameToUse = playerName || localStorage.getItem("cmp_player_name");
      if (roomIdToUse && nameToUse) {
        s.emit("rejoin_room", { roomId: roomIdToUse, name: nameToUse, playerId });
      }
    });

    s.on("rejoin_success", (state) => {
      setGame(state);
      setScreen(state.started ? "game" : "lobby");
    });

    s.on("game_state", (state) => {
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setSelectedIds([]);
      setScreen(state.started ? "game" : "lobby");
      setLoading(false);

      // Handle Round Number Logic (Increment only when game actually starts)
      if (state.started && !prevStartedRef.current) {
        setRoundNum(prev => prev + 1);
        
        // Capture scores at round start to calculate round-only points later
        const base = {};
        (state.players || []).forEach((p) => {
          base[p.id] = typeof p.score === "number" ? p.score : 0;
        });
        setRoundBaseScores(base);
      }
      prevStartedRef.current = state.started;
    });

    s.on("error", (e) => {
      alert(e.message || "Server error!");
      setLoading(false);
    });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (game?.roomId && playerName) {
      localStorage.setItem("cmp_room_id", game.roomId);
      localStorage.setItem("cmp_player_name", playerName);
    }
  }, [game?.roomId, playerName]);

  // Result logic
  useEffect(() => {
    if (game?.closeCalled) {
      const playersArr = game.players || [];
      const closer = playersArr[game.currentIndex] || playersArr[0];
      setWinnerName(closer?.name || "Winner");
      setShowResultOverlay(true);
    }
  }, [game?.closeCalled]);

  // Timer logic
  useEffect(() => {
    if (game?.started) {
      setTurnTimeLeft(20);
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      turnTimerRef.current = setInterval(() => {
        setTurnTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
    }
    return () => { if (turnTimerRef.current) clearInterval(turnTimerRef.current); };
  }, [game?.started, game?.currentIndex, game?.turnId]);

  const me = game?.players.find((p) => p.id === game?.youId);
  const myTurn = game?.started && game?.players[game?.currentIndex]?.id === game?.youId;

  // ACTIONS
  const createRoom = () => {
    if (!playerName.trim()) return alert("Name enter cheyali");
    setLoading(true);
    socket.emit("create_room", { name: playerName.trim(), playerId }, (res) => {
      setLoading(false);
      if (res?.error) alert(res.error); else setRoundNum(0);
    });
  };

  const joinRoom = () => {
    if (!playerName.trim() || !joinCode.trim()) return alert("Name mariyu Room ID kavali");
    setLoading(true);
    socket.emit("join_room", { name: playerName.trim(), roomId: joinCode.toUpperCase().trim(), playerId }, (res) => {
      setLoading(false);
      if (res?.error) alert(res.error); else setRoundNum(0);
    });
  };

  const startRound = () => socket.emit("start_round", { roomId: game.roomId });
  const drawCard = (fromDiscard = false) => socket.emit("action_draw", { roomId: game.roomId, fromDiscard });
  const dropCards = () => socket.emit("action_drop", { roomId: game.roomId, selectedIds });
  const callClose = () => {
    if (window.confirm("CLOSE cheyala?")) socket.emit("action_close", { roomId: game.roomId });
  };

  const cycleTheme = () => {
    const currentIndex = BG_THEMES.findIndex((t) => t.id === bgTheme.id);
    setBgTheme(BG_THEMES[(currentIndex + 1) % BG_THEMES.length]);
  };

  // Result Overlay (Round Points Only)
  const ResultOverlay = () => {
    if (!showResultOverlay) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
        <div className="bg-gray-900 border border-amber-400 p-6 rounded-3xl max-w-sm w-full shadow-[0_0_20px_rgba(251,191,36,0.5)]">
          <h2 className="text-amber-400 text-center font-black text-2xl mb-4">ROUND OVER</h2>
          <p className="text-white text-center text-lg mb-4 font-bold">{winnerName} Won the Round! 🎉</p>
          
          <div className="space-y-2 mb-6">
            <p className="text-xs text-gray-400 uppercase font-bold text-center">Points added this round</p>
            {game?.players.map((p) => {
              const roundPoints = (p.score || 0) - (roundBaseScores[p.id] || 0);
              return (
                <div key={p.id} className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="font-bold">{p.name}</span>
                  <span className="font-black text-red-400">+{roundPoints < 0 ? 0 : roundPoints}</span>
                </div>
              );
            })}
          </div>

          <button onClick={() => { setShowResultOverlay(false); setScreen("lobby"); }} className="w-full py-4 bg-amber-500 text-black font-black rounded-2xl hover:bg-amber-400 transition-all">CONTINUE</button>
        </div>
      </div>
    );
  };

  // WELCOME SCREEN
  if (screen === "welcome") {
    return (
      <div className="fixed inset-0 w-full h-screen text-white overflow-hidden flex flex-col items-center justify-center px-4">
        <video className="fixed inset-0 w-full h-full object-cover -z-10 opacity-60" src="/gifs/15.mp4" autoPlay muted loop playsInline />
        <div className="bg-black/80 backdrop-blur-xl p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl">
          <h1 className="text-4xl font-black text-center mb-8 bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">CLOSE MASTER</h1>
          <div className="space-y-5">
            <input type="text" className="w-full p-4 bg-gray-900/80 border border-gray-700 rounded-2xl text-white font-bold" placeholder="Enter Name" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={15} />
            <input type="text" className="w-full p-4 bg-gray-900/80 border border-gray-700 rounded-2xl text-white font-bold uppercase" placeholder="Room ID (for joining)" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} maxLength={4} />
            <button onClick={createRoom} disabled={loading} className="w-full py-4 bg-emerald-600 rounded-2xl font-black text-xl hover:bg-emerald-500 shadow-lg shadow-emerald-900/20">{loading ? "Loading..." : "CREATE ROOM"}</button>
            <button onClick={joinRoom} disabled={loading} className="w-full py-4 bg-sky-600 rounded-2xl font-black text-xl hover:bg-sky-500 shadow-lg shadow-sky-900/20">{loading ? "Loading..." : "JOIN ROOM"}</button>
          </div>
        </div>
      </div>
    );
  }

  // LOBBY & GAME RENDER
  return (
    <div className="min-h-screen text-white relative flex flex-col items-center p-4">
      <video className="fixed inset-0 w-full h-full object-cover -z-10" src={bgTheme.file} autoPlay muted loop playsInline />
      <ResultOverlay />

      {/* Header Info */}
      <div className="w-full max-w-4xl flex justify-between items-center bg-black/60 backdrop-blur-md p-3 rounded-2xl border border-white/10 mb-4 z-10">
        <div>
          <p className="text-[10px] text-gray-400 font-bold">ROOM: {game?.roomId}</p>
          <p className="text-emerald-400 font-black">Round {roundNum}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={cycleTheme} className="px-3 py-1 bg-white/10 border border-white/20 rounded-lg text-xs font-bold uppercase">🎨 Theme</button>
          <button onClick={() => window.location.reload()} className="px-3 py-1 bg-red-600/20 border border-red-500/50 rounded-lg text-xs font-bold uppercase text-red-200">Exit</button>
        </div>
      </div>

      {/* Players List */}
      <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-2 mb-4 z-10">
        {game?.players.map((p) => (
          <div key={p.id} className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${game?.players[game.currentIndex]?.id === p.id ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_10px_rgba(250,204,21,0.5)] scale-105' : 'border-white/10 bg-black/40'}`}>
            <p className="font-bold text-sm truncate max-w-full">{p.name} {p.id === game?.youId && "(You)"}</p>
            <div className="flex gap-2 text-[10px] mt-1">
              <span className="text-gray-400">{p.handSize} Cards</span>
              <span className="text-amber-400 font-bold">{p.score} Pts</span>
            </div>
            {game?.players[game.currentIndex]?.id === p.id && <div className="text-[10px] font-black text-yellow-400 mt-1 animate-pulse">TURN ({turnTimeLeft}s)</div>}
          </div>
        ))}
      </div>

      {screen === "lobby" ? (
        <div className="flex flex-col items-center justify-center flex-1 z-10">
          <div className="bg-black/60 p-10 rounded-3xl border border-white/10 text-center backdrop-blur-md">
            <h2 className="text-2xl font-black mb-6">Lobby</h2>
            {isHost ? (
              <button onClick={startRound} className="px-10 py-4 bg-emerald-600 text-white font-black text-xl rounded-2xl animate-bounce">START GAME</button>
            ) : (
              <p className="text-gray-300 animate-pulse">Waiting for host to start...</p>
            )}
            <p className="mt-4 text-xs text-gray-400">{game?.players.length} Players joined</p>
          </div>
        </div>
      ) : (
        <div className="w-full max-w-4xl flex flex-col items-center flex-1 z-10">
          {/* Open Card */}
          <div className="mb-6 text-center">
             <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Discard Pile</p>
             <div onClick={() => drawCard(true)} className={`w-20 h-28 rounded-xl border-2 flex flex-col justify-between p-2 bg-black/80 transition-all ${myTurn && !me?.hasDrawn ? 'border-yellow-400 scale-110 cursor-pointer shadow-[0_0_20px_rgba(250,204,21,0.8)]' : 'border-white/20'}`}>
                <span className={`text-xs font-bold ${cardTextColor(game?.discardTop)}`}>{game?.discardTop?.rank}</span>
                <span className={`text-3xl text-center ${cardTextColor(game?.discardTop)}`}>{game?.discardTop?.suit}</span>
                <span className={`text-xs font-bold text-right ${cardTextColor(game?.discardTop)}`}>{game?.discardTop?.rank}</span>
             </div>
          </div>

          {/* Your Hand */}
          <div className="mt-auto w-full">
            <div className="flex flex-wrap justify-center gap-2 p-4 bg-black/40 rounded-3xl border border-white/10 mb-6">
              {me?.hand.map((c) => (
                <div 
                  key={c.id} 
                  onClick={() => setSelectedIds(prev => prev.includes(c.id) ? prev.filter(id => id !== c.id) : [...prev, c.id])}
                  className={`relative w-14 h-20 md:w-16 md:h-24 rounded-xl border-2 flex flex-col justify-between p-2 bg-black transition-all cursor-pointer ${selectedIds.includes(c.id) ? 'border-pink-500 -translate-y-4 shadow-[0_0_15px_rgba(236,72,153,0.8)]' : 'border-white/20'}`}
                >
                  <span className={`text-xs font-bold ${cardTextColor(c)}`}>{c.rank}</span>
                  <span className={`text-2xl text-center ${cardTextColor(c)}`}>{c.suit}</span>
                  <span className={`text-xs font-bold text-right ${cardTextColor(c)}`}>{c.rank}</span>
                </div>
              ))}
            </div>

            {/* Game Buttons */}
            {myTurn && (
              <div className="grid grid-cols-3 gap-3 w-full mb-4">
                <button onClick={() => drawCard(false)} disabled={me?.hasDrawn} className={`py-4 rounded-2xl font-black text-lg border-2 ${me?.hasDrawn ? 'bg-gray-800 border-gray-700 opacity-50' : 'bg-sky-600 border-sky-400 shadow-[0_0_15px_rgba(2,132,199,0.5)]'}`}>DRAW</button>
                <button onClick={dropCards} disabled={selectedIds.length === 0} className={`py-4 rounded-2xl font-black text-lg border-2 ${selectedIds.length === 0 ? 'bg-gray-800 border-gray-700 opacity-50' : 'bg-emerald-600 border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]'}`}>DROP ({selectedIds.length})</button>
                <button onClick={callClose} disabled={me?.hasDrawn || game?.discardTop?.rank === "7"} className={`py-4 rounded-2xl font-black text-lg border-2 ${me?.hasDrawn || game?.discardTop?.rank === "7" ? 'bg-gray-800 border-gray-700 opacity-50' : 'bg-pink-600 border-pink-400 shadow-[0_0_15px_rgba(219,39,119,0.5)]'}`}>CLOSE</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
