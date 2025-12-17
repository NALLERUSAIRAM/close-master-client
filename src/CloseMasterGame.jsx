// CLOSEMASTERGAME.NEON.jsx
import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

// Safety check for Capacitor Plugins to prevent Vercel Build Errors
let HapticsModule = null;
let ImpactStyleValue = 'HEAVY';

if (typeof window !== "undefined" && window.Capacitor) {
  import("@capacitor/haptics").then((mod) => {
    HapticsModule = mod.Haptics;
    ImpactStyleValue = mod.ImpactStyle.Heavy;
  }).catch(err => console.log("Haptics not loaded"));
}

const SERVER_URL = "https://close-master-server-production.up.railway.app";
const MAX_PLAYERS = 7;

const GIF_LIST = [
  { id: "laugh", name: "Laugh", file: "/gifs/Laugh.gif" },
  { id: "husky", name: "Husky", file: "/gifs/Husky.gif" },
  { id: "monkey", name: "Monkey", file: "/gifs/monkey_clap.gif" },
  { id: "horse", name: "Horse", file: "/gifs/Horse_run.gif" },
];

const FACE_LIST = [
  "/gifs/1.png", "/gifs/2.png", "/gifs/3.png", "/gifs/4.png",
  "/gifs/5.png", "/gifs/6.png", "/gifs/7.png",
];

