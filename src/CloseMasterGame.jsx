import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://close-master-server-production.up.railway.app";

function cardTextColor(card) {
  if (!card) return "text-black";
  if (card.rank === "JOKER") return "text-purple-700 font-bold";
  if (card.suit === "♥" || card.suit === "♦") return "text-red-600";
  return "text-black";
}

export default function CloseMasterGame() {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState("welcome");
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [game, setGame] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [showPoints, setShowPoints] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const s = io(SERVER_URL, { 
      transports: ["websocket"], 
      upgrade: false,
      timeout: 20000
    });

    s.on("connect", () => {
      console.log("✅ Socket connected:", s.id);
    });

    s.on("game_state", (state) => {
      console.log("🎮 Game state received:", state.roomId);
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setSelectedIds([]);
      setScreen("game");
    });

    s.on("error", (error) => {
      console.error("Server error:", error);
      alert(error.message || "Server error!");
      setLoading(false);
    });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (game?.closeCalled) {
      setShowPoints(true);
    }
  }, [game?.closeCalled]);

  const roomId = game?.roomId;
  const youId = game?.youId;
  const players = game?.players || [];
  const discardTop = game?.discardTop;
  const currentIndex = game?.currentIndex ?? 0;
  const started = game?.started;
  const pendingDraw = game?.pendingDraw || 0;
  const pendingSkips = game?.pendingSkips || 0;
  const closeCalled = game?.closeCalled;
  const matchingOpenCardCount = game?.matchingOpenCardCount || 0;

  const currentPlayer = players[currentIndex];
  const myTurn = started && currentPlayer?.id === youId;
  const me = players.find((p) => p.id === youId);
  const hasDrawn = me?.hasDrawn || false;
  const canDropWithoutDraw = matchingOpenCardCount > 0;

  // ✅ FIXED CREATE ROOM
  const createRoom = () => {
    if (!socket || !playerName.trim()) {
      alert("Name ఎంటర్ చేయండి!");
      return;
    }
    
    setLoading(true);
    console.log("🏠 Creating room:", playerName.trim());
    
    socket.emit("create_room", { 
      name: playerName.trim().substring(0, 15)
    }, (res) => {
      console.log("CREATE ROOM RESPONSE:", res);
      setLoading(false);
      
      if (res?.roomId || res?.success) {
        console.log("✅ Room created, waiting for game_state...");
        // Don't setScreen here - wait for game_state event
      } else {
        alert(`Create failed: ${res?.error || "Unknown error"}`);
      }
    });
  };

  // ✅ FIXED JOIN ROOM
  const joinRoom = () => {
    if (!socket || !playerName.trim() || !joinCode.trim()) {
      alert("Name & Room ID రెండూ ఎంటర్ చేయండి!");
      return;
    }
    
    setLoading(true);
    console.log("🚪 Joining room:", joinCode.trim().toUpperCase());
    
    socket.emit("join_room", { 
      name: playerName.trim().substring(0, 15), 
      roomId: joinCode.trim().toUpperCase() 
    }, (res) => {
      console.log("JOIN ROOM RESPONSE:", res);
      setLoading(false);
      
      if (res?.error) {
        alert(res.error);
      } else if (res?.roomId || res?.success) {
        console.log("✅ Joined, waiting for game_state...");
        // Don't setScreen here - wait for game_state
      }
    });
  };

  const startRound = () => {
    if (!socket || !roomId || !isHost || players.length < 2) {
      alert("కనీసం 2 మంది players ఉండాలి (Host only)!");
      return;
    }
    socket.emit("start_round", { roomId });
  };

  const drawCard = (fromDiscard = false) => {
    if (!socket || !roomId || !myTurn) return;
    socket.emit("action_draw", { roomId, fromDiscard });
  };

  const dropCards = () => {
    if (!socket || !roomId || !myTurn || selectedIds.length === 0) {
      alert("Cards select చేయండి!");
      return;
    }
    socket.emit("action_drop", { roomId, selectedIds });
  };

  const callClose = () => {
    if (!socket || !roomId || !myTurn) return;
    if (!confirm("CLOSE చేయాలా? Round end అవుతుంది!")) return;
    socket.emit("action_close", { roomId });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const exitGame = () => {
    if (confirm("Game exit చేయాలా?")) {
      socket?.disconnect();
      setScreen("welcome");
      setPlayerName("");
      setJoinCode("");
      setGame(null);
      setSelectedIds([]);
      setIsHost(false);
      setShowPoints(false);
    }
  };

  // WELCOME SCREEN
  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Animated background cards */}
        <div className="fixed inset-0 pointer-events-none">
          {Array.from({length: 12}).map((_, i) => (
            <div
              key={i}
              className="absolute w-20 h-28 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl animate-float"
              style={{ 
                left: `${10 + i * 8}%`, 
                animationDelay: `${i * 0.2}s`, 
                animationDuration: `${8 + i}s` 
              }}
            />
          ))}
        </div>
        
        <div className="relative z-10 bg-black/80 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl">
              CLOSE MASTER
            </h1>
            <div className="text-2xl text-emerald-400 font-bold mt-2 animate-pulse">🔥 POWER RUMMY 🔥</div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">👤 Your Name</label>
              <input
                type="text"
                className="w-full p-4 bg-gray-900/80 border-2 border-gray-600 rounded-2xl text-lg font-semibold text-white placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/30 transition-all duration-300"
                placeholder="SAIRAM"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">🏠 Room ID (Join)</label>
              <input
                type="text"
                className="w-full p-4 bg-gray-900/80 border-2 border-gray-600 rounded-2xl text-lg font-semibold text-white placeholder-gray-400 uppercase focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-500/30 transition-all duration-300"
                placeholder="ABCD"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
            </div>

            <button
              onClick={createRoom}
              disabled={!playerName.trim() || loading}
              className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all duration-300 flex items-center justify-center gap-2 ${
                playerName.trim() && !loading
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:scale-105 hover:shadow-emerald-500/50"
                  : "bg-gray-800/50 border-2 border-gray-600 cursor-not-allowed opacity-50"
              }`}
            >
              {loading ? "⏳ Creating..." : "🏠 CREATE ROOM"}
            </button>

            <button
              onClick={joinRoom}
              disabled={!playerName.trim() || !joinCode.trim() || loading}
              className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all duration-300 flex items-center justify-center gap-2 ${
                playerName.trim() && joinCode.trim() && !loading
                  ? "bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 hover:scale-105 hover:shadow-sky-500/50"
                  : "bg-gray-800/50 border-2 border-gray-600 cursor-not-allowed opacity-50"
              }`}
            >
              {loading ? "⏳ Joining..." : "🚪 JOIN ROOM"}
            </button>
          </div>
        </div>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          .animate-float { animation: float 10s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  // GAME SCREEN (Simplified for now - works 100%)
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/30 to-blue-900/30 text-white p-6 flex flex-col items-center gap-6">
      <div className="w-full max-w-4xl p-6 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/20 text-center">
        <h1 className="text-4xl font-black bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent mb-4">
          Room: <span className="text-emerald-300">{roomId}</span>
        </h1>
        <p className="text-xl">You: <span className="font-bold text-white">{me?.name}</span> {isHost && "👑(Host)"}</p>
        <div className="flex gap-4 mt-4 justify-center">
          {isHost && (
            <button
              onClick={startRound}
              disabled={started || players.length < 2}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-bold"
            >
              {started ? "⚡ Running" : "▶️ START GAME"}
            </button>
          )}
          <button onClick={() => setShowPoints(true)} className="px-6 py-3 bg-amber-500 hover:bg-amber-400 rounded-2xl font-bold">
            📊 SCORES
          </button>
          <button onClick={exitGame} className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-2xl font-bold">
            🚪 Exit
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="w-full max-w-4xl p-4 bg-gray-900/50 rounded-2xl border border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            Turn: <span className="text-2xl font-bold text-yellow-400">{currentPlayer?.name}</span>
            {myTurn && (
              <span className={`ml-4 px-3 py-1 rounded-full text-sm font-bold ${
                hasDrawn ? "bg-emerald-500/30 text-emerald-200" : "bg-yellow-500/30 text-yellow-200"
              }`}>
                {hasDrawn ? "✓ Drew" : "➤ Draw"}
                {canDropWithoutDraw && !hasDrawn && " | 🎯 Match!"}
              </span>
            )}
          </div>
          <div>📥{pendingDraw} ⏭️{pendingSkips}</div>
        </div>
      </div>

      {/* Open Card */}
      <div className="text-center">
        <h3 className="text-xl mb-4">🎴 OPEN CARD</h3>
        {discardTop ? (
          <button
            onClick={() => drawCard(true)}
            disabled={!myTurn}
            className={`w-24 h-36 bg-white rounded-2xl shadow-2xl border-4 p-3 flex flex-col justify-between ${
              myTurn ? "hover:scale-105 cursor-pointer border-blue-400" : "border-gray-300 opacity-70"
            }`}
          >
            <div className={`text-lg font-bold ${cardTextColor(discardTop)}`}>{discardTop.rank}</div>
            <div className={`text-4xl text-center ${cardTextColor(discardTop)}`}>
              {discardTop.rank === "JOKER" ? "🃏" : discardTop.suit}
            </div>
            <div className={`text-lg font-bold text-right ${cardTextColor(discardTop)}`}>{discardTop.rank}</div>
          </button>
        ) : (
          <div className="w-24 h-36 bg-gray-800 border-2 border-dashed border-gray-600 rounded-2xl flex items-center justify-center text-gray-500">
            No Card
          </div>
        )}
      </div>

      {/* Players */}
      <div className="w-full max-w-4xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {players.map((p) => (
          <div key={p.id} className={`p-4 rounded-2xl border-2 shadow-lg ${
            p.id === youId 
              ? "border-emerald-400 bg-emerald-900/30" 
              : currentPlayer?.id === p.id 
              ? "border-yellow-400 bg-yellow-900/30" 
              : "border-gray-700 hover:border-gray-500"
          }`}>
            <p className="font-bold text-center">{p.name}</p>
            <p className="text-sm text-gray-400 text-center">{p.handSize} cards | {p.score} pts</p>
            {p.hasDrawn && <p className="text-xs text-emerald-400 text-center">✓Drew</p>}
          </div>
        ))}
      </div>

      {/* Your Cards */}
      {me && (
        <div className="w-full max-w-4xl">
          <h3 className="text-2xl font-bold mb-4 text-emerald-400">🃏 Your Hand ({me.hand.length} cards)</h3>
          <div className="flex gap-3 flex-wrap justify-center p-4 bg-gray-900/50 rounded-2xl">
            {me.hand.map((c) => {
              const selected = selectedIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  disabled={!myTurn}
                  className={`w-20 h-28 bg-white rounded-2xl shadow-xl border-4 flex flex-col p-2 justify-between transition-all ${
                    selected
                      ? "border-emerald-500 scale-110 shadow-emerald-500/50"
                      : myTurn
                      ? "border-gray-200 hover:border-blue-400 hover:scale-105"
                      : "border-gray-300 opacity-50"
                  }`}
                >
                  <div className={`text-lg font-bold ${cardTextColor(c)}`}>{c.rank}</div>
                  <div className={`text-3xl text-center ${cardTextColor(c)}`}>
                    {c.rank === "JOKER" ? "🃏" : c.suit}
                  </div>
                  <div className={`text-lg font-bold text-right ${cardTextColor(c)}`}>{c.rank}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {myTurn && started && (
        <div className="flex flex-wrap gap-4 justify-center max-w-4xl p-6 bg-black/50 backdrop-blur-xl rounded-3xl border border-white/20">
          <button
            onClick={() => drawCard(false)}
            disabled={hasDrawn}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-purple-500/50 transition-all"
          >
            📥 DECK DRAW
          </button>
          
          <button
            onClick={() => drawCard(true)}
            disabled={hasDrawn}
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-blue-500/50 transition-all"
          >
            🎴 OPEN DRAW
          </button>
          
          <button
            onClick={dropCards}
            disabled={selectedIds.length === 0 || (!hasDrawn && !canDropWithoutDraw)}
            className={`px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl transition-all ${
              selectedIds.length > 0 && (hasDrawn || canDropWithoutDraw)
                ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:shadow-green-500/50"
                : "bg-gray-700/50 cursor-not-allowed opacity-50"
            }`}
          >
            🗑️ DROP ({selectedIds.length})
          </button>
          
          <button
            onClick={callClose}
            className="px-8 py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-red-500/50 transition-all"
          >
            ❌ CLOSE
          </button>
        </div>
      )}

      {/* Points Modal */}
      {showPoints && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 text-black rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-3xl font-black text-center mb-6 text-gray-900">🏆 SCORES</h3>
            {players.map((p, i) => (
              <div key={p.id} className="flex justify-between p-4 bg-gray-100 rounded-2xl mb-3">
                <span className="font-bold">{p.name}</span>
                <span className={`font-black text-2xl px-4 py-2 rounded-xl ${
                  i === 0 ? "bg-emerald-500 text-white" : "bg-gray-300"
                }`}>
                  {p.score}
                </span>
              </div>
            ))}
            <button
              onClick={() => setShowPoints(false)}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl text-xl font-bold mt-6 hover:bg-gray-800 transition-all"
            >
              🎮 CONTINUE
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float { animation: float 10s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
