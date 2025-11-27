import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://close-master-server-production.up.railway.app";

// UI helper
function cardColor(card) {
  if (!card) return "text-white";
  if (card.rank === "JOKER") return "text-purple-400";
  if (card.suit === "♥" || card.suit === "♦") return "text-red-400";
  return "text-white";
}

export default function CloseMasterGame() {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState("welcome");
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [game, setGame] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isHost, setIsHost] = useState(false);

  // ---------------- CONNECT TO SERVER ----------------
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

    return () => s.disconnect();
  }, []);

  const roomId = game?.roomId;
  const youId = game?.youId;
  const players = game?.players || [];
  const discardTop = game?.discardTop;
  const currentIndex = game?.currentIndex;
  const started = game?.started;
  const pendingDraw = game?.pendingDraw;
  const pendingSkips = game?.pendingSkips;

  const currentPlayer = players[currentIndex];
  const myTurn = started && currentPlayer?.id === youId;

  const me = players.find((p) => p.id === youId);

  // --------------- ACTIONS ----------------
  function createRoom() {
    if (!socket || !playerName.trim()) return;
    socket.emit("create_room", { name: playerName }, (res) => {
      if (res?.roomId) setScreen("game");
    });
  }

  function joinRoom() {
    if (!socket || !playerName.trim() || !joinCode.trim()) return;
    socket.emit(
      "join_room",
      { name: playerName, roomId: joinCode.trim().toUpperCase() },
      (res) => {
        if (res?.error) alert(res.error);
        else if (res?.roomId) setScreen("game");
      }
    );
  }

  function startRound() {
    if (!socket || !roomId || !isHost) return;
    socket.emit("start_round", { roomId });
  }

  function drawCard() {
    if (!socket || !roomId || !myTurn) return;
    socket.emit("action_draw", { roomId });
  }

  function dropCards() {
    if (!socket || !roomId || !myTurn) return;
    if (selectedIds.length === 0) return;
    socket.emit("action_drop", { roomId, selectedIds });
  }

  function callClose() {
    if (!socket || !roomId || !myTurn) return;
    socket.emit("action_close", { roomId });
  }

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function exitGame() {
    if (!window.confirm("Exit game?")) return;

    if (socket) socket.disconnect();

    setScreen("welcome");
    setPlayerName("");
    setJoinCode("");
    setGame(null);
    setSelectedIds([]);
    setIsHost(false);
  }

  // ---------------- WELCOME SCREEN ----------------
  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center text-white px-4">
        <div className="bg-black/40 p-6 rounded-2xl w-full max-w-md space-y-4">
          <h1 className="text-3xl font-bold text-center">CLOSE MASTER POWER GAME 🔥</h1>

          <input
            className="w-full p-2 bg-gray-900 rounded-lg"
            placeholder="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <input
            className="w-full p-2 bg-gray-900 rounded-lg"
            placeholder="Room ID"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />

          <button onClick={createRoom} className="w-full bg-emerald-600 py-2 rounded-lg">
            Create Room
          </button>

          <button onClick={joinRoom} className="w-full bg-blue-600 py-2 rounded-lg">
            Join Room
          </button>
        </div>
      </div>
    );
  }

  // ---------------- GAME SCREEN ----------------
  return (
    <div className="min-h-screen bg-[#0a0f1f] text-white p-3 flex flex-col items-center">
      <h2 className="text-xl font-bold mb-2">ROOM: {roomId}</h2>

      {/* TURN INDICATOR */}
      {started && (
        <div className="mb-3 text-lg">
          Turn:{" "}
          <span className="text-yellow-400 font-bold">
            {currentPlayer?.name}
          </span>
        </div>
      )}

      {/* CENTER OPEN CARD */}
      <div className="my-4 p-4 bg-gray-900 rounded-2xl shadow-xl text-center">
        <h3 className="text-lg mb-2">OPEN CARD</h3>
        {discardTop ? (
          <div
            className={`w-20 h-28 bg-white rounded-xl mx-auto flex flex-col items-center justify-center text-black text-xl shadow-lg ${cardColor(
              discardTop
            )}`}
          >
            {discardTop.rank}
            <span className="text-sm">{discardTop.suit}</span>
          </div>
        ) : (
          <p>No card</p>
        )}
      </div>

      {/* OTHER PLAYERS (BACKSIDE) */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-3xl">
        {players
          .filter((p) => p.id !== youId)
          .map((p) => (
            <div
              key={p.id}
              className={`p-2 bg-gray-900 rounded-xl text-center ${
                currentPlayer?.id === p.id ? "border-2 border-yellow-400" : ""
              }`}
            >
              <p className="font-bold">{p.name}</p>
              <p className="text-sm mb-2">Cards: {p.handSize}</p>

              {/* backside cards */}
              <div className="flex justify-center flex-wrap gap-1">
                {Array.from({ length: p.handSize }).map((_, i) => (
                  <div
                    key={i}
                    className="w-6 h-8 bg-gray-700 rounded-sm border border-gray-500"
                  ></div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* YOUR CARDS */}
      {me && (
        <div className="mt-4 w-full max-w-3xl">
          <h3 className="text-lg mb-1">YOUR CARDS</h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {me.hand.map((c) => {
              const sel = selectedIds.includes(c.id);
              return (
                <div
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  className={`w-14 h-20 bg-white rounded-xl p-2 text-black text-center shadow-md cursor-pointer transition-all ${
                    sel ? "border-4 border-green-500 scale-110" : "border border-gray-400"
                  } ${cardColor(c)}`}
                >
                  <div className="text-lg">{c.rank}</div>
                  <div className="text-sm">{c.suit}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      {started && (
        <div className="mt-4 flex gap-3">
          <button
            onClick={drawCard}
            disabled={!myTurn}
            className="px-4 py-2 bg-purple-600 rounded-lg disabled:opacity-40"
          >
            Draw
          </button>

          <button
            onClick={dropCards}
            disabled={!myTurn}
            className="px-4 py-2 bg-green-600 rounded-lg disabled:opacity-40"
          >
            Drop
          </button>

          <button
            onClick={callClose}
            disabled={!myTurn}
            className="px-4 py-2 bg-red-600 rounded-lg disabled:opacity-40"
          >
            Close
          </button>

          <button
            onClick={exitGame}
            className="px-4 py-2 bg-gray-700 rounded-lg"
          >
            Exit
          </button>
        </div>
      )}

      {/* START BUTTON BEFORE ROUND */}
      {!started && isHost && (
        <button
          onClick={startRound}
          className="mt-4 px-5 py-2 bg-emerald-600 rounded-xl"
        >
          Start Game
        </button>
      )}
    </div>
  );
}
