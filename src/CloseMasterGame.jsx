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
  const [screen, setScreen] = useState("welcome"); // welcome, lobby, game
  const [log, setLog] = useState([]);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on("game_state", (room) => {
      setPlayers(room.players);
      setTurnId(room.turnId);
      setOpenCard(room.discardPile.length > 0 ? room.discardPile[room.discardPile.length - 1] : null);
      setPendingDraw(room.pendingDraw);
      setPendingSkips(room.pendingSkips);
      setHasSpecialCardThisRound(room.hasSpecialCardThisRound || false);
      setLog(room.log);
      setRoomId(room.id);
      const mePlayer = room.players.find((p) => p.id === newSocket.id);
      setMe(mePlayer || null);
      setHand(mePlayer ? mePlayer.hand : []);
      if (room.started) {
        setScreen("game");
      } else if (room.players.length > 0) {
        setScreen("lobby");
      } else {
        setScreen("welcome");
      }
    });

    newSocket.on("room_created", ({ roomId }) => {
      setRoomId(roomId);
    });

    newSocket.on("error", (msg) => {
      alert(msg);
    });

    return () => newSocket.close();
  }, []);

  const isMyTurn = me && turnId === me.id;

  // Button enable/disable logic
  const canDraw = isMyTurn && pendingDraw > 0;
  const canDrop =
    isMyTurn &&
    !canDraw &&
    pendingSkips === 0 &&
    (!hasSpecialCardThisRound || pendingDraw === 0) &&
    selectedIds.length > 0;
  const canClose = isMyTurn && pendingDraw === 0 && pendingSkips === 0 && !hasSpecialCardThisRound;

  // Handle card selection toggle
  function toggleSelectCard(cardId) {
    if (selectedIds.includes(cardId)) {
      setSelectedIds(selectedIds.filter(id => id !== cardId));
    } else {
      setSelectedIds([...selectedIds, cardId]);
    }
  }

  // Send draw action
  function handleDraw() {
    if (socket) {
      socket.emit("action_draw");
      setSelectedIds([]);
    }
  }

  // Send drop action
  function handleDrop() {
    if (socket && canDrop) {
      socket.emit("action_drop", { selectedIds });
      setSelectedIds([]);
    }
  }

  // Send close action
  function handleClose() {
    if (socket && canClose) {
      socket.emit("action_close");
      setSelectedIds([]);
    }
  }

  // Join room or create new
  const [name, setName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");

  function handleCreateRoom() {
    if (socket && name) {
      socket.emit("create_room", { name });
    }
  }

  function handleJoinRoom() {
    if (socket && name && joinRoomId.trim() !== "") {
      socket.emit("join_room", { name, roomId: joinRoomId.trim().toUpperCase() });
    }
  }

  // Utility: Render a single card component
  function Card({ card }) {
    return (
      <div
        onClick={() => toggleSelectCard(card.id)}
        className={`border-2 rounded-md p-2 m-1 cursor-pointer select-none ${cardTextColor(card)} ${
          selectedIds.includes(card.id) ? "border-blue-600 bg-blue-100" : "border-gray-300 bg-white"
        }`}
        style={{ width: 60, textAlign: "center" }}
      >
        {card.rank}{card.suit}
      </div>
    );
  }

  if (screen === "welcome") {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <h1 className="text-2xl font-bold text-center mb-4">Close Master Game</h1>
        <input
          type="text"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button onClick={handleCreateRoom} disabled={!name} className="w-full p-2 bg-blue-600 text-white rounded">
          Create Room
        </button>
        <input
          type="text"
          placeholder="Room ID"
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <button
          onClick={handleJoinRoom}
          disabled={!name || joinRoomId.trim().length !== 4}
          className="w-full p-2 bg-green-600 text-white rounded"
        >
          Join Room
        </button>
      </div>
    );
  }

  if (screen === "lobby") {
    return (
      <div className="p-4 max-w-md mx-auto space-y-4">
        <h1 className="text-xl font-bold text-center mb-2">Lobby - Room: {roomId}</h1>
        <p>Players Joined: {players.length}</p>
        <ul>
          {players.map((p) => (
            <li key={p.id} className={p.id === me?.id ? "font-bold" : ""}>
              {p.name} {p.id === roomId?.hostId ? "(Host)" : ""}
            </li>
          ))}
        </ul>
        {me && me.id === players[0].id && (
          <button
            onClick={() => socket.emit("start_game")}
            disabled={players.length < 2}
            className="w-full p-2 bg-purple-600 text-white rounded"
          >
            Start Game
          </button>
        )}
      </div>
    );
  }

  if (screen === "game") {
    return (
      <div className="p-4 max-w-lg mx-auto space-y-2">
        <h1 className="text-lg font-bold text-center">Room: {roomId}</h1>
        <p className="text-center mb-2">Turn: {players.find(p => p.id === turnId)?.name || "Unknown"}</p>

        <div className="flex justify-center mb-4">
          <div className="border-2 border-gray-600 rounded-lg p-2">
            <p className="text-center mb-2 font-semibold">Open Card</p>
            {openCard ? <Card card={openCard} /> : <p>No open card</p>}
          </div>
        </div>

        <div className="mb-4">
          <p className="font-semibold">Your Hand ({hand.length})</p>
          <div className="flex flex-wrap">
            {hand.map((card) => (
              <Card key={card.id} card={card} />
            ))}
          </div>
        </div>

        <div className="flex space-x-2 justify-center mb-4">
          <button
            onClick={handleDraw}
            disabled={!canDraw}
            className={`${canDraw ? "bg-green-600" : "bg-gray-400"} text-white rounded px-4 py-2`}
          >
            DRAW
          </button>
          <button
            onClick={handleDrop}
            disabled={!canDrop}
            className={`${canDrop ? "bg-blue-600" : "bg-gray-400"} text-white rounded px-4 py-2`}
          >
            DROP ({selectedIds.length})
          </button>
          <button
            onClick={handleClose}
            disabled={!canClose}
            className={`${canClose ? "bg-red-600" : "bg-gray-400"} text-white rounded px-4 py-2`}
          >
            CLOSE
          </button>
        </div>

        <div className="p-2 h-24 overflow-auto bg-gray-100 rounded border border-gray-300">
          <p className="font-semibold mb-1">Game Log:</p>
          {log.map((entry, i) => (
            <p key={i} className="text-sm">{entry}</p>
          ))}
        </div>
      </div>
    );
  }

  return <div>Loading...</div>;
}
