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
  if (card.rank === "JOKER") return "text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,1)]";
  const isRed = card.suit === "♥" || card.suit === "♦";
  return isRed ? "text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,1)]" : "text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,1)]";
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
  }, [playerId]);

  useEffect(() => {
    if (game?.started) {
      setTurnTimeLeft(20);
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      turnTimerRef.current = setInterval(() => setTurnTimeLeft(p => p <= 1 ? 0 : p - 1), 1000);
    }
    return () => clearInterval(turnTimerRef.current);
  }, [game?.started, game?.currentIndex, game?.turnId]);

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
      <div className="fixed inset-0 flex items-center justify-center text-white select-none">
        <video className="fixed inset-0 w-full h-full object-cover -z-10 opacity-50" src="/gifs/15.mp4" autoPlay muted loop playsInline />
        <div className="bg-black/90 p-8 rounded-[40px] w-full max-w-sm border border-white/20 shadow-2xl">
          <h1 className="text-4xl font-black text-center mb-8 text-emerald-400">CLOSE MASTER</h1>
          <input className="w-full p-5 bg-gray-900 rounded-2xl mb-4 border-2 border-gray-700 text-xl font-bold select-text" placeholder="Name" value={playerName} onChange={e => setPlayerName(e.target.value)} />
          <input className="w-full p-5 bg-gray-900 rounded-2xl mb-6 border-2 border-gray-700 uppercase text-3xl font-black tracking-widest text-center select-text" placeholder="ROOM ID" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
          <button onClick={() => { if(playerName.trim()) socket.emit("create_room", { name: playerName, playerId }, (res) => { localStorage.setItem("cmp_room_id", res.roomId); }); }} className="w-full py-5 bg-emerald-600 rounded-2xl font-black text-2xl mb-4 shadow-lg active:scale-95 transition-transform">CREATE</button>
          <button onClick={() => { if(playerName.trim() && joinCode.trim()) socket.emit("join_room", { name: playerName, roomId: joinCode.toUpperCase(), playerId }, (res) => { if(res.error) alert(res.error); else localStorage.setItem("cmp_room_id", res.roomId); }); }} className="w-full py-5 bg-sky-600 rounded-2xl font-black text-2xl shadow-lg active:scale-95 transition-transform">JOIN</button>
        </div>
      </div>
    );
  }

  const me = game?.players.find(p => p.id === game.youId);
  const myTurn = game?.started && game?.turnId === game.youId;

  return (
    <div className="min-h-screen text-white relative flex flex-col items-center p-4 overflow-hidden select-none touch-none">
      <video className="fixed inset-0 w-full h-full object-cover -z-10" src={bgTheme.file} autoPlay muted loop playsInline />
      
      {/* Selection Block Styles */}
      <style dangerouslySetInnerHTML={{__html: `
        * { -webkit-user-select: none; user-select: none; -webkit-touch-callout: none; }
        input { -webkit-user-select: text; user-select: text; }
      `}} />

      {/* Game Header */}
      <div className="w-full max-w-2xl flex justify-between items-center bg-black/70 p-5 rounded-[30px] border-2 border-white/10 mb-6 backdrop-blur-md">
        <div className="flex flex-col">
          <p className="text-sm text-gray-400 font-black tracking-widest leading-none">ROOM: <span className="text-white text-2xl ml-1">{game?.roomId}</span></p>
          <p className="text-4xl font-black text-emerald-400 mt-2 leading-none">Round {game?.roundNumber}</p>
        </div>
        <button onClick={() => setBgTheme(BG_THEMES[(BG_THEMES.findIndex(t => t.id === bgTheme.id) + 1) % BG_THEMES.length])} className="p-5 bg-white/10 rounded-2xl border border-white/20 active:scale-90 transition-transform text-2xl">🎨</button>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl mb-auto">
        {game?.players.map(p => (
          <div key={p.id} className={`p-5 rounded-[30px] border-4 transition-all ${game.turnId === p.id ? 'border-yellow-400 bg-yellow-400/20 shadow-[0_0_20px_rgba(250,204,21,0.4)] scale-105' : 'border-white/5 bg-black/50'}`}>
            <p className="text-2xl font-black truncate text-white uppercase tracking-tighter leading-tight">{p.name}</p>
            <div className="flex justify-between items-end mt-1">
              <p className="text-xs font-bold text-gray-400 uppercase">{p.handSize} Cards</p>
              <p className="text-2xl font-black text-amber-400">{p.score} <span className="text-[10px] text-gray-500">PTS</span></p>
            </div>
            {game.turnId === p.id && (
              <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 transition-all duration-1000" style={{ width: `${(turnTimeLeft/20)*100}%` }}></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Center Discard Pile */}
      {game?.started && (
        <div className="flex flex-col items-center my-10">
          <p className="text-xs font-black text-gray-500 mb-4 uppercase tracking-[0.6em]">Discard</p>
          <div onClick={() => { if(myTurn && !me?.hasDrawn) socket.emit("action_draw", { roomId: game.roomId, fromDiscard: true }); }} 
            className={`w-32 h-44 md:w-40 md:h-56 rounded-[45px] border-[6px] bg-black/90 flex items-center justify-center transition-all cursor-pointer ${myTurn && !me?.hasDrawn ? 'border-yellow-400 scale-110 shadow-[0_0_50px_rgba(250,204,21,0.7)]' : 'border-white/10'}`}>
            <span className={`text-8xl md:text-9xl font-black ${getCardColor(game.discardTop)}`}>{game.discardTop?.rank === "JOKER" ? "JKR" : game.discardTop?.rank}</span>
          </div>
        </div>
      )}

      {/* Hand & Actions */}
      <div className="w-full max-w-2xl mt-auto pb-6">
        <div className="flex flex-wrap justify-center gap-3 mb-10 px-2">
          {me?.hand.map(c => (
            <div key={c.id} onClick={() => setSelectedIds(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
              className={`w-20 h-32 md:w-28 md:h-40 rounded-[30px] border-4 bg-black/95 flex items-center justify-center transition-all cursor-pointer ${selectedIds.includes(c.id) ? 'border-pink-500 -translate-y-10 scale-115 shadow-[0_0_40px_rgba(236,72,153,0.6)] z-20' : 'border-white/10 hover:border-white/30'}`}>
              <span className={`text-6xl md:text-7xl font-black ${getCardColor(c)}`}>{c.rank === "JOKER" ? "JKR" : c.rank}</span>
            </div>
          ))}
        </div>
        
        {myTurn && (
          <div className="grid grid-cols-3 gap-4">
            <button onClick={() => socket.emit("action_draw", { roomId: game.roomId, fromDiscard: false })} disabled={me?.hasDrawn} className="py-6 bg-sky-600 rounded-[30px] font-black text-2xl shadow-xl active:scale-90 disabled:opacity-20 uppercase">Draw</button>
            <button onClick={() => socket.emit("action_drop", { roomId: game.roomId, selectedIds })} disabled={selectedIds.length === 0} className="py-6 bg-emerald-600 rounded-[30px] font-black text-2xl shadow-xl active:scale-90 disabled:opacity-20 uppercase">Drop</button>
            <button onClick={() => { if (window.confirm("CLOSE?")) socket.emit("action_close", { roomId: game.roomId }); }} className="py-6 bg-pink-600 rounded-[30px] font-black text-2xl shadow-xl active:scale-90 uppercase">Close</button>
          </div>
        )}
        
        {screen === "lobby" && isHost && (
          <button onClick={() => socket.emit("start_round", { roomId: game.roomId })} className="w-full py-8 bg-emerald-600 rounded-[40px] font-black text-4xl shadow-2xl active:scale-95 transition-all uppercase tracking-tighter">Start Game</button>
        )}
      </div>
    </div>
  );
}
