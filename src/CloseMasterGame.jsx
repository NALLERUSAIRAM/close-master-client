import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "https://close-master-server-production.up.railway.app";

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

  useEffect(() => {
    if (game?.closeCalled) {
      setShowPoints(true);
    }
  }, [game?.closeCalled]);

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
  const hasDrawn = me?.hasDrawn || false;

  // ✅ FIXED CREATE ROOM
  function createRoom() {
    if (!socket || !playerName.trim()) {
      alert("Name ఎంటర్ చేయండి!");
      return;
    }
    
    console.log("Creating room with name:", playerName.trim());
    
    socket.emit("create_room", { 
      name: playerName.trim().substring(0, 20)
    }, (res) => {
      console.log("CREATE ROOM RESPONSE:", res);
      
      if (res && (res.roomId || res.success)) {
        console.log("✅ Room created successfully:", res.roomId);
        setScreen("game");
      } else {
        console.error("❌ Create failed:", res);
        alert(`Create failed: ${res?.error || "Server error. Refresh చేసి మళ్లీ try చేయండి"}`);
      }
    });
  }

  function joinRoom() {
    if (!socket) return;
    if (!playerName.trim() || !joinCode.trim()) {
      alert("Name & Room ID రెండూ ఎంటర్ చేయండి!");
      return;
    }
    socket.emit(
      "join_room",
      { name: playerName.trim(), roomId: joinCode.trim().toUpperCase() },
      (res) => {
        console.log("JOIN RESPONSE:", res);
        if (res?.error) {
          alert(res.error);
        } else if (res?.roomId || res?.success) {
          setScreen("game");
        }
      }
    );
  }

  function startRound() {
    if (!socket || !game?.roomId || !isHost) return;
    if (players.length < 2) {
      alert("కనీసం 2 మంది players ఉండాలి.");
      return;
    }
    socket.emit("start_round", { roomId: game.roomId });
  }

  function drawCard(fromDiscard = false) {
    if (!socket || !roomId || !myTurn || hasDrawn) return;
    socket.emit("action_draw", { 
      roomId, 
      fromDiscard
    });
  }

  function dropCards() {
    if (!socket || !roomId || !myTurn || !hasDrawn) return;
    if (selectedIds.length === 0) {
      alert("ముందు cards select చేయండి!");
      return;
    }
    socket.emit("action_drop", { roomId, selectedIds });
  }

  function callClose() {
    if (!socket || !roomId || !myTurn) return;
    if (!window.confirm("Sure? CLOSE అని అడిగితే scoring direct ga jarugutundi!")) {
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
    if (!window.confirm("Game exit చేయాలా?")) return;
    if (socket) socket.disconnect();
    setScreen("welcome");
    setPlayerName("");
    setJoinCode("");
    setGame(null);
    setSelectedIds([]);
    setIsHost(false);
    setShowPoints(false);
  }

  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center text-white px-4">
        <div className="bg-black/70 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
          <h1 className="text-3xl font-bold text-center text-gradient bg-gradient-to-r from-emerald-400 to-sky-400 bg-clip-text text-transparent">
            CLOSE MASTER 🔥
          </h1>

          <div className="space-y-2">
            <label className="text-xs text-gray-300">Your Name</label>
            <input
              className="w-full p-3 bg-gray-900 rounded-lg border border-gray-700 outline-none text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
              placeholder="eg: SAIRAM"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-gray-300">Room ID (Join చేయడానికి)</label>
            <input
              className="w-full p-3 bg-gray-900 rounded-lg border border-gray-700 outline-none text-sm focus:border-sky-500 focus:ring-2 focus:ring-sky-500/50 uppercase"
              placeholder="Host ఇచ్చిన code ఇవ్వండి"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
          </div>

          <button
            onClick={createRoom}
            disabled={!playerName.trim()}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
              playerName.trim()
                ? "bg-emerald-600 hover:bg-emerald-500 shadow-lg hover:shadow-emerald-500/50 hover:scale-[1.02]"
                : "bg-emerald-900 opacity-50 cursor-not-allowed"
            }`}
          >
            🏠 CREATE ROOM (Host అవ్వండి)
          </button>

          <button
            onClick={joinRoom}
            disabled={!playerName.trim() || !joinCode.trim()}
            className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
              playerName.trim() && joinCode.trim()
                ? "bg-sky-600 hover:bg-sky-500 shadow-lg hover:shadow-sky-500/50 hover:scale-[1.02]"
                : "bg-sky-900 opacity-50 cursor-not-allowed"
            }`}
          >
            🚪 JOIN ROOM
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] to-[#1e1b4b] text-white p-3 flex flex-col items-center gap-3">
      <div className="w-full max-w-6xl flex flex-wrap items-center justify-between gap-3 p-4 bg-black/30 backdrop-blur-sm rounded-2xl border border-white/10">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 bg-clip-text text-transparent">
            Room: <span className="text-emerald-400">{roomId || "----"}</span>
          </h2>
          <p className="text-xs text-gray-300">
            You: <span className="font-semibold text-white">{me?.name}</span> 
            {isHost && " 👑(Host)"}
          </p>
        </div>

        <div className="flex gap-2 items-center">
          {isHost && (
            <button
              onClick={startRound}
              disabled={started || players.length < 2}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                started
                  ? "bg-emerald-900 text-emerald-300 cursor-not-allowed"
                  : players.length < 2
                  ? "bg-gray-700 opacity-50 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-500 hover:shadow-lg"
              }`}
            >
              {started ? "⚡ Running" : "▶️ Start Game"}
            </button>
          )}
          <button
            onClick={() => setShowPoints(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 rounded-xl text-xs font-bold shadow-md hover:shadow-lg"
          >
            📊 SCORES
          </button>
          <button
            onClick={exitGame}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-xs font-bold"
          >
            🚪 Exit
          </button>
        </div>
      </div>

      <div className="w-full max-w-6xl bg-black/40 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 text-sm flex justify-between items-center">
        <div>
          Status: 
          {started ? (
            <>
              <span className="text-yellow-400 font-bold ml-1">
                {currentPlayer?.name}
              </span>
              {myTurn && (
                <span className="ml-2 px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded-full text-xs">
                  {hasDrawn ? "✓ Drew" : "➤ Draw First"}
                </span>
              )}
            </>
          ) : closeCalled ? (
            <span className="text-red-400">🔚 Round Ended</span>
          ) : (
            <span className="text-gray-400">⏳ Host start చేయాలి</span>
          )}
        </div>
        <div className="text-xs text-gray-400 flex gap-4">
          <span>📥 {pendingDraw}</span>
          <span>⏭️ {pendingSkips}</span>
        </div>
      </div>

      <div className="p-4 bg-black/50 backdrop-blur-sm rounded-2xl border border-white/20 text-center shadow-2xl">
        <h3 className="text-sm text-gray-300 mb-2">
          🎴 OPEN CARD {myTurn && !hasDrawn && "(Click చేయండి)"}
        </h3>
        {discardTop ? (
          <button
            onClick={() => drawCard(true)}
            disabled={!myTurn || hasDrawn}
            className={`w-20 h-28 bg-white rounded-2xl shadow-2xl flex flex-col justify-between p-2 mx-auto transition-all duration-200 border-4 ${
              myTurn && !hasDrawn
                ? "border-blue-400 hover:scale-105 hover:shadow-blue-500 cursor-pointer"
                : "border-gray-300 opacity-70"
            }`}
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
          <div className="w-20 h-28 bg-gray-800 border-2 border-gray-600 rounded-xl flex items-center justify-center text-xs text-gray-500">
            No Card
          </div>
        )}
        <p className="mt-2 text-xs text-gray-400">
          Match: <span className="font-bold">{discardTop?.rank || "?"}</span>
        </p>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {players
          .filter((p) => p.id !== youId)
          .map((p) => (
            <div
              key={p.id}
              className={`p-3 bg-black/50 backdrop-blur-sm rounded-xl border transition-all ${
                currentPlayer?.id === p.id 
                  ? "border-yellow-400 ring-2 ring-yellow-400/50 shadow-xl scale-105" 
                  : "border-gray-700 hover:border-gray-500 hover:scale-105"
              } ${p.hasDrawn ? "bg-green-900/30 ring-2 ring-green-400/30" : ""}`}
            >
              <p className="text-xs font-bold truncate">
                {p.name}
                {p.id === game?.hostId && " 👑"}
              </p>
              <p className="text-[10px] text-gray-400">
                {p.handSize} Cards | {p.score} pts
                {p.hasDrawn && " ✓"}
              </p>
              <div className="flex gap-1 mt-2 flex-wrap">
                {Array.from({ length: p.handSize }).map((_, i) => (
                  <div key={i} className="w-4 h-6 bg-gray-700 rounded-sm border" />
                ))}
              </div>
            </div>
          ))}
      </div>

      {me && (
        <div className="w-full max-w-6xl">
          <div className="mb-2 flex justify-between items-center p-2 bg-black/30 rounded-xl">
            <h3 className="text-sm font-bold text-emerald-400">
              🃏 Your Hand ({me.hand.length} cards) | Score: {me.score}
            </h3>
            <span className="text-xs text-gray-400">
              {hasDrawn ? "✓ Drew - Select & Drop" : "Draw first!"}
            </span>
          </div>

          <div className="bg-black/50 backdrop-blur-sm rounded-2xl border border-white/20 p-4 overflow-x-auto">
            <div className="flex gap-2">
              {me.hand.map((c) => {
                const sel = selectedIds.includes(c.id);
                const color = cardTextColor(c);
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleSelect(c.id)}
                    disabled={!hasDrawn}
                    className={`w-16 h-24 bg-white rounded-2xl shadow-xl border-4 transition-all duration-200 hover:scale-105 ${
                      sel
                        ? "border-emerald-500 shadow-emerald-500/50 scale-110 translate-y-[-2px]"
                        : !hasDrawn
                        ? "border-gray-300 opacity-50 cursor-not-allowed"
                        : "border-gray-200 hover:border-gray-400 hover:shadow-lg"
                    }`}
                  >
                    <div className={`flex flex-col justify-between h-full p-2 ${color}`}>
                      <div className="text-sm font-bold">{c.rank}</div>
                      <div className="text-3xl text-center">{c.rank === "JOKER" ? "🃏" : c.suit}</div>
                      <div className="text-xs text-right">{c.rank}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {started && (
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => drawCard(false)}
            disabled={!myTurn || hasDrawn}
            className={`px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all ${
              !myTurn || hasDrawn
                ? "bg-purple-900/50 border border-purple-500/50 opacity-50 cursor-not-allowed"
                : "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 shadow-purple-500/25 hover:shadow-xl hover:scale-[1.02]"
            }`}
          >
            📥 DECK DRAW{pendingDraw > 0 && ` (+${pendingDraw})`}
          </button>

          <button
            onClick={dropCards}
            disabled={!myTurn || !hasDrawn || selectedIds.length === 0}
            className={`px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all ${
              !myTurn || !hasDrawn || selectedIds.length === 0
                ? "bg-green-900/50 border border-green-500/50 opacity-50 cursor-not-allowed"
                : "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 shadow-green-500/25 hover:shadow-xl hover:scale-[1.02]"
            }`}
          >
            🗑️ DROP ({selectedIds.length})
          </button>

          <button
            onClick={callClose}
            disabled={!myTurn}
            className={`px-6 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all ${
              !myTurn
                ? "bg-red-900/50 border border-red-500/50 opacity-50 cursor-not-allowed"
                : "bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/25 hover:shadow-xl hover:scale-[1.02]"
            }`}
          >
            ❌ CLOSE
          </button>
        </div>
      )}

      {myTurn && started && (
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-900/90 to-orange-900/90 rounded-3xl border-2 border-yellow-400/50 shadow-2xl text-center max-w-lg mx-auto">
          <div className="text-lg font-bold text-yellow-300 mb-2">🎯 YOUR TURN</div>
          {hasDrawn ? (
            <div className="text-green-300 font-semibold">
              ✓ Card డ్రా చేశారు! <br />
              <span className="text-sm">Same rank cards select చేసి DROP చేయండి 🚀</span>
            </div>
          ) : (
            <div className="text-yellow-200 font-semibold">
              ➤ ముందు DECK లేదా OPEN CARD నుండి DRAW చేయండి
            </div>
          )}
        </div>
      )}

      {showPoints && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 text-black rounded-3xl p-8 w-96 shadow-2xl max-h-[85vh] overflow-auto backdrop-blur-sm">
            <h3 className="text-3xl font-black text-center mb-8 bg-gradient-to-r from-gray-900 to-black text-white py-4 rounded-2xl shadow-2xl">
              🏆 SCORES
            </h3>

            <div className="space-y-4 mb-8">
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl shadow-lg hover:shadow-xl transition-all border-l-8 border-emerald-500 hover:scale-[1.02]"
                >
                  <span className="text-xl font-bold">{p.name}</span>
                  <span className={`text-3xl font-black px-6 py-3 rounded-2xl shadow-xl ${
                    i === 0 
                      ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-white" 
                      : "bg-gradient-to-r from-gray-200 to-gray-300 text-gray-800"
                  }`}>
                    {p.score}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowPoints(false)}
              className="w-full py-4 bg-gradient-to-r from-gray-800 to-black text-white rounded-2xl text-xl font-bold shadow-2xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-200"
            >
              🎮 CONTINUE GAME
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
