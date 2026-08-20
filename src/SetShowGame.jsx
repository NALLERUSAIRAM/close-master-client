import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://site--close-master-server--t29zpf96vfqv.code.run";

const sortHand = (hand) => {
  if (!hand) return [];
  const rankOrder = { "A": 1, "2": 2, "3": 3, "4": 4, "5": 5, "6": 6, "7": 7, "8": 8, "9": 9, "10": 10, "J": 11, "Q": 12, "K": 13, "JOKER": 14 };
  return [...hand].sort((a, b) => (rankOrder[a.rank] || 0) - (rankOrder[b.rank] || 0));
};

const getCardBg = (card) => {
  if (!card) return "bg-gray-800 border-gray-600";
  if (card.rank === "JOKER") return "bg-gradient-to-tr from-yellow-400 via-red-500 to-blue-500 text-white border-yellow-300";
  switch (card.suit) {
    case "♥": return "bg-red-600 text-white border-red-400";
    case "♦": return "bg-yellow-500 text-black border-yellow-300";
    case "♣": return "bg-blue-600 text-white border-blue-400";
    case "♠": return "bg-emerald-600 text-white border-emerald-400";
    default: return "bg-purple-600 text-white border-purple-400";
  }
};

const Card = ({ card, isSelected, onClick, isMiddle, showBack }) => {
  if (showBack) {
    return (
      <div className={`bg-gradient-to-br from-gray-900 via-slate-900 to-black border-2 border-pink-500/80 rounded-xl flex items-center justify-center shadow-xl select-none ${isMiddle ? 'w-16 h-24 sm:w-20 sm:h-28' : 'w-10 h-16 sm:w-12 sm:h-18'}`}>
        <div className="w-[85%] h-[85%] border border-pink-500/30 rounded-lg flex items-center justify-center bg-gradient-to-tr from-pink-950 via-rose-950 to-purple-950 shadow-inner">
          <span className="text-pink-400 text-xs font-black">♠️</span>
        </div>
      </div>
    );
  }

  if (!card) return <div className={`border-2 border-dashed border-white/20 rounded-xl ${isMiddle ? 'w-16 h-24 sm:w-20 sm:h-28' : 'w-12 h-20 sm:w-16 sm:h-24'}`} />;

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border-2 flex flex-col justify-between p-1 transition-all cursor-pointer select-none shadow-xl ${getCardBg(card)} 
      ${isMiddle ? 'w-16 h-24 sm:w-20 sm:h-28' : 'w-12 h-20 sm:w-16 sm:h-24'} 
      ${isSelected ? '-translate-y-4 z-30 ring-4 ring-pink-300' : 'hover:-translate-y-1'}`}
    >
      <div className="flex flex-col items-start leading-none font-black text-[10px] sm:text-xs">
        <span>{card.rank}</span>
        <span>{card.suit}</span>
      </div>
      <div className="self-center w-7 h-10 sm:w-10 sm:h-14 bg-white/90 rounded-full flex items-center justify-center shadow-md">
        <span className={`text-sm sm:text-lg font-black ${card.suit === '♥' || card.suit === '♦' ? 'text-red-600' : 'text-gray-900'}`}>
          {card.rank === "JOKER" ? "🃏" : card.rank}
        </span>
      </div>
    </div>
  );
};

export default function SetShowGame({ playerName, roomAction, onExit }) {
  const [socket, setSocket] = useState(null);
  const [game, setGame] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const playerId = useRef(localStorage.getItem("cmp_id") || Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    localStorage.setItem("cmp_id", playerId);
    const s = io(SERVER_URL, { transports: ["polling", "websocket"] });
    
    s.on("game_state", (g) => {
      if (g && g.players) {
        g.players.forEach(p => {
          if (p.hand) p.hand = sortHand(p.hand);
        });
      }
      setGame(g);
    });

    s.on("close_result", () => setShowResult(true));
    s.on("show_error", (msg) => { 
      setErrorMsg(msg); 
      setTimeout(() => setErrorMsg(""), 3000); 
    });
    
    if (roomAction?.type === "create") {
      s.emit("create_room", { name: playerName, playerId, gameType: "set_show" });
    } else if (roomAction?.type === "join") {
      s.emit("join_room", { name: playerName, roomId: roomAction.code, playerId, gameType: "set_show" });
    }

    setSocket(s);
    return () => s.disconnect();
  }, [playerId, playerName, roomAction]);

  const me = game?.players.find(p => p.id === game.youId);
  const myTurn = game?.started && game?.turnId === game.youId;
  const opponents = game?.players.filter(p => p.id !== game.youId) || [];

  if (!game) {
    return (
      <div className="h-full w-full flex items-center justify-center text-white relative overflow-hidden">
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0 opacity-80">
          <source src="/gifs/16.mp4" type="video/mp4" />
        </video>
        <div className="w-10 h-10 border-4 border-pink-400 border-t-transparent rounded-full animate-spin z-10"></div>
      </div>
    );
  }

  return (
    <div className="h-full w-full text-white flex flex-col justify-between p-2 overflow-hidden select-none relative">
      {/* Background Video (16.mp4) */}
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
        <source src="/gifs/16.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/40 z-0"></div>

      {/* Header with Dedicated Bonus Button & No Sort/Sound Buttons */}
      <div className="w-full flex justify-between items-center bg-black/60 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-lg z-20">
        <div className="flex items-center gap-2">
          <span className="text-pink-400 font-black text-lg italic uppercase">Set Show</span>
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-bold">ROOM: {game.roomId}</span>
        </div>
        <div className="flex items-center gap-2">
          {me?.bonusUnlocked && (
            <button onClick={() => setShowBonusModal(true)} className="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-amber-600 animate-pulse rounded-xl font-black text-xs uppercase text-black shadow-lg">Bonus 🃏</button>
          )}

          <button onClick={() => setShowHistory(true)} className="px-3 py-1.5 bg-amber-500 rounded-xl font-black text-xs uppercase hover:scale-105">Score</button>
          <button onClick={() => { if (window.confirm("Exit?")) { socket.emit("exit_room"); if (onExit) onExit(); } }} className="px-3 py-1.5 bg-red-600 rounded-xl font-black text-xs uppercase hover:scale-105">Exit</button>
        </div>
      </div>

      {errorMsg && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-red-600 text-white font-bold px-4 py-2 rounded-full z-50 shadow-xl border border-white animate-bounce">
          {errorMsg}
        </div>
      )}

      <div className="flex justify-center gap-3 my-2 px-2 flex-wrap z-10">
        {opponents.map(p => (
          <div key={p.id} className={`flex items-center gap-2 p-2 rounded-2xl border transition-all shadow-lg ${game.turnId === p.id ? 'border-pink-400 bg-pink-400/20 ring-2' : 'border-white/10 bg-black/50'}`}>
            <div className="flex flex-col">
              <span className="font-bold text-[10px] truncate max-w-[70px] uppercase">{p.name}</span>
              <span className="text-[9px] text-amber-400 font-black">{p.score} PTS</span>
            </div>
            {p.bonusUnlocked && p.bonusCard && (
               <div className="scale-75 origin-left">
                  <Card card={p.bonusCard} />
               </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative my-2 z-10">
        {game.started ? (
          <div className="flex flex-col items-center gap-4">
             <div className="flex gap-8 bg-black/50 backdrop-blur-sm p-6 rounded-3xl border border-white/10 shadow-2xl relative">
               <div className="absolute top-2 right-4 text-xs font-black text-yellow-400">⏳ {game.turnTimeLeft}s</div>
               <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => { if (myTurn && !me?.hasDrawn) socket.emit("action_draw", { roomId: game.roomId, fromDiscard: false }); }}>
                 <span className="text-[10px] font-black uppercase text-pink-400">DRAW</span>
                 <Card showBack isMiddle />
               </div>
               <div className="flex flex-col items-center gap-1">
                 <span className="text-[10px] font-black uppercase text-amber-400">DISCARD</span>
                 <Card card={game.discardTop} isMiddle onClick={() => { if (myTurn && !me?.hasDrawn && game.discardTop) socket.emit("action_draw", { roomId: game.roomId, fromDiscard: true }); }} />
               </div>
             </div>
          </div>
        ) : (
          game.hostId === game.youId && (
            <button onClick={() => socket.emit("start_round", { roomId: game.roomId })} className="px-10 py-4 bg-gradient-to-r from-pink-500 to-rose-600 rounded-3xl font-black text-2xl uppercase shadow-2xl animate-pulse border-2 border-white">
              Start Game
            </button>
          )
        )}
      </div>

      <div className="w-full max-w-md mx-auto flex justify-center gap-2 mb-2 px-2 z-10">
        {myTurn ? (
          <>
            <button onClick={() => socket.emit("action_draw", { roomId: game.roomId, fromDiscard: false })} disabled={me?.hasDrawn} className="flex-1 py-3 bg-pink-600 disabled:opacity-40 rounded-xl font-black text-sm uppercase shadow-lg">DRAW</button>
            <button onClick={() => { socket.emit("action_drop", { roomId: game.roomId, selectedIds }); setSelectedIds([]); }} disabled={selectedIds.length !== 1 || !me?.hasDrawn} className="flex-1 py-3 bg-emerald-600 disabled:opacity-40 rounded-xl font-black text-sm uppercase shadow-lg">DROP 1</button>
            <button onClick={() => { if (window.confirm("Sets Ready for Show?")) socket.emit("action_show_set", { roomId: game.roomId, selectedIds }); }} disabled={selectedIds.length !== 1 || !me?.hasDrawn} className="flex-1 py-3 bg-gradient-to-r from-yellow-500 to-amber-600 disabled:opacity-40 rounded-xl font-black text-sm uppercase shadow-lg border border-white">SHOW! 🏆</button>
          </>
        ) : (
          <div className="w-full text-center py-2 bg-black/50 rounded-xl border border-white/10 italic text-[10px] font-black uppercase text-yellow-400">
            ⏳ {game.turnTimeLeft}s : Waiting for turn...
          </div>
        )}
      </div>

      <div className="w-full flex justify-center items-end pb-2 overflow-x-auto no-scrollbar px-4 pt-4 z-10">
        <div className="flex -space-x-3 sm:-space-x-2">
          {me?.hand.map(c => (
            <div key={c.id} className="relative transition-transform hover:-translate-y-6 hover:z-40">
               <Card card={c} isSelected={selectedIds.includes(c.id)} onClick={() => setSelectedIds(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} />
            </div>
          ))}
        </div>
      </div>

      {showBonusModal && me?.bonusUnlocked && me?.bonusCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-gradient-to-b from-gray-900 to-black p-6 rounded-3xl border-2 border-yellow-400 shadow-[0_0_50px_rgba(250,204,21,0.3)] w-full max-w-xs text-center flex flex-col items-center">
            <span className="text-yellow-400 font-black text-xs uppercase tracking-widest mb-2">Secret Bonus Card</span>
            <p className="text-[11px] text-gray-400 mb-6">4-card set unlock ayinappudu vachina bonus card idi!</p>
            
            <div className="scale-125 my-4">
              <Card card={me.bonusCard} />
            </div>

            <button onClick={() => setShowBonusModal(false)} className="w-full mt-6 py-3 bg-yellow-500 text-black rounded-xl font-black uppercase text-xs tracking-wider hover:bg-yellow-400 transition">
              Close
            </button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 p-6 rounded-3xl border-2 border-pink-400 shadow-2xl w-full max-w-sm text-center">
            <h2 className="text-2xl font-black text-pink-400 mb-4 uppercase">Score Board</h2>
            <div className="space-y-2 mb-6 max-h-60 overflow-y-auto">
              {game.players.map(p => (
                <div key={p.id} className="flex justify-between py-2 border-b border-white/10">
                  <span className="uppercase font-bold">{p.name}</span>
                  <span className="text-yellow-400 font-black">{p.score} PTS</span>
                </div>
              ))}
            </div>
            <button onClick={() => setShowHistory(false)} className="w-full py-3 bg-pink-500 rounded-xl font-black uppercase text-white">Close</button>
          </div>
        </div>
      )}

      {showResult && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
            <div className="bg-gray-900 p-6 rounded-3xl border-2 border-pink-400 shadow-2xl w-full max-w-sm text-center">
              <h2 className="text-3xl font-black text-pink-400 mb-4 uppercase">Round Over</h2>
              {game.players.map(p => (
                <div key={p.id} className="flex justify-between py-2 border-b border-white/10">
                  <span className="uppercase">{p.name}</span>
                  <span className="text-red-400">+{p.lastRoundPoints} Penalty</span>
                </div>
              ))}
              <button onClick={() => { setShowResult(false); if (game.hostId === game.youId) socket.emit("start_round", { roomId: game.roomId }); }} className="w-full mt-4 py-3 bg-pink-500 rounded-xl font-black uppercase text-white">
                Next Round
              </button>
            </div>
         </div>
      )}
    </div>
  );
}
