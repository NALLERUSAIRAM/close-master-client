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

  // connect
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

  // auto open points when CLOSE happens
  useEffect(() => {
    if (game?.closeCalled) {
      setShowPoints(true);
    }
  }, [game?.closeCalled]);

  // derived
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
  const hasDrawn = me?.hasDrawn || false; // ✅ Get from my player object

  // actions
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

  // ✅ DRAW from Deck OR Discard
  function drawCard(fromDiscard = false) {
    if (!socket || !roomId || !myTurn || hasDrawn) return;
    socket.emit("action_draw", { 
      roomId, 
      fromDiscard // true = discard, false = deck
    });
  }

  function dropCards() {
    if (!socket || !roomId || !myTurn || !hasDrawn) return;
    if (selectedIds.length === 0) {
      alert("Drop cheyali ante mundu konni cards select chey.");
      return;
    }
    socket.emit("action_drop", { roomId, selectedIds });
  }

  function callClose() {
    if (!socket || !roomId || !myTurn) return;
    if (!window.confirm("Sure na? CLOSE ante direct ga scoring jarugutundi.")) {
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

  // welcome screen
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
            <label className="text-xs text-gray-300">Room ID (join cheyadaniki)</label>
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

  // game screen
  return (
    <div className="min-h-screen bg-[#020617] text-white p-3 flex flex-col items-center gap-3">
      {/* HEADER */}
      <div className="w-full max-w-6xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">
            Room: <span className="text-emerald-400">{roomId || "----"}</span>
          </h2>
          <p className="text-xs text-gray-300">
            You are:{" "}
            <span className="font-semibold">
              {me?.name} {isHost ? "(Host)" : ""}
            </span>
          </p>
        </div>

        <div className="flex gap-2 items-center">
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

      {/* STATUS BAR */}
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
                  (Your turn) {hasDrawn ? "✓ Drew" : "➤ Draw first"}
                </span>
              )}
            </>
          ) : closeCalled ? (
            <span className="text-red-300">Round ended (CLOSE called)</span>
          ) : (
            <span className="text-gray-300">
              Waiting for Start Game (Host)
            </span>
          )}
        </div>
        <div className="text-xs text-gray-300 flex gap-3">
          <span>Draw: {pendingDraw}</span>
          <span>Skip: {pendingSkips}</span>
        </div>
      </div>

      {/* OPEN CARD - Click to DRAW */}
      <div className="mt-1 p-3 bg-gray-900 rounded-xl shadow-lg border border-gray-700 text-center">
        <h3 className="text-sm text-gray-300 mb-1">
          OPEN CARD {myTurn && !hasDrawn && "(Click to DRAW)"}
        </h3>
        {discardTop ? (
          <button
            onClick={() => drawCard(true)} // ✅ Draw from discard
            disabled={!myTurn || hasDrawn}
            className={`w-20 h-28 bg-white rounded-2xl shadow-2xl flex flex-col justify-between p-1.5 mx-auto transition-all duration-200 ${
              myTurn && !hasDrawn
                ? "hover:scale-105 cursor-pointer border-2 border-blue-400 hover:shadow-emerald-500"
                : "cursor-default"
            } ${hasDrawn ? "opacity-60" : ""}`}
          >
            <div className={`text-xs font-bold ${cardTextColor(discardTop)}`}>
              {discardTop.rank}
            </div>
            <div className={`text-2xl text-center ${cardTextColor(discardTop)}`}>
              {discardTop.rank === "JOKER" ? "🃏" : discardTop.suit}
            </div>
            <div className={`text-xs text-right ${cardTextColor(discardTop)}`}>
              {discardTop.rank}
            </div>
          </button>
        ) : (
          <div className="w-20 h-28 border border-gray-600 rounded-xl text-xs text-gray-400 flex items-center justify-center mx-auto">
            No card
          </div>
        )}
        <p className="mt-1 text-[11px] text-gray-400">
          Match value:{" "}
          <span className="font-semibold">{discardTop?.rank || "-"}</span>
        </p>
      </div>

      {/* OTHER PLAYERS */}
      <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
        {players
          .filter((p) => p.id !== youId)
          .map((p) => (
            <div
              key={p.id}
              className={`p-2 bg-gray-900 rounded-xl border transition-all ${
                currentPlayer?.id === p.id 
                  ? "border-yellow-400 shadow-lg ring-2 ring-yellow-500/50" 
                  : "border-gray-700 hover:border-gray-600"
              } ${p.hasDrawn ? "bg-green-900/50 ring-2 ring-green-500/30" : ""}`}
            >
              <p className="text-xs font-bold">
                {p.name}
                {p.id === game?.hostId ? " (Host)" : ""}
              </p>
              <p className="text-[10px] text-gray-400">
                Cards: {p.handSize} | Score: {p.score}
                {p.hasDrawn && " ✓Drew"}
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
              {hasDrawn ? "✓ Drew - Select same rank to DROP" : "Draw first"}
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
            style={{ maxHeight: "none", height: "auto", paddingBottom: "12px" }}
          >
            <div className="flex gap-3">
              {me.hand.map((c) => {
                const sel = selectedIds.includes(c.id);
                const color = cardTextColor(c);

                return (
                  <button
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    disabled={!hasDrawn} // ✅ Can't select until drawn
                    className={`w-16 h-24 bg-white rounded-2xl shadow-xl border transition-all duration-150 ${
                      sel
                        ? "border-4 border-emerald-500 scale-110 translate-y-[-4px] shadow-2xl"
                        : "border-gray-300 hover:border-gray-400"
                    } ${!hasDrawn ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02]"}`}
                  >
                    <div
                      className={`flex flex-col justify-between h-full p-2 ${color}`}
                    >
                      <div className="text-sm font-bold">{c.rank}</div>
                      <div className="text-3xl text-center">
                        {c.rank === "JOKER" ? "🃏" : c.suit}
                      </div>
                      <div className="text-[11px] text-right">{c.rank}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ACTION BUTTONS - PERFECT DRAW→DROP FLOW */}
      {started && (
        <div className="mt-4 flex flex-wrap gap-3 justify-center w-full max-w-6xl">
          {/* DECK DRAW */}
          <button
            onClick={() => drawCard(false)}
            disabled={!myTurn || hasDrawn}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
              !myTurn || hasDrawn
                ? "bg-purple-900 text-purple-300 opacity-50 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-500 hover:shadow-lg shadow-purple-500/25"
            }`}
            title={hasDrawn ? "Already drawn this turn" : "Draw from deck"}
          >
            📥 DECK DRAW
            {pendingDraw > 0 && ` (+${pendingDraw})`}
          </button>

          {/* DROP - Only after DRAW */}
          <button
            onClick={dropCards}
            disabled={!myTurn || !hasDrawn || selectedIds.length === 0}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
              !myTurn || !hasDrawn || selectedIds.length === 0
                ? "bg-green-900 text-green-300 opacity-50 cursor-not-allowed"
                : "bg-green-600 hover:bg-green-500 hover:shadow-lg shadow-green-500/25"
            }`}
            title={!hasDrawn ? "Must DRAW first!" : `Drop ${selectedIds.length} cards`}
          >
            🗑️ DROP ({selectedIds.length})
          </button>

          {/* CLOSE */}
          <button
            onClick={callClose}
            disabled={!myTurn}
            className={`px-6 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
              !myTurn
                ? "bg-red-900 text-red-300 opacity-50 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-500 hover:shadow-lg shadow-red-500/25"
            }`}
          >
            ❌ CLOSE
          </button>
        </div>
      )}

      {/* ✅ PERFECT RULE GUIDANCE */}
      {myTurn && started && (
        <div className="mt-4 p-3 bg-gradient-to-r from-yellow-900/80 to-orange-900/80 rounded-2xl border-2 border-yellow-500/50 text-center max-w-md mx-auto">
          <div className="text-xs font-semibold text-yellow-200 mb-1">
            📋 YOUR TURN
          </div>
          {hasDrawn ? (
            <div className="text-sm text-emerald-300">
              ✓ Drew card! Now select <strong>same rank cards</strong> & DROP 🚀
            </div>
          ) : (
            <div className="text-sm text-yellow-200">
              ➤ DRAW from DECK or OPEN CARD first, then DROP
            </div>
          )}
        </div>
      )}

      {/* POINTS POPUP */}
      {showPoints && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-white text-black rounded-2xl p-6 w-96 shadow-2xl max-h-[80vh] overflow-auto">
            <h3 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-gray-800 to-gray-900 text-white py-2 rounded-xl">
              🏆 FINAL SCORES
            </h3>

            <div className="space-y-3">
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-xl border-l-4 border-emerald-500 hover:shadow-md transition-all"
                >
                  <span className="font-semibold text-lg">{p.name}</span>
                  <span className={`text-2xl font-bold px-3 py-1 rounded-full ${
                    i === 0 ? "bg-emerald-500 text-white shadow-lg" : "bg-gray-200 text-gray-800"
                  }`}>
                    {p.score}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPoints(false)}
              className="w-full mt-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-xl text-lg font-bold hover:shadow-xl transition-all duration-200"
            >
              CONTINUE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
