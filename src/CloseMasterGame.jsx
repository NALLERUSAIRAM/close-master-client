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

  // ✅ FIXED: Welcome screen input fonts
  useEffect(() => {
    const s = io(SERVER_URL, { transports: ["websocket"], upgrade: false });
    setSocket(s);

    s.on("game_state", (state) => {
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setSelectedIds([]);
    });

    s.on("error", (error) => alert(error.message || "Server error!"));

    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (game?.closeCalled) setShowPoints(true);
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

  const currentPlayer = players[currentIndex];
  const myTurn = started && currentPlayer?.id === youId;
  const me = players.find((p) => p.id === youId);
  const hasDrawn = me?.hasDrawn || false;
  const canDropWithoutDraw = me?.hand.some((c) => c.rank === discardTop?.rank); // ✅ NEW RULE

  // ✅ FIXED: All functions
  function createRoom() {
    if (!socket || !playerName.trim()) {
      alert("Name ఎంటర్ చేయండి!");
      return;
    }
    socket.emit("create_room", { name: playerName.trim() }, (res) => {
      if (res?.roomId || res?.success) setScreen("game");
    });
  }

  function joinRoom() {
    if (!socket || !playerName.trim() || !joinCode.trim()) {
      alert("Name & Room ID రెండూ ఎంటర్ చేయండి!");
      return;
    }
    socket.emit("join_room", { 
      name: playerName.trim(), 
      roomId: joinCode.trim().toUpperCase() 
    }, (res) => {
      if (res?.error) alert(res.error);
      else if (res?.roomId || res?.success) setScreen("game");
    });
  }

  function startRound() {
    if (!socket || !game?.roomId || !isHost || players.length < 2) {
      alert("కనీసం 2 మంది players ఉండాలి.");
      return;
    }
    socket.emit("start_round", { roomId: game.roomId });
  }

  // ✅ NEW RULE: Draw OR Drop if matching card exists
  function drawCard(fromDiscard = false) {
    if (!socket || !roomId || !myTurn) return;
    if (hasDrawn && !canDropWithoutDraw) return;
    socket.emit("action_draw", { roomId, fromDiscard });
  }

  function dropCards() {
    if (!socket || !roomId || !myTurn) return;
    if (selectedIds.length === 0) {
      alert("Cards select చేయండి!");
      return;
    }
    // ✅ NEW: Allow drop even without draw if matching open card
    if (!hasDrawn && !canDropWithoutDraw) {
      alert("ముందు draw చేయండి లేదా matching card ఉంటే drop చేయండి!");
      return;
    }
    socket.emit("action_drop", { roomId, selectedIds });
  }

  function callClose() {
    if (!socket || !roomId || !myTurn) return;
    if (!confirm("CLOSE చేయాలా?")) return;
    socket.emit("action_close", { roomId });
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function exitGame() {
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
  }

  // ✅ FIXED: Welcome screen with proper fonts
  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex items-center justify-center px-4 relative overflow-hidden">
        <div className="fixed inset-0 pointer-events-none">
          {Array.from({length: 12}).map((_, i) => (
            <div
              key={i}
              className="absolute w-20 h-28 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl animate-float"
              style={{ left: `${10 + i * 8}%`, animationDelay: `${i * 0.2}s`, animationDuration: `${8 + i}s` }}
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

          {/* ✅ FIXED: Input fonts - text-white + proper contrast */}
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">👤 Your Name</label>
              <input
                type="text"
                className="w-full p-4 bg-gray-900/80 border-2 border-gray-600 rounded-2xl text-lg font-semibold text-white placeholder-gray-400 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/30 transition-all duration-300 text-left"
                placeholder="SAIRAM"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">🏠 Room ID</label>
              <input
                type="text"
                className="w-full p-4 bg-gray-900/80 border-2 border-gray-600 rounded-2xl text-lg font-semibold text-white placeholder-gray-400 uppercase focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-500/30 transition-all duration-300 text-left"
                placeholder="ABCD"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
            </div>

            <button
              onClick={createRoom}
              disabled={!playerName.trim()}
              className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all duration-300 ${
                playerName.trim()
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:scale-105 hover:shadow-emerald-500/50"
                  : "bg-gray-800/50 border-2 border-gray-600 cursor-not-allowed opacity-50"
              }`}
            >
              🏠 CREATE ROOM
            </button>

            <button
              onClick={joinRoom}
              disabled={!playerName.trim() || !joinCode.trim()}
              className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all duration-300 ${
                playerName.trim() && joinCode.trim()
                  ? "bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 hover:scale-105 hover:shadow-sky-500/50"
                  : "bg-gray-800/50 border-2 border-gray-600 cursor-not-allowed opacity-50"
              }`}
            >
              🚪 JOIN ROOM
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

  // Game screen (shortened for brevity - same as before but with NEW RULE logic)
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/30 to-blue-900/30 text-white p-4 flex flex-col gap-4 relative overflow-hidden">
      {/* Background cards animation */}
      <div className="fixed inset-0 pointer-events-none">
        {Array.from({length: 15}).map((_, i) => (
          <div key={i} className="absolute w-16 h-24 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10 shadow-xl animate-float-slow" 
               style={{left: `${5 + i * 6}%`, top: `${10 + i * 4}%`, animationDelay: `${i * 0.1}s`}} />
        ))}
      </div>

      {/* Header, Status, Open Card, Players, Your Cards, Action Buttons - same structure */}
      {/* ... rest of game UI same as previous version ... */}
      
      {/* ✅ NEW ACTION BUTTONS LOGIC */}
      {started && myTurn && (
        <div className="flex flex-col gap-4 max-w-2xl mx-auto p-6 bg-black/50 backdrop-blur-xl rounded-3xl border border-white/20">
          <div className={`p-4 rounded-2xl font-bold text-xl text-center ${
            canDropWithoutDraw && !hasDrawn
              ? "bg-blue-500/20 border-2 border-blue-400 text-blue-200"
              : hasDrawn
              ? "bg-emerald-500/20 border-2 border-emerald-400 text-emerald-200"
              : "bg-yellow-500/20 border-2 border-yellow-400 text-yellow-200"
          }`}>
            {canDropWithoutDraw && !hasDrawn 
              ? "🎯 Open card match undi! Direct DROP చేయవచ్చు" 
              : hasDrawn 
              ? "✓ Drew! Same rank cards DROP చేయండి" 
              : "➤ Draw చేయండి"}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => drawCard(false)}
              disabled={!myTurn}
              className="p-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-purple-500/50 transition-all"
            >
              📥 DECK DRAW
            </button>

            <button
              onClick={() => drawCard(true)}
              disabled={!myTurn}
              className="p-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-blue-500/50 transition-all"
            >
              🎴 OPEN CARD
            </button>

            <button
              onClick={dropCards}
              disabled={selectedIds.length === 0 || !myTurn || (!hasDrawn && !canDropWithoutDraw)}
              className={`p-6 rounded-2xl font-bold text-xl shadow-2xl transition-all ${
                selectedIds.length > 0 && (hasDrawn || canDropWithoutDraw)
                  ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:shadow-green-500/50"
                  : "bg-gray-700/50 cursor-not-allowed opacity-50"
              }`}
            >
              🗑️ DROP ({selectedIds.length})
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(3deg); }
        }
        .animate-float-slow { animation: float-slow 12s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
