import React, { useEffect, useState } from "react";
import { io } from "socket.io-client";

const SERVER_URL = "http://localhost:3000";
const MAX_PLAYERS = 7;

function cardTextColor(card) {
  if (!card) return "text-black";
  if (card.suit === "♥" || card.suit === "♦") return "text-red-600";
  return "text-black";
}

export default function CloseMasterGame() {
  const [socket, setSocket] = useState(null);
  const [screen, setScreen] = useState("welcome");
  const [roomId, setRoomId] = useState("");
  const [players, setPlayers] = useState([]);
  const [me, setMe] = useState(null);
  const [hand, setHand] = useState([]);
  const [openCard, setOpenCard] = useState(null);
  const [turnId, setTurnId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showScores, setShowScores] = useState(false);
  const [roundScores, setRoundScores] = useState({});
  const [name, setName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    
    newSocket.on("connect", () => console.log("✅ Connected"));
    
    newSocket.on("game_state", (room) => {
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
      
      if (!room.started && room.players?.length > 0) {
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
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handleCreateRoom = () => {
    if (!name.trim()) return alert("Enter name!");
    setLoading(true);
    socket?.emit("create_room", { name: name.trim() });
  };

  const handleJoinRoom = () => {
    if (!name.trim() || !joinRoomId.trim()) return alert("Name & Room ID!");
    setLoading(true);
    socket?.emit("join_room", { name: name.trim(), roomId: joinRoomId.trim().toUpperCase() });
  };

  const handleStartGame = () => socket?.emit("start_game");
  const handleDraw = () => { socket?.emit("action_draw"); setSelectedIds([]); };
  const handleDrop = () => { socket?.emit("action_drop", { selectedIds }); setSelectedIds([]); };
  const handleClose = () => socket?.emit("action_close");

  const Card = ({ card, isSelected, onClick }) => (
    <div onClick={onClick} className={`border-4 rounded-lg p-3 m-2 cursor-pointer hover:scale-105 transition-all ${isSelected ? "border-blue-500 bg-blue-100" : "border-gray-300 bg-white hover:border-blue-400"} ${cardTextColor(card)} font-bold`} style={{minWidth: 75, height: 100}}>
      <div className="text-2xl">{card.rank}</div>
      <div className="text-sm mt-auto text-center">{card.suit}</div>
    </div>
  );

  if (showScores) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-8">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border-4 border-green-500">
          <h2 className="text-3xl font-bold text-center text-green-600 mb-8">SCORES</h2>
          {players.map(p => (
            <div key={p.id} className="flex justify-between p-4 bg-gray-50 rounded-lg mb-2">
              <span className="font-bold">{p.name}</span>
              <span className="text-2xl font-black text-green-600">{roundScores[p.id] || 0}</span>
            </div>
          ))}
          <button onClick={() => setShowScores(false)} className="w-full mt-8 p-4 bg-green-600 text-white rounded-xl font-bold text-xl hover:bg-green-700">CONTINUE</button>
        </div>
      </div>
    );
  }

  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-12 shadow-2xl max-w-md w-full border-4 border-purple-300">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">CLOSE MASTER</h1>
            <p className="text-2xl font-bold text-gray-600">Power Rummy</p>
          </div>
          <div className="space-y-6">
            {loading && <div className="text-center text-yellow-500 font-bold text-xl animate-pulse">Creating room...</div>}
            <input type="text" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} className="w-full p-4 border-2 border-gray-300 rounded-xl text-xl focus:border-purple-500" />
            <button onClick={handleCreateRoom} disabled={!name.trim() || loading} className="w-full p-4 bg-purple-600 text-white rounded-xl text-xl font-bold hover:bg-purple-700 disabled:opacity-50">
              {loading ? "⏳ Creating..." : "🎮 CREATE ROOM"}
            </button>
            <div className="text-center py-6 text-gray-500 font-bold">OR JOIN</div>
            <div className="flex gap-3">
              <input type="text" placeholder="ROOM ID" value={joinRoomId} onChange={e => setJoinRoomId(e.target.value.toUpperCase())} maxLength={4} className="flex-1 p-4 border-2 border-gray-300 rounded-xl text-xl uppercase text-center" />
              <button onClick={handleJoinRoom} disabled={!name.trim() || joinRoomId.length !== 4 || loading} className="w-28 p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50">JOIN</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (screen === "lobby") {
    const isHost = me?.id === players[0]?.id;
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-purple-900 flex items-center justify-center p-8">
        <div className="bg-white rounded-3xl p-12 shadow-2xl max-w-lg w-full border-4 border-purple-300">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">Room: <span className="font-mono text-5xl text-purple-600">{roomId}</span></h2>
            <div className="text-3xl font-bold text-gray-700">{players.length}/{MAX_PLAYERS} Players</div>
          </div>
          <div className="space-y-4 mb-12 max-h-80 overflow-y-auto">
            {players.map(p => (
              <div key={p.id} className={`p-6 rounded-2xl border-2 flex items-center space-x-4 ${p.id === me?.id ? "border-green-400 bg-green-50" : "border-gray-200 bg-gray-50"}`}>
                <div className={`w-4 h-4 rounded-full ${p.id === me?.id ? "bg-green-500" : "bg-gray-400"}`}></div>
                <span className={`font-bold text-lg ${p.id === me?.id ? "text-green-700" : "text-gray-700"}`}>{p.name}</span>
                {p.id === players[0]?.id && <span className="ml-auto px-3 py-1 bg-purple-200 text-purple-800 rounded-full text-sm font-bold">HOST</span>}
              </div>
            ))}
          </div>
          {isHost && players.length >= 2 && (
            <button onClick={handleStartGame} className="w-full p-6 bg-green-600 text-white rounded-2xl text-2xl font-bold hover:bg-green-700">START GAME</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center text-white p-6 bg-gray-800 rounded-2xl">
          <h1 className="text-4xl font-bold mb-4">Close Master - {roomId}</h1>
          <div className={`inline-flex px-8 py-4 rounded-full text-xl font-bold ${isMyTurn ? "bg-green-500 text-black" : "bg-gray-600"}`}>
            Turn: {players.find(p => p.id === turnId)?.name || "—"} {isMyTurn && "← YOU"}
          </div>
        </div>

        <div className="flex justify-center">
          <div className="bg-gray-800 rounded-2xl p-8 border-4 border-purple-500">
            <p className="text-white text-xl font-bold mb-6 text-center">OPEN CARD</p>
            {openCard ? <Card card={openCard} isSelected={false} onClick={() => {}} /> : (
              <div className="w-32 h-40 bg-gray-700 rounded-xl border-4 border-gray-500 flex items-center justify-center text-gray-400 font-bold">No Card</div>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 border-4 border-green-500">
          <p className="text-green-400 text-2xl font-bold mb-8 text-center">YOUR HAND ({hand.length})</p>
          <div className="flex flex-wrap justify-center gap-4">
            {hand.map(card => (
              <Card key={card.id} card={card} isSelected={selectedIds.includes(card.id)} onClick={() => toggleSelectCard(card.id)} />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-4 justify-center p-8 bg-gray-800 rounded-2xl border-4 border-purple-500">
          <button onClick={handleDraw} disabled={!canDraw} className={`px-8 py-4 rounded-xl text-xl font-bold ${canDraw ? "bg-green-600 text-white hover:bg-green-700" : "bg-gray-600 text-gray-400"}`}>DRAW</button>
          <button onClick={handleDrop} disabled={!canDrop} className={`px-8 py-4 rounded-xl text-xl font-bold ${canDrop ? "bg-blue-600 text-white hover:bg-blue-700" : "bg-gray-600 text-gray-400"}`}>DROP ({selectedIds.length})</button>
          <button onClick={handleClose} disabled={!canClose} className={`px-8 py-4 rounded-xl text-xl font-bold ${canClose ? "bg-red-600 text-white hover:bg-red-700" : "bg-gray-600 text-gray-400"}`}>CLOSE</button>
        </div>
      </div>
    </div>
  );
}
