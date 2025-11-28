import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3000"; // Local testing - change to Railway URL if needed
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
  const [selectedIds, setSelectedIds] = useState([]);
  const [screen, setScreen] = useState("welcome");
  const [name, setName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [showScores, setShowScores] = useState(false);
  const [roundScores, setRoundScores] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    
    newSocket.on("connect", () => {
      console.log("✅ Socket connected:", newSocket.id);
    });

    newSocket.on("game_state", (room) => {
      console.log("🎮 Game state received");
      setPlayers(room.players || []);
      setTurnId(room.turnId);
      setOpenCard(room.discardPile?.[room.discardPile.length - 1] || null);
      setRoomId(room.id);
      
      const mePlayer = room.players?.find(p => p.id === newSocket.id);
      setMe(mePlayer);
      setHand(mePlayer?.hand || []);
      
      if (room.roundScores && Object.keys(room.roundScores).length > 0) {
        setRoundScores(room.roundScores);
        setShowScores(true);
      }
      
      if (room.started === false && room.players?.length > 0) {
        setScreen("lobby");
      } else if (room.started) {
        setScreen("game");
      }
      setLoading(false);
    });

    newSocket.on("room_created", ({ roomId }) => {
      console.log("✅ Room created:", roomId);
      setRoomId(roomId);
      setScreen("lobby");
      setLoading(false);
    });

    newSocket.on("error", (msg) => {
      console.error("❌ Error:", msg);
      alert(msg);
      setLoading(false);
    });

    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  const isMyTurn = me && turnId === me.id;
  const canDraw = isMyTurn;
  const canDrop = isMyTurn && selectedIds.length > 0;
  const canClose = isMyTurn;

  const toggleSelectCard = (cardId) => {
    setSelectedIds(prev => 
      prev.includes(cardId) 
        ? prev.filter(id => id !== cardId)
        : [...prev, cardId]
    );
  };

  const handleDraw = () => {
    socket?.emit("action_draw");
    setSelectedIds([]);
  };

  const handleDrop = () => {
    socket?.emit("action_drop", { selectedIds });
    setSelectedIds([]);
  };

  const handleClose = () => {
    socket?.emit("action_close");
    setSelectedIds([]);
  };

  const handleCreateRoom = () => {
    if (!name.trim() || !socket) {
      alert("Enter name first!");
      return;
    }
    setLoading(true);
    socket.emit("create_room", { name: name.trim() });
  };

  const handleJoinRoom = () => {
    if (!name.trim() || !joinRoomId.trim() || !socket) {
      alert("Enter name & room ID!");
      return;
    }
    setLoading(true);
    socket.emit("join_room", { 
      name: name.trim(), 
      roomId: joinRoomId.trim().toUpperCase() 
    });
  };

  const handleStartGame = () => {
    socket?.emit("start_game");
  };

  const Card = ({ card, isSelected, onClick }) => (
    <div 
      onClick={onClick}
      className={`border-4 rounded-lg p-3 m-2 cursor-pointer hover:scale-105 transition-all shadow-lg flex flex-col justify-between ${
        isSelected 
          ? "border-blue-500 bg-blue-100 ring-4 ring-blue-200" 
          : "border-gray-300 bg-white hover:border-blue-400 hover:shadow-xl"
      } ${cardTextColor(card)} font-bold`}
      style={{ minWidth: 75, height: 100 }}
    >
      <div className="text-2xl">{card.rank}</div>
      <div className="text-sm mt-auto text-center">{card.suit}</div>
    </div>
  );

  // Scores Popup
  if (showScores) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full border-4 border-green-500 animate-pulse">
          <h2 className="text-3xl font-bold text-center text-green-600 mb-8">ROUND SCORES</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {players.map(p => (
              <div key={p.id} className="flex justify-between p-4 bg-gray-50 rounded-lg border-l-4 border-green-400">
                <span className="font-bold text-lg">{p.name}</span>
                <span className="text-2xl font-black text-green-600">{roundScores[p.id] || 0}</span>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setShowScores(false)}
            className="w-full mt-8 p-4 bg-green-600 text-white rounded-lg font-bold text-xl hover:bg-green-700 transition-all shadow-lg"
          >
            CONTINUE → LOBBY
          </button>
        </div>
      </div>
    );
  }

  // Welcome Screen
  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 flex items-center justify-center p-8">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-12 shadow-2xl max-w-md w-full border-4 border-purple-300">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 mb-4">
              CLOSE MASTER
            </h1>
            <p className="text-2xl font-bold text-gray-700 tracking-wide">Power Rummy</p>
          </div>
          
          <div className="space-y-6">
            {loading && (
              <div className="text-center text-yellow-500 font-bold text-xl animate-pulse">
                Creating room...
              </div>
            )}
            
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-5 border-2 border-gray-300 rounded-xl text-xl focus:border-purple-500 focus:outline-none transition-all shadow-lg"
              disabled={loading}
            />
            
            <button 
              onClick={handleCreateRoom} 
              disabled={!name.trim() || loading}
              className="w-full p-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-xl font-bold hover:from-purple-700 hover:to-blue-700 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "⏳ Creating..." : "🎮 CREATE ROOM"}
            </button>
            
            <div className="text-center py-6 text-gray-500 font-bold text-lg">OR JOIN ROOM</div>
            
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="ROOM ID"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                maxLength={4}
                className="flex-1 p-5 border-2 border-gray-300 rounded-xl text-xl uppercase text-center font-mono focus:border-blue-500 focus:outline-none transition-all shadow-lg"
                disabled={loading}
              />
              <button 
                onClick={handleJoinRoom}
                disabled={!name.trim() || joinRoomId.length !== 4 || loading}
                className="w-28 p-5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-lg font-bold hover:from-blue-700 hover:to-cyan-700 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                JOIN
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Lobby Screen
  if (screen === "lobby") {
    const isHost = me?.id === players[0]?.id;
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 flex items-center justify-center p-8">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-12 shadow-2xl max-w-lg w-full border-4 border-purple-300">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Room: <span className="font-mono text-5xl text-purple-600">{roomId}</span>
            </h2>
            <div className="text-3xl font-bold text-gray-700 mb-2">
              {players.length}/{MAX_PLAYERS} Players
            </div>
            <div className="text-lg text-gray-500">Waiting for host to start...</div>
          </div>

          <div className="space-y-4 mb-12 max-h-80 overflow-y-auto">
            {players.map((p, i) => (
              <div key={p.id} className={`p-6 rounded-2xl border-2 flex items-center space-x-4 hover:shadow-xl transition-all ${
                p.id === me?.id 
                  ? "border-green-400 bg-green-50 ring-2 ring-green-200" 
                  : "border-gray-200 bg-gray-50"
              }`}>
                <div className={`w-4 h-4 rounded-full ${p.id === me?.id ? "bg-green-500" : "bg-gray-400"}`}></div>
                <span className={`font-bold text-lg flex-1 ${p.id === me?.id ? "text-green-700" : "text-gray-700"}`}>
                  {p.name}
                </span>
                {p.id === players[0]?.id && (
                  <span className="px-4 py-2 bg-purple-200 text-purple-800 rounded-full text-sm font-bold ml-auto">
                    👑 HOST
                  </span>
                )}
              </div>
            ))}
          </div>

          {isHost && players.length >= 2 && (
            <button
              onClick={handleStartGame}
              className="w-full p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl text-2xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-2xl hover:shadow-green-500 transform hover:scale-105"
            >
              🚀 START GAME ({players.length} players)
            </button>
          )}
        </div>
      </div>
    );
  }

  // Game Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center text-white p-6 bg-black/40 backdrop-blur-xl rounded-2xl border border-purple-500">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Close Master - Room {roomId}
          </h1>
          <div className={`inline-flex px-8 py-4 rounded-full text-xl font-bold shadow-lg ${
            isMyTurn 
              ? "bg-green-500 text-black border-4 border-green-400 animate-pulse" 
              : "bg-gray-700 border-2 border-gray-500"
          }`}>
            Turn: {players.find(p => p.id === turnId)?.name || "—"} 
            {isMyTurn && " ← YOUR TURN!"}
          </div>
        </div>

        {/* Open Card */}
        <div className="flex justify-center">
          <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-8 border-4 border-purple-400 shadow-2xl">
            <p className="text-white text-xl font-bold mb-6 text-center tracking-wide">🂱 OPEN CARD</p>
            {openCard ? (
              <Card card={openCard} isSelected={false} onClick={() => {}} />
            ) : (
              <div className="w-32 h-40 bg-gray-700 rounded-xl border-4 border-gray-500 flex items-center justify-center text-gray-400 font-bold text-lg animate-pulse">
                No Card
              </div>
            )}
          </div>
        </div>

        {/* Your Hand */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border-4 border-green-400 shadow-2xl">
          <p className="text-green-300 text-2xl font-bold mb-8 text-center tracking-wide">
            YOUR HAND ({hand.length} cards) {me?.score && `| Score: ${me.score}`}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
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
        <div className="flex flex-wrap gap-6 justify-center p-10 bg-black/30 backdrop-blur-xl rounded-2xl border-4 border-purple-400 shadow-2xl">
          <button
            onClick={handleDraw}
            disabled={!canDraw}
            className={`px-12 py-6 rounded-2xl text-2xl font-bold shadow-2xl transform transition-all duration-300 hover:scale-105 ${
              canDraw
                ? "bg-green-600 text-white hover:bg-green-700 border-4 border-green-500 shadow-green-500" 
                : "bg-gray-600 text-gray-400 border-2 border-gray-500 cursor-not-allowed"
            }`}
          >
            📥 DRAW
          </button>
          
          <button
            onClick={handleDrop}
            disabled={!canDrop}
            className={`px-12 py-6 rounded-2xl text-2xl font-bold shadow-2xl transform transition-all duration-300 hover:scale-105 ${
              canDrop
                ? "bg-blue-600 text-white hover:bg-blue-700 border-4 border-blue-500 shadow-blue-500" 
                : "bg-gray-600 text-gray-400 border-2 border-gray-500 cursor-not-allowed"
            }`}
          >
            🂠 DROP ({selectedIds.length})
          </button>
          
          <button
            onClick={handleClose}
            disabled={!canClose}
            className={`px-12 py-6 rounded-2xl text-2xl font-bold shadow-2xl transform transition-all duration-300 hover:scale-105 ${
              canClose
                ? "bg-red-600 text-white hover:bg-red-700 border-4 border-red-500 shadow-red-500 animate-pulse" 
                : "bg-gray-600 text-gray-400 border-2 border-gray-500 cursor-not-allowed"
            }`}
          >
            ✅ CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
