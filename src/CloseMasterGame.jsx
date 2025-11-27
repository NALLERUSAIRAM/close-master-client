import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://close-master-server-production.up.railway.app";
const MAX_PLAYERS = 7;

function cardTextColor(card) {
  if (!card) return "text-black";
  if (card.rank === "JOKER") return "text-purple-700 font-bold";
  if (card.suit === "♥" || card.suit === "♦") return "text-red-600";
  return "text-black";
}

function NeonFloatingCards() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10">
      {Array.from({length:20}).map((_,i)=>(
        <div key={i} className="absolute w-16 h-24 rounded-3xl border border-white/20 shadow-[0_0_20px_#3b82f6] backdrop-blur-md animate-float-slow" 
             style={{left:`${5+Math.random()*90}%`,top:`${10+Math.random()*80}%`,animationDelay:`${Math.random()*10}s`,animationDuration:`${12+Math.random()*8}s`,boxShadow:"0 0 20px 4px rgba(59,130,246,0.6)",background:"rgba(255,255,255,0.05)"}}/>
      ))}
    </div>
  );
}

export default function CloseMasterGame() {
  const [socket,setSocket]=useState(null);
  const [screen,setScreen]=useState("welcome");
  const [playerName,setPlayerName]=useState("");
  const [joinCode,setJoinCode]=useState("");
  const [game,setGame]=useState(null);
  const [selectedIds,setSelectedIds]=useState([]);
  const [isHost,setIsHost]=useState(false);
  const [showPoints,setShowPoints]=useState(false);
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    const s=io(SERVER_URL,{transports:["websocket"],upgrade:false,timeout:20000});
    s.on("connect",()=>console.log("✅ Connected:",s.id));
    s.on("game_state",(state)=>{
      console.log("🎮 State:",state);
      setGame(state);
      setIsHost(state.hostId===state.youId);
      setSelectedIds([]);
      setScreen("game");
      setLoading(false);
    });
    s.on("error",(e)=>{alert(e.message||"Server error!");setLoading(false);});
    setSocket(s);
    return()=>s.disconnect();
  },[]);

  useEffect(()=>{if(game?.closeCalled)setShowPoints(true);},[game?.closeCalled]);

  const roomId=game?.roomId,youId=game?.youId,players=game?.players||[];
  const discardTop=game?.discardTop,currentIndex=game?.currentIndex??0,started=game?.started;
  const pendingDraw=game?.pendingDraw||0,pendingSkips=game?.pendingSkips||0;
  const currentPlayer=players[currentIndex],myTurn=started&&currentPlayer?.id===youId;
  const me=players.find(p=>p.id===youId),hasDrawn=me?.hasDrawn||false;
  const matchingOpenCardCount=game?.matchingOpenCardCount||0;

  const createRoom=()=>{if(!socket||!playerName.trim()){alert("Name!");return;}setLoading(true);socket.emit("create_room",{name:playerName.trim()},(res)=>{setLoading(false);if(!res?.roomId&&!res?.success)alert(res?.error||"Error");});};
  const joinRoom=()=>{if(!socket||!playerName.trim()||!joinCode.trim()){alert("Name & Room ID!");return;}setLoading(true);socket.emit("join_room",{name:playerName.trim(),roomId:joinCode.toUpperCase().trim()},(res)=>{setLoading(false);if(res?.error)alert(res.error);});};
  const startRound=()=>{if(!socket||!roomId||!isHost||players.length<2){alert("2+ players!");return;}socket.emit("start_round",{roomId});};
  const drawCard=(fromDiscard=false)=>{if(!socket||!roomId||!myTurn)return;socket.emit("action_draw",{roomId,fromDiscard});};
  const dropCards=()=>{if(!socket||!roomId||!myTurn||selectedIds.length===0){alert("Select cards!");return;}socket.emit("action_drop",{roomId,selectedIds});};
  const callClose=()=>{if(!socket||!roomId||!myTurn||!confirm("CLOSE?"))return;socket.emit("action_close",{roomId});};
  const toggleSelect=id=>setSelectedIds(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const exitGame=()=>{if(confirm("Exit?")){socket?.disconnect();setScreen("welcome");setPlayerName("");setJoinCode("");setGame(null);setSelectedIds([]);setIsHost(false);setShowPoints(false);setLoading(false);}};

  if(screen==="welcome")return(
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex items-center justify-center px-4 relative overflow-hidden">
      <NeonFloatingCards/>
      <div className="relative z-10 bg-black/80 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl">CLOSE MASTER</h1>
          <div className="text-2xl text-emerald-400 font-bold mt-2 animate-pulse">🔥 POWER RUMMY 🔥</div>
        </div>
        <div className="space-y-6">
          <div><label className="block text-sm font-semibold text-gray-200 mb-3">👤 Name</label>
            <input type="text" className="w-full p-4 bg-gray-900/80 border-2 border-gray-600 rounded-2xl text-lg font-semibold text-white placeholder-gray-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/30 transition-all" placeholder="" value={playerName} onChange={e=>setPlayerName(e.target.value)} maxLength={15}/>
          </div>
          <div><label className="block text-sm font-semibold text-gray-200 mb-3">🏠 Room ID</label>
            <input type="text" className="w-full p-4 bg-gray-900/80 border-2 border-gray-600 rounded-2xl text-lg font-semibold text-white placeholder-gray-500 uppercase focus:border-sky-400 focus:ring-4 focus:ring-sky-500/30 transition-all" placeholder="" value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase())} maxLength={4}/>
          </div>
          <button onClick={createRoom} disabled={!playerName.trim()||loading} className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all ${playerName.trim()&&!loading?"bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:scale-105":"bg-gray-800/50 border-2 border-gray-600 cursor-not-allowed opacity-50"}`}>{loading?"⏳ Creating...":"🏠 CREATE ROOM"}</button>
          <button onClick={joinRoom} disabled={!playerName.trim()||!joinCode.trim()||loading} className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all ${playerName.trim()&&joinCode.trim()&&!loading?"bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 hover:scale-105":"bg-gray-800/50 border-2 border-gray-600 cursor-not-allowed opacity-50"}`}>{loading?"⏳ Joining...":"🚪 JOIN ROOM"}</button>
        </div>
      </div>
      <style jsx>{`@keyframes float{0%,100%{transform:translateY(0)rotate(0);}50%{transform:translateY(-20px)rotate(5deg);}}.animate-float-slow{animation:float 15s ease-in-out infinite;}`}</style>
    </div>
  );

  return(
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/30 to-blue-900/30 text-white p-4 md:p-6 flex flex-col items-center gap-4 md:gap-6 relative overflow-hidden">
      <NeonFloatingCards/>
      
      {/* Header */}
      <div className="z-10 w-full max-w-5xl text-center p-4 md:p-6 bg-black/60 backdrop-blur-xl rounded-3xl border border-emerald-500/50 shadow-2xl">
        <h1 className="mb-3 md:mb-4 text-2xl md:text-4xl font-black bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">Room: {roomId?.toUpperCase()}</h1>
        <p className="text-lg md:text-xl mb-4 md:mb-6">You: <span className="font-bold text-white px-3 py-1 bg-emerald-500/30 rounded-full">{me?.name}</span>{isHost&&<span className="ml-2 md:ml-4 px-3 md:px-4 py-1 md:py-2 bg-yellow-500/90 text-black font-bold rounded-full text-sm md:text-lg animate-pulse">👑 HOST</span>}</p>
        <div className="flex flex-wrap gap-2 md:gap-4 justify-center">
          {isHost&&<button onClick={startRound} disabled={started||players.length<2} className={`px-4 md:px-8 py-3 md:py-4 rounded-3xl text-base md:text-xl font-black shadow-2xl ${(started||players.length<2)?"bg-gray-700/50 border-2 border-gray-600 cursor-not-allowed opacity-60":"bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:scale-105"}`}>{started?"⚡ RUNNING":players.length<2?`▶️ WAIT (${players.length}/2)`:"▶️ START GAME"}</button>}
          <button onClick={()=>setShowPoints(true)} className="px-4 md:px-8 py-3 md:py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-3xl font-bold text-base md:text-xl shadow-2xl">📊 SCORES ({players.length})</button>
          <button onClick={exitGame} className="px-4 md:px-8 py-3 md:py-4 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 rounded-3xl font-bold text-base md:text-xl shadow-2xl">🚪 EXIT</button>
        </div>
        <div className="mt-3 md:mt-4 text-sm md:text-lg">Players: <span className="text-emerald-400 font-bold">{players.length}/{MAX_PLAYERS}</span> | Turn: <span className={`font-bold px-2 md:px-3 py-1 rounded-full text-sm md:text-base ${myTurn?"bg-yellow-500/90 text-black":"bg-gray-600/50"}`}>{currentPlayer?.name||"None"}</span></div>
      </div>

      {/* Game Status */}
      {started&&<div className="z-10 w-full max-w-4xl p-3 md:p-4 bg-gray-900/50 rounded-2xl border border-gray-700">
        <div className="flex flex-wrap justify-between items-center gap-2 text-sm md:text-base">
          <div>Turn: <span className="text-xl md:text-2xl font-bold text-yellow-400">{currentPlayer?.name}</span>{myTurn&&<span className={`ml-2 md:ml-4 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold ${hasDrawn?"bg-emerald-500/30 text-emerald-200":"bg-yellow-500/30 text-yellow-200"}`}>{hasDrawn?"✓ Drew":"➤ Draw"}</span>}</div>
          <div className="text-sm md:text-base">📥 Draw: <span className="font-bold">{pendingDraw||1}</span> | ⏭️ Skip: <span className="font-bold">{pendingSkips}</span></div>
        </div>
      </div>}

      {/* Open Card */}
      {started&&<div className="z-10 text-center">
        <h3 className="text-lg md:text-xl mb-3 md:mb-4 font-bold">🎴 OPEN CARD</h3>
        {discardTop?<button onClick={()=>drawCard(true)} disabled={!myTurn||hasDrawn} className={`w-20 md:w-24 h-28 md:h-36 bg-white rounded-2xl shadow-2xl border-4 p-2 md:p-3 flex flex-col justify-between ${myTurn&&!hasDrawn?"hover:scale-105 cursor-pointer border-blue-400":"border-gray-300 opacity-70"}`}>
          <div className={`text-base md:text-lg font-bold ${cardTextColor(discardTop)}`}>{discardTop.rank}</div>
          <div className={`text-3xl md:text-4xl text-center ${cardTextColor(discardTop)}`}>{discardTop.rank==="JOKER"?"🃏":discardTop.suit}</div>
          <div className={`text-base md:text-lg font-bold text-right ${cardTextColor(discardTop)}`}>{discardTop.rank}</div>
        </button>:<div className="w-20 md:w-24 h-28 md:h-36 bg-gray-800 border-2 border-dashed border-gray-600 rounded-2xl flex items-center justify-center text-gray-500 text-xs md:text-sm">Empty</div>}
      </div>}

      {/* Players */}
      {started&&<div className="z-10 w-full max-w-5xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
        {players.map(p=><div key={p.id} className={`p-3 md:p-4 rounded-2xl border-2 shadow-lg ${p.id===youId?"border-emerald-400 bg-emerald-900/30":currentPlayer?.id===p.id?"border-yellow-400 bg-yellow-900/30":"border-gray-700 bg-gray-900/30"}`}>
          <p className="font-bold text-center text-sm md:text-base truncate">{p.name}</p>
          <p className="text-xs md:text-sm text-gray-400 text-center">{p.handSize} cards | {p.score} pts</p>
          {p.hasDrawn&&<p className="text-xs text-emerald-400 text-center">✓Drew</p>}
        </div>)}
      </div>}

      {/* Your Hand */}
      {me&&started&&<div className="z-10 w-full max-w-5xl">
        <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-emerald-400 text-center">🃏 Your Hand ({me.hand.length})</h3>
        <div className="flex gap-2 md:gap-3 flex-wrap justify-center p-3 md:p-4 bg-gray-900/50 rounded-2xl">
          {me.hand.map(c=>{const selected=selectedIds.includes(c.id);return<button key={c.id} onClick={()=>toggleSelect(c.id)} disabled={!myTurn} className={`w-16 md:w-20 h-24 md:h-28 bg-white rounded-2xl shadow-xl border-4 flex flex-col p-1 md:p-2 justify-between transition-all ${selected?"border-emerald-500 scale-110 shadow-emerald-500/50":myTurn?"border-gray-200 hover:border-blue-400 hover:scale-105":"border-gray-300 opacity-50"}`}>
            <div className={`text-sm md:text-lg font-bold ${cardTextColor(c)}`}>{c.rank}</div>
            <div className={`text-2xl md:text-3xl text-center ${cardTextColor(c)}`}>{c.rank==="JOKER"?"🃏":c.suit}</div>
            <div className={`text-sm md:text-lg font-bold text-right ${cardTextColor(c)}`}>{c.rank}</div>
          </button>})}
        </div>
      </div>}

      {/* Actions */}
      {myTurn&&started&&<div className="z-10 flex flex-wrap gap-2 md:gap-4 justify-center max-w-4xl p-4 md:p-6 bg-black/50 backdrop-blur-xl rounded-3xl border border-white/20">
        <button onClick={()=>drawCard(false)} disabled={hasDrawn} className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-xl shadow-2xl ${hasDrawn?"bg-gray-700/50 cursor-not-allowed opacity-50":"bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"}`}>📥 DECK</button>
        <button onClick={()=>drawCard(true)} disabled={hasDrawn} className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-xl shadow-2xl ${hasDrawn?"bg-gray-700/50 cursor-not-allowed opacity-50":"bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"}`}>🎴 OPEN</button>
        <button onClick={dropCards} disabled={selectedIds.length===0||(!hasDrawn&&matchingOpenCardCount===0)} className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-xl shadow-2xl ${selectedIds.length>0&&(hasDrawn||matchingOpenCardCount>0)?"bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800":"bg-gray-700/50 cursor-not-allowed opacity-50"}`}>🗑️ DROP ({selectedIds.length})</button>
        <button onClick={callClose} className="px-4 md:px-8 py-3 md:py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-2xl font-bold text-base md:text-xl shadow-2xl">❌ CLOSE</button>
      </div>}

      {/* Scores Modal */}
      {showPoints&&<div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50"><div className="bg-white/95 text-black rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl"><h3 className="text-2xl md:text-3xl font-black text-center mb-4 md:mb-6 text-gray-900">🏆 SCORES</h3>{players.map((p,i)=><div key={p.id} className={`flex justify-between p-3 md:p-4 rounded-2xl mb-2 md:mb-3 ${i===0?"bg-emerald-500 text-white":"bg-gray-100 text-black"}`}><span className="font-bold truncate text-sm md:text-base">{p.name}</span><span className="font-black text-xl md:text-2xl px-3 md:px-4 py-1 md:py-2 rounded-xl">{p.score}</span></div>)}<button onClick={()=>setShowPoints(false)} className="w-full py-3 md:py-4 bg-gray-900 text-white rounded-2xl text-lg md:text-xl font-bold mt-4 md:mt-6 hover:bg-gray-800">🎮 CONTINUE</button></div></div>}
      
      <style jsx>{`@keyframes float{0%,100%{transform:translateY(0)rotate(0);}50%{transform:translateY(-20px)rotate(5deg);}}.animate-float-slow{animation:float 15s ease-in-out infinite;}`}</style>
    </div>
  );
}
