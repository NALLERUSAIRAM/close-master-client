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

const Card = ({ card, isSelected, onClick, isMiddle }) => {
  if (!card) return <div className={`bg-white/5 border-2 border-dashed border-white/10 rounded-xl ${isMiddle ? 'w-28 h-40' : 'w-20 h-32 md:w-24 md:h-36'}`} />;
  return (
    <div onClick={onClick} className={`relative bg-black/95 border-2 rounded-xl flex flex-col justify-between p-2 transition-all cursor-pointer select-none ${getCardStyle(card)} ${isMiddle ? 'w-28 h-40 shadow-2xl' : 'w-20 h-32 md:w-24 md:h-36'} ${isSelected ? '-translate-y-8 scale-110 z-20 !border-white shadow-[0_0_20px_white]' : ''}`}>
      <div className="flex flex-col items-start leading-none font-black text-sm"><span>{card.rank}</span><span className="text-[10px]">{card.suit}</span></div>
      <div className="text-4xl self-center">{card.rank === "JOKER" ? "🃏" : card.suit}</div>
      <div className="flex flex-col items-end leading-none rotate-180 font-black text-sm"><span>{card.rank}</span><span className="text-[10px]">{card.suit}</span></div>
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
      <h1 className="text-5xl font-black text-emerald-400 mb-10 italic">CLOSE MASTER</h1>
      <div className="w-full max-w-xs space-y-4">
        <input className="w-full p-5 bg-gray-900 rounded-2xl border border-white/10 text-xl font-bold" placeholder="Name" value={playerName} onChange={e => setPlayerName(e.target.value)} />
        <input className="w-full p-5 bg-gray-900 rounded-2xl border border-white/10 text-center uppercase tracking-widest text-2xl font-black" placeholder="ROOM ID" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
        <button onClick={() => { if(playerName) socket.emit("create_room", { name: playerName, playerId }); }} className="w-full py-5 bg-emerald-600 rounded-2xl font-black text-2xl">CREATE</button>
        <button onClick={() => { if(playerName && joinCode) socket.emit("join_room", { name: playerName, roomId: joinCode.toUpperCase(), playerId }); }} className="w-full py-5 bg-sky-600 rounded-2xl font-black text-2xl">JOIN</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-white flex flex-col items-center p-4 overflow-hidden select-none">
      <video className="fixed inset-0 w-full h-full object-cover -z-10 opacity-60" src={bg.file} autoPlay muted loop playsInline />
      
      <div className="w-full max-w-2xl flex justify-between items-center bg-black/70 p-4 rounded-3xl border border-white/10 mb-4 backdrop-blur-md">
        <div><p className="text-[10px] text-gray-400 font-bold uppercase">Room: {game.roomId}</p><p className="text-xl font-black text-emerald-400 italic">Round {game.roundNumber}</p></div>
        <div className="flex gap-3">
          <button onClick={() => setShowHistory(true)} className="px-5 py-2 bg-amber-500 rounded-xl font-black text-xs">📊 POINTS</button>
          <button onClick={() => setBg(BG_THEMES[bg.id === "t15" ? 1 : 0])} className="p-2 bg-white/10 rounded-xl text-xl">🎨</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mb-6">
        {game.players.map(p => (
          <div key={p.id} className={`p-4 rounded-2xl border-2 ${game.turnId === p.id ? 'border-yellow-400 bg-yellow-400/20 scale-105 shadow-xl' : 'border-white/5 bg-black/50'}`}>
            <p className="font-black text-sm uppercase truncate">{p.name}</p>
            <p className="text-amber-400 text-2xl font-black">{p.score} <span className="text-[10px] text-gray-500">PTS</span></p>
          </div>
        ))}
      </div>

      {game.started && (
        <div className="my-6 flex flex-col items-center">
          <p className="text-[10px] tracking-[0.4em] text-gray-500 mb-2 uppercase font-black">Middle Card</p>
          <Card card={game.discardTop} isMiddle onClick={() => { if(myTurn && !me?.hasDrawn && game.discardTop) socket.emit("action_draw", { roomId: game.roomId, fromDiscard: true }); }} />
          {game.penaltyCount > 0 && <p className="mt-3 px-4 py-1 bg-red-600 rounded-full text-xs font-black animate-bounce shadow-lg">+{game.penaltyCount} PENDING</p>}
        </div>
      )}

      <div className="mt-auto w-full max-w-4xl pb-6">
        <div className="flex flex-wrap justify-center gap-2 mb-10 px-2 overflow-y-visible">
          {me?.hand.map(c => <Card key={c.id} card={c} isSelected={selectedIds.includes(c.id)} onClick={() => setSelectedIds(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} />)}
        </div>
        {myTurn ? (
          <div className="grid grid-cols-3 gap-3 px-2 max-w-lg mx-auto">
            <button onClick={() => socket.emit("action_draw", { roomId: game.roomId, fromDiscard: false })} disabled={me.hasDrawn} className="py-5 bg-sky-600 rounded-2xl font-black text-xl shadow-xl disabled:opacity-20 uppercase tracking-tighter">Draw</button>
            <button onClick={() => { socket.emit("action_drop", { roomId: game.roomId, selectedIds }); setSelectedIds([]); }} disabled={selectedIds.length === 0} className="py-5 bg-emerald-600 rounded-2xl font-black text-xl shadow-xl disabled:opacity-20 uppercase tracking-tighter">Drop</button>
            <button onClick={() => { if(window.confirm("CLOSE?")) socket.emit("action_close", { roomId: game.roomId }); }} className="py-5 bg-pink-600 rounded-2xl font-black text-xl shadow-xl uppercase tracking-tighter text-white">Close</button>
          </div>
        ) : game.hostId === game.youId && !game.started && <button onClick={() => socket.emit("start_round", { roomId: game.roomId })} className="w-full py-6 bg-emerald-600 rounded-3xl font-black text-3xl shadow-2xl animate-pulse">START GAME</button>}
      </div>

      {showResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl p-6">
          <div className="w-full max-w-md text-center">
            <h2 className="text-5xl font-black text-yellow-400 mb-8 italic drop-shadow-lg uppercase">Round Over</h2>
            <div className="bg-white/5 rounded-[32px] p-8 border border-white/10 mb-10 shadow-2xl">
              {game.players.map(p => (
                <div key={p.id} className="flex justify-between py-4 border-b border-white/5 last:border-0 italic font-bold">
                  <span className="text-2xl text-gray-300 uppercase">{p.name}</span>
                  <span className="text-3xl text-emerald-400">+{p.lastRoundPoints}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { setShowResult(false); if(game.hostId === game.youId) socket.emit("start_round", { roomId: game.roomId }); }} className="w-full py-6 bg-emerald-600 rounded-2xl font-black text-2xl shadow-2xl active:scale-95 transition-all">NEXT ROUND</button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-gray-900 w-full max-w-lg rounded-[40px] border-4 border-amber-500/30 p-8 max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-8"><h3 className="text-3xl font-black text-amber-500 italic uppercase">Score Board</h3><button onClick={() => setShowHistory(false)} className="text-5xl text-gray-500 hover:text-white transition-colors">&times;</button></div>
            <div className="overflow-x-auto italic">
              <table className="w-full text-left font-bold">
                <thead><tr className="border-b-2 border-white/10 text-gray-400 text-xs uppercase tracking-widest"><th className="pb-4">RD</th>{game.players.map(p => <th key={p.id} className="pb-4">{p.name}</th>)}</tr></thead>
                <tbody className="text-xl">
                  {game.roundHistory.map((h, i) => (<tr key={i} className="border-b border-white/5"><td className="py-4 text-gray-500">#{h.round}</td>{game.players.map(p => <td key={p.id} className="py-4">{h.points[p.name]}</td>)}</tr>))}
                  <tr className="text-amber-400 text-3xl font-black uppercase"><td className="py-6">Total</td>{game.players.map(p => <td key={p.id} className="py-6">{p.score}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
