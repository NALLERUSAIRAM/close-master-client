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
    const s = io(SERVER_URL, { transports: ["websocket"], upgrade: false, timeout: 30000 });
    s.on("connect", () => console.log("✅ Connected:", s.id));
    s.on("game_state", (state) => {
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setSelectedIds([]);
      setScreen("game");
      setLoading(false);
    });
    s.on("error", (e) => {
      alert(e.message || "Server error!");
      setLoading(false);
    });
    s.on("room_created", ({ roomId }) => {
      setScreen("lobby");
      setLoading(false);
    });
    setSocket(s);
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
  const currentPlayer = players[currentIndex];
  const myTurn = started && currentPlayer?.id === youId;
  const me = players.find((p) => p.id === youId);
  const hasDrawn = me?.hasDrawn || false;
  const matchingOpenCardCount = game?.matchingOpenCardCount || 0;

  const createRoom = () => {
    if (!socket || !playerName.trim()) {
      alert("Name!");
      return;
    }
    setLoading(true);
    socket.emit("create_room", { name: playerName.trim() });
  };

  const joinRoom = () => {
    if (!socket || !playerName.trim() || !joinCode.trim()) {
      alert("Name & Room ID!");
      return;
    }
    setLoading(true);
    socket.emit("join_room", { name: playerName.trim(), roomId: joinCode.toUpperCase().trim() });
  };

  const startRound = () => {
    if (!socket || !roomId || !isHost || players.length < 2) {
      alert("2+ players needed!");
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
      alert("Select cards!");
      return;
    }
    socket.emit("action_drop", { roomId, selectedIds });
  };

  const callClose = () => {
    if (!socket || !roomId || !myTurn || !confirm("Are you sure to CLOSE?")) return;
    socket.emit("action_close", { roomId });
  };

  const toggleSelect = (id) => setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

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
    }
  };

  if (screen === "welcome")
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex items-center justify-center px-4 relative overflow-hidden">
        <div className="relative z-10 bg-black/80 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl">
              CLOSE MASTER
            </h1>
            <div className="text-2xl text-emerald-400 font-bold mt-2 animate-pulse">🔥 POWER RUMMY 🔥</div>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">👤 Name</label>
              <input
                type="text"
                className="w-full p-4 bg-gray-900/80 border-2 border-gray-600 rounded-2xl text-lg font-semibold text-white placeholder-gray-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/30 transition-all"
                placeholder=""
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={15}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">🏠 Room ID</label>
              <input
                type="text"
                className="w-full p-4 bg-gray-900/80 border-2 border-gray-600 rounded-2xl text-lg font-semibold text-white placeholder-gray-500 uppercase focus:border-sky-400 focus:ring-4 focus:ring-sky-500/30 transition-all"
                placeholder=""
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
              />
            </div>
            <button
              onClick={createRoom}
              disabled={!playerName.trim() || loading}
              className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all ${
                playerName.trim() && !loading
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 hover:scale-105"
                  : "bg-gray-800/50 border-2 border-gray-600 cursor-not-allowed opacity-50"
              }`}
            >
              {loading ? "⏳ Creating..." : "🏠 CREATE ROOM"}
            </button>
            <button
              onClick={joinRoom}
              disabled={!playerName.trim() || !joinCode.trim() || loading}
              className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all ${
                playerName.trim() && joinCode.trim() && !loading
                  ? "bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 hover:scale-105"
                  : "bg-gray-800/50 border-2 border-gray-600 cursor-not-allowed opacity-50"
              }`}
            >
              {loading ? "⏳ Joining..." : "🚪 JOIN ROOM"}
            </button>
          </div>
        </div>
      </div>
    );

  // Rest of game UI here (similar to original with removed animations/logs for clarity)...

  return (
    <div>
      {/* For brevity, the full game UI omitted here — keep game UI from your previous working code */}
      {/* It includes room, players, open card, hand, and actions */}
      {/* Please reuse your game screen UI with this fixed create/join room */}
    </div>
  );
}
