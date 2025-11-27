import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

// Client side: only UI + socket events.
// Game rules & round logic: server.cjs (Railway) lo run avuthayi.

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

  // ---------- EXIT (NEW) ----------
  // Only client reset + disconnect, server lo migatha players continue.
  function handleExitGame() {
    if (
      !window.confirm(
        "Exit cheyyali? Mee score & game migatha players ki continue avutundi."
      )
    ) {
      return;
    }

    if (socket) {
      socket.disconnect();
      setSocket(null);
    }

    setGame(null);
    setSelectedIds([]);
    setPlayerName("");
    setJoinRoomId("");
    setIsHost(false);
    setShowScores(false);
    setShowRules(false);
    setScreen("welcome");
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

  // ---------- GAME / ROOM SCREEN ----------
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

        {/* GAME AREA */}
        {started ? (
          <>
            {/* Round table */}
            <div className="relative w-full max-w-3xl aspect-[4/3] mx-auto mb-4 bg-gray-900/40 rounded-[2.5rem] border border-gray-700/60 overflow-hidden">
              {/* center open card */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                <div className="text-xs text-gray-200">Open Card</div>
                <div className="relative w-16 h-24 rounded-2xl border-2 border-white/80 bg-slate-50 shadow-lg flex items-center justify-center">
                  {topCard ? (
                    <>
                      <div
                        className={`absolute top-1 left-1 text-[11px] font-bold ${cardColorClass(
                          topCard
                        )}`}
                      >
                        {topCard.rank === "JOKER" ? "J" : topCard.rank}
                      </div>
                      <div
                        className={`text-2xl ${cardColorClass(topCard)}`}
                      >
                        {topCard.rank === "JOKER" ? "🃏" : topCard.suit}
                      </div>
                      <div
                        className={`absolute bottom-1 right-1 text-[11px] ${cardColorClass(
                          topCard
                        )}`}
                      >
                        {topCard.rank === "JOKER" ? "R" : topCard.rank}
                      </div>
                    </>
                  ) : (
                    <span className="text-slate-400">–</span>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-gray-200 text-center">
                  Current:{" "}
                  <span className="font-semibold">
                    {currentPlayer?.name || "–"}
                  </span>
                  <br />
                  Draw: {game?.pendingDraw || 0} | Skips:{" "}
                  {game?.pendingSkips || 0} |{" "}
                  {game?.roundEnded ? "Round Ended" : "Playing"}
                </div>
              </div>

              {/* players around circle */}
              {players.map((p, idx) => {
                const total = players.length || 1;
                const angle =
                  (idx / total) * 2 * Math.PI - Math.PI / 2;
                const radius = 38;
                const x = 50 + radius * Math.cos(angle);
                const y = 50 + radius * Math.sin(angle);
                const isSelf = p.id === youId;
                const isCurrent =
                  currentPlayer && currentPlayer.id === p.id;
                const handToShow = isSelf ? p.hand : [];
                const backCount = isSelf
                  ? p.hand.length
                  : p.handSize || p.hand.length;

                return (
                  <div
                    key={p.id}
                    className={`absolute flex flex-col items-center ${
                      isCurrent ? "z-20" : "z-10"
                    }`}
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-semibold mb-1 ${
                        isCurrent
                          ? "bg-yellow-400 text-black shadow"
                          : "bg-gray-800/90 text-white"
                      }`}
                    >
                      {p.name}
                      {isSelf ? " (You)" : ""}
                    </div>

                    {/* Cards + Score + (NEW) Exit for self after start */}
                    <div className="text-[10px] text-gray-200 mb-1 flex items-center gap-2">
                      <span>
                        Cards: {backCount} | Score: {p.score}
                      </span>

                      {isSelf && started && (
                        <button
                          onClick={handleExitGame}
                          className="px-2 py-0.5 rounded-md bg-red-600 hover:bg-red-500 text-[9px] font-semibold"
                        >
                          Exit
                        </button>
                      )}
                    </div>

                    <div
                      className={`flex flex-wrap justify-center gap-1 ${
                        isSelf ? "max-w-[260px]" : "max-w-[120px]"
                      }`}
                    >
                      {isSelf
                        ? handToShow.map((card) => {
                            const selected =
                              selectedIds.includes(card.id);
                            return (
                              <button
                                key={card.id}
                                disabled={game?.roundEnded}
                                onClick={() => toggleSelect(card.id)}
                                className={`relative w-10 h-16 sm:w-11 sm:h-18 md:w-12 md:h-20 rounded-2xl border shadow-md transition transform hover:-translate-y-0.5 ${
                                  selected
                                    ? "border-green-600 ring-2 ring-green-400 bg-slate-50"
                                    : "border-slate-300 bg-slate-50"
                                }`}
                              >
                                <div
                                  className={`absolute top-1 left-1 text-[10px] font-bold ${cardColorClass(
                                    card
                                  )}`}
                                >
                                  {card.rank === "JOKER"
                                    ? "J"
                                    : card.rank}
                                </div>
                                <div
                                  className={`flex items-center justify-center h-full text-xl ${cardColorClass(
                                    card
                                  )}`}
                                >
                                  {card.rank === "JOKER"
                                    ? "🃏"
                                    : card.suit}
                                </div>
                                <div
                                  className={`absolute bottom-1 right-1 text-[10px] ${cardColorClass(
                                    card
                                  )}`}
                                >
                                  {card.rank === "JOKER"
                                    ? "R"
                                    : card.rank}
                                </div>
                              </button>
                            );
                          })
                        : Array.from({ length: backCount }).map(
                            (_, i) => (
                              <div
                                key={i}
                                className="w-4 h-7 rounded-md border border-slate-500 bg-gradient-to-br from-slate-700 to-slate-900 shadow-sm"
                              />
                            )
                          )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* main buttons */}
            <div className="flex flex-wrap gap-2 justify-center mb-2">
              <button
                onClick={handleDraw}
                disabled={!myTurn || game?.hasDrawnThisTurn}
                className="px-4 py-2 rounded-xl shadow text-white bg-purple-600 disabled:opacity-50"
              >
                Draw Card
                {game?.pendingDraw ? ` (${game.pendingDraw})` : ""}
              </button>
              <button
                onClick={handleDrop}
                disabled={!myTurn}
                className="px-4 py-2 rounded-xl shadow text-white bg-green-600 disabled:opacity-50"
              >
                Drop Selected
              </button>
              <button
                onClick={handleCallClose}
                disabled={!myTurn || game?.roundEnded}
                className="px-4 py-2 rounded-xl shadow text-white bg-red-600 disabled:opacity-50"
              >
                Call CLOSE
              </button>
              <button
                onClick={handlePoints}
                disabled={!isHost}
                className="px-4 py-2 rounded-xl shadow text-white bg-amber-700 disabled:opacity-50"
              >
                Points
              </button>
              <button
                onClick={() => setShowRules(true)}
                className="px-4 py-2 rounded-xl shadow text-white bg-gray-700"
              >
                Rules
              </button>
            </div>

            {/* log */}
            <div className="mt-3 p-3 rounded-2xl bg-gray-100 shadow h-40 overflow-auto text-sm text-gray-900">
              <h2 className="font-semibold mb-2">Log</h2>
              {log.map((l, i) => (
                <p key={i}>• {l}</p>
              ))}
            </div>
          </>
        ) : (
          // NOT STARTED – show log only
          <div className="mt-3 p-3 rounded-2xl bg-gray-100 shadow h-48 overflow-auto text-sm text-gray-900">
            <h2 className="font-semibold mb-2">Log</h2>
            {log.map((l, i) => (
              <p key={i}>• {l}</p>
            ))}
          </div>
        )}

        {/* SCORES POPUP */}
        {showScores && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm text-gray-900">
              <h2 className="text-lg font-semibold mb-3">
                Scores (Total)
              </h2>
              <div className="space-y-2 mb-4">
                {players.map((p) => (
                  <div
                    key={p.id}
                    className="flex justify-between text-sm border-b border-gray-200 pb-1"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="font-semibold">{p.score}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowScores(false)}
                className="w-full px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* RULES POPUP */}
        {showRules && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/70 z-50">
            <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md text-sm text-gray-900 space-y-2">
              <h2 className="text-lg font-semibold mb-2">Game Rules</h2>
              <ul className="list-disc pl-5 space-y-1">
                <li>2–7 players, 7 cards each.</li>
                <li>Deck: 52 cards + 2 Jokers (Joker = 0 points).</li>
                <li>7 = draw chain (+2 cards per each 7 dropped).</li>
                <li>J = skip chain (each J skips next 1 player).</li>
                <li>Multi-drop allowed only for same-rank cards.</li>
                <li>
                  If you have a card matching the open rank and you
                  didn&apos;t draw, you must use that match.
                </li>
                <li>
                  Escape: if you don&apos;t have a match and didn&apos;t
                  draw, you can drop 3+ cards of the same number.
                </li>
                <li>After drawing, you can drop any same-rank set.</li>
                <li>
                  CLOSE correct: caller is strict lowest → caller 0;
                  others get their card total as points.
                </li>
                <li>
                  CLOSE wrong: caller gets (highest value × 2), lowest
                  gets 0, others get their normal card total.
                </li>
                <li>Each round points are added to total Score.</li>
              </ul>
              <button
                onClick={() => setShowRules(false)}
                className="w-full mt-3 px-4 py-2 rounded-xl bg-gray-800 text-white text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
