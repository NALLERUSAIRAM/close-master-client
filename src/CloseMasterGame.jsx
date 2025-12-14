import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://close-master-server-production.up.railway.app";
const MAX_PLAYERS = 7;

// 🔥 GIF LIST – only 4 GIFs (for reactions)
const GIF_LIST = [
  { id: "laugh",  name: "Laugh",  file: "/gifs/Laugh.gif" },
  { id: "husky",  name: "Husky",  file: "/gifs/Husky.gif" },
  { id: "monkey", name: "Monkey", file: "/gifs/monkey_clap.gif" },
  { id: "horse",  name: "Horse",  file: "/gifs/Horse_run.gif" },
];

// 🧑 FACE LIST (PNG avatars) – public/gifs/1.png ... 7.png
const FACE_LIST = [
  "/gifs/1.png",
  "/gifs/2.png",
  "/gifs/3.png",
  "/gifs/4.png",
  "/gifs/5.png",
  "/gifs/6.png",
  "/gifs/7.png",
];

function cardTextColor(card) {
  if (!card) return "text-white";
  if (card.rank === "JOKER")
    return "text-yellow-200 drop-shadow-[0_0_6px_rgba(250,250,150,0.9)] font-extrabold";
  if (card.suit === "♥" || card.suit === "♦")
    return "text-red-50 drop-shadow-[0_0_6px_rgba(248,113,113,0.9)] font-bold";
  return "text-cyan-50 drop-shadow-[0_0_6px_rgba(56,189,248,0.9)] font-bold";
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
  const [showPoints, setShowPoints] = useState(false); // lobby SCORES button
  const [loading, setLoading] = useState(false);

  // 🧑 FACE STATE
  const [selectedFace, setSelectedFace] = useState("");

  // TURN TIMER STATE
  const [turnTimeLeft, setTurnTimeLeft] = useState(20);
  const turnTimerRef = useRef(null);

  // GIF REACTION STATE
  const [showGifPickerFor, setShowGifPickerFor] = useState(null); // playerId | null
  const [activeReactions, setActiveReactions] = useState({}); // { [playerId]: gifId }

  // CLOSE result overlay
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [winnerName, setWinnerName] = useState("");

  // round base scores (total before round start)
  const [roundBaseScores, setRoundBaseScores] = useState({});
  const prevStartedRef = useRef(false);

  // permanent playerId (device-based)
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

  // load stored name (optional)
  useEffect(() => {
    try {
      const storedName = localStorage.getItem("cmp_player_name");
      if (storedName) setPlayerName(storedName);
    } catch {}
  }, []);

  // socket setup
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
      console.log("✅ Connected:", s.id);
      reconnectAttempts = 0;

      // try to rejoin using stored info
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
            // face rejoin ki optional; server daggara already store untundi
          });
        }, 500);
      }
    });

    s.on("disconnect", (reason) => {
      console.log("🔌 Disconnected:", reason);
      if (reason === "io server disconnect") {
        s.disconnect();
      }
    });

    s.on("connect_error", (err) => {
      console.log("❌ Connect error:", err.message);
      reconnectAttempts++;
      if (reconnectAttempts >= MAX_RECONNECTS) {
        alert("Connection failed. Check internet & try again.");
      }
    });

    s.on("rejoin_success", (state) => {
      console.log("🔄 Rejoined game:", state.roomId);
      setGame(state);
      setScreen(state.started ? "game" : "lobby");
    });

    s.on("rejoin_error", (error) => {
      console.log("❌ Rejoin failed:", error);
      setScreen("welcome");
    });

    s.on("game_state", (state) => {
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setSelectedIds([]);
      if (!state.started) {
        setScreen("lobby");
      } else {
        setScreen("game");
      }
      setLoading(false);
    });

    s.on("error", (e) => {
      alert(e.message || "Server error!");
      setLoading(false);
    });

    // GIF PLAY listener (anni players ki broadcast)
    s.on("gif_play", ({ targetId, gifId }) => {
      if (!targetId || !gifId) return;
      setActiveReactions((prev) => ({
        ...prev,
        [targetId]: gifId,
      }));

      // 4s taruvata auto-clear
      setTimeout(() => {
        setActiveReactions((prev) => {
          if (prev[targetId] !== gifId) return prev;
          const copy = { ...prev };
          delete copy[targetId];
          return copy;
        });
      }, 4000);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  // store roomId & name in localStorage
  useEffect(() => {
    if (game?.roomId && playerName) {
      try {
        localStorage.setItem("cmp_room_id", game.roomId);
        localStorage.setItem("cmp_player_name", playerName);
      } catch {}
    }
  }, [game?.roomId, playerName]);

  // ROUND START detect → save base scores
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

  // CLOSE called → show overlay with winner & round points
  useEffect(() => {
    if (!game?.closeCalled) return;

    const players = game.players || [];
    const currentIndex = game.currentIndex ?? 0;
    const closer = players[currentIndex] || players[0];

    setWinnerName(closer?.name || "Winner");
    setShowResultOverlay(true);
  }, [game?.closeCalled, game?.players, game?.currentIndex]);

  // Page visibility / reconnect
  useEffect(() => {
    let reconnectTimeout;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log("📱 App background");
      } else {
        console.log("📱 App foreground");
        if (socket && screen !== "welcome") {
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
            reconnectTimeout = setTimeout(() => {
              socket.emit("rejoin_room", {
                roomId: roomIdToUse,
                name: nameToUse,
                playerId,
              });
            }, 1000);
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [socket, game?.roomId, playerName, screen, playerId]);

  // clear turn timer interval on unmount
  useEffect(() => {
    return () => {
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
      }
    };
  }, []);

  // 20s TURN TIMER
  useEffect(() => {
    const startedNow = !!game?.started;
    const players = game?.players || [];
    const currentIndex = game?.currentIndex ?? 0;
    const currentPlayer = players[currentIndex];

    const isMyTurn =
      startedNow && currentPlayer && currentPlayer.id === game?.youId;

    if (!startedNow || !currentPlayer) {
      setTurnTimeLeft(20);
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
        turnTimerRef.current = null;
      }
      return;
    }

    setTurnTimeLeft(20);
    if (turnTimerRef.current) {
      clearInterval(turnTimerRef.current);
    }

    turnTimerRef.current = setInterval(() => {
      setTurnTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(turnTimerRef.current);
          turnTimerRef.current = null;

          if (isMyTurn && socket && game?.roomId) {
            socket.emit("turn_timeout", { roomId: game.roomId });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (turnTimerRef.current) {
        clearInterval(turnTimerRef.current);
        turnTimerRef.current = null;
      }
    };
  }, [
    game?.started,
    game?.currentIndex,
    game?.turnId,
    game?.youId,
    game?.roomId,
    socket,
    game?.players,
  ]);

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

  // CREATE / JOIN – face compulsory
  const createRoom = () => {
    if (!socket || !playerName.trim() || !selectedFace) {
      alert("Name and face select cheyali");
      return;
    }
    setLoading(true);
    socket.emit(
      "create_room",
      { name: playerName.trim(), playerId, face: selectedFace },
      (res) => {
        setLoading(false);
        if (!res || res.error) {
          alert(res?.error || "Create failed");
        }
      }
    );
  };

  const joinRoom = () => {
    if (!socket || !playerName.trim() || !joinCode.trim() || !selectedFace) {
      alert("Name, Room ID and face select cheyali");
      return;
    }
    setLoading(true);
    socket.emit(
      "join_room",
      {
        name: playerName.trim(),
        roomId: joinCode.toUpperCase().trim(),
        playerId,
        face: selectedFace,
      },
      (res) => {
        setLoading(false);
        if (res?.error) {
          alert(res.error);
        }
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
      setSelectedFace("");
    }
  };

  const handleContinue = () => {
    setShowResultOverlay(false);
    setScreen("lobby");
  };

  const handleGifClick = (playerId) => {
    setShowGifPickerFor(playerId);
  };

  const handleSelectGif = (gifId) => {
    if (!socket || !roomId || !showGifPickerFor) return;
    socket.emit("send_gif", {
      roomId,
      targetId: showGifPickerFor,
      gifId,
    });
    setShowGifPickerFor(null);
  };

  const ResultOverlay = () => {
    if (!showResultOverlay || !game?.closeCalled) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
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

        <div className="relative px-8 py-6 md:px-10 md:py-8 bg-black/90 rounded-3xl border border-amber-400 shadow-[0_0_20px_rgba(251,191,36,1)] max-w-md w-[90%]">
          <p className="text-xs md:text-sm font-semibold tracking-[0.3em] text-amber-300 text-center mb-2">
            ROUND WINNER
          </p>
          <p className="text-2xl md:text-3xl font-black text-amber-400 text-center mb-1 capitalize">
            {winnerName}
          </p>

          <div className="flex justify-center mb-3">
            <img
              src="/gifs/chimpanzee.gif"
              alt="Winner celebration"
              className="w-32 h-32 md:w-40 md:h-40 rounded-2xl shadow-xl object-cover"
            />
          </div>

          <p className="text-sm md:text-base text-amber-100 text-center mb-4">
            CLOSE SUCCESS 🎉
          </p>

          <div className="bg-white/5 rounded-2xl p-3 md:p-4 mb-4 max-h-20 overflow-y-auto">
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
                <span className="font-semibold truncate flex items-center gap-2">
                  {p.face && (
                    <img
                      src={p.face}
                      className="w-6 h-6 rounded-full"
                      alt=""
                    />
                  )}
                  {p.name}
                </span>
                <span className="font-black text-lg md:text-xl">
                  {getRoundPointsForPlayer(p, roundBaseScores)}
                </span>
              </div>
            ))}
          </div>

          <button
            onClick={handleContinue}
            className="w-full py-3 md:py-4 bg-gradient-to-r from-amber-500 to-amber-200 hover:from-amber-200 hover:to-amber-700 rounded-2xl font-bold text-base md:text-lg text-black shadow-xl"
          >
            CONTINUE
          </button>
        </div>
      </div>
    );
  };

  // WELCOME SCREEN
  if (screen === "welcome") {
    const canCreate = !!playerName.trim() && !!selectedFace && !loading;
    const canJoin =
      !!playerName.trim() && !!joinCode.trim() && !!selectedFace && !loading;

    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex items-center justify-center px-4 relative overflow-hidden">
        <NeonFloatingCards />
        <div className="relative z-10 bg-black/80 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl">
              CLOSE MASTER
            </h1>
          </div>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">
                Name
              </label>
              <input
                type="text"
                className="w-full p-4 bg-gray-900/80 border-2 border-gray-200 rounded-2xl text-lg font-semibold text-white placeholder-gray-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/30 transition-all"
                placeholder=""
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={15}
              />
            </div>

            {/* FACE SELECTION GRID */}
            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">
                Choose Avatar
              </label>
              <div className="grid grid-cols-4 gap-3 mb-1">
                {FACE_LIST.map((f) => (
                  <img
                    key={f}
                    src={f}
                    onClick={() => setSelectedFace(f)}
                    className={`w-14 h-14 rounded-full cursor-pointer border-2 transition-transform ${
                      selectedFace === f
                        ? "border-emerald-400 scale-110"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                    alt=""
                  />
                ))}
              </div>
              {!selectedFace && (
                <p className="text-xs text-red-400 mt-1">
                  Please select a face to continue
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-200 mb-3">
                Room ID
              </label>
              <input
                type="text"
                className="w-full p-4 bg-gray-900/80 border-2 border-gray-200 rounded-2xl text-lg font-semibold text-white placeholder-gray-500 uppercase focus:border-sky-400 focus:ring-4 focus:ring-sky-500/30 transition-all"
                placeholder=""
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
              />
            </div>

            <button
              onClick={createRoom}
              disabled={!canCreate}
              className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all ${
                canCreate
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-200 hover:from-emerald-200 hover:to-emerald-700 hover:scale-105"
                  : "bg-gray-800/50 border-2 border-gray-200 cursor-not-allowed opacity-50"
              }`}
            >
              {loading ? "Creating..." : "CREATE ROOM"}
            </button>
            <button
              onClick={joinRoom}
              disabled={!canJoin}
              className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all ${
                canJoin
                  ? "bg-gradient-to-r from-sky-500 to-sky-200 hover:from-sky-200 hover:to-sky-700 hover:scale-105"
                  : "bg-gray-800/50 border-2 border-gray-200 cursor-not-allowed opacity-50"
              }`}
            >
              {loading ? "Joining..." : "JOIN ROOM"}
            </button>
          </div>
        </div>
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          .animate-float-slow { animation: float 15s ease-in-out infinite; }
          @keyframes firework-burst {
            0% { transform: scale(0); opacity: 1; }
            20% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          .firework-burst { animation: firework-burst 1.2s ease-out infinite; }
        `}</style>
      </div>
    );
  }

  // LOBBY SCREEN
  if (screen === "lobby") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/30 to-blue-900/30 text-white p-4 md:p-6 flex flex-col items-center gap-4 md:gap-6 relative overflow-hidden">
        <NeonFloatingCards />
        <ResultOverlay />

        <div className="z-10 w-full max-w-5xl text-center p-4 md:p-6 bg-black/20 backdrop-blur-xl rounded-3xl border border-emerald-500/50 shadow-2xl">
          <h1 className="mb-3 md:mb-4 text-2xl md:text-4xl font-black bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
            Room: {roomId?.toUpperCase()}
          </h1>
          <div className="flex flex-col items-center mb-4 md:mb-6">
            <div className="flex items-center gap-3 mb-2">
              {me?.face && (
                <img
                  src={me.face}
                  className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-emerald-400"
                  alt=""
                />
              )}
              <p className="text-lg md:text-xl">
                You:{" "}
                <span className="font-bold text-white px-3 py-1 bg-emerald-500/30 rounded-full">
                  {me?.name}
                </span>
              </p>
            </div>
            {isHost && (
              <span className="px-3 md:px-4 py-1 md:py-2 bg-yellow-500/90 text-black font-bold rounded-full text-sm md:text-lg animate-pulse">
                HOST
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 md:gap-4 justify-center">
            {isHost && (
              <button
                onClick={startRound}
                disabled={players.length < 2}
                className={`px-4 md:px-8 py-3 md:py-4 rounded-3xl text-base md:text-xl font-black shadow-2xl ${
                  players.length < 2
                    ? "bg-gray-700/50 border-2 border-gray-200 cursor-not-allowed opacity-20"
                    : "bg-gradient-to-r from-emerald-500 to-emerald-200 hover:from-emerald-200 hover:to-emerald-700 hover:scale-105"
                }`}
              >
                {players.length < 2
                  ? `WAIT (${players.length}/2)`
                  : "START GAME"}
              </button>
            )}
            <button
              onClick={() => setShowPoints(true)}
              className="px-4 md:px-8 py-3 md:py-4 bg-gradient-to-r from-amber-500 to-amber-200 hover:from-amber-200 hover:to-amber-700 rounded-3xl font-bold text-base md:text-xl shadow-2xl"
            >
              SCORES ({players.length})
            </button>
            <button
              onClick={exitGame}
              className="px-4 md:px-8 py-3 md:py-4 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 rounded-3xl font-bold text-base md:text-xl shadow-2xl"
            >
              EXIT
            </button>
          </div>
          <div className="mt-3 md:mt-4 text-sm md:text-lg">
            Players:{" "}
            <span className="text-emerald-400 font-bold">
              {players.length}/{MAX_PLAYERS}
            </span>
          </div>
        </div>

        <div className="z-10 w-full max-w-5xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
          {players.map((p) => (
            <div
              key={p.id}
              className={`p-3 md:p-4 rounded-2xl border-2 shadow-lg ${
                p.id === youId
                  ? "border-emerald-400 bg-emerald-900/30"
                  : "border-gray-700 bg-gray-900/30"
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                {p.face && (
                  <img
                    src={p.face}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-full"
                    alt=""
                  />
                )}
                <p className="font-bold text-center text-sm md:text-base truncate">
                  {p.name}
                </p>
              </div>
              <p className="text-xs md:text-sm text-gray-400 text-center">
                {p.score} pts
              </p>
            </div>
          ))}
        </div>

        {showPoints && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <div className="bg-white/95 text-black rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl">
              <h3 className="text-2xl md:text-3xl font-black text-center mb-4 md:mb-6 text-gray-900">
                SCORES
              </h3>
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className={`flex justify-between p-3 md:p-4 rounded-2xl mb-2 md:mb-3 ${
                    i === 0 ? "bg-emerald-500 text-white" : "bg-gray-100 text-black"
                  }`}
                >
                  <span className="font-bold truncate flex items-center gap-2 text-sm md:text-base">
                    {p.face && (
                      <img
                        src={p.face}
                        className="w-6 h-6 rounded-full"
                        alt=""
                      />
                    )}
                    {p.name}
                  </span>
                  <span className="font-black text-xl md:text-2xl px-3 md:px-4 py-1 md:py-2 rounded-xl">
                    {p.score}
                  </span>
                </div>
              ))}
              <button
                onClick={() => setShowPoints(false)}
                className="w-full py-3 md:py-4 bg-gray-900 text-white rounded-2xl text-lg md:text-xl font-bold mt-4 md:mt-6 hover:bg-gray-800"
              >
                CONTINUE
              </button>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          .animate-float-slow { animation: float 15s ease-in-out infinite; }
          @keyframes firework-burst {
            0% { transform: scale(0); opacity: 1; }
            20% { transform: scale(1); opacity: 1; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          .firework-burst { animation: firework-burst 1.2s ease-out infinite; }
        `}</style>
      </div>
    );
  }

  // GAME SCREEN
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/30 to-blue-900/30 text-white p-4 md:p-6 flex flex-col items-center gap-4 md:gap-6 relative overflow-hidden">
      <NeonFloatingCards />
      <ResultOverlay />

      {/* TURN TIMER – TOP */}
      {started && (
        <div className="z-10 flex flex-col items-center gap-2 mt-2">
          <div
            className={`relative w-20 h-20 md:w-24 md:h-24 rounded-full border-4 flex items-center justify-center ${
              myTurn ? "border-yellow-400 animate-ping-slow" : "border-gray-200"
            }`}
          >
            <span className="text-xl md:text-2xl font-extrabold">
              {started ? turnTimeLeft : "--"}
            </span>
          </div>
          <p className="text-xs md:text-sm font-semibold text-yellow-200">
            {myTurn
              ? "Mee turn, 20s lopala aadandi"
              : `${currentPlayer?.name || "Player"} turn lo vunnadu`}
          </p>
        </div>
      )}

      {started && (
        <div className="z-10 w-full max-w-4xl p-3 md:p-4 bg-gray-900/50 rounded-2xl border border-gray-700">
          <div className="flex flex-wrap justify-between items-center gap-2 text-sm md:text-base">
            <div className="flex items-center gap-2">
              {currentPlayer?.face && (
                <img
                  src={currentPlayer.face}
                  className="w-8 h-8 rounded-full"
                  alt=""
                />
              )}
              <span>
                Turn:{" "}
                <span className="text-xl md:text-2xl font-bold text-yellow-400">
                  {currentPlayer?.name}
                </span>
              </span>
              {myTurn && (
                <span
                  className={`ml-2 md:ml-4 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-bold ${
                    hasDrawn
                      ? "bg-emerald-500/30 text-emerald-200"
                      : "bg-yellow-500/30 text-yellow-200"
                  }`}
                >
                  {hasDrawn ? "Drew" : "Draw"}
                </span>
              )}
            </div>
            <div className="text-sm md:text-base">
              Draw: <span className="font-bold">{pendingDraw || 1}</span> | Skip:{" "}
              <span className="font-bold">{pendingSkips}</span>
            </div>
          </div>
        </div>
      )}

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
              <div
                className={`text-base md:text-lg font-bold ${cardTextColor(
                  discardTop
                )}`}
              >
                {discardTop.rank}
              </div>
              <div
                className={`text-3xl md:text-4xl text-center ${cardTextColor(
                  discardTop
                )}`}
              >
                {discardTop.rank === "JOKER" ? "🃏" : discardTop.suit}
              </div>
              <div
                className={`text-base md:text-lg font-bold text-right ${cardTextColor(
                  discardTop
                )}`}
              >
                {discardTop.rank}
              </div>
            </button>
          ) : (
            <div className="w-20 md:w-24 h-28 md:h-36 bg-gray-800 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center text-gray-500 text-xs md:text-sm">
              Empty
            </div>
          )}
        </div>
      )}

      {/* PLAYERS LIST + GIF ICONS + ACTIVE GIF BUBBLE */}
      {started && (
        <div className="z-10 w-full max-w-5xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
          {players.map((p) => {
            const isYou = p.id === youId;
            const isTurn = currentPlayer?.id === p.id;
            const activeGifId = activeReactions[p.id];
            const activeGif = GIF_LIST.find((g) => g.id === activeGifId);

            return (
              <div
                key={p.id}
                className={`relative p-3 md:p-4 rounded-2xl border-2 shadow-lg ${
                  isYou
                    ? "border-emerald-400 bg-emerald-900/30"
                    : isTurn
                    ? "border-yellow-400 bg-yellow-900/30"
                    : "border-gray-700 bg-gray-900/30"
                }`}
              >
                {activeGif && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden border-2 border-white shadow-lg bg-black/70">
                    <img
                      src={activeGif.file}
                      alt={activeGif.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="mt-2 flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-1">
                    {p.face && (
                      <img
                        src={p.face}
                        className="w-7 h-7 md:w-8 md:h-8 rounded-full"
                        alt=""
                      />
                    )}
                    <p className="font-bold text-center text-sm md:text-base truncate">
                      {p.name}
                    </p>
                  </div>
                  <p className="text-xs md:text-sm text-gray-400 text-center">
                    {p.handSize} cards | {p.score} pts
                  </p>
                  {p.hasDrawn && (
                    <p className="text-xs text-emerald-400 text-center">Drew</p>
                  )}
                </div>

                <div className="mt-2 flex justify-center">
                  <button
                    type="button"
                    onClick={() => handleGifClick(p.id)}
                    className="text-xs md:text-sm px-2 py-1 rounded-full bg-black/20 border border-white/30 flex items-center gap-1 hover:bg-black/80"
                  >
                    <span>GIF</span>
                    <span>🎭</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* GIF PICKER */}
      {showGifPickerFor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="bg-slate-950/95 border border-white/10 rounded-3xl w-[90%] max-w-sm p-4 md:p-6 shadow-2xl">
            <p className="text-center text-base md:text-lg font-bold mb-1 text-white">
              Choose GIF
            </p>
            <p className="text-center text-xs md:text-sm text-gray-300 mb-4">
              {(players.find((p) => p.id === showGifPickerFor)?.name) || "Player"}{" "}
              ki GIF pettandi
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {GIF_LIST.map((gif) => (
                <button
                  key={gif.id}
                  type="button"
                  onClick={() => handleSelectGif(gif.id)}
                  className="flex flex-col items-center gap-1 bg-gray-900/80 hover:bg-gray-800 rounded-2xl p-2"
                >
                  <img
                    src={gif.file}
                    alt={gif.name}
                    className="w-20 h-20 md:w-24 md:h-24 object-cover rounded-xl"
                  />
                  <span className="text-xs md:text-sm text-gray-100">
                    {gif.name}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowGifPickerFor(null)}
              className="w-full py-2.5 md:py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-sm md:text-base font-semibold text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* YOUR HAND */}
      {me && started && (
        <div className="z-10 w-full max-w-5xl">
          <h3 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 text-emerald-400 text-center">
            Your Hand ({me.hand.length})
          </h3>
          <div className="flex gap-2 md:gap-3 flex-wrap justify-center p-3 md:p-4 bg-gray-900/50 rounded-2xl">
           {me.hand.map((c) => {
  const selected = selectedIds.includes(c.id);

  const isRed = c.suit === "♥" || c.suit === "♦";
  const suitBg = isRed
    ? "bg-gradient-to-br from-pink-500 via-red-500 to-orange-400"
    : "bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-700";
  const neonGlow = isRed
    ? "shadow-[0_0_20px_rgba(248,113,113,0.8)]"
    : "shadow-[0_0_20px_rgba(56,189,248,0.8)]";

  return (

                <button
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  disabled={!myTurn}
                 className={`
  w-16 md:w-20 h-24 md:h-28
  rounded-2xl border-4
  flex flex-col p-1 md:p-2 justify-between transition-all
  ${suitBg} ${neonGlow}
  ${
    selected
      ? "scale-125 border-cyan-300 shadow-[0_0_25px_rgba(0,255,255,1)] animate-neon-rotate"
      : myTurn
      ? "border-white/70 hover:border-cyan-300 hover:scale-105"
      : "border-white/30 opacity-60"
  }
`}

                >
                  <div
                    className={`text-sm md:text-lg font-bold ${cardTextColor(c)}`}
                  >
                    {c.rank}
                  </div>
                  <div
                    className={`text-2xl md:text-3xl text-center ${cardTextColor(
                      c
                    )}`}
                  >
                    {c.rank === "JOKER" ? "🃏" : c.suit}
                  </div>
                  <div
                    className={`text-sm md:text-lg font-bold text-right ${cardTextColor(
                      c
                    )}`}
                  >
                    {c.rank}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ACTION BUTTONS */}
      {myTurn && started && (
        <div className="z-10 flex flex-wrap gap-2 md:gap-4 justify-center max-w-4xl p-4 md:p-6 bg-black/50 backdrop-blur-xl rounded-3xl border border-white/20">
          <button
            onClick={() => drawCard(false)}
            disabled={hasDrawn}
            className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-xl shadow-2xl ${
              hasDrawn
                ? "bg-gray-700/50 cursor-not-allowed opacity-50"
                : "bg-gradient-to-r from-purple-200 to-purple-700 hover:from-purple-700 hover:to-purple-800"
            }`}
          >
            DECK
          </button>
          <button
            onClick={dropCards}
            disabled={!allowDrop}
            className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-xl shadow-2xl ${
              allowDrop
                ? "bg-gradient-to-r from-green-200 to-green-700 hover:from-green-700 hover:to-green-800"
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
                : "bg-gradient-to-r from-red-200 to-red-700 hover:from-red-700 hover:to-red-800 hover:scale-105"
            }`}
          >
            CLOSE
          </button>
        </div>
      )}

      {/* EXIT BUTTON */}
      {started && (
        <div className="z-10 mt-4">
          <button
            onClick={exitGame}
            className="px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-gray-900 rounded-2xl font-bold text-lg shadow-xl"
          >
            EXIT GAME
          </button>
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float-slow { animation: float 15s ease-in-out infinite; }

        @keyframes firework-burst {
          0% { transform: scale(0); opacity: 1; }
          20% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .firework-burst { animation: firework-burst 1.2s ease-out infinite; }

        @keyframes neon-rotate {
          0% { transform: rotate(-4deg) scale(1.25); }
          50% { transform: rotate(4deg) scale(1.25); }
          100% { transform: rotate(-4deg) scale(1.25); }
        }
        .animate-neon-rotate {
          animation: neon-rotate 1.5s ease-in-out infinite;
        }

        @keyframes ping-slow {
          0% { transform: scale(1); opacity: 1; }
          75% { transform: scale(1.15); opacity: 0.6; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-ping-slow {
          animation: ping-slow 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
