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

  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ["websocket"],
      upgrade: false,
    });

    setSocket(s);

    s.on("game_state", (state) => {
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setSelectedIds([]);
    });

    s.on("error", (error) => {
      alert(error.message || "Server error!");
    });

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

  const currentPlayer = players[currentIndex];
  const myTurn = started && currentPlayer?.id === youId;
  const me = players.find((p) => p.id === youId);
  const hasDrawn = me?.hasDrawn || false;

  function createRoom() {
    if (!socket || !playerName.trim()) {
      alert("Name ఎంటర్ చేయండి!");
      return;
    }
    
    console.log("🎮 Creating room with name:", playerName.trim());
    
    socket.emit("create_room", { 
      name: playerName.trim().substring(0, 20)
    }, (res) => {
      console.log("✅ CREATE ROOM RESPONSE:", res);
      
      if (res && (res.roomId || res.success)) {
        console.log("🎉 Room created:", res.roomId);
        setScreen("game");
      } else {
        console.error("❌ Create failed:", res);
        alert(`Room create failed: ${res?.error || "Server error. Refresh చేయండి"}`);
      }
    });
  }

  function joinRoom() {
    if (!socket) return;
    if (!playerName.trim() || !joinCode.trim()) {
      alert("Name & Room ID రెండూ ఎంటర్ చేయండి!");
      return;
    }
    socket.emit(
      "join_room",
      { name: playerName.trim(), roomId: joinCode.trim().toUpperCase() },
      (res) => {
        console.log("🚪 JOIN RESPONSE:", res);
        if (res?.error) {
          alert(res.error);
        } else if (res?.roomId || res?.success) {
          setScreen("game");
        }
      }
    );
  }

  function startRound() {
    if (!socket || !game?.roomId || !isHost) return;
    if (players.length < 2) {
      alert("కనీసం 2 మంది players ఉండాలి.");
      return;
    }
    socket.emit("start_round", { roomId: game.roomId });
  }

  function drawCard(fromDiscard = false) {
    if (!socket || !roomId || !myTurn || hasDrawn) return;
    socket.emit("action_draw", { 
      roomId, 
      fromDiscard
    });
  }

  function dropCards() {
    if (!socket || !roomId || !myTurn || !hasDrawn) return;
    if (selectedIds.length === 0) {
      alert("ముందు cards select చేయండి!");
      return;
    }
    socket.emit("action_drop", { roomId, selectedIds });
  }

  function callClose() {
    if (!socket || !roomId || !myTurn) return;
    if (!window.confirm("Sure? CLOSE అని అడిగితే scoring direct ga jarugutundi!")) {
      return;
    }
    socket.emit("action_close", { roomId });
  }

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function exitGame() {
    if (!window.confirm("Game exit చేయాలా?")) return;
    if (socket) socket.disconnect();
    setScreen("welcome");
    setPlayerName("");
    setJoinCode("");
    setGame(null);
    setSelectedIds([]);
    setIsHost(false);
    setShowPoints(false);
  }

  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex items-center justify-center px-4 relative overflow-hidden">
        {/* Animated Cards Background */}
        <div className="fixed inset-0 pointer-events-none">
          {Array.from({length: 12}).map((_, i) => (
            <div
              key={i}
              className="absolute w-20 h-28 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 shadow-2xl animate-float animate-delay-[0s]"
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

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-300 mb-2 font-semibold">👤 Your Name</label>
              <input
                className="w-full p-4 bg-black/50 border-2 border-gray-700 rounded-2xl text-lg font-semibold focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/30 transition-all duration-300"
                placeholder="eg: SAIRAM"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-2 font-semibold">🏠 Room ID (Join చేయడానికి)</label>
              <input
                className="w-full p-4 bg-black/50 border-2 border-gray-700 rounded-2xl text-lg font-semibold uppercase focus:border-sky-400 focus:ring-4 focus:ring-sky-500/30 transition-all duration-300"
                placeholder="ABCD (Host ఇచ్చిన code)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              />
            </div>

            <button
              onClick={createRoom}
              disabled={!playerName.trim()}
              className={`w-full py-5 rounded-2xl text-xl font-black shadow-2xl transform transition-all duration-300 ${
                playerName.trim()
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:scale-105 hover:shadow-emerald-500/50 hover:shadow-2xl"
                  : "bg-gray-800/50 border-2 border-gray-700 cursor-not-allowed opacity-50"
              }`}
            >
              🏠 CREATE ROOM
            </button>

            <button
              onClick={joinRoom}
              disabled={!playerName.trim() || !joinCode.trim()}
              className={`w-full py-5 rounded-2xl text-xl font-black shadow-2xl transform transition-all duration-300 ${
                playerName.trim() && joinCode.trim()
                  ? "bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 hover:scale-105 hover:shadow-sky-500/50 hover:shadow-2xl"
                  : "bg-gray-800/50 border-2 border-gray-700 cursor-not-allowed opacity-50"
              }`}
            >
              🚪 JOIN ROOM
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/30 to-blue-900/30 text-white overflow-hidden relative">
      {/* Animated Cards Background */}
      <div className="fixed inset-0 pointer-events-none">
        {Array.from({length: 20}).map((_, i) => (
          <div
            key={i}
            className="absolute w-16 h-24 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm rounded-xl border border-white/10 shadow-xl animate-float-slow"
            style={{
              left: `${Math.sin(i) * 45 + 5}%`,
              top: `${Math.cos(i) * 35 + 5}%`,
              animationDelay: `${i * 0.15}s`,
              animationDuration: `${12 + i * 0.5}s`
            }}
          />
        ))}
      </div>

      <div className="min-h-screen p-4 flex flex-col gap-6 relative z-10">
        {/* Header */}
        <div className="w-full max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4 p-6 bg-black/40 backdrop-blur-xl rounded-3xl border border-white/20 shadow-2xl">
          <div>
            <h2 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
              Room: <span className="text-emerald-300">{roomId}</span>
            </h2>
            <p className="text-lg font-semibold text-white/90">
              You: <span className="text-emerald-400">{me?.name}</span> 
              {isHost && " 👑(Host)"}
            </p>
          </div>

          <div className="flex gap-3 items-center">
            {isHost && (
              <button
                onClick={startRound}
                disabled={started || players.length < 2}
                className={`px-8 py-4 rounded-2xl text-lg font-black shadow-2xl transform transition-all ${
                  started
                    ? "bg-emerald-900/50 cursor-not-allowed"
                    : players.length < 2
                    ? "bg-gray-800/50 cursor-not-allowed opacity-50"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:scale-105 hover:shadow-emerald-500/50"
                }`}
              >
                {started ? "⚡ Running" : "▶️ START GAME"}
              </button>
            )}
            <button
              onClick={() => setShowPoints(true)}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-2xl font-bold shadow-lg hover:shadow-amber-500/50 transform hover:scale-105 transition-all"
            >
              📊 SCORES
            </button>
            <button
              onClick={exitGame}
              className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 rounded-2xl font-bold shadow-lg hover:shadow-gray-500/50 transform hover:scale-105 transition-all"
            >
              🚪 Exit
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="w-full max-w-6xl mx-auto bg-black/50 backdrop-blur-xl border border-white/20 rounded-3xl px-8 py-6 text-xl flex justify-between items-center shadow-2xl">
          <div>
            Status: 
            {started ? (
              <>
                <span className="text-yellow-400 font-black ml-3 text-2xl drop-shadow-lg">
                  {currentPlayer?.name}
                </span>
                {myTurn && (
                  <span className={`ml-4 px-4 py-2 rounded-2xl font-bold text-lg border-2 shadow-lg ${
                    hasDrawn 
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 animate-pulse" 
                      : "bg-yellow-500/20 border-yellow-500 text-yellow-200"
                  }`}>
                    {hasDrawn ? "✓ Drew!" : "➤ Draw First!"}
                  </span>
                )}
              </>
            ) : closeCalled ? (
              <span className="text-red-400 text-2xl font-black animate-pulse">🔚 Round Ended</span>
            ) : (
              <span className="text-gray-400 text-xl font-bold">⏳ Host start చేయాలి</span>
            )}
          </div>
          <div className="text-lg font-bold text-white/80 flex gap-6">
            <span>📥 {pendingDraw}</span>
            <span>⏭️ {pendingSkips}</span>
          </div>
        </div>

        {/* Open Card */}
        <div className="w-full max-w-md mx-auto p-8 bg-black/40 backdrop-blur-xl rounded-3xl border-2 border-white/20 shadow-2xl text-center">
          <h3 className="text-xl font-bold text-gray-300 mb-6">
            🎴 OPEN CARD {myTurn && !hasDrawn && "(Click చేయండి!)"}
          </h3>
          {discardTop ? (
            <button
              onClick={() => drawCard(true)}
              disabled={!myTurn || hasDrawn}
              className={`w-28 h-40 bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl border-4 mx-auto transform transition-all duration-300 hover:shadow-neon hover:shadow-[0_0_50px_${myTurn && !hasDrawn ? '#3b82f6' : '#6b7280'}] ${
                myTurn && !hasDrawn
                  ? "hover:scale-110 cursor-pointer border-blue-400 animate-pulse hover:animate-none"
                  : "opacity-70 cursor-not-allowed border-gray-300"
              }`}
            >
              <div className={`flex flex-col justify-between h-full p-4 ${cardTextColor(discardTop)}`}>
                <div className="text-lg font-black">{discardTop.rank}</div>
                <div className="text-4xl text-center drop-shadow-lg">
                  {discardTop.rank === "JOKER" ? "🃏" : discardTop.suit}
                </div>
                <div className="text-lg font-black text-right">{discardTop.rank}</div>
              </div>
            </button>
          ) : (
            <div className="w-28 h-40 bg-gray-800/50 border-4 border-dashed border-gray-600 rounded-3xl flex items-center justify-center text-lg font-bold text-gray-500 shadow-xl">
              No Card
            </div>
          )}
          <p className="mt-6 text-lg font-bold text-gray-300">
            Match: <span className="text-2xl text-emerald-400">{discardTop?.rank || "?"}</span>
          </p>
        </div>

        {/* Other Players */}
        <div className="w-full max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {players
            .filter((p) => p.id !== youId)
            .map((p) => (
              <div
                key={p.id}
                className={`p-6 bg-black/40 backdrop-blur-xl rounded-3xl border-2 shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-neon hover:shadow-[0_0_30px_${currentPlayer?.id === p.id ? '#eab308' : '#6b7280'}] ${
                  currentPlayer?.id === p.id 
                    ? "border-yellow-400 ring-4 ring-yellow-400/50 scale-110 shadow-[0_0_40px_#eab308]" 
                    : "border-white/20 hover:border-white/40"
                } ${p.hasDrawn ? "ring-4 ring-emerald-400/30 bg-emerald-900/20" : ""}`}
              >
                <p className="text-lg font-black text-center mb-2 truncate">
                  {p.name}
                  {p.id === game?.hostId && " 👑"}
                </p>
                <p className="text-sm text-gray-400 text-center mb-4">
                  {p.handSize} Cards | {p.score} pts
                  {p.hasDrawn && " ✓Drew"}
                </p>
                <div className="flex gap-1 justify-center flex-wrap">
                  {Array.from({ length: p.handSize }).map((_, i) => (
                    <div 
                      key={i} 
                      className="w-6 h-8 bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl border border-gray-500 shadow-md"
                    />
                  ))}
                </div>
              </div>
            ))}
        </div>

        {/* Your Cards */}
        {me && (
          <div className="w-full max-w-6xl mx-auto">
            <div className="mb-6 p-6 bg-gradient-to-r from-emerald-900/50 to-emerald-800/30 backdrop-blur-xl rounded-3xl border-2 border-emerald-400/30 shadow-2xl">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-black text-emerald-400 drop-shadow-lg">
                  🃏 Your Hand ({me.hand.length} cards)
                </h3>
                <span className={`px-4 py-2 rounded-2xl font-bold text-lg border-2 shadow-lg ${
                  hasDrawn 
                    ? "bg-emerald-500/30 border-emerald-500 text-emerald-200" 
                    : "bg-yellow-500/30 border-yellow-500 text-yellow-100"
                }`}>
                  {hasDrawn ? "✓ Drew - Select & Drop" : "Draw First!"}
                </span>
              </div>
            </div>

            <div className="bg-black/50 backdrop-blur-xl rounded-4xl border-2 border-white/10 p-8 shadow-2xl">
              <div className="flex gap-4 justify-center flex-wrap">
                {me.hand.map((c) => {
                  const sel = selectedIds.includes(c.id);
                  const color = cardTextColor(c);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleSelect(c.id)}
                      disabled={!hasDrawn}
                      className={`w-20 h-32 bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl border-4 transform transition-all duration-300 hover:shadow-neon group ${
                        sel
                          ? "border-emerald-500 shadow-emerald-500/50 scale-110 translate-y-[-8px] shadow-[0_0_50px_#10b981]"
                          : !hasDrawn
                          ? "border-gray-300 opacity-50 cursor-not-allowed scale-95"
                          : "border-gray-200 hover:border-blue-400 hover:scale-105 hover:shadow-[0_0_30px_#3b82f6] hover:shadow-neon"
                      }`}
                    >
                      <div className={`flex flex-col justify-between h-full p-3 ${color} group-hover:text-blue-600 transition-colors`}>
                        <div className="text-lg font-black">{c.rank}</div>
                        <div className="text-5xl text-center drop-shadow-2xl">{c.rank === "JOKER" ? "🃏" : c.suit}</div>
                        <div className="text-lg font-black text-right">{c.rank}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {started && (
          <div className="w-full max-w-4xl mx-auto flex flex-wrap gap-6 justify-center p-8">
            <button
              onClick={() => drawCard(false)}
              disabled={!myTurn || hasDrawn}
              className={`px-12 py-8 rounded-3xl text-2xl font-black shadow-2xl transform transition-all duration-300 group ${
                !myTurn || hasDrawn
                  ? "bg-purple-900/50 border-2 border-purple-500/50 opacity-50 cursor-not-allowed scale-95"
                  : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 hover:scale-110 hover:shadow-[0_0_60px_#8b5cf6] shadow-purple-500/30"
              }`}
            >
              📥 DECK DRAW
              {pendingDraw > 0 && <div className="text-lg text-purple-200">+{pendingDraw}</div>}
            </button>

            <button
              onClick={dropCards}
              disabled={!myTurn || !hasDrawn || selectedIds.length === 0}
              className={`px-12 py-8 rounded-3xl text-2xl font-black shadow-2xl transform transition-all duration-300 group ${
                !myTurn || !hasDrawn || selectedIds.length === 0
                  ? "bg-green-900/50 border-2 border-green-500/50 opacity-50 cursor-not-allowed scale-95"
                  : "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 hover:scale-110 hover:shadow-[0_0_60px_#10b981] shadow-green-500/30"
              }`}
            >
              🗑️ DROP
              <div>({selectedIds.length})</div>
            </button>

            <button
              onClick={callClose}
              disabled={!myTurn}
              className={`px-12 py-8 rounded-3xl text-2xl font-black shadow-2xl transform transition-all duration-300 group ${
                !myTurn
                  ? "bg-red-900/50 border-2 border-red-500/50 opacity-50 cursor-not-allowed scale-95"
                  : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 hover:scale-110 hover:shadow-[0_0_60px_#ef4444] shadow-red-500/30"
              }`}
            >
              ❌ CLOSE
            </button>
          </div>
        )}

        {/* Turn Guidance */}
        {myTurn && started && (
          <div className={`w-full max-w-2xl mx-auto p-8 rounded-4xl shadow-2xl border-4 text-center transform transition-all duration-500 animate-bounce-slow ${
            hasDrawn 
              ? "bg-gradient-to-r from-emerald-900/80 to-emerald-800/80 border-emerald-400/50 shadow-emerald-500/30" 
              : "bg-gradient-to-r from-yellow-900/80 to-orange-900/80 border-yellow-400/50 shadow-yellow-500/30"
          }`}>
            <div className="text-3xl font-black mb-4 drop-shadow-2xl">
              🎯 YOUR TURN
            </div>
            {hasDrawn ? (
              <div className="text-2xl font-bold text-emerald-300">
                ✓ Card డ్రా చేశారు! <br />
                <span className="text-xl">Same rank cards select చేసి 🚀 DROP చేయండి</span>
              </div>
            ) : (
              <div className="text-2xl font-bold text-yellow-200">
                ➤ ముందు DECK లేదా OPEN CARD నుండి DRAW చేయండి
              </div>
            )}
          </div>
        )}

        {/* Points Modal */}
        {showPoints && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center p-6 z-50">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-xl rounded-4xl p-12 shadow-2xl border-4 border-emerald-400/20 shadow-emerald-500/20">
                <h3 className="text-5xl font-black text-center mb-12 bg-gradient-to-r from-gray-900 to-black text-transparent bg-clip-text drop-shadow-4xl">
                  🏆 FINAL SCORES
                </h3>

                <div className="space-y-6 mb-12">
                  {players.map((p, i) => (
                    <div
                      key={p.id}
                      className={`p-8 rounded-3xl shadow-2xl transform transition-all hover:scale-105 border-4 ${
                        i === 0 
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600 border-emerald-400 shadow-[0_0_60px_#10b981] hover:shadow-[0_0_80px_#059669]"
                          : "bg-gradient-to-r from-gray-100 to-gray-200 border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-3xl font-black">{p.name}</span>
                        <span className={`text-5xl font-black px-12 py-6 rounded-3xl shadow-2xl ${
                          i === 0 
                            ? "bg-gradient-to-r from-emerald-400 to-emerald-500 text-white shadow-[0_0_40px_#059669]" 
                            : "bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800"
                        }`}>
                          {p.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowPoints(false)}
                  className="w-full py-8 px-12 bg-gradient-to-r from-gray-900 to-black text-white rounded-3xl text-2xl font-black shadow-2xl hover:shadow-[0_0_60px_#6b7280] hover:scale-105 transform transition-all duration-300"
                >
                  🎮 CONTINUE GAME
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-30px) rotate(2deg); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 10s ease-in-out infinite; }
        .animate-float-slow { animation: float-slow 15s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        .shadow-neon {
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }
      `}</style>
    </div>
  );
}
