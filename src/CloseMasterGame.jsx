import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://site--close-master-server--t29zpf96vfqv.code.run";

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
      <div className={`bg-gradient-to-br from-gray-900 to-black border-2 border-amber-400 rounded-xl flex items-center justify-center shadow-xl select-none ${isMiddle ? 'w-16 h-24 sm:w-20 sm:h-28' : 'w-10 h-16 sm:w-12 sm:h-18'}`}>
        <div className="w-[80%] h-[70%] border border-amber-400/40 rounded-lg flex items-center justify-center bg-red-700 font-black text-[8px] sm:text-[10px] text-yellow-300 -rotate-12 shadow-inner">
          UNO
        </div>
      </div>
    );
  }

  if (!card) {
    return <div className={`border-2 border-dashed border-white/20 rounded-xl ${isMiddle ? 'w-16 h-24 sm:w-20 sm:h-28' : 'w-14 h-22 sm:w-16 sm:h-24'}`} />;
  }

  return (
    <div
      onClick={onClick}
      className={`relative rounded-xl border-2 flex flex-col justify-between p-1.5 transition-all cursor-pointer select-none shadow-xl ${getCardBg(card)} 
      ${isMiddle ? 'w-16 h-24 sm:w-20 sm:h-28' : 'w-14 h-22 sm:w-16 sm:h-24'} 
      ${isSelected ? '-translate-y-4 scale-110 z-30 ring-4 ring-yellow-300 shadow-[0_0_15px_rgba(253,224,71,0.8)]' : 'hover:-translate-y-1'}`}
    >
      <div className="flex flex-col items-start leading-none font-black text-xs drop-shadow">
        <span>{card.rank}</span>
        <span className="text-[10px]">{card.suit}</span>
      </div>

      <div className="self-center w-9 h-14 sm:w-11 sm:h-16 bg-white/90 rounded-[50%] -rotate-[25deg] flex items-center justify-center shadow-md">
        <span className={`text-base sm:text-lg font-black italic rotate-[25deg] ${card.suit === '♥' || card.suit === '♦' ? 'text-red-600' : 'text-gray-900'}`}>
          {card.rank === "JOKER" ? "🃏" : card.rank}
        </span>
      </div>

      <div className="flex flex-col items-end leading-none rotate-180 font-black text-xs drop-shadow">
        <span>{card.rank}</span>
        <span className="text-[10px]">{card.suit}</span>
      </div>
    </div>
  );
};