function cardTextColor(card) {
  if (!card) return "text-white";
  if (card.rank === "JOKER") return "text-yellow-100 drop-shadow-[0_0_12px_rgba(255,255,0,1)] font-extrabold";
  if (card.suit === "♥" || card.suit === "♦") return "text-pink-300 drop-shadow-[0_0_12px_rgba(255,0,255,1)] font-bold";
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
  const [showPoints, setShowPoints] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFace, setSelectedFace] = useState("");
  const [turnTimeLeft, setTurnTimeLeft] = useState(20);
  const turnTimerRef = useRef(null);
  const [activeReactions, setActiveReactions] = useState({});
  const [showResultOverlay, setShowResultOverlay] = useState(false);

  const [playerId] = useState(() => {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem("cmp_player_id");
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now();
      localStorage.setItem("cmp_player_id", id);
    }
    return id;
  });

  // Turn Vibration Logic
  useEffect(() => {
    const isMyTurn = game?.started && game?.players[game?.currentIndex]?.id === game?.youId;
    if (isMyTurn) {
      if (typeof window !== "undefined") {
        if (window.Capacitor && HapticsModule) {
          HapticsModule.impact({ style: ImpactStyleValue });
        } else if (navigator.vibrate) {
          navigator.vibrate(500);
        }
      }
    }
  }, [game?.currentIndex, game?.started]);

  useEffect(() => {
    const s = io(SERVER_URL, { transports: ["websocket"] });
    s.on("connect", () => {
      const rid = localStorage.getItem("cmp_room_id");
      const name = localStorage.getItem("cmp_player_name");
      if (rid && name) s.emit("rejoin_room", { roomId: rid, name, playerId });
    });
    s.on("game_state", (state) => {
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setScreen(state.started ? "game" : "lobby");
      setLoading(false);
    });
    s.on("gif_play", ({ targetId, gifId }) => {
      setActiveReactions(p => ({ ...p, [targetId]: gifId }));
      setTimeout(() => setActiveReactions(p => { const n = {...p}; delete n[targetId]; return n; }), 4000);
    });
    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (game?.started) {
      setTurnTimeLeft(20);
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      turnTimerRef.current = setInterval(() => {
        setTurnTimeLeft(t => {
          if (t <= 1) {
            if (game?.players[game?.currentIndex]?.id === game?.youId) socket.emit("turn_timeout", { roomId: game.roomId });
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(turnTimerRef.current);
  }, [game?.turnId, game?.started]);

  const createRoom = () => {
    if (!playerName || !selectedFace) return alert("Details ivvandi");
    setLoading(true);
    socket.emit("create_room", { name: playerName, playerId, face: selectedFace });
  };

  const joinRoom = () => {
    if (!playerName || !joinCode || !selectedFace) return alert("Details ivvandi");
    setLoading(true);
    socket.emit("join_room", { name: playerName, roomId: joinCode.toUpperCase(), playerId, face: selectedFace });
  };

  if (screen === "welcome") return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <video className="fixed inset-0 w-full h-full object-cover opacity-30" src="/gifs/15.mp4" autoPlay muted loop playsInline />
      <div className="relative z-10 bg-black/60 p-8 rounded-3xl border border-white/10 w-full max-w-md backdrop-blur-xl shadow-2xl">
        <h1 className="text-4xl font-black text-center mb-8 bg-gradient-to-r from-cyan-400 to-fuchsia-500 bg-clip-text text-transparent">CLOSE MASTER</h1>
        <input className="w-full p-4 mb-4 bg-white/5 rounded-xl border border-white/10 outline-none focus:border-cyan-400 text-white" placeholder="Enter Name" value={playerName} onChange={e => setPlayerName(e.target.value)} />
        <div className="grid grid-cols-4 gap-3 mb-6">
          {FACE_LIST.map(f => <img key={f} src={f} onClick={() => setSelectedFace(f)} className={`w-full rounded-full cursor-pointer border-2 transition-all ${selectedFace === f ? 'border-cyan-400 scale-110 shadow-lg' : 'border-transparent opacity-50'}`} />)}
        </div>
        <input className="w-full p-4 mb-6 bg-white/5 rounded-xl border border-white/10 uppercase text-white" placeholder="Room ID (to join)" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
        <button onClick={createRoom} className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-xl font-bold mb-3 hover:brightness-110">CREATE ROOM</button>
        <button onClick={joinRoom} className="w-full py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 rounded-xl font-bold hover:brightness-110">JOIN ROOM</button>
      </div>
    </div>
  );

  const me = game?.players.find(p => p.id === game.youId);
  const myTurn = game?.started && game?.players[game?.currentIndex]?.id === game?.youId;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 relative overflow-hidden">
      <video className="fixed inset-0 w-full h-full object-cover opacity-20 -z-10" src="/gifs/15.mp4" autoPlay muted loop playsInline />
      
      {/* HUD */}
      <div className="flex justify-between items-center p-4 bg-black/40 rounded-2xl border border-white/5 mb-6 backdrop-blur-md">
        <div>
          <p className="text-[10px] text-gray-500 uppercase">Room Code</p>
          <p className="font-mono font-bold text-cyan-400">{game?.roomId}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-gray-500 uppercase">Time Left</p>
          <p className={`text-xl font-black ${turnTimeLeft < 5 ? 'text-red-500 animate-ping' : 'text-yellow-400'}`}>{turnTimeLeft}s</p>
        </div>
        <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-1 rounded-full text-xs font-bold">EXIT</button>
      </div>

      {/* Players List */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {game?.players.map((p, idx) => (
          <div key={p.id} className={`relative p-3 rounded-2xl border-2 transition-all duration-500 ${idx === game.currentIndex ? 'border-cyan-400 bg-cyan-400/10 shadow-[0_0_20px_rgba(34,211,238,0.2)]' : 'border-white/5 bg-black/20'}`}>
            <div className="flex items-center gap-2">
              <img src={p.face} className="w-8 h-8 rounded-full border border-white/10" />
              <p className="truncate text-xs font-bold">{p.name} {p.id === game.youId && "(You)"}</p>
            </div>
            <div className="mt-2 flex justify-between text-[10px] font-mono opacity-60">
                <span>C: {p.handSize}</span>
                <span>P: {p.score}</span>
            </div>
            {activeReactions[p.id] && (
              <img src={GIF_LIST.find(g => g.id === activeReactions[p.id])?.file} className="absolute inset-0 w-full h-full object-contain z-50 animate-bounce p-2" />
            )}
          </div>
        ))}
      </div>

      {/* Discard Pile Area */}
      <div className="flex flex-col items-center mb-10">
        <div className="relative">
          <p className="text-[10px] text-center text-gray-500 mb-2 tracking-[0.3em] uppercase">Open Card</p>
          {game?.discardTop ? (
            <div onClick={() => myTurn && !me?.hasDrawn && socket.emit("action_draw", { roomId: game.roomId, fromDiscard: true })} 
                 className={`w-28 h-40 rounded-2xl border-2 bg-slate-900 flex flex-col justify-between p-3 shadow-2xl transition-all ${myTurn && !me?.hasDrawn ? 'cursor-pointer hover:scale-105 border-fuchsia-500 shadow-fuchsia-500/20' : 'border-white/10'}`}>
              <span className={`text-lg font-bold ${cardTextColor(game.discardTop)}`}>{game.discardTop.rank}</span>
              <span className={`text-5xl self-center ${cardTextColor(game.discardTop)}`}>{game.discardTop.suit}</span>
              <span className={`text-lg font-bold self-end rotate-180 ${cardTextColor(game.discardTop)}`}>{game.discardTop.rank}</span>
            </div>
          ) : <div className="w-28 h-40 rounded-2xl border-2 border-dashed border-white/5 bg-white/2" />}
        </div>
      </div>

      {/* Controls */}
      {myTurn && (
        <div className="fixed bottom-32 left-4 right-4 flex gap-3 z-50">
          <button onClick={() => !me?.hasDrawn && socket.emit("action_draw", { roomId: game.roomId, fromDiscard: false })} disabled={me?.hasDrawn} className={`flex-1 py-4 rounded-2xl font-black text-sm tracking-widest transition-all ${!me?.hasDrawn ? 'bg-cyan-600 shadow-lg' : 'bg-gray-800 opacity-50'}`}>DRAW DECK</button>
          <button onClick={() => { socket.emit("action_drop", { roomId: game.roomId, selectedIds }); setSelectedIds([]); }} disabled={selectedIds.length === 0} className={`flex-1 py-4 rounded-2xl font-black text-sm tracking-widest transition-all ${selectedIds.length > 0 ? 'bg-emerald-600 shadow-lg shadow-emerald-900/40' : 'bg-gray-800 opacity-50'}`}>DROP ({selectedIds.length})</button>
          <button onClick={() => window.confirm("CLOSE?") && socket.emit("action_close", { roomId: game.roomId })} disabled={me?.hasDrawn || game?.discardTop?.rank === "7"} className="flex-1 py-4 rounded-2xl font-black text-sm tracking-widest bg-fuchsia-600 shadow-lg disabled:opacity-30">CLOSE</button>
        </div>
      )}

      {/* Reactions Panel */}
      <div className="fixed right-2 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 bg-black/40 p-2 rounded-full border border-white/5">
        {GIF_LIST.map(g => (
          <button key={g.id} onClick={() => socket.emit("send_gif", { roomId: game.roomId, targetId: game.youId, gifId: g.id })} className="w-10 h-10 rounded-full overflow-hidden border border-white/20 hover:scale-110 active:scale-90 transition-all">
            <img src={g.file} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Hand Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-2xl border-t border-white/10 p-4 pb-8 overflow-x-auto">
        <div className="flex gap-2 justify-start sm:justify-center min-w-max px-4">
          {me?.hand.map(c => (
            <div key={c.id} onClick={() => myTurn && setSelectedIds(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} 
                 className={`w-16 h-24 rounded-xl border-2 bg-slate-900 flex flex-col justify-between p-2 transition-all duration-300 ${selectedIds.includes(c.id) ? '-translate-y-6 border-cyan-400 scale-110 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'border-white/10 opacity-80'}`}>
              <span className={`text-[10px] font-bold ${cardTextColor(c)}`}>{c.rank}</span>
              <span className={`text-2xl self-center ${cardTextColor(c)}`}>{c.suit}</span>
              <span className={`text-[10px] font-bold self-end rotate-180 ${cardTextColor(c)}`}>{c.rank}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
