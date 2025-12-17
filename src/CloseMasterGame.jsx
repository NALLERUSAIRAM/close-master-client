// CLOSEMASTERGAME.NEON.jsx
import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://close-master-server-production.up.railway.app";
const MAX_PLAYERS = 7;

// 🔥 GIF LIST – only 4 GIFs (for reactions)
const GIF_LIST = [
  { id: "laugh", name: "Laugh", file: "/gifs/Laugh.gif" },
  { id: "husky", name: "Husky", file: "/gifs/Husky.gif" },
  { id: "monkey", name: "Monkey", file: "/gifs/monkey_clap.gif" },
  { id: "horse", name: "Horse", file: "/gifs/Horse_run.gif" },
];

// 🧑 FACE LIST (PNG avatars)
const FACE_LIST = [
  "/gifs/1.png",
  "/gifs/2.png",
  "/gifs/3.png",
  "/gifs/4.png",
  "/gifs/5.png",
  "/gifs/6.png",
  "/gifs/7.png",
  "/gifs/8.png",
  "/gifs/9.png",
  "/gifs/10.png",
];

// 🎥 BACKGROUND VIDEO THEMES (GAME SCREEN THEMES)
const BG_THEMES = [
  { id: "t15", name: "Theme 15", file: "/gifs/15.mp4" },
  { id: "t16", name: "Theme 16", file: "/gifs/16.mp4" },
  { id: "t17", name: "Theme 17", file: "/gifs/17.mp4" },
];

// UPDATED: Card text glow is now more intense and bright (drop-shadow:[0_0_12px...])
function cardTextColor(card) {
  if (!card) return "text-white";
  // JOKER - Intense Yellow Neon
  if (card.rank === "JOKER")
    return "text-yellow-100 drop-shadow-[0_0_12px_rgba(255,255,0,1)] font-extrabold";
  // HEART / DIAMOND - Intense Pink/Red Neon
  if (card.suit === "♥" || card.suit === "♦")
    return "text-pink-300 drop-shadow-[0_0_12px_rgba(255,0,255,1)] font-bold";
  // SPADE / CLUB - Intense Cyan/Blue Neon
  return "text-cyan-300 drop-shadow-[0_0_12px_rgba(0,255,255,1)] font-bold";
}

// Placeholder – not using floating cards now
function NeonFloatingCards() {
  return null;
}

