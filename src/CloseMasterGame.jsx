import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://close-master-server-production.up.railway.app";

// Text color helper
function cardTextColor(card) {
  if (!card) return "text-black";
  if (card.rank === "JOKER") return "text-purple-700";
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

  // ⭐ NEW: POINTS POPUP
  const [showPoints, setShowPoints] = useState(false);

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
  const currentIndex = game?.currentIndex ?? 0;
  const started = game?.started;
  const pendingDraw = game?.pendingDraw || 0;
  const pendingSkips = game?.pendingSkips || 0;

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
    if (!socket || !playerName.trim() || !joinCode.trim()) {
      alert("Name and Room ID enter chey dostho");
      return;
    }
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
    if (selectedIds.length === 0) {
      alert("Drop cheyyadaniki mundu oka card select chey");
      return;
    }
    socket.emit("action_drop", { roomId, selectedIds });
  }

  function callClose() {
    if (!socket || !roomId || !myTurn) return;
    if (!window.confirm("Sure na? CLOSE ante direct scoring vastundi.")) return;
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
        <div className="bg-black/60 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
          <h1 className="text-3xl font-bold text-center">
            CLOSE MASTER POWER GAME 🔥
          </h1>

          <input
            className="w-full p-2 bg-gray-900 rounded-lg border border-gray-700"
            placeholder="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
          />

          <input
            className="w-full p-2 bg-gray-900 rounded-lg border border-gray-700"
            placeholder="Room ID"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
          />

          <button
            onClick={createRoom}
            className="w-full bg-emerald-600 py-2 rounded-lg"
          >
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
    <div className="min-h-screen bg-[#020617] text-white p-3 flex flex-col items-center gap-3">

      {/* HEADER */}
      <div className="w-full max-w-6xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">
            Room: <span className="text-emerald-400">{roomId}</span>
          </h2>
          <p className="text-xs text-gray-300">
            You are: <span className="font-semibold">{me?.name}</span>
          </p>
        </div>

        {/* ACTIONS TOP RIGHT */}
        <div className="flex gap-2">
          {/* ⭐ POINTS BUTTON */}
          <button
            onClick={() => setShowPoints(true)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 rounded-lg text-xs font-semibold"
          >
            POINTS
          </button>

          <button
            onClick={exitGame}
            className="px-3 py-1.5 bg-gray-700 rounded-lg text-xs"
          >
            Exit
          </button>
        </div>
      </div>

      {/* TURN INFO */}
      {started && (
        <div className="w-full max-w-6xl bg-gray-900/70 border border-gray-700 rounded-xl px-3 py-2 text-sm flex justify-between">
          <span>
            Turn:{" "}
            <span className="text-yellow-300 font-semibold">
              {currentPlayer?.name}
            </span>
            {myTurn && <span className="ml-2 text-emerald-400">(You)</span>}
          </span>
          <span className="text-xs text-gray-300">
            Draw: {pendingDraw} | Skip: {pendingSkips}
          </span>
        </div>
      )}

      {/* CENTER OPEN CARD */}
      <div className="mt-2 p-3 bg-gray-900 rounded-xl shadow-lg border border-gray-700 text-center">
        <h3 className="text-sm text-gray-300 mb-1">OPEN CARD</h3>

        {discardTop ? (
          <div className="w-20 h-28 bg-white rounded-2xl shadow-2xl flex flex-col justify-between p-1.5">
            <div className={`text-xs font-bold ${cardTextColor(discardTop)}`}>
              {discardTop.rank}
            </div>
            <div className={`text-2xl text-center ${cardTextColor(discardTop)}`}>
              {discardTop.rank === "JOKER" ? "🃏" : discardTop.suit}
            </div>
            <div className={`text-xs text-right ${cardTextColor(discardTop)}`}>
              {discardTop.rank}
            </div>
          </div>
        ) : (
          <div className="w-20 h-28 border border-gray-600 rounded-xl text-xs text-gray-400 flex items-center justify-center">
            No card
          </div>
        )}
      </div>

      {/* OTHER PLAYERS */}
      <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
        {players
          .filter((p) => p.id !== youId)
          .map((p) => (
            <div
              key={p.id}
              className={`p-2 bg-gray-900 rounded-xl border ${
                currentPlayer?.id === p.id ? "border-yellow-400" : "border-gray-700"
              }`}
            >
              <p className="text-xs font-bold">{p.name}</p>
              <p className="text-[10px] text-gray-400">Cards: {p.handSize}</p>

              <div className="flex mt-1 gap-1 flex-wrap">
                {Array.from({ length: p.handSize }).map((_, i) => (
                  <div
                    key={i}
                    className="w-5 h-7 bg-gray-700 border border-gray-500 rounded-sm"
                  />
                ))}
              </div>
            </div>
          ))}
      </div>

      {/* YOUR CARDS */}
      {me && (
        <div className="w-full max-w-6xl mt-3">
          <div className="mb-1 flex justify-between items-center">
            <h3 className="text-sm text-gray-300">YOUR CARDS</h3>
            <span className="text-[10px] text-gray-400">Tap to select</span>
          </div>

          <div className="bg-gray-900 rounded-xl border border-gray-700 p-2 max-h-48 overflow-auto">
            <div className="flex flex-wrap gap-2 justify-center">
              {me.hand.map((c) => {
                const sel = selectedIds.includes(c.id);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    className={`w-14 h-20 bg-white rounded-2xl shadow-md border transition-all ${
                      sel
                        ? "border-4 border-emerald-500 scale-110"
                        : "border-gray-300"
                    }`}
                  >
                    <div className={`flex flex-col justify-between h-full p-1.5 ${cardTextColor(c)}`}>
                      <div className="text-xs font-bold">{c.rank}</div>
                      <div className="text-2xl text-center">
                        {c.rank === "JOKER" ? "🃏" : c.suit}
                      </div>
                      <div className="text-[10px] text-right">{c.rank}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      {started && (
        <div className="mt-3 flex flex-wrap gap-3 justify-center">
          <button
            onClick={drawCard}
            disabled={!myTurn}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl disabled:opacity-40 text-sm"
          >
            Draw {pendingDraw > 0 ? `(+${pendingDraw})` : ""}
          </button>

          <button
            onClick={dropCards}
            disabled={!myTurn}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl disabled:opacity-40 text-sm"
          >
            DROP
          </button>

          <button
            onClick={callClose}
            disabled={!myTurn}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl disabled:opacity-40 text-sm"
          >
            CLOSE
          </button>
        </div>
      )}

      {/* ⭐ POINTS POPUP */}
      {showPoints && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-black rounded-xl p-4 w-80 shadow-xl">
            <h3 className="text-lg font-bold text-center mb-3">SCORES</h3>

            <div className="space-y-2 max-h-60 overflow-auto">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between p-2 border-b border-gray-300 text-sm"
                >
                  <span>{p.name}</span>
                  <span className="font-semibold">{p.score}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPoints(false)}
              className="w-full mt-3 py-2 bg-gray-900 text-white rounded-lg"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
