import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://site--close-master-server--t29zpf96vfqv.code.run";

const BG_THEMES = [
  { id: "t15", name: "Theme 15", file: "/gifs/15.mp4" },
  { id: "t16", name: "Theme 16", file: "/gifs/16.mp4" },
  { id: "t17", name: "Theme 17", file: "/gifs/17.mp4" },
];

function getCardColor(card) {
  if (!card) return "text-white";
  if (card.rank === "JOKER") return "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]";
  const isRed = card.suit === "♥" || card.suit === "♦";
  return isRed ? "text-pink-500 drop-shadow-[0_0_8px_rgba(236,72,153,0.8)]" : "text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]";
}

export default function CloseMasterGame() {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState("welcome");
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [game, setGame] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [bgTheme, setBgTheme] = useState(BG_THEMES[0]);
  const [turnTimeLeft, setTurnTimeLeft] = useState(20);
  const turnTimerRef = useRef(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [winnerName, setWinnerName] = useState("");

  const [playerId] = useState(() => {
    if (typeof window === "undefined") return "";
    let id = localStorage.getItem("cmp_player_id") || Math.random().toString(36).slice(2);
    localStorage.setItem("cmp_player_id", id);
    return id;
  });

  useEffect(() => {
    const s = io(SERVER_URL, { transports: ["polling", "websocket"] });
    s.on("connect", () => {
      const rid = localStorage.getItem("cmp_room_id");
      const name = localStorage.getItem("cmp_player_name");
      if (rid && name) s.emit("rejoin_room", { roomId: rid, name, playerId });
    });
    s.on("game_state", (state) => {
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setScreen(state.started ? "game" : "lobby");
    });
    s.on("close_result", (data) => {
      setWinnerName(data.winner);
      setShowResultOverlay(true);
    });
    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (game?.started) {
      setTurnTimeLeft(20);
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      turnTimerRef.current = setInterval(() => setTurnTimeLeft(p => p <= 1 ? 0 : p - 1), 1000);
    }
  }, [game?.started, game?.currentIndex, game?.turnId]);

  const createRoom = () => {
    if (!playerName.trim()) return alert("Name enter chey!");
    socket.emit("create_room", { name: playerName, playerId }, (res) => {
      if (res.error) alert(res.error);
      else localStorage.setItem("cmp_room_id", res.roomId);
    });
  };

  const joinRoom = () => {
    if (!playerName.trim() || !joinCode.trim()) return alert("Details enter chey!");
    socket.emit("join_room", { name: playerName, roomId: joinCode.toUpperCase(), playerId }, (res) => {
      if (res.error) alert(res.error);
      else localStorage.setItem("cmp_room_id", res.roomId);
    });
  };

  const handleContinue = () => {
    if (game?.isGameOver && isHost) {
      if (window.confirm("Game Over! 500 points reach ayyaru. Scores reset cheyala?")) {
        socket.emit("reset_game", { roomId: game.roomId, playerId });
      }
    } else if (isHost) {
      socket.emit("start_round", { roomId: game.roomId });
    }
    setShowResultOverlay(false);
  };

  if (screen === "welcome") {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-white font-sans">
        <video className="fixed inset-0 w-full h-full object-cover -z-10 opacity-40" src="/gifs/15.mp4" autoPlay muted loop />
        <div className="bg-black/80 p-8 rounded-3xl w-full max-w-sm border border-white/20">
          <h1 className="text-3xl font-black text-center mb-6 text-emerald-400">CLOSE MASTER</h1>
          <input className="w-full p-4 bg-gray-900 rounded-xl mb-4 border border-gray-700" placeholder="Name" value={playerName} onChange={e => setPlayerName(e.target.value)} />
          <input className="w-full p-4 bg-gray-900 rounded-xl mb-6 border border-gray-700 uppercase" placeholder="Room ID" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
          <button onClick={createRoom} className="w-full py-4 bg-emerald-600 rounded-xl font-bold mb-3">CREATE</button>
          <button onClick={joinRoom} className="w-full py-4 bg-sky-600 rounded-xl font-bold">JOIN</button>
        </div>
      </div>
    );
  }

  const me = game?.players.find(p => p.id === game.youId);
  const myTurn = game?.started && game?.turnId === game.youId;

  return (
    <div className="min-h-screen text-white relative flex flex-col items-center p-4 overflow-hidden">
      <video className="fixed inset-0 w-full h-full object-cover -z-10" src={bgTheme.file} autoPlay muted loop />
      
      {/* Result Overlay */}
      {showResultOverlay && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6">
          <div className="bg-gray-900 border-2 border-amber-500 p-6 rounded-3xl w-full max-w-sm text-center">
            <h2 className="text-amber-500 font-bold mb-2">ROUND RESULTS</h2>
            <h1 className="text-2xl font-black mb-4">{winnerName} Won!</h1>
            <div className="space-y-2 mb-6">
              {game.players.map(p => (
                <div key={p.id} className="flex justify-between bg-white/5 p-2 rounded-lg">
                  <span className={p.score >= 500 ? "text-red-500 font-bold" : ""}>{p.name}</span>
                  <span className="font-bold">+{p.lastRoundPoints} ({p.score})</span>
                </div>
              ))}
            </div>
            <button onClick={handleContinue} className="w-full py-3 bg-amber-600 rounded-xl font-bold">
              {game?.isGameOver ? "RESET GAME" : "CONTINUE"}
            </button>
          </div>
        </div>
      )}

      {/* Game Header */}
      <div className="w-full max-w-md flex justify-between bg-black/60 p-3 rounded-2xl mb-4 border border-white/10">
        <div>
          <p className="text-[10px] text-gray-400 uppercase">Room: {game?.roomId}</p>
          <p className="font-black text-emerald-400">Round {game?.roundNumber}</p>
        </div>
        <button onClick={() => setBgTheme(BG_THEMES[(BG_THEMES.findIndex(t => t.id === bgTheme.id) + 1) % BG_THEMES.length])} className="px-3 bg-white/10 rounded-lg text-xs">🎨 Theme</button>
      </div>

      {/* Players */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-md mb-6">
        {game?.players.map(p => (
          <div key={p.id} className={`p-2 rounded-xl border-2 ${game.turnId === p.id ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/5 bg-black/40'}`}>
            <p className="text-sm font-bold truncate">{p.name}</p>
            <p className="text-[10px] text-gray-400">{p.handSize} Cards | {p.score} Pts</p>
            {game.turnId === p.id && <p className="text-[10px] text-yellow-400 font-black">TURN: {turnTimeLeft}s</p>}
          </div>
        ))}
      </div>

      {/* Discard Pile (Open Card) */}
      {game?.started && (
        <div className="flex flex-col items-center mb-8">
          <p className="text-[10px] text-gray-400 mb-2 uppercase tracking-widest">Discard</p>
          <div onClick={() => drawCard(true)} className={`w-20 h-28 rounded-2xl border-2 bg-black/80 flex items-center justify-center transition-all ${myTurn && !me?.hasDrawn ? 'border-yellow-400 scale-110 shadow-[0_0_20px_rgba(250,204,21,0.5)]' : 'border-white/20'}`}>
            <span className={`text-5xl font-black ${getCardColor(game.discardTop)}`}>{game.discardTop?.rank === "JOKER" ? "JKR" : game.discardTop?.rank}</span>
          </div>
        </div>
      )}

      {/* Hand & Actions */}
      <div className="mt-auto w-full max-w-md">
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {me?.hand.map(c => (
            <div key={c.id} onClick={() => setSelectedIds(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
              className={`w-16 h-24 rounded-2xl border-2 bg-black/90 flex items-center justify-center transition-all ${selectedIds.includes(c.id) ? 'border-pink-500 -translate-y-4 shadow-lg scale-110' : 'border-white/20'}`}>
              <span className={`text-4xl font-black ${getCardColor(c)}`}>{c.rank === "JOKER" ? "JKR" : c.rank}</span>
            </div>
          ))}
        </div>
        
        {myTurn && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <button onClick={() => socket.emit("action_draw", { roomId: game.roomId, fromDiscard: false })} disabled={me?.hasDrawn} className="py-4 bg-sky-600 rounded-xl font-black disabled:opacity-50">DRAW</button>
            <button onClick={() => socket.emit("action_drop", { roomId: game.roomId, selectedIds })} disabled={selectedIds.length === 0} className="py-4 bg-emerald-600 rounded-xl font-black disabled:opacity-50">DROP</button>
            <button onClick={() => { if (window.confirm("CLOSE?")) socket.emit("action_close", { roomId: game.roomId }); }} className="py-4 bg-pink-600 rounded-xl font-black">CLOSE</button>
          </div>
        )}
        
        {screen === "lobby" && isHost && (
          <button onClick={() => socket.emit("start_round", { roomId: game.roomId })} className="w-full py-5 bg-emerald-600 rounded-2xl font-black text-xl mb-4">START GAME</button>
        )}
      </div>
    </div>
  );
}