export default function CloseMasterGame() {
  const [socket, setSocket] = useState(null);
  const [game, setGame] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const playerId = useRef(localStorage.getItem("cmp_id") || Math.random().toString(36).slice(2)).current;

  useEffect(() => {
    localStorage.setItem("cmp_id", playerId);
    const s = io(SERVER_URL, { transports: ["polling", "websocket"] });
    s.on("game_state", setGame);
    s.on("close_result", () => setShowResult(true));
    setSocket(s);
    return () => s.disconnect();
  }, [playerId]);

  const me = game?.players.find(p => p.id === game.youId);
  const myTurn = game?.started && game?.turnId === game.youId;
  const opponents = game?.players.filter(p => p.id !== game.youId) || [];

  const handleExit = () => {
    if (window.confirm("Game nunchi exit avvalani anukuntunnara?")) {
      socket.emit("exit_room");
      window.location.reload();
    }
  };

  if (!game) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950 via-purple-900 to-black text-white p-6 font-sans">
      <div className="text-center mb-8">
        <h1 className="text-5xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 tracking-wider uppercase italic drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">
          CLOSE MASTER
        </h1>
        <p className="text-xs uppercase tracking-widest text-yellow-300 font-bold mt-2">UNO Style Multiplayer Experience</p>
      </div>

      <div className="w-full max-w-sm bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-2xl flex flex-col gap-4">
        <input 
          className="p-4 bg-black/60 rounded-2xl border border-yellow-400/40 text-lg font-bold outline-none text-center focus:border-yellow-400 transition" 
          placeholder="Nee Name Type Cheyyi" 
          value={playerName} 
          onChange={e => setPlayerName(e.target.value)} 
        />
        <input 
          className="p-4 bg-black/60 rounded-2xl border border-yellow-400/40 text-center uppercase tracking-widest text-xl font-black outline-none focus:border-yellow-400 transition" 
          placeholder="ROOM CODE" 
          value={joinCode} 
          onChange={e => setJoinCode(e.target.value)} 
        />
        
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button 
            onClick={() => playerName && socket.emit("create_room", { name: playerName, playerId })} 
            className="py-4 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-2xl font-black text-lg uppercase shadow-lg hover:brightness-110 active:scale-95 transition"
          >
            Create
          </button>
          <button 
            onClick={() => playerName && joinCode && socket.emit("join_room", { name: playerName, roomId: joinCode.toUpperCase(), playerId })} 
            className="py-4 bg-gradient-to-b from-sky-400 to-sky-600 rounded-2xl font-black text-lg uppercase shadow-lg hover:brightness-110 active:scale-95 transition"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full text-white flex flex-col justify-between p-3 overflow-hidden select-none relative font-sans bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-indigo-950 to-black">
      
      {/* Top Header */}
      <div className="w-full flex justify-between items-center bg-black/40 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-lg z-20">
        <div className="flex items-center gap-2">
          <span className="text-yellow-400 font-black text-lg italic tracking-tighter">CLOSE MASTER</span>
          <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-bold uppercase text-gray-300">Room: {game.roomId}</span>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowHistory(true)} className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 rounded-xl font-black text-xs shadow-md uppercase hover:scale-105 transition">Score</button>
          <button onClick={handleExit} className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-pink-600 rounded-xl font-black text-xs shadow-md uppercase hover:scale-105 transition">Exit</button>
        </div>
      </div>

      {/* Opponents Area */}
      <div className="w-full flex justify-center items-center gap-4 my-2 px-2 overflow-x-auto no-scrollbar">
        {opponents.map(p => (
          <div key={p.id} className={`flex flex-col items-center gap-1 p-2 rounded-2xl border transition-all shadow-lg min-w-[80px] ${game.turnId === p.id ? 'border-yellow-400 bg-yellow-400/20 ring-2 ring-yellow-400' : 'border-white/10 bg-black/40'}`}>
            <div className="flex flex-col items-center">
              <span className="font-bold text-[10px] truncate max-w-[80px] uppercase text-gray-300">{p.name}</span>
              <span className="text-[9px] text-amber-400 font-black">{p.score} PTS</span>
            </div>
            
            {game.started && (
              <div className="relative flex -space-x-4 mt-2 mb-1">
                 {Array.from({ length: Math.min(p.handSize, 5) }).map((_, i) => (
                   <div key={i} className={`transform scale-75 origin-bottom ${i % 2 === 0 ? 'rotate-3' : '-rotate-3'}`}>
                     <Card showBack />
                   </div>
                 ))}
                 {p.handSize > 0 && (
                    <div className="absolute -top-3 -right-3 bg-gradient-to-br from-yellow-300 to-amber-500 text-black rounded-full w-6 h-6 flex items-center justify-center text-[11px] font-black border-2 border-black shadow-lg z-10">
                      {p.handSize}
                    </div>
                 )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Center Table */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-2">
        {game.started ? (
          <div className="flex items-center justify-center gap-8 bg-black/30 p-6 rounded-3xl border border-white/10 backdrop-blur-sm shadow-2xl">
            <div className="flex flex-col items-center gap-1 cursor-pointer" onClick={() => { if (myTurn && !me?.hasDrawn) socket.emit("action_draw", { roomId: game.roomId, fromDiscard: false }); }}>
              <span className="text-[10px] font-black uppercase tracking-wider text-yellow-400">DRAW DECK</span>
              <div className="relative hover:scale-105 transition-transform">
                <Card showBack isMiddle />
                <div className="absolute top-1 left-1 -z-10"><Card showBack isMiddle /></div>
                <div className="absolute top-2 left-2 -z-20"><Card showBack isMiddle /></div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-pink-400">DISCARD PILE</span>
              <Card 
                card={game.discardTop} 
                isMiddle 
                onClick={() => { if (myTurn && !me?.hasDrawn && game.discardTop) socket.emit("action_draw", { roomId: game.roomId, fromDiscard: true }); }} 
              />
            </div>

            {game.penaltyCount > 0 && (
              <div className="absolute -top-4 px-3 py-1 bg-gradient-to-r from-red-600 to-pink-600 rounded-full text-xs font-black animate-bounce shadow-lg border border-white">
                +{game.penaltyCount} Cards Penalty!
              </div>
            )}
          </div>
        ) : (
          game.hostId === game.youId && (
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={() => socket.emit("start_round", { roomId: game.roomId })} 
                className="px-10 py-4 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600 rounded-3xl font-black text-2xl shadow-2xl animate-pulse uppercase tracking-wider border-2 border-white hover:scale-105 transition"
              >
                Start Game 🚀
              </button>
            </div>
          )
        )}
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md mx-auto flex justify-center gap-3 mb-2 px-2">
        {myTurn ? (
          <>
            <button 
              onClick={() => socket.emit("action_draw", { roomId: game.roomId, fromDiscard: false })} 
              disabled={me?.hasDrawn} 
              className="flex-1 py-3 bg-gradient-to-b from-sky-400 to-sky-600 disabled:opacity-40 rounded-2xl font-black text-sm uppercase shadow-xl border-2 border-white/40 active:scale-95 transition"
            >
              DRAW 🎴
            </button>
            <button 
              onClick={() => { socket.emit("action_drop", { roomId: game.roomId, selectedIds }); setSelectedIds([]); }} 
              disabled={selectedIds.length === 0} 
              className="flex-1 py-3 bg-gradient-to-b from-emerald-400 to-emerald-600 disabled:opacity-40 rounded-2xl font-black text-sm uppercase shadow-xl border-2 border-white/40 active:scale-95 transition"
            >
              DROP ⬇️
            </button>
            <button 
              onClick={() => { if (window.confirm("CLOSE / SHOW chesthara?")) socket.emit("action_close", { roomId: game.roomId }); }} 
              className="flex-1 py-3 bg-gradient-to-b from-pink-500 to-rose-600 rounded-2xl font-black text-sm uppercase shadow-xl border-2 border-white/40 active:scale-95 transition"
            >
              CLOSE 🔥
            </button>
          </>
        ) : (
          <div className="w-full text-center py-2.5 bg-black/40 rounded-2xl border border-white/10 italic text-xs font-black uppercase text-yellow-400/70 tracking-widest animate-pulse">
            Waiting for player turn...
          </div>
        )}
      </div>

      {/* Player Hand */}
      <div className="w-full flex justify-center items-end gap-1 sm:gap-2 pb-2 overflow-x-auto no-scrollbar min-h-[110px]">
        {me?.hand.map(c => (
          <Card 
            key={c.id} 
            card={c} 
            isSelected={selectedIds.includes(c.id)} 
            onClick={() => setSelectedIds(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} 
          />
        ))}
      </div>

      {/* Result Modal */}
      {showResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-lg">
          <div className="w-full max-w-sm text-center bg-gradient-to-b from-gray-900 to-black p-6 rounded-3xl border-2 border-yellow-400 shadow-2xl">
            <h2 className="text-3xl font-black text-yellow-400 mb-4 italic uppercase tracking-wider">Round Finished</h2>
            <div className="flex flex-col gap-2 bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
              {game.players.map(p => (
                <div key={p.id} className="flex justify-between items-center py-2 px-3 bg-black/60 rounded-xl">
                  <span className="text-xs font-bold text-gray-300 uppercase truncate max-w-[100px]">{p.name}</span>
                  <span className="text-base font-black text-emerald-400">+{p.lastRoundPoints} PTS</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => { setShowResult(false); if (game.hostId === game.youId) socket.emit("start_round", { roomId: game.roomId }); }} 
              className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl font-black text-lg shadow-xl uppercase italic hover:scale-105 transition"
            >
              Next Round ➡️
            </button>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-gray-900 w-full max-w-xl rounded-3xl border border-yellow-500/40 p-6 flex flex-col h-[75vh]">
            <div className="flex justify-between items-center mb-4 px-1 italic">
              <h3 className="text-2xl font-black text-yellow-400 uppercase">Score Board</h3>
              <button onClick={() => setShowHistory(false)} className="text-3xl font-bold text-gray-400 hover:text-white">&times;</button>
            </div>
            <div className="overflow-auto flex-1 text-xs font-bold">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-gray-900 border-b border-white/10 text-gray-400 uppercase">
                  <tr>
                    <th className="pb-2">RD</th>
                    {game.players.map(p => <th key={p.id} className="pb-2 text-center">{p.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {game.roundHistory.map((h, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2.5 text-gray-500">#{h.round}</td>
                      {game.players.map(p => <td key={p.id} className="py-2.5 text-center text-white">{h.points[p.name]}</td>)}
                    </tr>
                  ))}
                  <tr className="text-yellow-400 text-sm font-black uppercase sticky bottom-0 bg-gray-900 border-t border-white/20 italic">
                    <td className="pt-3">Total</td>
                    {game.players.map(p => <td key={p.id} className="text-center pt-3">{p.score}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
