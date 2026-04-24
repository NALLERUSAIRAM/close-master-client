import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://site--close-master-server--t29zpf96vfqv.code.run";
const BG_THEMES = [{ id: "t15", file: "/gifs/15.mp4" }, { id: "t16", file: "/gifs/16.mp4" }];

const getCardStyle = (c) => {
  if (!c) return "border-white/10 text-white";
  if (c.rank === "JOKER") return "border-yellow-400 text-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.4)]";
  const isRed = c.suit === "♥" || c.suit === "♦";
  return isRed ? "border-pink-500 text-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.4)]" : "border-cyan-400 text-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]";
};

const Card = ({ card, isSelected, onClick, isMiddle }) => {
  if (!card) return <div className={`bg-white/5 border-2 border-dashed border-white/10 rounded-lg ${isMiddle ? 'w-16 h-24' : 'w-12 h-18'}`} />;
  return (
    <div onClick={onClick} className={`relative bg-black/95 border-2 rounded-lg flex flex-col justify-between p-1 transition-all cursor-pointer select-none ${getCardStyle(card)} ${isMiddle ? 'w-16 h-24' : 'w-[13%] h-18'} ${isSelected ? '-translate-y-3 scale-105 z-20 !border-white shadow-[0_0_10px_white]' : ''}`}>
      <div className="flex flex-col items-start leading-none font-black text-[8px]"><span>{card.rank}</span><span className="text-[6px]">{card.suit}</span></div>
      <div className="text-base self-center">{card.rank === "JOKER" ? "🃏" : card.suit}</div>
      <div className="flex flex-col items-end leading-none rotate-180 font-black text-[8px]"><span>{card.rank}</span><span className="text-[6px]">{card.suit}</span></div>
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
  const [bg, setBg] = useState(BG_THEMES[0]);

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

  if (!game) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white p-6">
      <h1 className="text-4xl font-black text-emerald-400 mb-8 italic">CLOSE MASTER</h1>
      <div className="w-full max-w-xs space-y-4">
        <input className="w-full p-4 bg-gray-900 rounded-xl border border-white/10 text-lg font-bold" placeholder="Name" value={playerName} onChange={e => setPlayerName(e.target.value)} />
        <input className="w-full p-4 bg-gray-900 rounded-xl border border-white/10 text-center uppercase tracking-widest text-xl font-black" placeholder="ROOM ID" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
        <button onClick={() => { if(playerName) socket.emit("create_room", { name: playerName, playerId }); }} className="w-full py-4 bg-emerald-600 rounded-xl font-black">CREATE</button>
        <button onClick={() => { if(playerName && joinCode) socket.emit("join_room", { name: playerName, roomId: joinCode.toUpperCase(), playerId }); }} className="w-full py-4 bg-sky-600 rounded-xl font-black">JOIN</button>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full text-white flex flex-col items-center p-2 overflow-hidden select-none relative font-sans">
      <video className="fixed inset-0 w-full h-full object-cover -z-10 opacity-50" src={bg.file} autoPlay muted loop playsInline />
      
      {/* Header - Super Compact */}
      <div className="w-full max-w-md flex justify-between items-center bg-black/70 p-1.5 rounded-xl border border-white/10 mb-1 backdrop-blur-md">
        <div className="pl-1"><p className="text-[7px] text-gray-400 font-bold uppercase">ID: {game.roomId}</p><p className="text-xs font-black text-emerald-400 italic leading-none">Round {game.roundNumber}</p></div>
        <div className="flex gap-1.5">
          <button onClick={() => setShowHistory(true)} className="px-2 py-1 bg-amber-500 rounded-lg font-black text-[9px]">📊 POINTS</button>
          <button onClick={() => setBg(BG_THEMES[bg.id === "t15" ? 1 : 0])} className="p-1 bg-white/10 rounded-lg text-sm">🎨</button>
        </div>
      </div>

      {/* Players - Tight Grid */}
      <div className="grid grid-cols-2 gap-1.5 w-full max-w-md">
        {game.players.map(p => (
          <div key={p.id} className={`px-2 py-1.5 rounded-xl border ${game.turnId === p.id ? 'border-yellow-400 bg-yellow-400/20' : 'border-white/5 bg-black/50'}`}>
            <p className="font-black text-[8px] uppercase truncate opacity-60 leading-none mb-1">{p.name}</p>
            <p className="text-amber-400 text-xs font-black leading-none">{p.score} <span className="text-[7px] text-gray-500 font-normal">PTS</span></p>
          </div>
        ))}
      </div>

      {/* Middle Area - Removed Empty Space */}
      {game.started && (
        <div className="flex-1 flex flex-col items-center justify-center -my-4">
          <p className="text-[7px] tracking-[0.2em] text-gray-500 mb-1 uppercase font-black">Middle</p>
          <Card card={game.discardTop} isMiddle onClick={() => { if(myTurn && !me?.hasDrawn && game.discardTop) socket.emit("action_draw", { roomId: game.roomId, fromDiscard: true }); }} />
          {game.penaltyCount > 0 && <p className="mt-1 px-2 py-0.5 bg-red-600 rounded-full text-[8px] font-black animate-bounce shadow-lg">+{game.penaltyCount} PENDING</p>}
        </div>
      )}

      {/* Action Area - Shifted Up */}
      <div className="w-full max-w-md pb-2 mt-auto">
        <div className="flex flex-wrap justify-center gap-1 mb-3">
          {me?.hand.map(c => <Card key={c.id} card={c} isSelected={selectedIds.includes(c.id)} onClick={() => setSelectedIds(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} />)}
        </div>
        
        {myTurn ? (
          <div className="grid grid-cols-3 gap-1.5 px-1">
            <button onClick={() => socket.emit("action_draw", { roomId: game.roomId, fromDiscard: false })} disabled={me.hasDrawn} className="py-2.5 bg-sky-600 rounded-xl font-black text-xs shadow-md disabled:opacity-30 uppercase">Draw</button>
            <button onClick={() => { socket.emit("action_drop", { roomId: game.roomId, selectedIds }); setSelectedIds([]); }} disabled={selectedIds.length === 0} className="py-2.5 bg-emerald-600 rounded-xl font-black text-xs shadow-md disabled:opacity-30 uppercase">Drop</button>
            <button onClick={() => { if(window.confirm("CLOSE?")) socket.emit("action_close", { roomId: game.roomId }); }} className="py-2.5 bg-pink-600 rounded-xl font-black text-xs shadow-md uppercase">Close</button>
          </div>
        ) : game.hostId === game.youId && !game.started && (
          <button onClick={() => socket.emit("start_round", { roomId: game.roomId })} className="w-full py-3.5 bg-emerald-600 rounded-2xl font-black text-lg">START GAME</button>
        )}
      </div>

      {/* Result Popup - Optimized for height */}
      {showResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xs text-center">
            <h2 className="text-2xl font-black text-yellow-400 mb-3 italic uppercase">Round Over</h2>
            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 mb-4 max-h-[40vh] overflow-y-auto">
              {game.players.map(p => (
                <div key={p.id} className="flex justify-between py-2 border-b border-white/5 last:border-0 font-bold">
                  <span className="text-xs text-gray-300 uppercase">{p.name}</span>
                  <span className="text-base text-emerald-400">+{p.lastRoundPoints}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { setShowResult(false); if(game.hostId === game.youId) socket.emit("start_round", { roomId: game.roomId }); }} className="w-full py-3 bg-emerald-600 rounded-xl font-black text-base">NEXT ROUND</button>
          </div>
        </div>
      )}

      {/* History Table - Compact */}
      {showHistory && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-2">
          <div className="bg-gray-900 w-full max-w-xs rounded-2xl border border-amber-500/30 p-3 max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-3 px-1"><h3 className="text-base font-black text-amber-500 uppercase italic">Score</h3><button onClick={() => setShowHistory(false)} className="text-2xl text-gray-500">&times;</button></div>
            <div className="overflow-auto flex-1 italic text-[10px]">
              <table className="w-full text-left font-bold">
                <thead className="sticky top-0 bg-gray-900"><tr className="border-b border-white/10 text-gray-400 uppercase"><th className="pb-1">RD</th>{game.players.map(p => <th key={p.id} className="pb-1">{p.name}</th>)}</tr></thead>
                <tbody>
                  {game.roundHistory.map((h, i) => (<tr key={i} className="border-b border-white/5"><td className="py-1.5 text-gray-500">#{h.round}</td>{game.players.map(p => <td key={p.id} className="py-1.5">{h.points[p.name]}</td>)}</tr>))}
                  <tr className="text-amber-400 text-sm font-black uppercase sticky bottom-0 bg-gray-900"><td className="pt-2">Total</td>{game.players.map(p => <td key={p.id} className="pt-2">{p.score}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
