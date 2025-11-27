import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://close-master-server-production.up.railway.app";
const MAX_PLAYERS = 7;

function NeonFloatingCards() {
  const cards = Array.from({ length: 20 }).map((_, i) => {
    const left = Math.random() * 90 + 5;
    const top = Math.random() * 80 + 10;
    const delay = Math.random() * 10;
    const duration = 12 + Math.random() * 8;
    return { left, top, delay, duration, id: i };
  });

  return (
    <div className="fixed inset-0 pointer-events-none -z-10">
      {cards.map(({ id, left, top, delay, duration }) => (
        <div
          key={id}
          className="absolute w-16 h-24 rounded-3xl border border-white/20 shadow-[0_0_20px_#3b82f6] backdrop-blur-md animate-float-slow"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            boxShadow: "0 0 20px 4px rgba(59,130,246,0.6)",
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(8px)",
            borderColor: "rgba(59,130,246,0.5)",
          }}
        />
      ))}
    </div>
  );
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
      timeout: 20000,
    });

    s.on("connect", () => console.log("✅ Socket connected:", s.id));
    s.on("game_state", (state) => {
      console.log("🎮 Game State:", {
        roomId: state.roomId,
        youId: state.youId,
        hostId: state.hostId,
        isHost: state.hostId === state.youId,
        playerCount: state.players.length,
      });
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setSelectedIds([]);
      setScreen("game");
      setLoading(false);
    });
    s.on("error", (error) => {
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

  const currentPlayer = players[currentIndex];
  const myTurn = started && currentPlayer?.id === youId;
  const me = players.find((p) => p.id === youId);
  const hasDrawn = me?.hasDrawn || false;
  const matchingOpenCardCount = game?.matchingOpenCardCount || 0;
  const canDropWithoutDraw = matchingOpenCardCount > 0;

  const createRoom = () => {
    if (!socket || !playerName.trim()) {
      alert("Name ఎంటర్ చేయండి!");
      return;
    }
    setLoading(true);
    socket.emit("create_room", { name: playerName.trim() }, (res) => {
      setLoading(false);
      if (res?.roomId || res?.success) {
        console.log("Room created, waiting for game_state...");
      } else {
        alert(`Create failed: ${res?.error || "Unknown error"}`);
      }
    });
  };

  const joinRoom = () => {
    if (!socket || !playerName.trim() || !joinCode.trim()) {
      alert("Name & Room ID రెండూ ఎంటర్ చేయండి!");
      return;
    }
    setLoading(true);
    socket.emit(
      "join_room",
      { name: playerName.trim(), roomId: joinCode.toUpperCase().trim() },
      (res) => {
        setLoading(false);
        if (res?.error) {
          alert(res.error);
        } else if (res?.roomId || res?.success) {
          console.log("Joined room, waiting for game_state...");
        }
      }
    );
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
      setLoading(false);
    }
  };

  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex items-center justify-center px-4 relative overflow-hidden">
        <NeonFloatingCards />
        <div className="relative z-10 bg-black/80 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl">
              CLOSE MASTER
            </h1>
            <div className="text-2xl text-emerald-400 font-bold mt-2 animate-pulse">
              🔥 POWER RUMMY 🔥
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                👤 Your Name
              </label>
              <input
                type="text"
                className="w-full p-4 bg-gray-900/80 border-2 border-gray-600 rounded-2xl text-lg font-semibold text-white placeholder-gray-500 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/30 transition-all duration-300"
                placeholder=""
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={15}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                🏠 Room ID (Join)
              </label>
              <input
                type="text"
                className="w-full p-4 bg-gray-900/80 border-2 border-gray-600 rounded-2xl text-lg font-semibold text-white placeholder-gray-500 uppercase focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-500/30 transition-all duration-300"
                placeholder=""
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
                autoComplete="off"
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
          .animate-float {
            animation: float 10s ease-in-out infinite;
          }
          .animate-float-slow {
            animation: float 15s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/30 to-blue-900/30 text-white p-6 flex flex-col items-center gap-6 relative overflow-hidden">
      <NeonFloatingCards />
      <div className="z-10 w-full max-w-5xl text-center p-6 bg-black/60 backdrop-blur-xl rounded-3xl border border-emerald-500/50 shadow-2xl">
        <h1 className="mb-4 text-4xl font-black bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
          Room: <span className="text-emerald-300 font-bold">{roomId?.toUpperCase()}</span>
        </h1>
        <p className="text-xl mb-6">
          You: <span className="font-bold text-white px-3 py-1 bg-emerald-500/30 rounded-full">{me?.name}</span>
          {isHost && (
            <span className="ml-4 px-4 py-2 bg-yellow-500/90 text-black font-bold rounded-full text-lg animate-pulse">👑 HOST</span>
          )}
        </p>
        <div className="flex flex-wrap gap-4 justify-center items-center">
          {isHost && (
            <button
              onClick={startRound}
              disabled={started || players.length < 2}
              className={`px-8 py-4 rounded-3xl text-xl font-black shadow-2xl transition-all duration-300 flex items-center gap-2 ${
                started || players.length < 2
                  ? "bg-gray-700/50 border-2 border-gray-600 cursor-not-allowed opacity-60"
                  : "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:scale-105 hover:shadow-emerald-500/50"
              }`}
            >
              {started ? "⚡ GAME RUNNING" : players.length < 2 ? `▶️ WAIT (${players.length}/2)` : "▶️ START GAME"}
            </button>
          )}
          <button
            onClick={() => setShowPoints(true)}
            className="px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-3xl font-bold text-xl shadow-2xl hover:shadow-amber-500/50 transition-all"
          >
            📊 SCORES ({players.length})
          </button>
          <button
            onClick={exitGame}
            className="px-8 py-4 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 rounded-3xl font-bold text-xl shadow-2xl hover:shadow-gray-500/50 transition-all"
          >
            🚪 EXIT
          </button>
        </div>
        <div className="mt-4 text-lg opacity-90">
          Players: <span className="text-emerald-400 font-bold">{players.length}/{MAX_PLAYERS}</span> | Turn:{" "}
          <span
            className={`font-bold px-3 py-1 rounded-full ${
              myTurn ? "bg-yellow-500/90 text-black" : "bg-gray-600/50"
            }`}
          >
            {currentPlayer?.name || "None"}
          </span>
        </div>
      </div>

      {/* Your existing game UI goes here */}

      {showPoints && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 text-black rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-3xl font-black text-center mb-6 text-gray-900">🏆 SCORES</h3>
            {players.map((p, i) => (
              <div
                key={p.id}
                className={`flex justify-between p-4 rounded-2xl mb-3 ${
                  i === 0 ? "bg-emerald-500 text-white" : "bg-gray-100 text-black"
                }`}
              >
                <span className="font-bold truncate">{p.name}</span>
                <span className="font-black text-2xl px-4 py-2 rounded-xl">{p.score}</span>
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
    </div>
  );
}