// round-points helper
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

  const [selectedFace, setSelectedFace] = useState("");
  // 🎨 Background Theme State
  const [bgTheme, setBgTheme] = useState(BG_THEMES[0]);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const [turnTimeLeft, setTurnTimeLeft] = useState(20);
  const turnTimerRef = useRef(null);

  const [showGifPickerFor, setShowGifPickerFor] = useState(null);
  const [activeReactions, setActiveReactions] = useState({});

  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [winnerName, setWinnerName] = useState("");

  const [roundBaseScores, setRoundBaseScores] = useState({});
  const prevStartedRef = useRef(false);
  
  // NEW: Firework Colors setup (Requested Tapakayalu effect)
  const FIREWORK_COLORS = [
    "rgba(255, 0, 255, 1)", // Magenta
    "rgba(0, 255, 255, 1)", // Cyan
    "rgba(255, 255, 0, 1)", // Yellow
    "rgba(255, 105, 180, 1)", // Hot Pink
    "rgba(0, 255, 127, 1)", // Spring Green
    "rgba(255, 165, 0, 1)", // Orange
  ];
  const randomColor = () => FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];


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

  // load stored name
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

    s.on("disconnect", (reason) => {
      if (reason === "io server disconnect") {
        s.disconnect();
      }
    });

    s.on("connect_error", () => {
      reconnectAttempts++;
      if (reconnectAttempts >= MAX_RECONNECTS) {
        alert("Connection failed. Check internet & try again.");
      }
    });

    s.on("rejoin_success", (state) => {
      setGame(state);
      setScreen(state.started ? "game" : "lobby");
    });

    s.on("rejoin_error", () => {
      setScreen("welcome");
    });

    s.on("game_state", (state) => {
      setGame(state);
      setIsHost(state.hostId === state.youId);
      setSelectedIds([]);
      setScreen(state.started ? "game" : "lobby");
      setLoading(false);
    });

    s.on("error", (e) => {
      alert(e.message || "Server error!");
      setLoading(false);
    });

    // GIF broadcast
    s.on("gif_play", ({ targetId, gifId }) => {
      if (!targetId || !gifId) return;
      setActiveReactions((prev) => ({
        ...prev,
        [targetId]: gifId,
      }));
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

  // store roomId & name
  useEffect(() => {
    if (game?.roomId && playerName) {
      try {
        localStorage.setItem("cmp_room_id", game.roomId);
        localStorage.setItem("cmp_player_name", playerName);
      } catch {}
    }
  }, [game?.roomId, playerName]);

  // round start → base scores
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

  // CLOSE → winner overlay
  useEffect(() => {
    if (!game?.closeCalled) return;
    const playersArr = game.players || [];
    const currentIndex = game.currentIndex ?? 0;
    const closer = playersArr[currentIndex] || playersArr[0];
    setWinnerName(closer?.name || "Winner");
    setShowResultOverlay(true);
  }, [game?.closeCalled, game?.players, game?.currentIndex]);

  // page visibility / reconnect
  useEffect(() => {
    let reconnectTimeout;
    const handleVisibilityChange = () => {
      if (!document.hidden && socket && screen !== "welcome") {
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
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [socket, game?.roomId, playerName, screen, playerId]);

  // clear timer on unmount
  useEffect(() => {
    return () => {
      if (turnTimerRef.current) clearInterval(turnTimerRef.current);
    };
  }, []);

  // 20s TURN TIMER
  useEffect(() => {
    const startedNow = !!game?.started;
    const playersArr = game?.players || [];
    const currentIndex = game?.currentIndex ?? 0;
    const currentPlayer = playersArr[currentIndex];
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
    if (turnTimerRef.current) clearInterval(turnTimerRef.current);

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
    // 🔔 VIBRATION ON MY TURN (1 SECOND)
  useEffect(() => {
    if (!game?.started) return;

    const playersArr = game?.players || [];
    const currentIndex = game?.currentIndex ?? 0;
    const currentPlayer = playersArr[currentIndex];

    const isMyTurn =
      currentPlayer && currentPlayer.id === game?.youId;

    if (isMyTurn) {
      if ("vibrate" in navigator) {
        navigator.vibrate(1000); // 1 second vibration
      }
    }
  }, [game?.turnId]);

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
  const selectedSingleRank =
    selectedRanks.length === 1 ? selectedRanks[0] : null;
  const openCardRank = discardTop?.rank;

  let canDropWithoutDraw = false;
  if (!hasDrawn && selectedCards.length > 0 && selectedSingleRank) {
    const sameAsOpen = openCardRank && selectedSingleRank === openCardRank;
    if (sameAsOpen || selectedCards.length >= 3) {
      canDropWithoutDraw = true;
    }
  }
  const allowDrop =
    selectedCards.length > 0 && (hasDrawn || canDropWithoutDraw);

  const closeDisabled = !myTurn || hasDrawn || discardTop?.rank === "7";

  // CREATE / JOIN
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
    // No need for client-side state change, the socket update will trigger the Open Card animation.
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
const handleKickPlayer = (playerIdToKick) => {
  if (!socket || !roomId || !isHost) return;

  if (!window.confirm("Ee player ni remove cheyala?")) return;

  socket.emit("kick_player", {
    roomId,
    targetId: playerIdToKick,
  });
};
const handleGifClick = (pid) => {
  setShowGifPickerFor(pid);
};

// 🎨 Auto cycle background theme (15 → 16 → 17 → 15)
const cycleTheme = () => {
  const currentIndex = BG_THEMES.findIndex(
    (t) => t.id === bgTheme.id
  );

  const nextIndex =
    currentIndex === -1 || currentIndex === BG_THEMES.length - 1
      ? 0
      : currentIndex + 1;

  const nextTheme = BG_THEMES[nextIndex];
  setBgTheme(nextTheme);
  localStorage.setItem("cmp_bg_theme", nextTheme.id);
};

// 🎭 HANDLE GIF SELECTION (MISSING FUNCTION — VERY IMPORTANT)
const handleSelectGif = (gifId) => {
  if (!socket || !roomId || !showGifPickerFor) return;

  socket.emit("send_gif", {
    roomId,
    targetId: showGifPickerFor,
    gifId,
  });

  setShowGifPickerFor(null);
};


  // RESULT OVERLAY – full list (no scroll)
  const ResultOverlay = () => {
    if (!showResultOverlay || !game?.closeCalled) return null;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
        <div className="absolute inset-0 pointer-events-none">
          {/* MODIFIED: Firework Burst Effect (Multi-color, Fast-burst) */}
          {Array.from({ length: 20 }).map((_, i) => { // Increased count to 20
            const color = randomColor();
            const size = 4 + Math.random() * 4; // size 4rem to 8rem
            return (
              <div
                key={i}
                className="absolute rounded-full firework-burst"
                style={{
                  width: `${size}rem`,
                  height: `${size}rem`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  // Stronger glow based on size and use random color
                  boxShadow: `0 0 ${size * 5}px 10px ${color.replace('1)', '0.99)')}`, 
                  background:
                    `radial-gradient(circle, ${color} 0%, rgba(0,0,0,0) 70%)`,
                  animationDelay: `${Math.random() * 0.9}s`,
                }}
              />
            );
          })}
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

          <div className="bg-white/5 rounded-2xl p-3 md:p-4 mb-4">
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

          {/* UPDATED: RESULT OVERLAY CONTINUE BUTTON (Neon Style) */}
          <button
            onClick={handleContinue}
            className="w-full py-3 md:py-4 bg-black/70 border-2 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.8)] hover:shadow-[0_0_30px_rgba(251,191,36,1)] rounded-2xl font-black text-base md:text-lg transition-all hover:scale-[1.01]"
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
      <div className="min-h-screen text-white relative overflow-hidden">
        <video
          className="fixed top-0 left-0 w-screen h-screen object-cover -z-10"
          src="/gifs/15.mp4"
          autoPlay
          muted
          loop
          playsInline
        />

        <div className="relative flex items-center justify-center px-4">
          <div className="bg-black/80 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl">
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
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={15}
                />
              </div>

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
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={4}
                />
              </div>

              {/* UPDATED: WELCOME - CREATE ROOM BUTTON (Intense Green Neon) */}
              <button
                onClick={createRoom}
                disabled={!canCreate}
                className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all border-2 border-transparent ${
                  canCreate
                    ? "bg-black/70 border-2 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(52,211,167,0.8)] hover:shadow-[0_0_30px_rgba(52,211,167,1)] hover:scale-[1.01]"
                    : "bg-gray-800/50 border-2 border-gray-200 cursor-not-allowed opacity-50 text-gray-400"
                }`}
              >
                {loading ? "Creating..." : "CREATE ROOM"}
              </button>
              {/* UPDATED: WELCOME - JOIN ROOM BUTTON (Intense Blue Neon) */}
              <button
                onClick={joinRoom}
                disabled={!canJoin}
                className={`w-full py-4 rounded-2xl text-xl font-black shadow-2xl transition-all border-2 border-transparent ${
                  canJoin
                    ? "bg-black/70 border-2 border-sky-400 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.8)] hover:shadow-[0_0_30px_rgba(56,189,248,1)] hover:scale-[1.01]"
                    : "bg-gray-800/50 border-2 border-gray-200 cursor-not-allowed opacity-50 text-gray-400"
                }`}
              >
                {loading ? "Joining..." : "JOIN ROOM"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LOBBY SCREEN
  if (screen === "lobby") {
    const meLobby = players.find((p) => p.id === youId);

    return (
      <div className="min-h-screen text-white relative overflow-hidden">
        <video
          className="fixed top-0 left-0 w-screen h-screen object-cover -z-10"
          src="/gifs/15.mp4"
          autoPlay
          muted
          loop
          playsInline
        />
        <ResultOverlay />

        <div className="relative p-4 md:p-6 flex flex-col items-center gap-4 md:gap-6">
          <div className="z-10 w-full max-w-5xl text-center p-4 md:p-6 bg-black/60 backdrop-blur-xl rounded-3xl border border-emerald-500/50 shadow-2xl">
            <h1 className="mb-3 md:mb-4 text-2xl md:text-4xl font-black bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
              Room: {roomId?.toUpperCase()}
            </h1>
            <div className="flex flex-col items-center mb-4 md:mb-6">
              <div className="flex items-center gap-3 mb-2">
                {meLobby?.face && (
                  <img
                    src={meLobby.face}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-emerald-400"
                    alt=""
                  />
                )}
                <p className="text-lg md:text-xl">
                  You:{" "}
                  <span className="font-bold text-white px-3 py-1 bg-emerald-500/30 rounded-full">
                    {meLobby?.name}
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
              {/* UPDATED: LOBBY - START GAME BUTTON (Intense Green Neon) */}
              {isHost && (
                <button
                  onClick={startRound}
                  disabled={players.length < 2}
                  className={`px-4 md:px-8 py-3 md:py-4 rounded-3xl text-base md:text-xl font-black shadow-2xl transition-all border-2 border-transparent ${
                    players.length < 2
                      ? "bg-gray-700/50 border-2 border-gray-200 cursor-not-allowed opacity-20 text-gray-400"
                      : "bg-black/70 border-2 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(52,211,167,0.8)] hover:shadow-[0_0_30px_rgba(52,211,167,1)] hover:scale-[1.01]"
                  }`}
                >
                  {players.length < 2
                    ? `WAIT (${players.length}/2)`
                    : "START GAME"}
                </button>
              )}
              {/* UPDATED: LOBBY - SCORES BUTTON (Intense Amber Neon) */}
              <button
                onClick={() => setShowPoints(true)}
                className="px-4 md:px-8 py-3 md:py-4 bg-black/70 border-2 border-amber-400 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.8)] hover:shadow-[0_0_30px_rgba(251,191,36,1)] rounded-3xl font-black text-base md:text-xl transition-all hover:scale-[1.01]"
              >
                SCORES ({players.length})
              </button>
              {/* UPDATED: LOBBY - EXIT BUTTON (Dark Neon) */}
              <button
                onClick={exitGame}
                className="px-4 md:px-8 py-3 md:py-4 bg-black/70 border-2 border-gray-600 hover:border-gray-400 rounded-3xl font-bold text-base md:text-xl text-gray-300 shadow-lg transition-all hover:scale-[1.01]"
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
                className={`relative p-2 md:p-3 rounded-2xl border-2 shadow-lg ${
                  p.id === youId
                    ? "border-emerald-400 bg-black/70"
                    : "border-gray-700 bg-black/60"
                }`}
              >
               {/* HOST REMOVE BUTTON */}
               {isHost && p.id !== youId && (
               <button
               onClick={() => handleKickPlayer(p.id)}
               className="absolute top-1 right-1 px-2 py-1 text-xs bg-red-600 text-white rounded-full hover:bg-red-700"
               >
              ❌
               </button>
             )}
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
                <p className="text-xs md:text-sm text-gray-300 text-center">
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
                      i === 0
                        ? "bg-emerald-500 text-white"
                        : "bg-gray-100 text-black"
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
        </div>
      </div>
    );
  }

  // GAME SCREEN
  return (
    <div className="min-h-screen text-white relative overflow-hidden">
      <video
        className="fixed top-0 left-0 w-screen h-screen object-cover -z-10"
        src={bgTheme.file}
        autoPlay
        muted
        loop
        playsInline
      />
      <ResultOverlay />

      <div className="relative p-4 md:p-6 flex flex-col items-center gap-4 md:gap-6">
        {/* TITLE */}
        <div className="z-10 mt-2 mb-1 text-center">
          <h1 className="text-2xl md:text-3xl font-black tracking-wide bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-500 bg-clip-text text-transparent drop-shadow-2xl">
            CLOSE MASTER
          </h1>
        </div>

        {/* INFO BAR */}
        {started && (
          <div className="z-10 w-full max-w-4xl p-3 md:p-4 bg-black/70 rounded-2xl border border-gray-700">
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
            </div>
          </div>
        )}

        {/* OPEN CARD (Discard Top) */}
        {started && (
          <div className="z-10 text-center">
            <h3 className="text-lg md:text-xl mb-3 md:mb-4 font-bold">
              OPEN CARD
            </h3>
            {discardTop ? (
              <button
                onClick={() => drawCard(true)}
                disabled={!myTurn || hasDrawn}
                className={[
                  "relative w-24 md:w-28 h-32 md:h-40 rounded-3xl border-2 border-fuchsia-500",
                  "bg-black/80 shadow-[0_0_35px_rgba(236,72,153,0.9)] animate-neon-pulse",
                  "flex flex-col justify-between p-2 md:p-3 transition-transform",
                  myTurn && !hasDrawn
                    ? "hover:scale-105 cursor-pointer"
                    : "opacity-70 cursor-not-allowed",
                ].join(" ")}
              >
                {/* Inner glow effect (stronger shadow) */}
                <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/60 shadow-[0_0_40px_rgba(248,250,252,0.6)]" />

                <div className="relative text-base md:text-lg font-bold uppercase">
                  <span className={cardTextColor(discardTop)}>
                    {discardTop.rank}
                  </span>
                </div>

                <div className="relative text-3xl md:text-4xl text-center">
                  <span className={cardTextColor(discardTop)}>
                    {discardTop.rank === "JOKER"
                      ? discardTop.suit
                      : discardTop.suit}
                  </span>
                </div>

                <div className="relative text-base md:text-lg font-bold text-right uppercase">
                  <span className={cardTextColor(discardTop)}>
                    {discardTop.rank}
                  </span>
                </div>
              </button>
            ) : (
              <div className="w-24 md:w-28 h-32 md:h-40 bg-black/70 border border-white/20 rounded-3xl flex items-center justify-center text-gray-300 text-xs md:text-sm">
                Empty
              </div>
            )}
          </div>
        )}

        {/* PLAYERS LIST + GIF + TIMER */}
        {started && (
          <div className="z-10 w-full max-w-5xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
            {players.map((p) => {
              const isYou = p.id === youId;
              const isTurn = currentPlayer?.id === p.id;
              const activeGifId = activeReactions[p.id];
              const activeGif = GIF_LIST.find((g) => g.id === activeGifId);
              const isTimerCard = isTurn; // timer only for current-turn player

// ✅ PLAYER BOX CLASSES — FINAL & STABLE
const playerClasses = [
  "relative p-1 rounded-xl border-2 shadow-lg box-border",
  "min-h-[82px] min-w-[160px]",
  "overflow-hidden",
  "transform-none" // 🔒 IMPORTANT: prevents zoom / pulse resize
];

if (isYou && isTurn) {
  playerClasses.push(
    "border-fuchsia-400 bg-black/70 shadow-[0_0_18px_rgba(236,72,153,0.9)]"
  );
} else if (isYou) {
  playerClasses.push(
    "border-emerald-400 bg-black/70 shadow-[0_0_12px_rgba(52,211,167,0.7)]"
  );
} else if (isTurn) {
  playerClasses.push(
    "border-yellow-400 bg-black/70 shadow-[0_0_18px_rgba(250,204,21,0.9)]"
  );
} else {
  playerClasses.push(
    "border-gray-700 bg-black/60"
  );
}

              return (
                <div
                  key={p.id}
                  className={playerClasses.join(" ")}
                >
                  {/* TOP BAR */}
                  <div className="flex items-center justify-between mb-1 text-[10px] md:text-xs">
                    <button
                      type="button"
                      onClick={() => handleGifClick(p.id)}
                      className="text-[10px] md:text-xs px-2 py-1 rounded-full bg-black/40 border border-white/40 flex items-center gap-1 hover:bg-black/70"
                    >
                      <span>🎭</span>
                    </button>
                    {isTimerCard && started && (
                      <div className="flex items-center gap-1">
                        <div
                          // UPDATED: Timer styling for intense red neon look
                         className={`w-7 h-7 md:w-8 md:h-8 rounded-full border-2 flex items-center justify-center text-[10px] md:text-xs font-black ${
  isTurn
    ? "border-red-400 text-red-200 shadow-[0_0_10px_rgba(248,113,113,1)]"
    : "border-gray-300 text-gray-200"
}`}
                        >
                          {turnTimeLeft}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ACTIVE GIF */}
                  {activeGif && (
                    <div className="absolute -top-6 -right-3 w-9 h-9 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-white shadow-lg bg-black/70">
                      <img
                        src={activeGif.file}
                        alt={activeGif.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* PLAYER INFO */}
                  <div className="mt-1 flex flex-col items-center">
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
                    <p className="text-xs md:text-sm text-gray-300 text-center">
                      {p.handSize} cards | {p.score} pts
                    </p>
{p.hasDrawn && (
  <span className="absolute -bottom-3 right-1 text-[10px] text-emerald-400 font-bold pointer-events-none">
    Drew
  </span>
)}
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
                {(
                  players.find((p) => p.id === showGifPickerFor)?.name ||
                  "Player"
                ) + " ki GIF pettandi"}
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
            <div className="flex gap-2 md:gap-3 flex-wrap justify-center p-3 md:p-4 bg-black/60 rounded-3xl border border-white/10">
              {me.hand.map((c) => {
                 const selected = selectedIds.includes(c.id);

              const isOpenRankMatch =
                  myTurn &&
                  discardTop &&
                  String(c.rank).trim() === String(discardTop.rank).trim();

                return (

                  <button
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    disabled={!myTurn}
                    className={[
                      "relative w-14 md:w-18 h-20 md:h-24 rounded-2xl",
                      // UPDATED: Thicker, brighter pink border (fuchsia)
                      "bg-black/80 border-2 border-white/20", 
                      // UPDATED: Stronger magenta shadow
                      "shadow-[0_0_25px_rgba(236,72,153,0.8)]", 
                      "flex flex-col justify-between p-1.5 md:p-2 transition-transform",
                      "backdrop-blur-sm",
                      selected
                        ? "scale-115 border-4 shadow-none animate-neon-border-glow z-10"
                        : isOpenRankMatch
                        ? "scale-110 border-4 border-yellow-400 shadow-[0_0_35px_rgba(250,204,21,1)] animate-pulse"
                        : myTurn
                        ? "hover:scale-105 hover:shadow-[0_0_35px_rgba(236,72,153,1)]"
                        : "opacity-60 cursor-not-allowed",
                    ].join(" ")}
                  >
                    {/* UPDATED: Inner glow effect (stronger shadow) */}
                    {!isOpenRankMatch && !selected && (
                        <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/40 shadow-[0_0_20px_rgba(248,250,252,0.5)]" />
                    )}
                    <div className="relative text-sm md:text-base font-bold uppercase">
                      <span className={cardTextColor(c)}>{c.rank}</span>
                    </div>

                    <div className="relative text-2xl md:text-3xl text-center">
                      <span className={cardTextColor(c)}>
                        {c.rank === "JOKER" ? c.suit : c.suit}
                      </span>
                    </div>

                    <div className="relative text-sm md:text-base font-bold text-right uppercase">
                      <span className={cardTextColor(c)}>{c.rank}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

{/* 🎨 CHANGE THEME BUTTON */}
{started && (
  <button
    onClick={cycleTheme}
    className="mb-2 px-4 py-2 bg-black/70 border-2 border-purple-400 text-purple-200 rounded-xl font-bold"
  >
    🎨 CHANGE THEME
  </button>
)}

        {/* ACTION BUTTONS */}
        {myTurn && started && (
          <div className="z-10 flex flex-wrap gap-2 md:gap-4 justify-center max-w-4xl p-4 md:p-6 bg-black/70 backdrop-blur-xl rounded-3xl border border-white/20">
            {/* GAME - DRAW BUTTON (Intense Blue Neon Style) */}
            <button
              onClick={() => drawCard(false)}
              disabled={hasDrawn}
              className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-xl shadow-2xl transition-all border-2 border-transparent ${
                hasDrawn
                  ? "bg-gray-700/50 cursor-not-allowed opacity-50"
                  : "bg-black/70 border-2 border-sky-400 text-sky-200 shadow-[0_0_20px_rgba(56,189,248,0.8)] hover:shadow-[0_0_30px_rgba(56,189,248,1)] hover:scale-[1.03]" 
              }`}
            >
  DRAW
</button>

            {/* GAME - DROP BUTTON (Intense Green Neon Style) */}
            <button
              onClick={dropCards}
              disabled={!allowDrop}
              className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-xl shadow-2xl transition-all border-2 border-transparent ${
                allowDrop
                  ? "bg-black/70 border-2 border-emerald-400 text-emerald-200 shadow-[0_0_20px_rgba(52,211,167,0.8)] hover:shadow-[0_0_30px_rgba(52,211,167,1)] hover:scale-[1.03]"
                  : "bg-gray-700/50 cursor-not-allowed opacity-50"
              }`}
            >
              DROP ({selectedIds.length})
            </button>
            {/* GAME - CLOSE BUTTON (Intense Pink Neon Style) */}
            <button
              onClick={callClose}
              disabled={closeDisabled}
              className={`px-4 md:px-8 py-3 md:py-4 rounded-2xl font-bold text-base md:text-xl shadow-2xl transition-all border-2 border-transparent ${
                closeDisabled
                  ? "bg-gray-700/50 cursor-not-allowed opacity-50"
                  : "bg-black/70 border-2 border-pink-500 text-pink-300 shadow-[0_0_20px_rgba(236,72,153,0.8)] hover:shadow-[0_0_30px_rgba(236,72,153,1)] hover:scale-[1.03]"
              }`}
            >
              CLOSE
            </button>
          </div>
        )}

        {started && (
          <div className="z-10 mt-4">
            {/* UPDATED: GAME - EXIT GAME BUTTON (Dark Neon) */}
            <button
              onClick={exitGame}
              className="px-6 py-3 bg-black/70 border-2 border-gray-600 hover:border-gray-400 rounded-2xl font-bold text-lg text-gray-300 shadow-xl transition-all hover:scale-[1.01]"
            >
              EXIT GAME
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        /* MODIFIED: Firework Burst Animation (now a quick explosion/pop) */
        @keyframes firework-burst {
          0% {
            transform: scale(0);
            opacity: 1;
          }
          15% {
            transform: scale(1.2); /* Quick expansion for the burst */
            opacity: 1;
          }
          100% {
            transform: scale(1.8); /* Fades out while scaling slightly larger */
            opacity: 0;
          }
        }
        .firework-burst {
          animation: firework-burst 0.7s ease-out infinite; /* Faster animation for a 'pop' effect */
        }

        /* Re-added: Pulsing Neon Glow for Open Card (Standby) */
        @keyframes neon-pulse {
            0%, 100% {
                box-shadow: 0 0 10px rgba(255, 0, 255, 0.4), 0 0 20px rgba(236,72,153,0.4); /* Pink */
            }
            50% {
                box-shadow: 0 0 30px rgba(255, 0, 255, 1), 0 0 40px rgba(236,72,153,1); /* Strong Pink */
            }
        }
        .animate-neon-pulse {
            animation: neon-pulse 3s ease-in-out infinite;
        }

        /* NEW: Player Card Turn Pulse Animation (for Turn Indicator) */
        @keyframes pulse-turn {
            0%, 100% {
                box-shadow: 0 0 5px currentColor;
                border-color: currentColor;
            }
            50% {
                box-shadow: 0 0 20px currentColor;
                border-color: currentColor;
            }
        }
        .animate-pulse-turn {
            animation: pulse-turn 1.5s infinite alternate;
        }


        /* Hand Card Glow */
        @keyframes neon-border-glow {
          0% {
            border-color: #ff00ff; /* Magenta */
            box-shadow: 0 0 15px #ff00ff, 0 0 25px #ff00ff;
            transform: scale(1.25);
          }
          33% {
            border-color: #00ffff; /* Cyan */
            box-shadow: 0 0 15px #00ffff, 0 0 25px #00ffff;
          }
          66% {
            border-color: #00ff00; /* Green */
            box-shadow: 0 0 15px #00ff00, 0 0 25px #00ff00;
          }
          100% {
            border-color: #ff00ff; /* Magenta */
            box-shadow: 0 0 15px #ff00ff, 0 0 25px #ff00ff;
            transform: scale(1.25);
          }
        }
        .animate-neon-border-glow {
          animation: neon-border-glow 2.5s linear infinite;
        }
      `}</style>
    </div>
  );
}
