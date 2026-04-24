import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://site--close-master-server--t29zpf96vfqv.code.run";

const BG_THEMES = [{ id: "t15", file: "/gifs/15.mp4" }, { id: "t16", file: "/gifs/16.mp4" }];

const getCardStyle = (c) => {
  if (!c) return "border-white/10 text-white";
  if (c.rank === "JOKER") return "border-yellow-400 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]";
  const isRed = c.suit === "♥" || c.suit === "♦";
  return isRed ? "border-pink-500 text-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]" : "border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]";
};

const Card = ({ card, isSelected, onClick, isMiddle }) => (
  <div onClick={onClick} className={`relative bg-black/90 border-2 rounded-xl flex flex-col justify-between p-2 transition-all cursor-pointer select-none ${getCardStyle(card)} ${isMiddle ? 'w-28 h-40 shadow-2xl' : 'w-20 h-32 md:w-24 md:h-36'} ${isSelected ? '-translate-y-8 scale-110 z-20 !border-white' : ''}`}>
    <div className="flex flex-col items-start leading-none"><span className="font-black text-sm">{card.rank}</span><span className="text-[10px]">{card.suit}</span></div>
    <div className="text-3xl self-center">{card.rank === "JOKER" ? "🃏" : card.suit}</div>
    <div className="flex flex-col items-end leading-none rotate-180"><span className="font-black text-sm">{card.rank}</span><span className="text-[10px]">{card.suit}</span></div>
  </div>
);

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
    const s = io(SERVER_URL);
    s.on("game_state", setGame);
    s.on("close_result", () => setShowResult(true));
    setSocket(s);
    return () => s.disconnect();
  }, []);

  const me = game?.players.find(p => p.id === game.youId);
  const myTurn = game?.started && game?.turnId === game.youId;

  if (!game) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white p-6">
      <h1 className="text-4xl font-black text-emerald-400 mb-8">CLOSE MASTER</h1>
      <input className="w-full max-w-xs p-4 bg-gray-900 rounded-xl mb-4 border border-white/10" placeholder="Name" value={playerName} onChange={e => setPlayerName(e.target.value)} />
      <input className="w-full max-w-xs p-4 bg-gray-900 rounded-xl mb-6 border border-white/10 uppercase text-center" placeholder="ROOM ID" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
      <button onClick={() => socket.emit("create_room", { name: playerName, playerId })} className="w-full max-w-xs py-4 bg-emerald-600 rounded-xl font-bold mb-3">CREATE</button>
      <button onClick={() => socket.emit("join_room", { name: playerName, roomId: joinCode.toUpperCase(), playerId })} className="w-full max-w-xs py-4 bg-sky-600 rounded-xl font-bold">JOIN</button>
    </div>
  );

  return (
    <div className="min-h-screen text-white flex flex-col items-center p-4 overflow-hidden">
      <video className="fixed inset-0 w-full h-full object-cover -z-10 opacity-50" src={bg.file} autoPlay muted loop />
      
      <div className="w-full max-w-2xl flex justify-between items-center bg-black/60 p-4 rounded-2xl border border-white/10 mb-6 backdrop-blur-md">
        <p className="font-bold">ROOM: {game.roomId} | RD: {game.roundNumber}</p>
        <div className="flex gap-2">
          <button onClick={() => setShowHistory(true)} className="px-3 py-1 bg-amber-500 rounded-lg text-xs font-bold">📊 POINTS</button>
          <button onClick={() => setBg(BG_THEMES[bg.id === "t15" ? 1 : 0])} className="px-3 py-1 bg-white/10 rounded-lg">🎨</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-2xl">
        {game.players.map(p => (
          <div key={p.id} className={`p-3 rounded-2xl border-2 ${game.turnId === p.id ? 'border-yellow-400 bg-yellow-400/10' : 'border-white/5 bg-black/40'}`}>
            <p className="font-black text-sm uppercase truncate">{p.name}</p>
            <p className="text-amber-400 text-lg font-black">{p.score} <span className="text-[10px] text-gray-500">PTS</span></p>
          </div>
        ))}
      </div>

      <div className="my-10 flex flex-col items-center">
        <p className="text-[10px] tracking-[0.3em] text-gray-500 mb-2">MIDDLE CARD</p>
        <Card card={game.discardTop} isMiddle onClick={() => { if(myTurn && !me?.hasDrawn) socket.emit("action_draw", { roomId: game.roomId, fromDiscard: true }); }} />
        {game.penaltyCount > 0 && <p className="mt-2 text-red-500 font-black animate-bounce">+{game.penaltyCount} PENDING</p>}
      </div>

      <div className="mt-auto w-full max-w-4xl pb-6">
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {me?.hand.map(c => <Card key={c.id} card={c} isSelected={selectedIds.includes(c.id)} onClick={() => setSelectedIds(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} />)}
        </div>
        {myTurn ? (
          <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
            <button onClick={() => socket.emit("action_draw", { roomId: game.roomId, fromDiscard: false })} disabled={me.hasDrawn} className="py-4 bg-sky-600 rounded-xl font-bold disabled:opacity-30">DRAW</button>
            <button onClick={() => { socket.emit("action_drop", { roomId: game.roomId, selectedIds }); setSelectedIds([]); }} disabled={selectedIds.length === 0} className="py-4 bg-emerald-600 rounded-xl font-bold disabled:opacity-30">DROP</button>
            <button onClick={() => socket.emit("action_close", { roomId: game.roomId })} className="py-4 bg-pink-600 rounded-xl font-bold">CLOSE</button>
          </div>
        ) : game.hostId === game.youId && !game.started && <button onClick={() => socket.emit("start_round", { roomId: game.roomId })} className="w-full py-4 bg-emerald-600 rounded-xl font-black">START GAME</button>}
      </div>

      {showResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-6">
          <div className="text-center w-full max-w-sm">
            <h2 className="text-4xl font-black text-yellow-400 mb-6">ROUND OVER</h2>
            <div className="bg-white/5 p-4 rounded-2xl mb-6">
              {game.players.map(p => <div key={p.id} className="flex justify-between py-2 border-b border-white/5 last:border-0"><span>{p.name}</span><span className="text-emerald-400">+{p.lastRoundPoints}</span></div>)}
            </div>
            <button onClick={() => { setShowResult(false); if(game.hostId === game.youId) socket.emit("start_round", { roomId: game.roomId }); }} className="w-full py-4 bg-emerald-600 rounded-xl font-bold">NEXT ROUND</button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-lg rounded-3xl p-6 border border-amber-500/50">
            <div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-amber-500">SCORE BOARD</h3><button onClick={() => setShowHistory(false)} className="text-2xl">&times;</button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-white/10"><th>RD</th>{game.players.map(p => <th key={p.id}>{p.name}</th>)}</tr></thead><tbody>{game.roundHistory.map((h, i) => <tr key={i} className="border-b border-white/5"><td className="py-2 opacity-50">#{h.round}</td>{game.players.map(p => <td key={p.id}>{h.points[p.name]}</td>)}</tr>)}</tbody></table></div>
          </div>
        </div>
      )}
    </div>
  );
}
