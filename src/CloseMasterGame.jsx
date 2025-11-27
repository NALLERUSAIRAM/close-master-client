import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

// Connect to your LIVE Railway server
const SERVER_URL = "https://close-master-server-production.up.railway.app";

function cardColorClass(card) {
  if (!card) return "text-slate-900";
  if (card.rank === "JOKER") return "text-purple-700";
  if (card.suit === "♥" || card.suit === "♦") return "text-red-600";
  return "text-slate-900";
}

export default function CloseMasterGame() {
  const [screen, setScreen] = useState("welcome");
  const [socket, setSocket] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");

  const [game, setGame] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showScores, setShowScores] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // ---------- connect to SERVER ----------
  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ["websocket"],
      upgrade: false,
    });

    setSocket(s);

    s.on("connect", () => {
      console.log("Connected:", s.id);
    });

    s.on("connect_error", (err) => {
      console.error("Socket Error:", err.message);
    });

    s.on("game_state", (state) => {
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setSelectedIds([]);
    });

    return () => {
      s.disconnect();
    };
  }, []);

  const youId = game?.youId || "";
  const players = game?.players || [];
  const roomId = game?.roomId || "";
  const started = game?.started || false;

  const currentPlayer =
    players[game?.currentIndex ?? -1] || null;

  const topCard = game?.discardTop || null;

  const myTurn =
    started &&
    !game?.roundEnded &&
    currentPlayer &&
    currentPlayer.id === youId;

  // -------- Lobby actions --------
  function handleCreateRoom() {
    if (!socket) return;
    socket.emit(
      "create_room",
      { name: playerName || "Player" },
      (res) => {
        if (res?.roomId) setScreen("game");
      }
    );
  }

  function handleJoinRoom() {
    if (!socket) return;
    if (!joinRoomId.trim()) return alert("Enter room ID");

    socket.emit(
      "join_room",
      {
        roomId: joinRoomId.trim().toUpperCase(),
        name: playerName || "Player",
      },
      (res) => {
        if (res?.error) alert(res.error);
        else if (res?.roomId) setScreen("game");
      }
    );
  }

  function handleStartRound() {
    if (!socket || !roomId || !isHost) return;
    socket.emit("start_round", { roomId });
  }

  // -------- Game actions --------
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

  // -------- EXIT (correct version) --------
  function handleExitGame() {
    if (
      !window.confirm(
        "Exit cheyyali? Game continue avutundi, mee score save untundi."
      )
    )
      return;

    if (socket) socket.disconnect();

    setGame(null);
    setSelectedIds([]);
    setPlayerName("");
    setJoinRoomId("");
    setIsHost(false);
    setShowScores(false);
    setShowRules(false);
    setScreen("welcome");
  }

  // -------- WELCOME SCREEN --------
  if (screen === "welcome") {
    return (
      <div className="min-h-screen w-full bg-[#020617] flex items-center justify-center text-white">
        <div className="p-6 max-w-md w-full bg-black/60 rounded-2xl space-y-4">
          <h1 className="text-3xl font-bold text-center">CLOSE MASTER 🔥</h1>

          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Your Name"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm"
          />

          <input
            type="text"
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            placeholder="Room ID"
            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm"
          />

          <button
            onClick={handleCreateRoom}
            className="w-full bg-emerald-600 py-2 rounded-lg"
          >
            Create Room
          </button>

          <button
            onClick={handleJoinRoom}
            className="w-full bg-sky-600 py-2 rounded-lg"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  // -------- GAME SCREEN --------
  return (
    <div className="min-h-screen bg-[#0a0f1f] p-4 text-white">
      <h1 className="text-3xl font-bold mb-2">Room: {roomId}</h1>

      {!started ? (
        <div className="mb-4">
          {isHost ? (
            <button
              onClick={handleStartRound}
              disabled={players.length < 2}
              className="px-4 py-2 bg-emerald-600 rounded-xl"
            >
              Start Game ({players.length}/7)
            </button>
          ) : (
            <p>Waiting for Host…</p>
          )}
        </div>
      ) : (
        <p className="text-green-400 mb-4">Game Started ✔</p>
      )}

      {/* Players around */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {players.map((p) => {
          const isSelf = p.id === youId;
          const isCurrent =
            currentPlayer && currentPlayer.id === p.id;

          return (
            <div
              key={p.id}
              className={`p-3 rounded-xl bg-gray-900 border ${
                isCurrent ? "border-yellow-400" : "border-gray-700"
              }`}
            >
              <p className="font-bold">
                {p.name} {isSelf && "(You)"}
              </p>
              <p className="text-sm text-gray-300">
                Cards: {p.handSize} | Score: {p.score}
              </p>

              {isSelf && started && (
                <button
                  onClick={handleExitGame}
                  className="mt-2 px-3 py-1 bg-red-600 rounded-lg text-xs"
                >
                  Exit
                </button>
              )}

              {isSelf && started && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {p.hand.map((card) => {
                    const selected = selectedIds.includes(card.id);
                    return (
                      <button
                        key={card.id}
                        onClick={() => toggleSelect(card.id)}
                        className={`w-12 h-16 bg-white rounded-lg text-black text-sm border ${
                          selected ? "border-green-500" : "border-gray-500"
                        }`}
                      >
                        {card.rank}
                        {card.suit}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {started && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={handleDraw}
            disabled={!myTurn}
            className="px-4 py-2 bg-purple-600 rounded-xl disabled:opacity-50"
          >
            Draw
          </button>

          <button
            onClick={handleDrop}
            disabled={!myTurn}
            className="px-4 py-2 bg-green-600 rounded-xl disabled:opacity-50"
          >
            Drop
          </button>

          <button
            onClick={handleCallClose}
            disabled={!myTurn}
            className="px-4 py-2 bg-red-600 rounded-xl disabled:opacity-50"
          >
            Close
          </button>

          {isHost && (
            <button
              onClick={handlePoints}
              className="px-4 py-2 bg-amber-700 rounded-xl"
            >
              Points
            </button>
          )}
        </div>
      )}

      {/* Scores popup */}
      {showScores && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center">
          <div className="bg-white text-black p-4 rounded-xl w-80">
            <h2 className="text-lg font-bold">Scores</h2>
            {players.map((p) => (
              <div
                key={p.id}
                className="flex justify-between border-b py-1"
              >
                <span>{p.name}</span>
                <span>{p.score}</span>
              </div>
            ))}
            <button
              onClick={() => setShowScores(false)}
              className="mt-3 w-full bg-gray-800 text-white py-2 rounded-lg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
