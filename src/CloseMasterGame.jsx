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
        <div key={i} className="absolute w-16 h-24 rounded-3xl border border-white/20 shadow-[0_0_20px_#3b82f6] backdrop-blur-md bg-gradient-to-br from-blue-500/20 to-purple-500/20 animate-float-slow" 
             style={{left:`${Math.random()*100}%`,top:`${Math.random()*100}%`,animationDelay:`${Math.random()*15}s`,animationDuration:`${10+Math.random()*10}s`}}/>
      ))}
      <style jsx>{`@keyframes float{0%,100%{transform:translateY(0)rotate(0);}50%{transform:translateY(-20px)rotate(5deg);}}.animate-float-slow{animation:float 15s ease-in-out infinite;}`}</style>
    </div>
  );
}

export default function CloseMasterGame() {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState("welcome");
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [myTurn, setMyTurn] = useState(false);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    
    newSocket.on("connect", () => console.log("✅ Socket connected:", newSocket.id));
    newSocket.on("room_created", (data) => {
      setGame(data.room);
      setPlayers(data.players);
      setScreen("lobby");
      setIsHost(true);
      setLoading(false);
    });
    newSocket.on("room_joined", (data) => {
      setGame(data.room);
      setPlayers(data.players);
      setScreen("game");
      setIsHost(data.isHost);
      setLoading(false);
    });
    newSocket.on("player_joined", (players) => setPlayers(players));
    newSocket.on("game_update", (data) => {
      setGame(data);
      setPlayers(data.players);
      
      // TURN & DRAWN STATUS
      const isMyTurn = data.currentPlayerId === newSocket.id;
      setMyTurn(isMyTurn);
      setHasDrawn(data.hasDrawn || false);
      
      if (!isMyTurn) {
        setSelectedIds([]);
        setHasDrawn(false);
      }
    });
    newSocket.on("game_ended", (scores) => {
      setShowPoints(true);
    });
    newSocket.on("error", (msg) => {
      alert(msg);
      setLoading(false);
    });

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  const createRoom = () => {
    if (!playerName.trim()) return alert("Enter name!");
    setLoading(true);
    socket.emit("create_room", { name: playerName.trim() });
  };

  const joinRoom = () => {
    if (!playerName.trim() || !joinCode.trim()) return alert("Name & code required!");
    setLoading(true);
    socket.emit("join_room", { name: playerName.trim(), roomId: joinCode.trim().toUpperCase() });
  };

  const startGame = () => socket.emit("start_game");

  // 🎯 PERFECT LOGIC: Deck click → NO turn pass
  const drawCard = (fromOpen = false) => {
    if (!socket || !game?.roomId || !myTurn || hasDrawn) return;
    
    if (fromOpen && game.discardPile?.[0]?.rank?.match(/7|J/)) {
      alert("🚫 Cannot take 7 or J from open!");
      return;
    }
    
    socket.emit("action_draw", { fromDiscard: fromOpen });
  };

  // 🎯 PERFECT LOGIC: Drop → THEN turn pass
  const dropCards = () => {
    if (!myTurn || !hasDrawn || selectedIds.length === 0) {
      alert("✅ Draw first + Select cards!");
      return;
    }
    socket.emit("action_drop", { selectedIds });
    setSelectedIds([]);
  };

  // 🎯 PERFECT LOGIC: Close → Only after draw
  const callClose = () => {
    if (!myTurn) return alert("Wait your turn!");
    if (!hasDrawn) return alert("Draw card first!");
    if (!confirm("Close round?")) return;
    socket.emit("action_close");
  };

  const exitGame = () => {
    if (confirm("Exit game?")) {
      socket?.disconnect();
      setScreen("welcome");
      setPlayerName("");
      setJoinCode("");
      setGame(null);
      setSelectedIds([]);
      setIsHost(false);
      setShowPoints(false);
      setLoading(false);
      setHasDrawn(false);
      setMyTurn(false);
    }
  };

  // WELCOME SCREEN (UNCHANGED)
  if (screen === "welcome") return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex items-center justify-center px-4 relative overflow-hidden">
      <NeonFloatingCards/>
      <div className="relative z-10 bg-black/80 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-500 bg-clip-text text-transparent mb-4 drop-shadow-2xl">
            CLOSE MASTER
          </h1>
          <p className="text-xl text-white/80 font-semibold">Power Rummy</p>
        </div>
        <div className="space-y-4">
          <input className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 transition-all" placeholder="Your Name" value={playerName} onChange={(e)=>setPlayerName(e.target.value)}/>
          <button onClick={createRoom} disabled={loading} className={`w-full px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl transition-all ${loading ? "bg-gray-600 text-gray-400 cursor-not-allowed" : "bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 hover:scale-105 shadow-emerald-500/50"}`}>
            {loading ? "⏳ Creating..." : "🎮 CREATE ROOM"}
          </button>
          <div className="text-center text-white/50 my-4">OR JOIN ROOM</div>
          <div className="flex space-x-3">
            <input className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400" placeholder="XXXX" value={joinCode} onChange={(e)=>setJoinCode(e.target.value.toUpperCase())} maxLength={4}/>
            <button onClick={joinRoom} disabled={loading || !playerName || !joinCode} className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-2xl font-bold text-white shadow-purple-500/50 hover:scale-105 whitespace-nowrap">JOIN</button>
          </div>
        </div>
      </div>
    </div>
  );

  // LOBBY SCREEN (UNCHANGED)
  if (screen === "lobby") return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <NeonFloatingCards/>
      <div className="relative z-10 w-full max-w-md">
        <button onClick={exitGame} className="absolute top-6 left-6 text-white/70 hover:text-white text-2xl">←</button>
        <div className="bg-black/80 backdrop-blur-2xl p-8 rounded-3xl border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent mb-2">Room: {game?.roomId}</h1>
            <p className="text-white/70">{players.length}/{MAX_PLAYERS} Players</p>
          </div>
          <div className="space-y-3 mb-8 max-h-64 overflow-y-auto">
            {players.map(p => (
              <div key={p.id} className={`flex items-center p-3 rounded-xl ${p.id === socket.id ? "bg-emerald-500/20 border-emerald-400 border" : "bg-white/10"}`}>
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">{p.name.slice(0,2).toUpperCase()}</div>
                <span className="text-white font-medium flex-1">{p.name}</span>
                {p.id === socket.id && <span className="text-emerald-400 text-sm font-bold">(YOU)</span>}
              </div>
            ))}
          </div>
          {isHost && players.length >= 2 && (
            <button onClick={startGame} className="w-full px-8 py-4 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-xl font-black rounded-2xl shadow-2xl hover:scale-105 hover:shadow-emerald-500/50 transition-all text-white">
              🚀 START GAME
            </button>
          )}
        </div>
      </div>
    </div>
  );

  // GAME SCREEN (PERFECT LOGIC)
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex flex-col relative overflow-hidden">
      <NeonFloatingCards/>
      <div className="p-4 pt-16 pb-24">
        <button onClick={exitGame} className="absolute top-6 left-6 bg-black/50 backdrop-blur-xl px-4 py-2 rounded-2xl text-white font-bold border border-white/20 hover:bg-white/10 transition-all">EXIT</button>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-2xl font-black text-white mb-1">Room: {game?.roomId}</div>
            <div className="text-lg text-white/70">Turn: {game?.players?.find(p=>p.id===game.currentPlayerId)?.name || "—"}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-emerald-400">{game?.players?.find(p=>p.id===socket.id)?.score || 0} pts</div>
            <div className="text-white/70 text-sm">Your Score</div>
          </div>
        </div>

        {/* Players */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {game?.players?.filter(p=>p.id!==socket.id).map((player) => (
            <div key={player.id} className={`p-4 rounded-2xl border-4 transition-all ${
              player.id === game.currentPlayerId 
                ? "border-yellow-400 bg-yellow-500/10 shadow-2xl shadow-yellow-500/25 scale-105" 
                : "border-white/20 bg-white/5"
            }`}>
              <div className="text-center">
                <div className="text-white font-bold text-lg mb-2">{player.name}</div>
                <div className="text-2xl font-black text-emerald-400">{player.score} pts</div>
                <div className="text-sm text-white/60 mt-1">{player.hand?.length || 0} cards</div>
              </div>
            </div>
          ))}
        </div>

        {/* Open Card + Deck */}
        <div className="flex items-center justify-center space-x-8 mb-8">
          {/* OPEN CARD */}
          <div className={`w-32 h-48 rounded-3xl border-4 border-white/30 shadow-2xl bg-gradient-to-br from-white to-gray-100 flex flex-col items-center justify-center p-4 cursor-pointer transition-all hover:scale-110 hover:shadow-white/50 group ${
            game?.discardPile?.[0] && myTurn && !game.discardPile[0].rank?.match(/7|J/) ? "hover:border-emerald-400" : "opacity-75 cursor-default"
          }`} onClick={() => drawCard(true)}>
            {game?.discardPile?.[0] ? (
              <>
                <div className={`text-3xl font-bold ${cardTextColor(game.discardPile[0])}`}>
                  {game.discardPile[0].rank === "10" ? "10" : game.discardPile[0].rank}
                </div>
                <div className={`text-2xl ${cardTextColor(game.discardPile[0])}`}>
                  {game.discardPile[0].suit}
                </div>
              </>
            ) : (
              <span className="text-gray-500 font-bold text-xl">EMPTY</span>
            )}
            {game?.discardPile?.[0]?.rank?.match(/7|J/) && (
              <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">🚫 SKIP</div>
            )}
          </div>

          {/* DECK */}
          <div className={`w-32 h-48 rounded-3xl border-4 border-white/30 shadow-2xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center cursor-pointer hover:scale-110 hover:shadow-white/50 transition-all ${
            myTurn && !hasDrawn ? "hover:border-emerald-400" : "opacity-50 cursor-not-allowed"
          }`} onClick={() => drawCard(false)}>
            <div className="text-3xl">📥</div>
          </div>
        </div>

        {/* YOUR HAND */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="text-2xl font-black text-white mr-4">YOUR HAND ({game?.players?.find(p=>p.id===socket.id)?.hand?.length || 0})</div>
            <span className={`px-4 py-2 rounded-xl text-lg font-bold ${
              hasDrawn ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400" : "bg-yellow-500/20 text-yellow-300 border border-yellow-400"
            }`}>
              {hasDrawn ? "✓ DREW" : "➤ DRAW"}
            </span>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {game?.players?.find(p=>p.id===socket.id)?.hand?.map((card) => (
              <div key={card.id} className={`w-20 h-28 rounded-2xl border-4 shadow-xl flex flex-col items-center justify-center p-2 cursor-pointer transition-all hover:scale-110 hover:shadow-white/50 ${
                selectedIds.includes(card.id) 
                  ? "border-emerald-400 bg-emerald-400/20 scale-110 shadow-emerald-500/50" 
                  : "border-white/30 bg-gradient-to-br from-white to-gray-100"
              }`} onClick={()=>setSelectedIds(p=>p.includes(card.id)?p.filter(x=>x!==card.id):[...p,card.id])}>
                <div className={`text-2xl font-bold ${cardTextColor(card)}`}>
                  {card.rank === "10" ? "10" : card.rank}
                </div>
                <div className={`text-xl ${cardTextColor(card)}`}>
                  {card.suit}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center text-sm text-white/60 mt-2">{selectedIds.length} selected</div>
        </div>

        {/* ACTIONS - PERFECT BUTTON STATES */}
        <div className="flex flex-col sm:flex-row gap-4 p-6 bg-black/60 backdrop-blur-xl rounded-3xl border border-white/20 mx-auto max-w-2xl">
          <button onClick={dropCards} disabled={!myTurn || !hasDrawn || selectedIds.length === 0}
            className={`flex-1 px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl transition-all ${
              myTurn && hasDrawn && selectedIds.length > 0
                ? "bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 hover:scale-105 shadow-orange-500/50 text-white"
                : "bg-gray-700/50 cursor-not-allowed opacity-50 text-gray-400"
            }`}
          >
            🗑️ DROP ({selectedIds.length})
          </button>
          
          <button onClick={callClose} disabled={!myTurn || !hasDrawn}
            className={`px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl transition-all ${
              myTurn && hasDrawn
                ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 hover:scale-105 shadow-red-500 animate-pulse text-white"
                : "bg-gray-700/50 cursor-not-allowed opacity-50 text-gray-400"
            }`}
          >
            ❌ CLOSE
          </button>
        </div>
      </div>

      {/* SCORES MODAL */}
      {showPoints && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white p-12 rounded-3xl shadow-2xl max-w-lg w-full text-center border-4 border-white/20 max-h-[80vh] overflow-y-auto">
            <h2 className="text-4xl font-black mb-8 bg-gradient-to-r from-white to-yellow-200 bg-clip-text text-transparent drop-shadow-2xl">FINAL SCORES</h2>
            <div className="space-y-4 mb-12">
              {game?.players?.map(p => (
                <div key={p.id} className="flex justify-between p-4 bg-white/20 rounded-2xl backdrop-blur-xl">
                  <span className="font-bold text-xl">{p.name}</span>
                  <span className="text-2xl font-black">{p.score} pts</span>
                </div>
              ))}
            </div>
            <button onClick={()=>setShowPoints(false)} className="w-full px-8 py-4 bg-white/20 backdrop-blur-xl rounded-2xl font-bold text-xl border border-white/30 hover:bg-white/30 hover:scale-105 transition-all mt-4 md:mt-6">
              🎮 CONTINUE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
