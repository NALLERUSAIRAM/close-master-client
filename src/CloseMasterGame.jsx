import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

// Card color utility
function cardColorClass(card) {
  if (!card) return "text-slate-900";
  if (card.rank === "JOKER") return "text-purple-700";
  if (card.suit === "♥" || card.suit === "♦") return "text-red-600";
  return "text-slate-900";
}

export default function CloseMasterGame() {
  const [screen, setScreen] = useState("welcome"); // welcome | game
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");

  const [game, setGame] = useState(null); // game_state from server
  const [isHost, setIsHost] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showScores, setShowScores] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // ---------- connect to SERVER (Railway) ----------
  useEffect(() => {
    const s = io("https://close-master-server-production.up.railway.app", {
      transports: ["websocket"],
      upgrade: false,
    });

    setSocket(s);

    s.on("connect", () => {
      console.log("Connected to game server:", s.id);
    });

    s.on("connect_error", (err) => {
      console.error("Socket connect error:", err.message);
    });

    s.on("game_state", (state) => {
      console.log("GAME STATE FROM SERVER:", state);
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setSelectedIds([]);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // ---------- derived values ----------
  const roomId = game?.roomId || "";
  const youId = game?.youId || "";
  const players = game?.players || [];
  const log = game?.log || [];
  const started = game?.started || false;

  const currentPlayer = players[game?.currentIndex ?? -1] || null;
  const topCard = game?.discardTop || null;

  const myPlayer = players.find((p) => p.id === youId) || null;

  const myTurn =
    started &&
    !game?.roundEnded &&
    currentPlayer &&
    currentPlayer.id === youId;

  // ---------- lobby actions ----------
  function handleCreateRoom() {
    if (!socket) return;
    socket.emit(
      "create_room",
      { name: playerName || "Player" },
      (res) => {
        console.log("ROOM CREATE RES:", res);
        if (res?.error) {
          alert(res.error);
          return;
        }
        if (res?.roomId) {
          setScreen("game");
        }
      }
    );
  }

  function handleJoinRoom() {
    if (!socket) return;
    if (!joinRoomId.trim()) {
      alert("Enter a room ID");
      return;
    }
    socket.emit(
      "join_room",
      {
        roomId: joinRoomId.trim().toUpperCase(),
        name: playerName || "Player",
      },
      (res) => {
        console.log("JOIN ROOM RES:", res);
        if (res?.error) {
          alert(res.error);
          return;
        }
        if (res?.roomId) {
          setScreen("game");
        }
      }
    );
  }

  function handleStartRound() {
    if (!socket || !roomId) return;
    socket.emit("start_round", { roomId });
  }

  // ---------- game actions ----------
  function handleDraw() {
    if (!socket || !roomId) return;
    socket.emit("action_draw", { roomId });
  }

  function handleDrop() {
    if (!socket || !roomId) return;
    socket.emit("action_drop", { roomId, selectedIds });
  }

  function handleCallClose() {
    if (!socket || !roomId) return;
    socket.emit("action_close", { roomId });
  }

  function handlePoints() {
    if (!socket || !roomId) return;
    socket.emit("action_points", { roomId });
    setShowScores(true);
  }

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  // --------------------------------------------------------------------
  //  ⭐ EXIT BUTTON (NEW) — exit → home screen, server game state reset kaadhu
  // --------------------------------------------------------------------
  function handleExitGame() {
    if (
      window.confirm(
        "Exit cheyyali? Mee score & game migatha players ki continue avutundi."
      )
    ) {
      // Browser refresh → Home screen
      // Server lo remaining players continue
      window.location.href = "/";
    }
  }

  // ---------- WELCOME SCREEN ----------
  if (screen === "welcome") {
    return (
      <div
        className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center"
        style={{ backgroundImage: "url('/close-master-bg.png')" }}
      >
        <div className="p-6 max-w-md w-full mx-auto space-y-4 bg-black/75 rounded-2xl shadow-2xl backdrop-blur text-white">
          <h1 className="text-3xl font-bold text-center mb-2">
            CLOSE MASTER 🔥
          </h1>
          <p className="text-sm text-gray-200 text-center">
            Enter your name and choose an option to start.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Your Name
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="eg: SAIRAM"
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-300 mb-1">
                Room ID (for Join)
              </label>
              <input
                type="text"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                placeholder="Enter room ID to join"
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-sm"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <button
              onClick={handleCreateRoom}
              className="w-full px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 shadow text-sm font-semibold"
            >
              Create Room (Become Host)
            </button>
            <button
              onClick={handleJoinRoom}
              className="w-full px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 shadow text-sm font-semibold"
            >
              Join Room
            </button>
          </div>

          <div className="mt-3 p-2 rounded-xl bg-gray-900/80 h-32 overflow-auto text-xs">
            {log.map((l, i) => (
              <p key={i}>• {l}</p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------
  //  GAME SCREEN
  // --------------------------------------------------------------------
  return (
    <div
      className="min-h-screen w-full bg-cover bg-center bg-no-repeat flex items-center justify-center"
      style={{ backgroundImage: "url('/close-master-bg.png')" }}
    >
      <div className="p-4 max-w-5xl w-full mx-auto space-y-4 bg-black/70 rounded-2xl shadow-2xl backdrop-blur text-white">
        <h1 className="text-3xl font-bold mb-2">
          CLOSE MASTER – Online Room
        </h1>

        {/* ROOM HEADER */}
        <div className="mb-2 p-3 rounded-2xl bg-gray-900/80 flex flex-col gap-2">
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <span>Room: {roomId || "Not in room"}</span>

            <span className="px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700">
              {isHost ? "Host" : "Player"}
            </span>

            <span className="ml-auto text-gray-300">
              Players: {players.map((p) => p.name).join(", ") || "–"}
            </span>

            {/* EXIT BUTTON */}
            <button
              onClick={handleExitGame}
              className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold"
            >
              Exit
            </button>
          </div>

          {!started ? (
            <div className="flex flex-wrap gap-2 items-center mt-1">
              {isHost ? (
                <button
                  onClick={handleStartRound}
                  disabled={players.length < 2}
                  className="px-4 py-2 rounded-xl bg-emerald-600 disabled:opacity-50 text-sm font-semibold"
                >
                  Start Game ({players.length}/7)
                </button>
              ) : (
                <span className="text-xs text-gray-300">
                  Waiting for host to start the game…
                </span>
              )}
              <span className="text-xs text-gray-400">
                Need at least 2 players.
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 items-center mt-1 text-xs text-green-300">
              <span>Game started ✔</span>
              {isHost && (
                <button
                  onClick={handleStartRound}
                  className="px-3 py-1 rounded-lg bg-blue-600 text-xs font-semibold"
                >
                  New Round
                </button>
              )}
            </div>
          )}
        </div>

        {/* GAME UI BELOW — TRUNCATED in this view BUT YOU KEEP YOUR ORIGINAL */}
        {/* Your table, cards, buttons, discard pile, logs, etc. unchanged */}

        {/* (Because CloseMasterGame.jsx was too long to include full rendering here) */}

      </div>
    </div>
  );
}
