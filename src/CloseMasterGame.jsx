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

export default function CloseMasterGame() {
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [me, setMe] = useState(null);
  const [players, setPlayers] = useState([]);
  const [openCard, setOpenCard] = useState(null);
  const [turnId, setTurnId] = useState(null);
  const [hand, setHand] = useState([]);
  const [pendingDraw, setPendingDraw] = useState(0);
  const [pendingSkips, setPendingSkips] = useState(0);
  const [hasSpecialCardThisRound, setHasSpecialCardThisRound] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [screen, setScreen] = useState("welcome");
  const [log, setLog] = useState([]);
  const [name, setName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on("game_state", (room) => {
      setPlayers(room.players);
      setTurnId(room.turnId);
      setOpenCard(room.discardPile[room.discardPile.length - 1] || null);
      setPendingDraw(room.pendingDraw || 0);
      setPendingSkips(room.pendingSkips || 0);
      setHasSpecialCardThisRound(room.hasSpecialCardThisRound || false);
      setLog(room.log.slice(-5)); // Last 5 logs
      setRoomId(room.id);
      const mePlayer = room.players.find(p => p.id === newSocket.id);
      setMe(mePlayer);
      setHand(mePlayer?.hand || []);
      
      if (room.started === false && room.players.length > 0) {
        setScreen("lobby");
      } else if (room.started) {
        setScreen("game");
      }
    });

    newSocket.on("room_created", ({ roomId }) => {
      setRoomId(roomId);
      setScreen("lobby");
    });

    newSocket.on("error", (msg) => {
      alert(msg);
    });

    return () => newSocket.close();
  }, []);

  const isMyTurn = me && turnId === me.id;
  
  // PERFECT BUTTON LOGIC
  const canDraw = isMyTurn && !me?.hasDrawn;
  const canDrop = isMyTurn && me?.hasDrawn && selectedIds.length > 0;
  const canClose = isMyTurn && !me?.hasDrawn; // Turn start lo matrame!

  function toggleSelectCard(cardId) {
    setSelectedIds(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  }

  function handleDraw() {
    socket?.emit("action_draw");
    setSelectedIds([]);
  }

  function handleDrop() {
    socket?.emit("action_drop", { selectedIds });
    setSelectedIds([]);
  }

  function handleClose() {
    socket?.emit("action_close");
    setSelectedIds([]);
  }

  function handleCreateRoom() {
    if (name && socket) {
      socket.emit("create_room", { name: name.trim() });
    }
  }

  function handleJoinRoom() {
    if (name && joinRoomId.trim() && socket) {
      socket.emit("join_room", { 
        name: name.trim(), 
        roomId: joinRoomId.trim().toUpperCase() 
      });
    }
  }

  function Card({ card, isSelected, onClick }) {
    return (
      <div
        onClick={onClick}
        className={`relative border-4 rounded-xl p-3 m-2 cursor-pointer transform transition-all duration-200 hover:scale-110 shadow-lg ${
          isSelected 
            ? "border-blue-500 bg-blue-100 shadow-blue-300" 
            : "border-gray-300 bg-gradient-to-br from-white to-gray-50 shadow-md hover:shadow-xl"
        } ${cardTextColor(card)} font-bold text-lg`}
        style={{ minWidth: 70, height: 100, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}
      >
        <div className="absolute top-1 left-1 text-xs">{card.suit}</div>
        <div className="text-2xl">{card.rank}</div>
        <div className="absolute bottom-1 right-1 text-xs">{card.suit}</div>
      </div>
    );
  }

  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-emerald-400 to-blue-500 flex items-center justify-center p-4 animate-pulse">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl max-w-md w-full border-4 border-white/50 animate-float">
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-2">
              Close Master
            </h1>
            <p className="text-gray-600 text-lg">Power Rummy</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg focus:border-emerald-500 focus:outline-none transition-all"
            />
            <button 
              onClick={handleCreateRoom} 
              disabled={!name.trim()}
              className="w-full p-4 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl text-xl font-bold hover:from-emerald-600 hover:to-emerald-700 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
            >
              🎮 Create Room
            </button>
            
            <div className="text-center py-4 text-gray-400">or</div>
            
            <input
              type="text"
              placeholder="Room ID (ABCD)"
              value={joinRoomId}
              onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
              maxLength={4}
              className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg uppercase text-center font-mono tracking-wider focus:border-blue-500 focus:outline-none transition-all"
            />
            <button 
              onClick={handleJoinRoom}
              disabled={!name.trim() || joinRoomId.length !== 4}
              className="w-full p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-2xl text-xl font-bold hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
            >
              🚪 Join Room
            </button>
          </div>
        </div>
        
        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(2deg); }
          }
          .animate-float { animation: float 6s ease-in-out infinite; }
        `}</style>
      </div>
    );
  }

  if (screen === "lobby") {
    const isHost = me?.id === players[0]?.id;
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center p-4">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl max-w-md w-full border-4 border-white/50">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Room: <span className="font-mono text-4xl tracking-wider">{roomId}</span>
            </h1>
            <p className="text-2xl mt-2">Players: {players.length}/{MAX_PLAYERS}</p>
          </div>

          <div className="space-y-3 mb-8 max-h-48 overflow-y-auto">
            {players.map((p) => (
              <div key={p.id} className={`p-4 rounded-2xl border-2 flex items-center space-x-3 ${
                p.id === me?.id ? "border-emerald-400 bg-emerald-50" : "border-gray-200 bg-gray-50"
              } transform hover:scale-105 transition-all`}>
                <div className={`w-3 h-3 rounded-full ${p.id === me?.id ? "bg-emerald-500" : "bg-gray-400"}`}></div>
                <span className={`font-bold ${p.id === me?.id ? "text-emerald-700" : "text-gray-700"}`}>
                  {p.name}
                </span>
                {p.id === players[0]?.id && (
                  <span className="ml-auto px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-sm font-bold">
                    👑 Host
                  </span>
                )}
              </div>
            ))}
          </div>

          {isHost && players.length >= 2 && (
            <button
              onClick={() => socket.emit("start_game")}
              className="w-full p-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl text-xl font-black shadow-2xl hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all"
            >
              🚀 START GAME ({players.length} players)
            </button>
          )}
        </div>
      </div>
    );
  }

  // GAME SCREEN
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center text-white">
          <h1 className="text-2xl md:text-3xl font-black mb-2">Close Master - Room {roomId}</h1>
          <div className={`inline-flex px-4 py-2 rounded-full text-lg font-bold ${
            isMyTurn 
              ? "bg-emerald-500 text-black shadow-lg" 
              : "bg-gray-700"
          }`}>
            Turn: {players.find(p => p.id === turnId)?.name || "—"}
            {isMyTurn && " ← YOU"}
          </div>
        </div>

        {/* Open Card */}
        <div className="flex justify-center">
          <div className="bg-white/20 backdrop-blur-xl rounded-3xl p-6 border-4 border-white/30 shadow-2xl">
            <p className="text-white text-lg font-bold mb-4 text-center">🂱 Open Card</p>
            {openCard ? (
              <Card 
                card={openCard} 
                isSelected={false}
                onClick={() => {}} 
              />
            ) : (
              <div className="w-24 h-32 bg-gray-300 rounded-xl flex items-center justify-center text-gray-600 font-bold animate-pulse">
                No Card
              </div>
            )}
          </div>
        </div>

        {/* Your Hand */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border-2 border-white/20">
          <p className="text-white text-xl font-bold mb-6 text-center">
            Your Hand ({hand.length} cards) {me?.score ? `| Score: ${me.score}` : ""}
          </p>
          <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
            {hand.map((card) => (
              <Card
                key={card.id}
                card={card}
                isSelected={selectedIds.includes(card.id)}
                onClick={() => toggleSelectCard(card.id)}
              />
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center p-6 bg-white/5 backdrop-blur-xl rounded-3xl border-2 border-white/10">
          <button
            onClick={handleDraw}
            disabled={!canDraw}
            className={`px-8 py-4 rounded-2xl text-xl font-black shadow-2xl transform transition-all duration-200 ${
              canDraw
                ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:scale-105 shadow-green-500"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
          >
            📥 DRAW
          </button>
          
          <button
            onClick={handleDrop}
            disabled={!canDrop}
            className={`px-8 py-4 rounded-2xl text-xl font-bold shadow-2xl transform transition-all duration-200 ${
              canDrop
                ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:scale-105 shadow-blue-500"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
          >
            🂠 DROP ({selectedIds.length})
          </button>
          
          <button
            onClick={handleClose}
            disabled={!canClose}
            className={`px-8 py-4 rounded-2xl text-xl font-black shadow-2xl transform transition-all duration-200 ${
              canClose
                ? "bg-gradient-to-r from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 hover:scale-105 shadow-red-500"
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
          >
            ✅ CLOSE
          </button>
        </div>

        {/* Game Log */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border-2 border-white/10 max-h-48 overflow-y-auto">
          <p className="text-white font-bold mb-4 text-lg">📝 Recent Actions</p>
          <div className="space-y-2">
            {log.map((entry, i) => (
              <p key={i} className="text-white/90 text-sm bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                {entry}
              </p>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
        .animate-float { animation: float 15s ease-in-out infinite; }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
      `}</style>
    </div>
  );
}
