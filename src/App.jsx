import React, { useState } from "react";
import CloseMasterGame from "./CloseMasterGame"; 
import CardsShowGame from "./CardsShowGame"; 
import SetShowGame from "./SetShowGame"; 

export default function App() {
  const [step, setStep] = useState("welcome"); 
  const [playerName, setPlayerName] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [roomAction, setRoomAction] = useState({ type: "", code: "" });

  const games = [
    { id: "close_master", name: "Close Master", desc: "UNO Style Drop & Show", color: "from-emerald-400 to-teal-600", shadow: "shadow-emerald-500/50" },
    { id: "cards_show", name: "Cards Show", desc: "13 Unique Cards Challenge", color: "from-sky-400 to-blue-600", shadow: "shadow-blue-500/50" },
    { id: "set_show", name: "Set Show", desc: "3x3 & 1x4 Sets with Secret Bonus", color: "from-pink-500 to-rose-600", shadow: "shadow-rose-500/50" }
  ];

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (playerName.trim()) setStep("select_game");
  };

  const handleGameSelect = (gameId) => {
    setSelectedGame(games.find(g => g.id === gameId));
    setStep("lobby");
  };

  const handleBack = () => {
    if (step === "lobby") setStep("select_game");
    if (step === "select_game") setStep("welcome");
    if (step === "playing") setStep("select_game");
  };

  // 1. CINEMATIC WELCOME SCREEN
  if (step === "welcome") {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center text-white p-6 font-sans relative overflow-hidden">
        
        {/* Galaxy Video Background (16.mp4) */}
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
          <source src="/gifs/16.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50 z-0"></div>

        {/* Title Container */}
        <div className="text-center mb-10 z-10 animate-fade-in">
          <div className="inline-block px-4 py-1.5 mb-3 rounded-full bg-yellow-400/10 border border-yellow-400/30 text-yellow-400 text-xs font-black uppercase tracking-[0.3em] shadow-[0_0_15px_rgba(250,204,21,0.2)]">
            ♠️ Premium Multiplayer Experience ♦️
          </div>
          <h1 className="text-6xl sm:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-red-500 to-pink-500 tracking-wider uppercase italic drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)] hover:scale-105 transition-transform duration-500">
            GULLY CARDS
          </h1>
          <p className="text-xs sm:text-sm uppercase tracking-[0.4em] text-gray-300 font-bold mt-4 drop-shadow">
            Step Into The Arena
          </p>
        </div>

        {/* Cinematic Input Box Form */}
        <form onSubmit={handleNameSubmit} className="w-full max-w-sm z-10 bg-black/60 backdrop-blur-xl p-8 rounded-[32px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-6 relative group">
          
          <div className="flex flex-col gap-2 text-center relative z-10">
            <label className="text-[11px] uppercase tracking-[0.25em] text-yellow-400/90 font-black">Enter Your Battle Name</label>
            <input 
              className="p-4 bg-black/70 rounded-2xl border-2 border-white/10 text-xl font-black outline-none text-center focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all text-white uppercase tracking-wider placeholder:text-gray-600 shadow-inner" 
              placeholder="PLAYER NAME" 
              value={playerName} 
              onChange={e => setPlayerName(e.target.value.toUpperCase())} 
              maxLength={15}
              autoFocus
            />
          </div>

          <button 
            type="submit"
            disabled={!playerName.trim()}
            className="relative z-10 py-4 bg-gradient-to-r from-yellow-500 via-amber-500 to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl font-black text-lg uppercase shadow-[0_0_25px_rgba(245,158,11,0.4)] hover:shadow-[0_0_35px_rgba(245,158,11,0.7)] hover:scale-[1.02] active:scale-95 transition-all text-black tracking-wider"
          >
            Enter Hub 🚀
          </button>
        </form>

        {/* Footer info */}
        <div className="absolute bottom-6 z-10 text-center text-[10px] text-gray-400 uppercase tracking-widest">
          Close Master • Cards Show • Set Show
        </div>
      </div>
    );
  }

  // 2. GAME SELECTION (3 DECKS)
  if (step === "select_game") {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-start text-white p-4 sm:p-8 font-sans overflow-y-auto relative">
        {/* Galaxy Video Background (16.mp4) */}
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
          <source src="/gifs/16.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50 z-0"></div>

        <div className="w-full max-w-4xl flex justify-between items-center mb-8 bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-lg z-10">
          <button onClick={handleBack} className="text-gray-400 hover:text-white font-bold px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition">⬅ BACK</button>
          <div className="text-center flex-1">
            <span className="text-yellow-400 font-black text-2xl italic tracking-tighter uppercase">Gully Cards Hub</span>
          </div>
          <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-xl border border-yellow-400/30">
            <span className="text-[10px] text-gray-400 uppercase font-bold">Player</span>
            <span className="text-sm text-yellow-400 font-black truncate max-w-[100px]">{playerName}</span>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-widest mb-8 text-gray-200 z-10">Select Your Deck</h2>

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-4 z-10">
          {games.map((game) => (
            <div 
              key={game.id}
              onClick={() => handleGameSelect(game.id)}
              className={`relative group cursor-pointer flex flex-col items-center bg-gradient-to-b ${game.color} p-1 rounded-3xl transition-all duration-300 hover:-translate-y-4 hover:scale-105 shadow-xl hover:${game.shadow}`}
            >
              <div className="w-full h-full bg-gray-950/90 backdrop-blur-sm rounded-[22px] p-6 flex flex-col items-center text-center border border-white/10">
                <div className="w-24 h-32 mb-6 bg-black rounded-xl border-2 border-white/20 flex items-center justify-center shadow-inner relative overflow-hidden group-hover:border-yellow-400 transition-colors">
                   <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent"></div>
                   <span className="text-4xl">{game.id === "close_master" ? "🃏" : game.id === "cards_show" ? "🎴" : "♠️"}</span>
                </div>
                <h3 className="text-xl font-black uppercase italic mb-2 text-white">{game.name}</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">{game.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. ROOM LOBBY
  if (step === "lobby") {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center text-white p-6 font-sans relative">
        {/* Galaxy Video Background (16.mp4) */}
        <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover z-0">
          <source src="/gifs/16.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-black/50 z-0"></div>

        <div className="absolute top-6 left-6 z-10">
          <button onClick={handleBack} className="text-gray-400 hover:text-white font-bold px-4 py-2 bg-black/60 rounded-xl border border-white/10 transition">⬅ DECKS</button>
        </div>
        <div className="text-center mb-8 z-10">
          <h2 className={`text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${selectedGame.color} uppercase italic drop-shadow-lg`}>
            {selectedGame.name}
          </h2>
          <p className="text-sm uppercase tracking-widest text-gray-300 font-bold mt-2">{selectedGame.desc}</p>
        </div>
        <div className="w-full max-w-sm bg-black/60 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl flex flex-col gap-6 z-10">
          <button 
            onClick={() => { setRoomAction({ type: "create", code: "" }); setStep("playing"); }} 
            className={`w-full py-5 bg-gradient-to-r ${selectedGame.color} rounded-2xl font-black text-xl uppercase shadow-lg hover:brightness-110 active:scale-95 transition border border-white/20`}
          >
            Create Room
          </button>
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-white/20 w-full"></div>
            <span className="absolute bg-[#12141f] px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">OR</span>
          </div>
          <div className="flex flex-col gap-3">
            <input 
              className="p-4 bg-black/80 rounded-2xl border border-white/20 text-center uppercase tracking-widest text-xl font-black outline-none focus:border-white transition" 
              placeholder="ENTER ROOM CODE" 
              value={joinCode} 
              onChange={e => setJoinCode(e.target.value.toUpperCase())} 
              maxLength={6} 
            />
            <button 
              onClick={() => { setRoomAction({ type: "join", code: joinCode }); setStep("playing"); }} 
              disabled={!joinCode.trim()} 
              className="w-full py-4 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-lg uppercase transition border border-white/10"
            >
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. PLAYING AREA (GAMES ROUTING)
  if (step === "playing") {
    if (selectedGame.id === "close_master") {
      return (
        <div className="h-[100dvh] w-full relative">
          <CloseMasterGame playerName={playerName} roomAction={roomAction} onExit={handleBack} />
        </div>
      );
    }
    
    if (selectedGame.id === "cards_show") {
      return (
        <div className="h-[100dvh] w-full relative">
          <CardsShowGame playerName={playerName} roomAction={roomAction} onExit={handleBack} />
        </div>
      );
    }

    if (selectedGame.id === "set_show") {
      return (
        <div className="h-[100dvh] w-full relative">
          <SetShowGame playerName={playerName} roomAction={roomAction} onExit={handleBack} />
        </div>
      );
    }
    
    return null;
  }

  return null;
}
