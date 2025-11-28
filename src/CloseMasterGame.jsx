import React, { useEffect, useState } from "react";
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
          className="absolute w-16 h-24 rounded-3xl border border-white/20 shadow-[0_0_20px_#3b82f6] backdrop-blur-md bg-gradient-to-br from-blue-500/20 to-purple-500/20 animate-float-slow"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 15}s`,
            animationDuration: `${10 + Math.random() * 10}s`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(0);
          }
          50% {
            transform: translateY(-20px) rotate(5deg);
          }
        }
        .animate-float-slow {
          animation: float 15s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function CloseMasterGame() {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState("welcome");
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [game, setGame] = useState(null);
  const [players, setPlayers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [loading, setLoading] = useState(false);
  const [myTurn, setMyTurn] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showPoints, setShowPoints] = useState(false);

  useEffect(() => {
    const s = io(SERVER_URL);

    s.on("connect", () => console.log("socket connected", s.id));

    s.on("room_created", (data) => {
      setGame(data.room);
      setPlayers(data.players);
      setIsHost(true);
      setScreen("lobby");
      setLoading(false);
    });

    s.on("room_joined", (data) => {
      setGame(data.room);
      setPlayers(data.players);
      setIsHost(false);
      setScreen("lobby"); // always lobby first
      setLoading(false);
    });

    s.on("player_joined", (pls) => setPlayers(pls));

    s.on("game_update", (room) => {
      setGame(room);
      setPlayers(room.players);
      const isMyTurn = room.currentPlayerId === s.id;
      setMyTurn(isMyTurn);
      setHasDrawn(room.hasDrawn && isMyTurn);
      if (!isMyTurn) {
        setHasDrawn(false);
        setSelectedIds([]);
      }
      setScreen(room.started ? "game" : "lobby");
    });

    s.on("game_ended", (scores) => {
      setPlayers(scores);
      setShowPoints(true);
    });

    s.on("error", (msg) => {
      alert(msg);
      setLoading(false);
    });

    setSocket(s);
    return () => s.disconnect();
  }, []);

  const createRoom = () => {
    if (!playerName.trim()) return alert("Enter name!");
    setLoading(true);
    socket.emit("create_room", { name: playerName.trim() });
  };

  const joinRoom = () => {
    if (!playerName.trim() || !joinCode.trim())
      return alert("Name & code required!");
    setLoading(true);
    socket.emit("join_room", {
      name: playerName.trim(),
      roomId: joinCode.trim().toUpperCase(),
    });
  };

  const startGame = () => {
    if (!socket) return;
    socket.emit("start_game");
  };

  const drawCard = (fromOpen = false) => {
    if (!socket || !game || !myTurn || hasDrawn) return;
    if (
      fromOpen &&
      game.discardPile?.[0]?.rank &&
      game.discardPile[0].rank.match(/7|J/)
    ) {
      alert("🚫 Cannot take 7 or J from open!");
      return;
    }
    socket.emit("action_draw", { fromDiscard: fromOpen });
  };

  const dropCards = () => {
    if (!socket || !game) return;
    if (!myTurn || !hasDrawn || selectedIds.length === 0) {
      alert("Draw first & select cards");
      return;
    }
    socket.emit("action_drop", { selectedIds });
    setSelectedIds([]);
  };

  const callClose = () => {
    if (!socket || !game) return;
    if (!myTurn) return alert("Wait for your turn");
    if (hasDrawn) return alert("CLOSE only BEFORE draw");
    if (!window.confirm("Close this round?")) return;
    socket.emit("action_close");
  };

  const exitGame = () => {
    if (!window.confirm("Exit game?")) return;
    socket?.disconnect();
    setScreen("welcome");
    setPlayerName("");
    setJoinCode("");
    setGame(null);
    setPlayers([]);
    setIsHost(false);
    setLoading(false);
    setMyTurn(false);
    setHasDrawn(false);
    setSelectedIds([]);
    setShowPoints(false);
  };

  // WELCOME
  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex items-center justify-center px-4 relative overflow-hidden">
        <NeonFloatingCards />
        <div className="relative z-10 bg-black/80 backdrop-blur-2xl p-8 rounded-3xl w-full max-w-md border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-500 bg-clip-text text-transparent mb-4 drop-shadow-2xl">
              CLOSE MASTER
            </h1>
            <p className="text-xl text-white/80 font-semibold">
              Lowest Count Game
            </p>
          </div>
          <div className="space-y-4">
            <input
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400 transition-all"
              placeholder="Your Name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
            <button
              onClick={createRoom}
              disabled={loading}
              className={`w-full px-8 py-4 rounded-2xl font-bold text-xl shadow-2xl transition-all ${
                loading
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-emerald-500 to-blue-600 hover:from-emerald-600 hover:to-blue-700 hover:scale-105 shadow-emerald-500/50"
              }`}
            >
              {loading ? "⏳ Creating..." : "🎮 CREATE ROOM"}
            </button>
            <div className="text-center text-white/50 my-4">OR JOIN ROOM</div>
            <div className="flex space-x-3">
              <input
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-2xl text-white placeholder-white/50 focus:outline-none focus:border-emerald-400"
                placeholder="ROOM"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={4}
              />
              <button
                onClick={joinRoom}
                disabled={loading || !playerName || !joinCode}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 rounded-2xl font-bold text-white shadow-purple-500/50 hover:scale-105 whitespace-nowrap"
              >
                JOIN
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // LOBBY
  if (screen === "lobby") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex flex-col items-center justify-center px-4 relative overflow-hidden">
        <NeonFloatingCards />
        <div className="relative z-10 w-full max-w-md">
          <button
            onClick={exitGame}
            className="absolute top-6 left-6 text-white/70 hover:text-white text-2xl"
          >
            ←
          </button>
          <div className="bg-black/80 backdrop-blur-2xl p-8 rounded-3xl border border-white/20 shadow-2xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent mb-2">
                Room: {game?.roomId}
              </h1>
              <p className="text-white/70">
                {players.length}/{MAX_PLAYERS} Players
              </p>
            </div>
            <div className="space-y-3 mb-8 max-h-64 overflow-y-auto">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center p-3 rounded-xl ${
                    p.id === socket.id
                      ? "bg-emerald-500/20 border-emerald-400 border"
                      : "bg-white/10"
                  }`}
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-emerald-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-white font-medium flex-1">
                    {p.name}
                  </span>
                  {p.id === socket.id && (
                    <span className="text-emerald-400 text-sm font-bold">
                      (YOU)
                    </span>
                  )}
                </div>
              ))}
            </div>
            {isHost && players.length >= 2 && (
              <button
                onClick={startGame}
                className="w-full px-8 py-4 bg-gradient-to-r from-emerald-500 via-green-500 to-emerald-600 text-xl font-black rounded-2xl shadow-2xl hover:scale-105 hover:shadow-emerald-500/50 transition-all text-white"
              >
                🚀 START GAME
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // MAIN GAME
  const me = game?.players?.find((p) => p.id === socket.id);
  const others = game?.players?.filter((p) => p.id !== socket.id) || [];
  const topRow = others.slice(0, 3);
  const sideLeft = others[3];
  const sideRight = others[4];
  const extraBottom = others[5];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-purple-900/20 to-blue-900/20 flex flex-col relative overflow-hidden">
      <NeonFloatingCards />
      <div className="p-4 pt-6 pb-24 flex-1 flex flex-col">
        {/* TOP BAR */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-white/60">Turn</div>
            <div className="text-xl font-bold text-white">
              {game?.players?.find((p) => p.id === game.currentPlayerId)?.name ||
                "—"}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <div className="text-xs text-white/60">Your Score</div>
              <div className="text-lg font-bold text-emerald-400">
                {me?.score || 0} pts
              </div>
            </div>
            <button
              onClick={() => setShowPoints(true)}
              className="px-4 py-2 bg-white/10 border border-white/30 rounded-xl text-xs font-semibold text-white hover:bg-white/20 transition-all"
            >
              POINTS
            </button>
            <button
              onClick={exitGame}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-700 text-white font-bold rounded-xl text-xs border border-red-400/60"
            >
              EXIT
            </button>
          </div>
        </div>

        {/* TOP ROW PLAYERS */}
        <div className="flex justify-center gap-3 mb-4">
          {topRow.map((pl) => (
            <div
              key={pl.id}
              className={`min-w-[110px] px-3 py-2 rounded-2xl border text-center text-xs ${
                pl.id === game.currentPlayerId
                  ? "border-yellow-400 bg-yellow-500/15 shadow-lg shadow-yellow-500/40"
                  : "border-white/20 bg-white/5"
              }`}
            >
              <div className="text-white font-semibold truncate">{pl.name}</div>
              <div className="text-emerald-300 font-bold">{pl.score} pts</div>
              <div className="text-white/50 text-[11px]">
                {pl.hand?.length || 0} cards
              </div>
            </div>
          ))}
        </div>

        {/* MIDDLE TABLE */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center justify-center w-full max-w-5xl">
            {/* LEFT */}
            <div className="w-32">
              {sideLeft && (
                <div
                  className={`px-3 py-2 rounded-2xl border text-center text-xs ${
                    sideLeft.id === game.currentPlayerId
                      ? "border-yellow-400 bg-yellow-500/15 shadow-lg shadow-yellow-500/40"
                      : "border-white/20 bg-white/5"
                  }`}
                >
                  <div className="text-white font-semibold truncate">
                    {sideLeft.name}
                  </div>
                  <div className="text-emerald-300 font-bold">
                    {sideLeft.score} pts
                  </div>
                  <div className="text-white/50 text-[11px]">
                    {sideLeft.hand?.length || 0} cards
                  </div>
                </div>
              )}
            </div>

            {/* OPEN + DECK */}
            <div className="flex flex-col items-center justify-center gap-3 px-6">
              {/* OPEN */}
              <div
                className={`relative w-28 h-40 rounded-3xl border-4 shadow-2xl bg-gradient-to-br from-white to-gray-100 flex flex-col items-center justify-center p-3 cursor-pointer transition-all hover:scale-105 hover:shadow-white/50 ${
                  game?.discardPile?.[0] &&
                  myTurn &&
                  !game.discardPile[0].rank?.match(/7|J/)
                    ? "border-emerald-400"
                    : "border-white/30"
                }`}
                onClick={() => drawCard(true)}
              >
                {game?.discardPile?.[0] ? (
                  <>
                    <div
                      className={`text-3xl font-bold ${cardTextColor(
                        game.discardPile[0]
                      )}`}
                    >
                      {game.discardPile[0].rank}
                    </div>
                    <div
                      className={`text-2xl ${cardTextColor(
                        game.discardPile[0]
                      )}`}
                    >
                      {game.discardPile[0].suit}
                    </div>
                  </>
                ) : (
                  <span className="text-gray-500 font-bold text-sm">
                    NO CARD
                  </span>
                )}
              </div>

              {/* DECK */}
              <div
                className={`w-24 h-36 rounded-3xl border-4 border-white/30 shadow-2xl bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center cursor-pointer transition-all hover:scale-105 hover:shadow-white/50 ${
                  myTurn && !hasDrawn
                    ? "hover:border-emerald-400"
                    : "opacity-50 cursor-not-allowed"
                }`}
                onClick={() => drawCard(false)}
              >
                <span className="text-2xl">📥</span>
              </div>
            </div>

            {/* RIGHT */}
            <div className="w-32 text-right">
              {sideRight && (
                <div
                  className={`px-3 py-2 rounded-2xl border text-center text-xs ml-auto ${
                    sideRight.id === game.currentPlayerId
                      ? "border-yellow-400 bg-yellow-500/15 shadow-lg shadow-yellow-500/40"
                      : "border-white/20 bg-white/5"
                  }`}
                >
                  <div className="text-white font-semibold truncate">
                    {sideRight.name}
                  </div>
                  <div className="text-emerald-300 font-bold">
                    {sideRight.score} pts
                  </div>
                  <div className="text-white/50 text-[11px]">
                    {sideRight.hand?.length || 0} cards
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* EXTRA BOTTOM PLAYER */}
        {extraBottom && (
          <div className="flex justify-center mb-3">
            <div
              className={`min-w-[110px] px-3 py-2 rounded-2xl border text-center text-xs ${
                extraBottom.id === game.currentPlayerId
                  ? "border-yellow-400 bg-yellow-500/15 shadow-lg shadow-yellow-500/40"
                  : "border-white/20 bg-white/5"
              }`}
            >
              <div className="text-white font-semibold truncate">
                {extraBottom.name}
              </div>
              <div className="text-emerald-300 font-bold">
                {extraBottom.score} pts
              </div>
              <div className="text-white/50 text-[11px]">
                {extraBottom.hand?.length || 0} cards
              </div>
            </div>
          </div>
        )}

        {/* YOUR HAND */}
        <div className="mt-2">
          <div className="flex items-center mb-2">
            <div className="text-lg font-bold text-white mr-3">
              YOUR HAND ({me?.hand?.length || 0})
            </div>
            <span
              className={`px-3 py-1 rounded-xl text-xs font-bold ${
                hasDrawn
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400"
                  : "bg-yellow-500/20 text-yellow-300 border border-yellow-400"
              }`}
            >
              {hasDrawn ? "✓ DREW" : "➤ DRAW"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {me?.hand?.map((card) => (
              <div
                key={card.id}
                className={`w-16 h-24 rounded-2xl border-4 shadow-xl flex flex-col items-center justify-center p-1 cursor-pointer transition-all hover:scale-110 hover:shadow-white/50 ${
                  selectedIds.includes(card.id)
                    ? "border-emerald-400 bg-emerald-400/20 shadow-emerald-500/50"
                    : "border-white/30 bg-gradient-to-br from-white to-gray-100"
                }`}
                onClick={() =>
                  setSelectedIds((prev) =>
                    prev.includes(card.id)
                      ? prev.filter((x) => x !== card.id)
                      : [...prev, card.id]
                  )
                }
              >
                <div className={`text-lg font-bold ${cardTextColor(card)}`}>
                  {card.rank}
                </div>
                <div className={`text-base ${cardTextColor(card)}`}>
                  {card.suit}
                </div>
              </div>
            ))}
          </div>
          <div className="text-center text-xs text-white/60 mt-1">
            {selectedIds.length} selected
          </div>
        </div>

        {/* BOTTOM ACTIONS */}
        <div className="mt-4">
          <div className="flex justify-center gap-3 bg-black/70 backdrop-blur-xl border border-white/20 rounded-3xl px-4 py-4 max-w-xl mx-auto">
            <button
              onClick={() => drawCard(false)}
              disabled={!myTurn || hasDrawn}
              className={`flex-1 px-4 py-3 rounded-2xl font-bold text-lg shadow-2xl transition-all ${
                myTurn && !hasDrawn
                  ? "bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black hover:scale-105"
                  : "bg-gray-700/50 cursor-not-allowed opacity-50 text-gray-300"
              }`}
            >
              ➤ DRAW
            </button>

            <button
              onClick={dropCards}
              disabled={!myTurn || !hasDrawn || selectedIds.length === 0}
              className={`flex-1 px-4 py-3 rounded-2xl font-bold text-lg shadow-2xl transition-all ${
                myTurn && hasDrawn && selectedIds.length > 0
                  ? "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white hover:scale-105"
                  : "bg-gray-700/50 cursor-not-allowed opacity-50 text-gray-300"
              }`}
            >
              🗑️ DROP
            </button>

            <button
              onClick={callClose}
              disabled={!myTurn || hasDrawn}
              className={`flex-1 px-4 py-3 rounded-2xl font-bold text-lg shadow-2xl transition-all ${
                myTurn && !hasDrawn
                  ? "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white hover:scale-105"
                  : "bg-gray-700/50 cursor-not-allowed opacity-50 text-gray-300"
              }`}
            >
              ❌ CLOSE
            </button>
          </div>
          <div className="text-center text-xs text-white/50 mt-2">
            {myTurn
              ? hasDrawn
                ? "✓ Drew – select cards & DROP"
                : "Your turn – draw or close"
              : "Waiting for other players..."}
          </div>
        </div>
      </div>

      {/* SCORE MODAL */}
      {showPoints && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white p-10 rounded-3xl shadow-2xl max-w-lg w-full text-center border-4 border-white/20 max-h-[80vh] overflow-y-auto">
            <h2 className="text-3xl font-black mb-6">SCORES</h2>
            <div className="space-y-3 mb-6">
              {players.map((p) => (
                <div
                  key={p.id}
                  className="flex justify-between p-3 bg-white/20 rounded-2xl"
                >
                  <span className="font-semibold">{p.name}</span>
                  <span className="font-black text-lg">{p.score} pts</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShowPoints(false)}
              className="w-full px-6 py-3 bg-white/20 rounded-2xl font-bold border border-white/40 hover:bg-white/30 transition-all"
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
