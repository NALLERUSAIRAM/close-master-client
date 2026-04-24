import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://site--close-master-server--t29zpf96vfqv.code.run";

const BG_THEMES = [
  { id: "t15", name: "Theme 15", file: "/gifs/15.mp4" },
  { id: "t16", name: "Theme 16", file: "/gifs/16.mp4" },
  { id: "t17", name: "Theme 17", file: "/gifs/17.mp4" },
];

// కార్డు కలర్ మరియు నియాన్ గ్లో లాజిక్
function getCardStyle(card) {
  if (!card) return "border-white/10 text-white";
  if (card.rank === "JOKER") {
    return "border-yellow-400 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]";
  }
  const isRed = card.suit === "♥" || card.suit === "♦";
  return isRed 
    ? "border-pink-500 text-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]" 
    : "border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]";
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

  // Card Component for Reuse
  const Card = ({ card, isSelected, onClick, size = "normal" }) => {
    if (!card) return null;
    const styleClass = getCardStyle(card);
    const isSmall = size === "small";

    return (
      <div 
        onClick={onClick}
        className={`relative bg-black/90 border-2 rounded-xl flex flex-col justify-between p-2 transition-all cursor-pointer select-none
        ${styleClass} 
        ${isSmall ? 'w-16 h-24' : 'w-24 h-36 md:w-28 md:h-40'} 
        ${isSelected ? '-translate-y-8 scale-110 z-20 !border-white shadow-[0_0_25px_white]' : 'hover:-translate-y-2'}`}
      >
        <div className="flex flex-col items-start leading-none">
          <span className="font-black text-lg">{card.rank === "JOKER" ? "J" : card.rank}</span>
          <span className="text-sm">{card.suit}</span>
        </div>
        
        <div className="text-4xl self-center drop-shadow-lg">
          {card.rank === "JOKER" ? "🃏" : card.suit}
        </div>

        <div className="flex flex-col items-end leading-none rotate-180">
          <span className="font-black text-lg">{card.rank === "JOKER" ? "J" : card.rank}</span>
          <span className="text-sm">{card.suit}</span>
        </div>
      </div>
    );
  };

  if (screen === "welcome") {
    return (
      <div className="fixed inset-0 flex items-center justify-center text-white select-none">
        <video className="fixed inset-0 w-full h-full object-cover -z-10 opacity-40" src="/gifs/15.mp4" autoPlay muted loop playsInline />
        <div className="bg-black/90 p-8 rounded-[40px] w-full max-w-sm border border-white/10 shadow-2xl backdrop-blur-md">
          <h1 className="text-4xl font-black text-center mb-8 text-emerald-400 tracking-tighter">CLOSE MASTER</h1>
          <input className="w-full p-5 bg-white/5 rounded-2xl mb-4 border border-white/10 text-xl font-bold focus:border-emerald-500 outline-none transition-all" placeholder="Enter Name" value={playerName} onChange={e => setPlayerName(e.target.value)} />
          <input className="w-full p-5 bg-white/5 rounded-2xl mb-6 border border-white/10 uppercase text-3xl font-black tracking-[0.2em] text-center focus:border-sky-500 outline-none transition-all" placeholder="ROOM ID" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
          <button onClick={() => { if(playerName.trim()) socket.emit("create_room", { name: playerName, playerId }, (res) => { localStorage.setItem("cmp_room_id", res.roomId); localStorage.setItem("cmp_player_name", playerName); }); }} className="w-full py-5 bg-emerald-600 rounded-2xl font-black text-2xl mb-4 shadow-lg active:scale-95 transition-transform">CREATE</button>
          <button onClick={() => { if(playerName.trim() && joinCode.trim()) socket.emit("join_room", { name: playerName, roomId: joinCode.toUpperCase(), playerId }, (res) => { if(res.error) alert(res.error); else { localStorage.setItem("cmp_room_id", res.roomId); localStorage.setItem("cmp_player_name", playerName); } }); }} className="w-full py-5 bg-sky-600 rounded-2xl font-black text-2xl shadow-lg active:scale-95 transition-transform">JOIN</button>
        </div>
      </div>
    );
  }

  const me = game?.players.find(p => p.id === game.youId);
  const myTurn = game?.started && game?.turnId === game.youId;

  return (
    <div className="min-h-screen text-white relative flex flex-col items-center p-4 overflow-hidden select-none">
      <video className="fixed inset-0 w-full h-full object-cover -z-10" src={bgTheme.file} autoPlay muted loop playsInline />
      
      {/* Game Header */}
      <div className="w-full max-w-2xl flex justify-between items-center bg-black/60 p-4 rounded-[25px] border border-white/10 mb-6 backdrop-blur-lg">
        <div>
          <p className="text-[10px] text-gray-400 font-black tracking-widest">ROOM: <span className="text-white text-lg ml-1">{game?.roomId}</span></p>
          <p className="text-2xl font-black text-emerald-400 italic">Round {game?.roundNumber}</p>
        </div>
        <button onClick={() => setBgTheme(BG_THEMES[(BG_THEMES.findIndex(t => t.id === bgTheme.id) + 1) % BG_THEMES.length])} className="p-3 bg-white/5 rounded-xl border border-white/10 active:scale-90 transition-transform">🎨 Theme</button>
      </div>

      {/* Players Grid */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mb-6">
        {game?.players.map(p => (
          <div key={p.id} className={`p-4 rounded-[25px] border-2 transition-all ${game.turnId === p.id ? 'border-yellow-400 bg-yellow-400/10 shadow-[0_0_15px_rgba(250,204,21,0.3)] scale-[1.02]' : 'border-white/5 bg-black/40'}`}>
            <div className="flex justify-between items-start">
              <p className="text-lg font-black truncate max-w-[100px] uppercase tracking-tighter">{p.name}</p>
              <p className="text-xl font-black text-amber-400">{p.score}<span className="text-[10px] ml-1 opacity-50">PTS</span></p>
            </div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">{p.handSize} Cards</p>
            {game.turnId === p.id && (
              <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-yellow-400 transition-all duration-1000" style={{ width: `${(turnTimeLeft/20)*100}%` }}></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Center Discard Pile */}
      {game?.started && (
        <div className="flex flex-col items-center my-6">
          <div className="relative group">
             <p className="text-[10px] font-black text-center text-gray-500 mb-2 uppercase tracking-[0.4em]">Discard Pile</p>
             <Card 
                card={game.discardTop} 
                onClick={() => { if(myTurn && !me?.hasDrawn) socket.emit("action_draw", { roomId: game.roomId, fromDiscard: true }); }}
             />
          </div>
        </div>
      )}

      {/* Hand & Actions */}
      <div className="w-full max-w-4xl mt-auto pb-6">
        <div className="flex flex-wrap justify-center gap-2 mb-12 px-2">
          {me?.hand.map(c => (
            <Card 
              key={c.id} 
              card={c} 
              isSelected={selectedIds.includes(c.id)}
              onClick={() => setSelectedIds(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
            />
          ))}
        </div>
        
        {myTurn && (
          <div className="grid grid-cols-3 gap-3 px-2 max-w-2xl mx-auto">
            <button onClick={() => socket.emit("action_draw", { roomId: game.roomId, fromDiscard: false })} disabled={me?.hasDrawn} className="py-5 bg-sky-600 rounded-2xl font-black text-xl shadow-xl active:scale-95 disabled:opacity-20 uppercase tracking-tighter">Draw</button>
            <button onClick={() => { socket.emit("action_drop", { roomId: game.roomId, selectedIds }); setSelectedIds([]); }} disabled={selectedIds.length === 0} className="py-5 bg-emerald-600 rounded-2xl font-black text-xl shadow-xl active:scale-95 disabled:opacity-20 uppercase tracking-tighter">Drop</button>
            <button onClick={() => { if (window.confirm("CLOSE?")) socket.emit("action_close", { roomId: game.roomId }); }} className="py-5 bg-pink-600 rounded-2xl font-black text-xl shadow-xl active:scale-95 uppercase tracking-tighter">Close</button>
          </div>
        )}
        
        {screen === "lobby" && isHost && (
          <button onClick={() => socket.emit("start_round", { roomId: game.roomId })} className="w-full py-6 bg-emerald-600 rounded-3xl font-black text-3xl shadow-2xl active:scale-95 transition-all uppercase italic">Start Game</button>
        )}
      </div>

      {/* Result Overlay */}
      {showResultOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-6">
          <div className="text-center">
            <h2 className="text-6xl font-black text-yellow-400 mb-2 italic">WINNER!</h2>
            <p className="text-4xl font-bold text-white mb-10 uppercase tracking-widest">{winnerName}</p>
            <button onClick={() => { setShowResultOverlay(false); if(isHost) socket.emit("start_round", { roomId: game.roomId }); }} className="px-12 py-5 bg-emerald-600 rounded-full font-black text-2xl animate-bounce shadow-[0_0_30px_rgba(16,185,129,0.5)]">CONTINUE</button>
          </div>
        </div>
      )}
    </div>
  );
}
