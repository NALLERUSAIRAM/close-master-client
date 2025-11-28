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
  // ... (same state variables as before)

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

  // ... (same useEffect, handlers as before)

  const isMyTurn = me && turnId === me.id;
  const canDraw = isMyTurn && !me?.hasDrawn;
  const canDrop = isMyTurn && me?.hasDrawn && selectedIds.length > 0;
  const canClose = isMyTurn && !me?.hasDrawn;

  // ... (same functions: toggleSelectCard, handleDraw, handleDrop, handleClose, handleCreateRoom, handleJoinRoom)

  function Card({ card, isSelected, onClick }) {
    return (
      <div
        onClick={onClick}
        className={`relative border-4 rounded-xl p-3 m-2 cursor-pointer neon-glow transform transition-all duration-300 hover:scale-110 hover:rotate-3 shadow-2xl ${
          isSelected 
            ? "border-blue-400 bg-blue-500/20 neon-blue" 
            : "border-white/50 bg-white/10 neon-card"
        } ${cardTextColor(card)} font-bold text-xl backdrop-blur-sm`}
        style={{ minWidth: 75, height: 105 }}
      >
        <div className="absolute top-1 left-1 text-xs opacity-75">{card.suit}</div>
        <div className="text-3xl drop-shadow-lg">{card.rank}</div>
        <div className="absolute bottom-1 right-1 text-xs opacity-75">{card.suit}</div>
      </div>
    );
  }

  if (screen === "welcome") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black relative overflow-hidden">
        {/* NEON FLYING CARDS BACKGROUND */}
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="neon-card-float absolute text-4xl opacity-20"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.3}s`,
                animationDuration: `${8 + Math.random() * 4}s`
              }}
            >
              🂠
            </div>
          ))}
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="bg-black/40 backdrop-blur-3xl rounded-3xl p-10 shadow-2xl max-w-md w-full border-4 border-neon-purple animate-neon-pulse">
            <div className="text-center mb-10">
              <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-neon-purple via-neon-blue to-neon-cyan bg-clip-text text-transparent mb-4 drop-shadow-2xl">
                CLOSE MASTER
              </h1>
              <div className="w-32 h-1 bg-gradient-to-r from-neon-purple to-neon-cyan mx-auto rounded-full animate-neon-line"></div>
              <p className="text-neon-cyan text-xl font-bold mt-4 tracking-wider drop-shadow-lg">POWER RUMMY</p>
            </div>
            
            <div className="space-y-6">
              <input
                type="text"
                placeholder="Enter Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-5 bg-black/50 border-2 border-neon-purple rounded-2xl text-lg text-white placeholder-neon-gray focus:border-neon-cyan focus:outline-none transition-all duration-300 text-center font-mono tracking-wider"
              />
              
              <button 
                onClick={handleCreateRoom} 
                disabled={!name.trim()}
                className="w-full p-5 bg-gradient-to-r from-neon-purple to-neon-blue text-white rounded-2xl text-xl font-black neon-glow-btn hover:from-neon-cyan hover:to-neon-purple transform hover:scale-105 transition-all duration-300 disabled:opacity-30 shadow-2xl"
              >
                🎮 CREATE ROOM
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-neon-purple to-neon-cyan blur opacity-30 animate-pulse"></div>
                <div className="text-center py-6 text-neon-gray font-bold relative z-10">OR JOIN</div>
              </div>
              
              <input
                type="text"
                placeholder="ROOM ID"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                maxLength={4}
                className="w-full p-5 bg-black/50 border-2 border-neon-cyan rounded-2xl text-2xl uppercase text-center font-mono tracking-widest text-neon-cyan focus:border-neon-purple focus:outline-none transition-all duration-300"
              />
              <button 
                onClick={handleJoinRoom}
                disabled={!name.trim() || joinRoomId.length !== 4}
                className="w-full p-5 bg-gradient-to-r from-neon-cyan to-neon-green text-black rounded-2xl text-xl font-black neon-glow-btn hover:from-neon-blue hover:to-neon-purple transform hover:scale-105 transition-all duration-300 disabled:opacity-30 shadow-2xl font-mono tracking-wider"
              >
                🚪 JOIN ROOM
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
      <div className="min-h-screen bg-gradient-to-br from-black via-purple-900 to-black relative overflow-hidden">
        {/* MOVING NEON LINES */}
        <div className="fixed inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-gradient-to-r from-neon-purple to-neon-cyan w-full h-1 animate-neon-line-diagonal"
              style={{
                top: `${20 + i * 12}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${10 + i * 2}s`
              }}
            ></div>
          ))}
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
          <div className="bg-black/50 backdrop-blur-3xl rounded-3xl p-10 shadow-2xl max-w-lg w-full border-4 border-neon-purple animate-neon-pulse">
            <div className="text-center mb-10">
              <h2 className="text-4xl font-black bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent mb-4">
                ROOM LOBBY
              </h2>
              <div className="text-5xl font-mono tracking-widest text-neon-green mb-4 drop-shadow-2xl">
                {roomId}
              </div>
              <div className="text-3xl text-neon-yellow drop-shadow-lg">
                {players.length}/{MAX_PLAYERS} Players
              </div>
            </div>

            <div className="space-y-4 mb-10 max-h-64 overflow-y-auto">
              {players.map((p, i) => (
                <div key={p.id} className={`p-6 rounded-2xl border-3 flex items-center space-x-4 transform hover:scale-105 transition-all duration-300 ${
                  p.id === me?.id 
                    ? "border-neon-green bg-neon-green/10 neon-glow-green" 
                    : "border-neon-blue/50 bg-white/5 neon-glow-blue"
                }`}>
                  <div className={`w-4 h-4 rounded-full ${p.id === me?.id ? "bg-neon-green" : "bg-neon-blue"} animate-ping`}></div>
                  <span className="text-xl font-bold text-neon-white drop-shadow-lg flex-1">
                    {p.name}
                  </span>
                  {p.id === players[0]?.id && (
                    <div className="px-4 py-2 bg-neon-purple/30 text-neon-purple rounded-full text-sm font-bold border border-neon-purple animate-pulse">
                      👑 HOST
                    </div>
                  )}
                  <div className="w-8 h-8 bg-gradient-to-r from-neon-purple to-neon-cyan rounded-full animate-spin-slow"></div>
                </div>
              ))}
            </div>

            {isHost && players.length >= 2 && (
              <button
                onClick={() => socket.emit("start_game")}
                className="w-full p-6 bg-gradient-to-r from-neon-green via-neon-cyan to-neon-blue text-black rounded-3xl text-2xl font-black neon-glow-btn shadow-2xl hover:from-neon-purple hover:to-neon-green transform hover:scale-110 transition-all duration-500 animate-pulse-once"
              >
                🚀 START GAME
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // GAME SCREEN WITH NEON NATURE
  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-indigo-900 to-purple-900 relative overflow-hidden">
      {/* NEON NATURE BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Flying cards */}
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="neon-card-float absolute text-3xl opacity-10"
            style={{
              left: `${10 + i * 12}%`,
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${12 + Math.random() * 6}s`
            }}
          >
            🂡
          </div>
        ))}
        {/* Neon particles */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-neon-cyan rounded-full animate-neon-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 0.1}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-6xl mx-auto space-y-8 p-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-neon-purple via-neon-cyan to-neon-green bg-clip-text text-transparent mb-4 drop-shadow-2xl">
            CLOSE MASTER
          </h1>
          <div className="text-2xl font-mono text-neon-yellow drop-shadow-lg">
            Room: <span className="text-neon-cyan tracking-widest">{roomId}</span>
          </div>
          <div className={`inline-flex px-6 py-3 rounded-full text-xl font-bold mt-4 border-2 ${
            isMyTurn 
              ? "border-neon-green bg-neon-green/20 neon-glow-green animate-pulse" 
              : "border-neon-blue/50 bg-black/30"
          }`}>
            {players.find(p => p.id === turnId)?.name || "—"} {isMyTurn && "← YOUR TURN"}
          </div>
        </div>

        {/* Open Card */}
        <div className="flex justify-center">
          <div className="bg-black/40 backdrop-blur-3xl rounded-3xl p-8 border-4 border-neon-purple/50 shadow-2xl neon-glow">
            <p className="text-neon-cyan text-2xl font-black mb-6 text-center tracking-wider drop-shadow-lg">🂱 OPEN CARD</p>
            {openCard ? (
              <Card card={openCard} isSelected={false} onClick={() => {}} />
            ) : (
              <div className="w-32 h-44 bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border-4 border-neon-blue/50 flex items-center justify-center text-neon-gray font-bold text-xl animate-pulse">
                NO CARD
              </div>
            )}
          </div>
        </div>

        {/* Your Hand */}
        <div className="bg-black/30 backdrop-blur-3xl rounded-3xl p-8 border-4 border-neon-green/30 shadow-2xl">
          <p className="text-neon-green text-3xl font-black mb-8 text-center tracking-widest drop-shadow-2xl">
            YOUR HAND ({hand.length}) {me?.score && <span className="text-neon-yellow text-xl">| {me.score} PTS</span>}
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

        {/* ACTION BUTTONS */}
        <div className="flex flex-col lg:flex-row gap-6 justify-center items-center p-8 bg-black/40 backdrop-blur-3xl rounded-3xl border-4 border-neon-purple/20 shadow-2xl">
          <button
            onClick={handleDraw}
            disabled={!canDraw}
            className={`px-12 py-6 rounded-3xl text-2xl font-black shadow-2xl transform transition-all duration-300 group ${
              canDraw
                ? "bg-gradient-to-r from-neon-green to-neon-cyan text-black neon-glow-green hover:from-neon-purple hover:to-neon-blue hover:scale-110 shadow-neon-green"
                : "bg-gray-800/50 text-neon-gray border-2 border-neon-gray/50 cursor-not-allowed"
            }`}
          >
            📥 DRAW
            {canDraw && <div className="absolute inset-0 bg-gradient-to-r from-neon-green to-neon-cyan rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur animate-pulse"></div>}
          </button>
          
          <button
            onClick={handleDrop}
            disabled={!canDrop}
            className={`px-12 py-6 rounded-3xl text-2xl font-black shadow-2xl transform transition-all duration-300 group relative overflow-hidden ${
              canDrop
                ? "bg-gradient-to-r from-neon-blue to-neon-purple text-white neon-glow-blue hover:from-neon-cyan hover:to-neon-green hover:scale-110 shadow-neon-blue"
                : "bg-gray-800/50 text-neon-gray border-2 border-neon-gray/50 cursor-not-allowed"
            }`}
          >
            🂠 DROP ({selectedIds.length})
          </button>
          
          <button
            onClick={handleClose}
            disabled={!canClose}
            className={`px-12 py-6 rounded-3xl text-2xl font-black shadow-2xl transform transition-all duration-300 group ${
              canClose
                ? "bg-gradient-to-r from-neon-red to-neon-pink text-white neon-glow-red hover:from-neon-purple hover:to-neon-orange hover:scale-110 shadow-neon-red animate-pulse"
                : "bg-gray-800/50 text-neon-gray border-2 border-neon-gray/50 cursor-not-allowed"
            }`}
          >
            ✅ CLOSE
          </button>
        </div>

        {/* GAME LOG */}
        <div className="bg-black/40 backdrop-blur-3xl rounded-3xl p-8 border-4 border-neon-cyan/30 shadow-2xl max-h-60 overflow-y-auto">
          <p className="text-neon-cyan text-2xl font-black mb-6 text-center tracking-widest drop-shadow-2xl">📝 GAME LOG</p>
          <div className="space-y-3">
            {log.map((entry, i) => (
              <div key={i} className="p-4 bg-neon-purple/10 border-l-4 border-neon-green rounded-2xl backdrop-blur-sm text-neon-white text-lg animate-slide-in">
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes neon-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.5); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 1); }
        }
        @keyframes neon-glow {
          0%, 100% { filter: drop-shadow(0 0 10px currentColor); }
          50% { filter: drop-shadow(0 0 30px currentColor); }
        }
        @keyframes neon-card-float {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 0.3; }
          90% { opacity: 0.3; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }
        @keyframes neon-line-diagonal {
          0% { transform: translateX(-100vw) skewX(-45deg); }
          100% { transform: translateX(100vw) skewX(-45deg); }
        }
        @keyframes neon-particle {
          0%, 100% { transform: scale(0) translateY(0); opacity: 0; }
          50% { transform: scale(1) translateY(-20px); opacity: 1; }
        }
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes animate-pulse-once {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .neon-glow, .neon-glow-btn, .neon-glow-green, .neon-glow-blue, .neon-glow-red {
          animation: neon-glow 2s ease-in-out infinite alternate;
        }
        .neon-card-float { animation: neon-card-float linear infinite; }
        .neon-line-diagonal { animation: neon-line-diagonal linear infinite; }
        .neon-glow-green { filter: drop-shadow(0 0 20px #10b981); }
        .neon-glow-blue { filter: drop-shadow(0 0 20px #3b82f6); }
        .neon-glow-red { filter: drop-shadow(0 0 20px #ef4444); }
        .animate-neon-pulse { animation: neon-pulse 2s infinite; }
        .animate-neon-line { background-size: 200% 100%; animation: neon-pulse 3s ease-in-out infinite; }
        .animate-ping { animation: ping 1s cubic-bezier(0, 0, 0.2, 1) infinite; }
        .animate-spin-slow { animation: spin-slow 3s linear infinite; }
        .animate-slide-in { animation: slide-in 0.5s ease-out; }

        .text-neon-white { color: #ffffff; }
        .text-neon-gray { color: #9ca3af; }
        .text-neon-cyan { color: #06b6d4; }
        .text-neon-purple { color: #a855f7; }
        .text-neon-blue { color: #3b82f6; }
        .text-neon-green { color: #10b981; }
        .text-neon-yellow { color: #eab308; }
        .text-neon-pink { color: #ec4899; }
        .text-neon-orange { color: #f97316; }
        .border-neon-purple { border-color: #a855f7; }
        .border-neon-cyan { border-color: #06b6d4; }
        .border-neon-green { border-color: #10b981; }
        .bg-neon-purple { background-color: rgba(168, 85, 247, 0.2); }
        .bg-neon-green { background-color: rgba(16, 185, 129, 0.2); }
      `}</style>
    </div>
  );
}
