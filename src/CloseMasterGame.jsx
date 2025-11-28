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
  const [showScores, setShowScores] = useState(false);
  const [roundScores, setRoundScores] = useState({});

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
      setLog(room.log.slice(-6));
      setRoomId(room.id);
      
      const mePlayer = room.players.find(p => p.id === newSocket.id);
      setMe(mePlayer);
      setHand(mePlayer?.hand || []);
      
      if (room.roundScores && Object.keys(room.roundScores).length > 0) {
        setRoundScores(room.roundScores);
        setShowScores(true);
        setTimeout(() => setShowScores(false), 4000);
      }
      
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
  const selectedCards = hand.filter(c => selectedIds.includes(c.id));
  const hasOpenCardMatch = openCard && selectedCards.some(c => c.rank === openCard.rank);
  const canDropWithoutDraw = hasOpenCardMatch || selectedCards.length >= 3;
  const canDrop = isMyTurn && (me?.hasDrawn || canDropWithoutDraw) && selectedIds.length > 0;
  const canClose = isMyTurn && !me?.hasDrawn;

  function toggleSelectCard(cardId) {
    setSelectedIds(prev => 
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
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
    if (name.trim() && socket) socket.emit("create_room", { name: name.trim() });
  }

  function handleJoinRoom() {
    if (name.trim() && joinRoomId.trim() && socket) {
      socket.emit("join_room", { name: name.trim(), roomId: joinRoomId.trim().toUpperCase() });
    }
  }

  function Card({ card, isSelected, onClick }) {
    return (
      <div onClick={onClick} className={`border-4 rounded-lg p-3 m-2 cursor-pointer hover:scale-105 transition-all ${
        isSelected ? "border-blue-500 bg-blue-100" : "border-gray-300 bg-white"
      } hover:shadow-lg ${cardTextColor(card)} font-bold`} style={{minWidth: 70, height: 95}}>
        <div className="text-2xl">{card.rank}</div>
        <div className="text-sm">{card.suit}</div>
      </div>
    );
  }

  if (showScores) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center p-8">
        <div className="bg-white rounded-2xl p-8 shadow-2xl max-w-md w-full border-4 border-green-500 animate-pulse">
          <h2 className="text-3xl font-bold text-center text-green-600 mb-8">ROUND SCORES</h2>
          <div className="space-y-4">
            {players.map(p => (
              <div key={p.id} className="flex justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-bold">{p.name}</span>
                <span className="text-2xl font-black text-green-600">{roundScores[p.id] || 0}</span>
              </div>
            ))}
          </div>
          <button 
            onClick={() => setShowScores(false)}
            className="w-full mt-8 p-4 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all"
          >
            CONTINUE
          </button>
        </div>
      </div>
    );
  }

  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-12 shadow-2xl max-w-md w-full border border-purple-300">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 mb-4">
              CLOSE MASTER
            </h1>
            <p className="text-2xl font-bold text-gray-700">Power Rummy</p>
          </div>
          
          <div className="space-y-6">
            <input
              type="text"
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-4 border-2 border-gray-300 rounded-xl text-xl focus:border-purple-500 focus:outline-none transition-all"
            />
            <button 
              onClick={handleCreateRoom} 
              disabled={!name.trim()}
              className="w-full p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl text-xl font-bold hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50"
            >
              🎮 Create Room
            </button>
            
            <div className="text-center py-4 text-gray-500 font-bold">OR</div>
            
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Room ID"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                maxLength={4}
                className="flex-1 p-4 border-2 border-gray-300 rounded-xl text-xl uppercase text-center focus:border-blue-500 focus:outline-none transition-all"
              />
              <button 
                onClick={handleJoinRoom}
                disabled={!name.trim() || joinRoomId.length !== 4}
                className="w-28 p-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl text-lg font-bold hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50"
              >
                Join
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "lobby") {
    const isHost = me?.id === players[0]?.id;
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 p-8 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-12 shadow-2xl max-w-lg w-full border border-purple-300">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Room: <span className="font-mono text-5xl text-purple-600">{roomId}</span></h2>
            <div className="text-3xl font-bold text-gray-700">{players.length}/{MAX_PLAYERS} Players</div>
          </div>

          <div className="space-y-4 mb-12 max-h-80 overflow-y-auto">
            {players.map((p) => (
              <div key={p.id} className={`p-6 rounded-2xl border-2 flex items-center space-x-4 ${
                p.id === me?.id ? "border-green-400 bg-green-50" : "border-gray-200 bg-gray-50"
              } hover:shadow-lg transition-all`}>
                <div className={`w-4 h-4 rounded-full ${p.id === me?.id ? "bg-green-500" : "bg-gray-400"}`}></div>
                <span className={`font-bold ${p.id === me?.id ? "text-green-700" : "text-gray-700"}`}>
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
              className="w-full p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-2xl text-2xl font-bold hover:from-green-700 hover:to-emerald-700 transition-all shadow-xl"
            >
              🚀 START GAME ({players.length} players)
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center text-white p-6 bg-black/30 rounded-2xl backdrop-blur-sm">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Close Master - {roomId}
          </h1>
          <div className={`inline-flex px-6 py-3 rounded-full text-xl font-bold ${
            isMyTurn ? "bg-green-500 text-black" : "bg-gray-700"
          }`}>
            Turn: {players.find(p => p.id === turnId)?.name || "—"} {isMyTurn && "← YOU"}
          </div>
        </div>

        {/* Open Card */}
        <div className="flex justify-center">
          <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-8 border-2 border-purple-500 shadow-2xl">
            <p className="text-white text-xl font-bold mb-6 text-center">OPEN CARD</p>
            {openCard ? (
              <Card card={openCard} isSelected={false} onClick={() => {}} />
            ) : (
              <div className="w-28 h-36 bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 font-bold">
                No Card
              </div>
            )}
          </div>
        </div>

        {/* Your Hand */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border-2 border-green-500">
          <p className="text-green-400 text-2xl font-bold mb-6 text-center">
            YOUR HAND ({hand.length} cards) {me?.score && `| Score: ${me.score}`}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
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

        {/* Buttons */}
        <div className="flex flex-wrap gap-4 justify-center p-8 bg-black/20 backdrop-blur-xl rounded-2xl border-2 border-purple-500">
          <button
            onClick={handleDraw}
            disabled={!canDraw}
            className={`px-8 py-4 rounded-xl text-xl font-bold transition-all ${
              canDraw 
                ? "bg-green-600 text-white hover:bg-green-700 shadow-lg" 
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
          >
            DRAW
          </button>
          
          <button
            onClick={handleDrop}
            disabled={!canDrop}
            className={`px-8 py-4 rounded-xl text-xl font-bold transition-all ${
              canDrop 
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg" 
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
          >
            DROP ({selectedIds.length})
          </button>
          
          <button
            onClick={handleClose}
            disabled={!canClose}
            className={`px-8 py-4 rounded-xl text-xl font-bold transition-all ${
              canClose 
                ? "bg-red-600 text-white hover:bg-red-700 shadow-lg" 
                : "bg-gray-600 text-gray-400 cursor-not-allowed"
            }`}
          >
            CLOSE
          </button>
        </div>

        {/* Log */}
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-700 max-h-48 overflow-y-auto">
          <p className="text-white font-bold mb-4">Game Log:</p>
          {log.map((entry, i) => (
            <p key={i} className="text-white/90 text-sm mb-2">{entry}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
