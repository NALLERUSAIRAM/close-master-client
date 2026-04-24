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
  if (!card) return <div className={`bg-white/5 border-2 border-dashed border-white/10 rounded-lg ${isMiddle ? 'w-20 h-28' : 'w-16 h-24'}`} />;
  return (
    <div onClick={onClick} className={`relative bg-black/95 border-2 rounded-lg flex flex-col justify-between p-1 transition-all cursor-pointer select-none ${getCardStyle(card)} ${isMiddle ? 'w-20 h-28 shadow-xl' : 'w-16 h-24'} ${isSelected ? '-translate-y-4 scale-105 z-20 !border-white shadow-[0_0_10px_white]' : ''}`}>
      <div className="flex flex-col items-start leading-none font-black text-[10px]"><span>{card.rank}</span><span className="text-[8px]">{card.suit}</span></div>
      <div className="text-2xl self-center">{card.rank === "JOKER" ? "🃏" : card.suit}</div>
      <div className="flex flex-col items-end leading-none rotate-180 font-black text-[10px]"><span>{card.rank}</span><span className="text-[8px]">{card.suit}</span></div>
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
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock("landscape").catch(() => {});
    }
    localStorage.setItem("cmp_id", playerId);
    const s = io(SERVER_URL, { transports: ["polling", "websocket"] });
    s.on("game_state", setGame);
    s.on("close_result", () => setShowResult(true));
    setSocket(s);
    return () => s.disconnect();
  }, [playerId]);

  const me = game?.players.find(p => p.id === game.youId);
  const myTurn = game?.started && game?.turnId === game.youId;

  // Welcome Screen remains vertical/centered for ease
  if (!game) return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-black text-white p-6">
      <h1 className="text-4xl font-black text-emerald-400 mb-6 italic uppercase tracking-tighter text-center">Close Master</h1>
      <div className="w-full max-w-sm grid grid-cols-2 gap-4">
        <div className="col-span-2 flex gap-4">
            <input className="flex-1 p-4 bg-gray-900 rounded-xl border border-white/10 text-lg font-bold" placeholder="Name" value={playerName} onChange={e => setPlayerName(e.target.value)} />
            <input className="w-32 p-4 bg-gray-900 rounded-xl border border-white/10 text-center uppercase font-black" placeholder="Room" value={joinCode} onChange={e => setJoinCode(e.target.value)} />
        </div>
        <button onClick={() => { if(playerName) socket.emit("create_room", { name: playerName, playerId }); }} className="py-4 bg-emerald-600 rounded-xl font-black text-xl uppercase">Create</button>
        <button onClick={() => { if(playerName && joinCode) socket.emit("join_room", { name: playerName, roomId: joinCode.toUpperCase(), playerId }); }} className="py-4 bg-sky-600 rounded-xl font-black text-xl uppercase">Join</button>
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] w-full text-white flex flex-col items-center p-2 overflow-hidden select-none relative font-sans">
      <video className="fixed inset-0 w-full h-full object-cover -z-10 opacity-40" src={bg.file} autoPlay muted loop playsInline />
      
      {/* Top Section - Action Buttons & Player List */}
      <div className="w-full flex justify-between items-center gap-2 h-16 min-h-[64px]">
        
        {/* Action Buttons at Top (Only during turn) */}
        <div className="flex gap-2 w-1/3">
          {myTurn ? (
            <>
              <button onClick={() => socket.emit("action_draw", { roomId: game.roomId, fromDiscard: false })} disabled={me.hasDrawn} className="flex-1 py-2 bg-sky-600 rounded-xl font-black text-[10px] uppercase disabled:opacity-20 shadow-lg border border-white/10">Draw</button>
              <button onClick={() => { socket.emit("action_drop", { roomId: game.roomId, selectedIds }); setSelectedIds([]); }} disabled={selectedIds.length === 0} className="flex-1 py-2 bg-emerald-600 rounded-xl font-black text-[10px] uppercase disabled:opacity-20 shadow-lg border border-white/10">Drop</button>
              <button onClick={() => { if(window.confirm("CLOSE?")) socket.emit("action_close", { roomId: game.roomId }); }} className="flex-1 py-2 bg-pink-600 rounded-xl font-black text-[10px] uppercase shadow-lg border border-white/10">Close</button>
            </>
          ) : (
            <div className="flex-1 flex items-center px-4 bg-black/40 rounded-xl border border-white/5">
                <p className="text-[10px] font-black uppercase text-white/40 italic">Waiting for Turn...</p>
            </div>
          )}
        </div>

        {/* Players Row - Horizontal */}
        <div className="flex-1 flex gap-1.5 overflow-x-auto no-scrollbar justify-center px-2">
          {game.players.map(p => (
            <div key={p.id} className={`px-3 py-1.5 min-w-[100px] rounded-xl border transition-all ${game.turnId === p.id ? 'border-yellow-400 bg-yellow-400/20 scale-105' : 'border-white/5 bg-black/50'}`}>
              <p className="font-black text-[9px] uppercase truncate opacity-70 leading-none mb-1">{p.name}</p>
              <p className="text-amber-400 text-xs font-black leading-none">{p.score} <span className="text-[7px] text-gray-500 font-normal">PTS</span></p>
            </div>
          ))}
        </div>

        {/* Menu Buttons (History & Theme) */}
        <div className="flex gap-1.5">
            <button onClick={() => setShowHistory(true)} className="px-3 py-2 bg-amber-500 rounded-xl font-black text-[9px] shadow-lg">📊 SCORE</button>
            <button onClick={() => setBg(BG_THEMES[bg.id === "t15" ? 1 : 0])} className="p-2 bg-white/10 rounded-xl border border-white/10 text-xs">🎨</button>
        </div>
      </div>

      {/* Middle Table Section - Clean without room info */}
      {game.started ? (
        <div className="flex-1 flex items-center justify-center w-full gap-16 relative">
          {/* Visual Deck */}
          <div className="w-16 h-24 rounded-lg border-2 border-white/5 bg-white/5 flex items-center justify-center opacity-30 rotate-[-5deg]">
             <span className="text-[8px] font-black text-gray-400 uppercase">Deck</span>
          </div>

          {/* Middle Card */}
          <div className="flex flex-col items-center">
            <Card card={game.discardTop} isMiddle onClick={() => { if(myTurn && !me?.hasDrawn && game.discardTop) socket.emit("action_draw", { roomId: game.roomId, fromDiscard: true }); }} />
            {game.penaltyCount > 0 && <p className="mt-1 px-2 py-0.5 bg-red-600 rounded-full text-[9px] font-black animate-bounce shadow-lg">+{game.penaltyCount}</p>}
          </div>

          {/* Player Hand Indicator (Visual only) */}
          <div className="w-16 h-24 flex items-center justify-center">
             {myTurn && <div className="p-2 rounded-full bg-yellow-400/10 border border-yellow-400 animate-pulse text-[8px] font-black text-yellow-400 uppercase tracking-tighter">My Turn</div>}
          </div>
        </div>
      ) : (
          /* Start Round for Host */
          game.hostId === game.youId && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <p className="text-white/50 text-xs uppercase font-black tracking-widest italic">Room ID: {game.roomId}</p>
                <button onClick={() => socket.emit("start_round", { roomId: game.roomId })} className="px-12 py-5 bg-emerald-600 rounded-3xl font-black text-2xl shadow-2xl animate-pulse uppercase italic">Start Game</button>
            </div>
          )
      )}

      {/* Bottom Area - Player Hand Only */}
      <div className="w-full flex justify-center gap-1.5 pb-3">
          {me?.hand.map(c => (
            <Card 
              key={c.id} 
              card={c} 
              isSelected={selectedIds.includes(c.id)} 
              onClick={() => setSelectedIds(p => p.includes(c.id) ? p.filter(x => x !== c.id) : [...p, c.id])} 
            />
          ))}
      </div>

      {/* Popups remain the same logic */}
      {showResult && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm text-center">
            <h2 className="text-3xl font-black text-yellow-400 mb-4 italic uppercase tracking-tighter">Round Finished</h2>
            <div className="grid grid-cols-2 gap-3 bg-white/5 rounded-2xl p-4 border border-white/10 mb-6">
              {game.players.map(p => (
                <div key={p.id} className="flex justify-between items-center py-2 px-3 bg-black/40 rounded-xl border border-white/5">
                  <span className="text-[10px] text-gray-400 uppercase truncate max-w-[60px] font-bold">{p.name}</span>
                  <span className="text-base text-emerald-400 font-black">+{p.lastRoundPoints}</span>
                </div>
              ))}
            </div>
            <button onClick={() => { setShowResult(false); if(game.hostId === game.youId) socket.emit("start_round", { roomId: game.roomId }); }} className="px-12 py-4 bg-emerald-600 rounded-2xl font-black text-xl shadow-2xl uppercase italic">Continue</button>
          </div>
        </div>
      )}
      
      {showHistory && (
        <div className="fixed inset-0 z-[110] bg-black/95 flex items-center justify-center p-4">
          <div className="bg-gray-900 w-full max-w-2xl rounded-3xl border border-amber-500/30 p-6 flex flex-col h-[80vh] shadow-2xl">
            <div className="flex justify-between items-center mb-4 px-1 italic"><h3 className="text-xl font-black text-amber-500 uppercase">Score Board</h3><button onClick={() => setShowHistory(false)} className="text-3xl text-gray-500">&times;</button></div>
            <div className="overflow-auto flex-1 italic text-[11px] font-bold">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-gray-900 border-b border-white/10 text-gray-400 uppercase"><tr><th className="pb-1">RD</th>{game.players.map(p => <th key={p.id} className="pb-1 text-center font-black">{p.name}</th>)}</tr></thead>
                <tbody>
                  {game.roundHistory.map((h, i) => (<tr key={i} className="border-b border-white/5"><td className="py-2 text-gray-500">#{h.round}</td>{game.players.map(p => <td key={p.id} className="py-2 text-center text-white">{h.points[p.name]}</td>)}</tr>))}
                  <tr className="text-amber-400 text-lg font-black uppercase sticky bottom-0 bg-gray-900 border-t border-white/10 italic"><td>Total</td>{game.players.map(p => <td key={p.id} className="text-center pt-2">{p.score}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
