import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://close-master-server-production.up.railway.app";
const MAX_PLAYERS = 7;

function cardTextColor(card) {
  if (!card) return "text-black";
  if (card.rank === "JOKER") return "text-purple-700 font-bold";
  if (card.suit === "♥" || card.suit === "♦") return "text-red-600";
  return "text-black";
}

function NeonFloatingCards() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute w-16 h-24 rounded-3xl border border-white/20 shadow-[0_0_20px_#3b82f6] backdrop-blur-md animate-float-slow"
          style={{
            left: `${5 + Math.random() * 90}%`,
            top: `${10 + Math.random() * 80}%`,
            animationDelay: `${Math.random() * 10}s`,
            animationDuration: `${12 + Math.random() * 8}s`,
            boxShadow: "0 0 20px 4px rgba(59,130,246,0.6)",
            background: "rgba(255,255,255,0.05)",
          }}
        />
      ))}
    </div>
  );
}

// round-points helper (total - base for that round)
function getRoundPointsForPlayer(p, baseScores) {
  if (!p) return 0;
  const total = typeof p.score === "number" ? p.score : 0;
  const base =
    typeof baseScores[p.id] === "number" ? baseScores[p.id] : total;
  const diff = total - base;
  return diff < 0 ? 0 : diff;
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

  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [winnerName, setWinnerName] = useState("");

  const [roundBaseScores, setRoundBaseScores] = useState({});
  const prevStartedRef = useRef(false);

  const [playerId] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      let id = localStorage.getItem("cmp_player_id");
      if (!id) {
        if (window.crypto?.randomUUID) {
          id = window.crypto.randomUUID();
        } else {
          id = Math.random().toString(36).slice(2);
        }
        localStorage.setItem("cmp_player_id", id);
      }
      return id;
    } catch {
      return "";
    }
  });

  useEffect(() => {
    try {
      const storedName = localStorage.getItem("cmp_player_name");
      if (storedName) setPlayerName(storedName);
    } catch {}
  }, []);

  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ["websocket"],
      upgrade: false,
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    let reconnectAttempts = 0;
    const MAX_RECONNECTS = 10;

    s.on("connect", () => {
      reconnectAttempts = 0;

      let roomIdToUse = game?.roomId;
      let nameToUse = playerName;

      try {
        if (!roomIdToUse) {
          roomIdToUse = localStorage.getItem("cmp_room_id");
        }
        if (!nameToUse) {
          const storedName = localStorage.getItem("cmp_player_name");
          if (storedName) nameToUse = storedName;
        }
      } catch {}

      if (roomIdToUse && nameToUse) {
        setTimeout(() => {
          s.emit("rejoin_room", {
            roomId: roomIdToUse,
            name: nameToUse,
            playerId,
          });
        }, 500);
      }
    });

    s.on("rejoin_success", (state) => {
      setGame(state);
      setScreen(state.started ? "game" : "lobby");
    });

    s.on("game_state", (state) => {
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setSelectedIds([]);
      setScreen(state.started ? "game" : "lobby");
      setLoading(false);
    });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  useEffect(() => {
    if (game?.roomId && playerName) {
      try {
        localStorage.setItem("cmp_room_id", game.roomId);
        localStorage.setItem("cmp_player_name", playerName);
      } catch {}
    }
  }, [game?.roomId, playerName]);

  useEffect(() => {
    const startedNow = !!game?.started;
    if (startedNow && !prevStartedRef.current) {
      const base = {};
      (game?.players || []).forEach((p) => {
        base[p.id] = typeof p.score === "number" ? p.score : 0;
      });
      setRoundBaseScores(base);
    }
    prevStartedRef.current = startedNow;
  }, [game?.started, game?.players]);

  useEffect(() => {
    if (!game?.closeCalled) return;

    const players = game.players || [];
    const currentIndex = game.currentIndex ?? 0;
    const closer = players[currentIndex] || players[0];

    setWinnerName(closer?.name || "Winner");
    setShowResultOverlay(true);
  }, [game?.closeCalled, game?.players, game?.currentIndex]);

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

  const selectedCards = me
    ? me.hand.filter((c) => selectedIds.includes(c.id))
    : [];

  const selectedRanks = [...new Set(selectedCards.map((c) => c.rank))];
  const selectedSingleRank = selectedRanks.length === 1 ? selectedRanks[0] : null;
  const openCardRank = discardTop?.rank;

  let canDropWithoutDraw = false;
  if (!hasDrawn && selectedCards.length > 0 && selectedSingleRank) {
    const sameAsOpen = openCardRank && selectedSingleRank === openCardRank;
    if (sameAsOpen) {
      canDropWithoutDraw = true;
    } else if (selectedCards.length >= 3) {
      canDropWithoutDraw = true;
    }
  }
  const allowDrop = selectedCards.length > 0 && (hasDrawn || canDropWithoutDraw);

  const closeDisabled = !myTurn || hasDrawn || discardTop?.rank === "7";

  const createRoom = () => {
    if (!socket || !playerName.trim()) {
      alert("Name enter cheyali");
      return;
    }
    setLoading(true);
    socket.emit(
      "create_room",
      { name: playerName.trim(), playerId },
      (res) => {
        setLoading(false);
        if (!res || res.error) alert(res?.error || "Create failed");
      }
    );
  };

  const joinRoom = () => {
    if (!socket || !playerName.trim() || !joinCode.trim()) {
      alert("Name & Room ID enter cheyali");
      return;
    }
    setLoading(true);
    socket.emit(
      "join_room",
      {
        name: playerName.trim(),
        roomId: joinCode.toUpperCase().trim(),
        playerId,
      },
      (res) => {
        setLoading(false);
        if (res?.error) alert(res.error);
      }
    );
  };

  const startRound = () => {
    if (!socket || !roomId || !isHost || players.length < 2) {
      alert("Minimum 2 players (host only)");
      return;
    }
    socket.emit("start_round", { roomId });
  };

  const drawCard = (fromDiscard = false) => {
    if (!socket || !roomId || !myTurn) return;
    socket.emit("action_draw", { roomId, fromDiscard });
  };

  const dropCards = () => {
    if (!socket || !roomId || !myTurn || !allowDrop) {
      alert("Valid cards select cheyali");
      return;
    }
    socket.emit("action_drop", { roomId, selectedIds });
  };

  const callClose = () => {
    if (!socket || !roomId || !myTurn) return;
    if (!window.confirm("CLOSE cheyala?")) return;
    socket.emit("action_close", { roomId });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const exitGame = () => {
    if (window.confirm("Game exit cheyala?")) {
      try {
        localStorage.removeItem("cmp_room_id");
      } catch {}
      socket?.disconnect();
      setScreen("welcome");
      setJoinCode("");
      setGame(null);
      setSelectedIds([]);
      setIsHost(false);
      setShowPoints(false);
      setShowResultOverlay(false);
      setLoading(false);
    }
  };

  // FULL-SCREEN RESULT OVERLAY
  const handleContinue = () => {
    setShowResultOverlay(false);
    setScreen("lobby");
  };

  const ResultOverlay = () => {
    if (!showResultOverlay || !game?.closeCalled) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

        {/* Fireworks */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full firework-burst"
              style={{
                width: "6rem",
                height: "6rem",
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                boxShadow: "0 0 40px 10px rgba(251,191,36,0.95)",
                background:
                  "radial-gradient(circle, rgba(251,191,36,1) 0%, rgba(0,0,0,0) 70%)",
                animationDelay: `${Math.random() * 0.8}s`,
              }}
            />
          ))}
        </div>

        {/* Winner card */}
        <div className="relative px-8 py-6 md:px-10 md:py-8 bg-black/90 rounded-3xl border border-amber-400 shadow-[0_0_60px_rgba(251,191,36,1)] max-w-md w-[90%]">
          <p className="text-xs md:text-sm font-semibold tracking-[0.3em] text-amber-300 text-center mb-2">
            ROUND WINNER
          </p>
          <p className="text-2xl md:text-3xl font-black text-amber-400 text-center mb-1 capitalize">
            {winnerName}
          </p>
          <p className="text-sm md:text-base text-amber-100 text-center mb-4">
            CLOSE SUCCESS 🎉
          </p>

          <div className="bg-white/5 rounded-2xl p-3 md:p-4 mb-4 max-h-60 overflow-y-auto">
            <p className="text-xs md:text-sm text-amber-200 font-semibold mb-2 text-center">
              CURRENT ROUND POINTS
            </p>

            {players.map((p) => (
              <div
                key={p.id}
                className={`flex justify-between items-center px-3 py-2 rounded-xl mb-1 text-sm md:text-base ${
                  p.name === winnerName
                    ? "bg-emerald-500/90 text-white"
                    : "bg-gray-900/70 text-gray-100"
                }`}
              >
                <span className="font-semibold truncate">{p.name}</span>
                <span className="font-black text-lg md:text-xl">
                  {getRoundPointsForPlayer(p, roundBaseScores)}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={handleContinue}
            className="w-full py-3 md:py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 rounded-2xl font-bold text-base md:text-lg text-black shadow-xl"
          >
            CONTINUE
          </button>
        </div>
      </div>
    );
  };

  // GAME SCREEN
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/30 to-blue-900/30 text-white p-4 md:p-6 flex flex-col items-center gap-4 md:gap-6 relative overflow-hidden">
      <NeonFloatingCards />
      <ResultOverlay />

      <div className="z-10 w-full max-w-5xl text-center p-4 md:p-6 bg-black/60 backdrop-blur-xl rounded-3xl border border-emerald-500/50 shadow-2xl">
        <h1 className="mb-3 md:mb-4 text-2xl md:text-4xl font-black bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
          Room: {roomId?.toUpperCase()}
        </h1>

        <p className="text-lg md:text-xl mb-4 md:mb-6">
          You:{" "}
          <span className="font-bold text-white px-3 py-1 bg-emerald-500/30 rounded-full">
            {me?.name}
          </span>

          {isHost && (
            <span className="ml-2 md:ml-4 px-3 md:px-4 py-1 md:py-2 bg-yellow-500/90 text-black font-bold rounded-full text-sm md:text-lg animate-pulse">
              HOST
            </span>
          )}
        </p>

        <div className="mt-3 md:mt-4 text-sm md:text-lg">
          Players:{" "}
          <span className="text-emerald-400 font-bold">
            {players.length}/{MAX_PLAYERS}
          </span>{" "}
          | Turn:{" "}
          <span
            className={`font-bold px-2 md:px-3 py-1 rounded-full text-sm md:text-base ${
              myTurn ? "bg-yellow-500/90 text-black" : "bg-gray-600/50"
            }`}
          >
            {currentPlayer?.name || "None"}
          </span>
        </div>
      </div>

      {/* OPEN CARD */}
      {started && (
        <div className="z-10 text-center">
          <h3 className="text-lg md:text-xl mb-3 md:mb-4 font-bold">OPEN CARD</h3>

          {discardTop ? (
            <button
              onClick={() => drawCard(true)}
              disabled={!myTurn || hasDrawn}
              className={`w-20 md:w-24 h-28 md:h-36 bg-white rounded-2xl shadow-2xl border-4 p-2 md:p-3 flex flex-col justify-between ${
                myTurn && !hasDrawn
                  ? "hover:scale-105 cursor-pointer border-blue-400"
                  : "border-gray-300 opacity-70"
              }`}
            >
              <div className={`text-base md:text-lg font-bold ${cardTextColor(discardTop)}`}>
                {discardTop.rank}
              </div>

              <div className={`text-3xl md:text-4xl text-center ${cardTextColor(discardTop)}`}>
                {discardTop.rank === "JOKER" ? "🃏" : discardTop.suit}
              </div>

              <div className={`text-base md:text-lg font-bold text-right ${cardTextColor(discardTop)}`}>
                {discardTop.rank}
              </div>
            </button>
          ) : (
            <div className="w-20 md:w-24 h-28 md:h-36 bg-gray-800 border-2 border-dashed border-gray-600 rounded-2xl flex items-center justify-center text-gray-500 text-xs md:text-sm">
              Empty
            </div>
          )}
        </div>
      )}

      {/* PLAYER GRID */}
      {started && (
        <div className="z-10 w-full max-w-5xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
          {players.map((p) => (
            <div
              key={p.id}
              className={`p-3 md:p-4 rounded-2xl border-2 shadow-lg ${
                p.id === youId
                  ? "border-emerald-400 bg-emerald-900/30"
                  : currentPlayer?.id === p.id
                  ? "border-yellow-400 bg-yellow-900/30"
                  : "border-gray-700 bg-gray-900/30"
              }`}
            >
              <p className="font-bold text-center text-sm md:text-base truncate">
                {p.name}
              </p>

              <p className="text-xs md:text-sm text-gray-400 text-center">
                {p.handSize} cards | {p.score} pts
              </p>

              {p.hasDrawn && (
                <p className="text-xs text-emerald-400 text-center">Drew</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* --- YOUR HAND (WITH NEON CARD EFFECT HERE) --- */}
      {me && started && (
        <div className="z-10 w-full max-w-5xl">
          <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-emerald-400 text-center">
            Your Hand ({me.hand.length})
          </h3>

          <div className="flex gap-2 md:gap-3 flex-wrap justify-center p-3 md:p-4 bg-gray-900/50 rounded-2xl">
            {me.hand.map((c) => {
              const selected = selectedIds.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  disabled={!myTurn}
                  className={`
                    w-16 md:w-20 h-24 md:h-28
                    bg-white rounded-2xl shadow-xl border-4
                    flex flex-col p-1 md:p-2 justify-between transition-all
                    ${
                      selected
                        ? "scale-125 border-cyan-300 shadow-[0_0_25px_rgba(0,255,255,0.9)] animate-neon-rotate"
                        : myTurn
                        ? "border-gray-200 hover:border-blue-400 hover:scale-105"
                        : "border-gray-300 opacity-50"
                    }
                  `}
                >
                  <div className={`text-sm md:text-lg font-bold ${cardTextColor(c)}`}>
                    {c.rank}
                  </div>

                  <div className={`text-2xl md:text-3xl text-center ${cardTextColor(c)}`}>
                    {c.rank === "JOKER" ? "🃏" : c.suit}
                  </div>

                  <div className={`text-sm md:text-lg font-bold text-right ${cardTextColor(c)}`}>
                    {c.rank}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TURN ACTION BUTTONS */}
      {myTurn && started && (
        <div className="z-10 flex flex-wrap gap-2 md:gap-4 justify-center max-w-4xl p-4 md:p-6 bg-black/50 backdrop-blur-xl rounded-3xl border border-white/20">
          <button
            onClick={() => drawCard(false)}
            disabled={hasDrawn}
            className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-xl shadow-2xl ${
              hasDrawn
                ? "bg-gray-700/50 cursor-not-allowed opacity-50"
                : "bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            }`}
          >
            DECK
          </button>

          <button
            onClick={dropCards}
            disabled={!allowDrop}
            className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-xl shadow-2xl ${
              allowDrop
                ? "bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                : "bg-gray-700/50 cursor-not-allowed opacity-50"
            }`}
          >
            DROP ({selectedIds.length})
          </button>

          <button
            onClick={callClose}
            disabled={closeDisabled}
            className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-xl shadow-2xl ${
              closeDisabled
                ? "bg-gray-700/50 cursor-not-allowed opacity-50"
                : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 hover:scale-105"
            }`}
          >
            CLOSE
          </button>
        </div>
      )}

      {/* STYLES */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float-slow { animation: float 15s ease-in-out infinite; }

        @keyframes firework-burst {
          0% { transform: scale(0); opacity: 1; }
          60% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .firework-burst { animation: firework-burst 1.2s ease-out infinite; }

        /* NEW: NEON CARD EFFECT */
        @keyframes neon-rotate {
          0% { transform: rotate(-4deg) scale(1.25); }
          50% { transform: rotate(4deg) scale(1.25); }
          100% { transform: rotate(-4deg) scale(1.25); }
        }
        .animate-neon-rotate {
          animation: neon-rotate 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
