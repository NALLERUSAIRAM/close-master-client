import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://close-master-server-production.up.railway.app";

// text color helper for card faces
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

  // 🔔 AUTO OPEN POINTS POPUP WHEN CLOSE HAPPENS
  useEffect(() => {
    if (game?.closeCalled) {
      setShowPoints(true);
    }
  }, [game?.closeCalled]);

  // ---------- DERIVED STATE ----------
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

  // --------------- ACTIONS ----------------
  function createRoom() {
    if (!socket || !playerName.trim()) return;
    socket.emit("create_room", { name: playerName }, (res) => {
      if (res?.roomId) setScreen("game");
    });
  }

  function joinRoom() {
    if (!socket) return;
    if (!playerName.trim() || !joinCode.trim()) {
      alert("Name & Room ID enter chey dostho");
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
    if (!socket || !game?.roomId || !isHost) return;
    if (players.length < 2) {
      alert("Minimum 2 players tarvata start cheyali.");
      return;
    }
    socket.emit("start_round", { roomId: game.roomId });
  }

  function drawCard() {
    if (!socket || !roomId || !myTurn) return;
    socket.emit("action_draw", { roomId });
  }

  function dropCards() {
    if (!socket || !roomId || !myTurn) return;
    if (selectedIds.length === 0) {
      alert("Drop cheyali ante mundu konni cards select chey.");
      return;
    }
    socket.emit("action_drop", { roomId, selectedIds });
  }

  function callClose() {
    if (!socket || !roomId || !myTurn) return;
    if (
      !window.confirm(
        "Sure na? CLOSE ante direct ga scoring jarugutundi."
      )
    )
      return;
    socket.emit("action_close", { roomId });
  }

  function toggleSelect(id) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function exitGame() {
    if (!window.confirm("Exit game cheyyala?")) return;

    if (socket) socket.disconnect();

    setScreen("welcome");
    setPlayerName("");
    setJoinCode("");
    setGame(null);
    setSelectedIds([]);
    setIsHost(false);
    setShowPoints(false);
  }

  // ---------------- WELCOME SCREEN ----------------
  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white px-4">
        <div className="bg-black/70 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
          <h1 className="text-3xl font-bold text-center">
            CLOSE MASTER POWER GAME 🔥
          </h1>

          <div className="space-y-2">
            <label className="text-xs text-gray-300">Your Name</label>
            <input
              className="w-full p-2 bg-gray-900 rounded-lg border border-gray-700 outline-none text-sm"
              placeholder="eg: SAIRAM"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-300">
              Room ID (join cheyadaniki)
            </label>
            <input
              className="w-full p-2 bg-gray-900 rounded-lg border border-gray-700 outline-none text-sm"
              placeholder="Host ichina code ivvu"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
          </div>

          <button
            onClick={createRoom}
            className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded-lg font-semibold text-sm"
          >
            Create Room (Become Host)
          </button>

          <button
            onClick={joinRoom}
            className="w-full bg-sky-600 hover:bg-sky-500 py-2 rounded-lg font-semibold text-sm"
          >
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
            Room:{" "}
            <span className="text-emerald-400">
              {roomId || "----"}
            </span>
          </h2>
          <p className="text-xs text-gray-300">
            You are:{" "}
            <span className="font-semibold">
              {me?.name} {isHost ? "(Host)" : ""}
            </span>
          </p>
        </div>

        <div className="flex gap-2 items-center">
          {/* Start Game button for host */}
          {isHost && (
            <button
              onClick={startRound}
              disabled={started || players.length < 2}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                started
                  ? "bg-emerald-900 text-emerald-300 opacity-60 cursor-not-allowed"
                  : players.length < 2
                  ? "bg-gray-700 opacity-60 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500"
              }`}
            >
              {started ? "Game Running" : "Start Game"}
            </button>
          )}

          <button
            onClick={() => setShowPoints(true)}
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 rounded-lg text-xs font-semibold"
          >
            POINTS
          </button>
          <button
            onClick={exitGame}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs"
          >
            Exit
          </button>
        </div>
      </div>

      {/* TURN / STATUS BAR */}
      <div className="w-full max-w-6xl bg-gray-900/70 border border-gray-700 rounded-xl px-3 py-2 text-sm flex justify-between items-center">
        <div>
          Status:{" "}
          {started ? (
            <>
              Turn:{" "}
              <span className="text-yellow-300 font-semibold">
                {currentPlayer?.name || "-"}
              </span>
              {myTurn && (
                <span className="ml-2 text-emerald-400">
                  (Your turn)
                </span>
              )}
            </>
          ) : closeCalled ? (
            <span className="text-red-300">
              Round ended (CLOSE called)
            </span>
          ) : (
            <span className="text-gray-300">
              Waiting for Start Game (Host)
            </span>
          )}
        </div>
        <div className="text-xs text-gray-300 flex gap-3">
          <span>Pending Draw: {pendingDraw}</span>
          <span>Pending Skips: {pendingSkips}</span>
        </div>
      </div>

      {/* OPEN CARD PANEL */}
      <div className="mt-1 p-3 bg-gray-900 rounded-xl shadow-lg border border-gray-700 text-center">
        <h3 className="text-sm text-gray-300 mb-1">OPEN CARD</h3>
        {discardTop ? (
          <div className="w-20 h-28 bg-white rounded-2xl shadow-2xl flex flex-col justify-between p-1.5 mx-auto">
            <div
              className={`text-xs font-bold ${cardTextColor(
                discardTop
              )}`}
            >
              {discardTop.rank}
            </div>
            <div
              className={`text-2xl text-center ${cardTextColor(
                discardTop
              )}`}
            >
              {discardTop.rank === "JOKER"
                ? "🃏"
                : discardTop.suit}
            </div>
            <div
              className={`text-xs text-right ${cardTextColor(
                discardTop
              )}`}
            >
              {discardTop.rank}
            </div>
          </div>
        ) : (
          <div className="w-20 h-28 border border-gray-600 rounded-xl text-xs text-gray-400 flex items-center justify-center mx-auto">
            No card
          </div>
        )}
        <p className="mt-1 text-[11px] text-gray-400">
          Match value:{" "}
          <span className="font-semibold">
            {discardTop?.rank || "-"}
          </span>
        </p>
      </div>

      {/* OTHER PLAYERS */}
      <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
        {players
          .filter((p) => p.id !== youId)
          .map((p) => (
            <div
              key={p.id}
              className={`p-2 bg-gray-900 rounded-xl border ${
                currentPlayer?.id === p.id
                  ? "border-yellow-400 shadow-lg"
                  : "border-gray-700"
              }`}
            >
              <p className="text-xs font-bold">
                {p.name}
                {p.id === game?.hostId ? " (Host)" : ""}
              </p>
              <p className="text-[10px] text-gray-400">
                Cards: {p.handSize} | Score: {p.score}
              </p>

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
        <div className="w-full max-w-6xl mt-3 flex flex-col">
          <div className="mb-1 flex justify-between items-center">
            <h3 className="text-sm text-gray-300 font-semibold">
              Your Cards (Score: {me.score})
            </h3>
            <span className="text-[11px] text-gray-400">
              Tap cards to select
            </span>
          </div>

          <div
            className="
              bg-gray-900 
              rounded-xl 
              border 
              border-gray-700 
              p-3 
              overflow-x-auto
              overflow-y-hidden
              flex 
              items-center
              whitespace-nowrap
            "
            style={{
              maxHeight: "none",
              height: "auto",
              paddingBottom: "12px",
            }}
          >
            <div className="flex gap-3">
              {me.hand.map((c) => {
                const sel = selectedIds.includes(c.id);
                const color = cardTextColor(c);

                return (
                  <button
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    className={`w-16 h-24 bg-white rounded-2xl shadow-xl border transition-all duration-150 ${
                      sel
                        ? "border-4 border-emerald-500 scale-110 translate-y-[-4px]"
                        : "border-gray-300"
                    }`}
                  >
                    <div
                      className={`flex flex-col justify-between h-full p-2 ${color}`}
                    >
                      <div className="text-sm font-bold">
                        {c.rank}
                      </div>
                      <div className="text-3xl text-center">
                        {c.rank === "JOKER"
                          ? "🃏"
                          : c.suit}
                      </div>
                      <div className="text-[11px] text-right">
                        {c.rank}
                      </div>
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
        <div className="mt-3 flex flex-wrap gap-3 justify-center w-full max-w-6xl">
          <button
            onClick={drawCard}
            disabled={!myTurn}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            Draw{pendingDraw > 0 ? ` (+${pendingDraw})` : ""}
          </button>

          <button
            onClick={dropCards}
            disabled={!myTurn}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            DROP
          </button>

          <button
            onClick={callClose}
            disabled={!myTurn}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl text-sm font-semibold disabled:opacity-40"
          >
            CLOSE
          </button>
        </div>
      )}

      {/* POINTS POPUP */}
      {showPoints && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-black rounded-xl p-4 w-80 shadow-xl">
            <h3 className="text-lg font-bold text-center mb-3">
              SCORES
            </h3>

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
              className="w-full mt-3 py-2 bg-gray-900 text-white rounded-lg text-sm font-semibold"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
