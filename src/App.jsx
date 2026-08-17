import React, { useState } from "react";
import CloseMasterGame from "./CloseMasterGame"; 

export default function App() {
  const [step, setStep] = useState("welcome"); 
  const [playerName, setPlayerName] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const [joinCode, setJoinCode] = useState("");

  const games = [
    { id: "close_master", name: "Close Master", desc: "UNO Style Drop & Show", color: "from-emerald-400 to-teal-600", shadow: "shadow-emerald-500/50" },
    { id: "cards_show", name: "Cards Show", desc: "13 Unique Cards Challenge", color: "from-sky-400 to-blue-600", shadow: "shadow-blue-500/50" },
    { id: "set_show", name: "Set Show", desc: "Classic Sequence & Sets", color: "from-pink-500 to-rose-600", shadow: "shadow-rose-500/50" }
  ];

  const handleNameSubmit = (e) => {
    e.preventDefault();
    if (playerName.trim()) setStep("select_game");
  };

  const handleGameSelect = (gameId) => {
    setSelectedGame(games.find(g => g.id === gameId));
    if (gameId === "close_master") {
       // Close Master ki already daani own login/lobby undi kabatti direct ga game ki pampisthunnam
       setStep("playing");
    } else {
       setStep("lobby");
    }
  };

  const handleBack = () => {
    if (step === "lobby") setStep("select_game");
    if (step === "select_game") setStep("welcome");
    if (step === "playing") setStep("select_game");
  };

  if (step === "welcome") {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-gray-900 to-black text-white p-6 font-sans">
        <div className="text-center mb-10 animate-fade-in-down">
          <h1 className="text-6xl sm:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 tracking-wider uppercase italic drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">
            GULLY CARDS
          </h1>
          <p className="text-sm uppercase tracking-[0.3em] text-yellow-300 font-bold mt-3">The Ultimate Multiplayer Hub</p>
        </div>

        <form onSubmit={handleNameSubmit} className="w-full max-w-sm bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl flex flex-col gap-6">
          <div className="flex flex-col gap-2 text-center">
            <label className="text-xs uppercase tracking-widest text-gray-300 font-bold">Player Name</label>
            <input 
              className="p-4 bg-black/60 rounded-2xl border-2 border-yellow-400/40 text-xl font-black outline-none text-center focus:border-yellow-400 transition text-white uppercase" 
              placeholder="ENTER YOUR NAME" 
              value={playerName} 
              onChange={e => setPlayerName(e.target.value.toUpperCase())} 
              maxLength={15}
              autoFocus
            />
          </div>
          <button 
            type="submit"
            disabled={!playerName.trim()}
            className="py-4 bg-gradient-to-r from-yellow-500 to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-lg uppercase shadow-[0_0_15px_rgba(245,158,11,0.5)] hover:scale-105 active:scale-95 transition"
          >
            Enter Hub 🚀
          </button>
        </form>
      </div>
    );
  }

  if (step === "select_game") {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-start bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-gray-900 to-black text-white p-4 sm:p-8 font-sans overflow-y-auto">
        <div className="w-full max-w-4xl flex justify-between items-center mb-8 bg-black/40 p-4 rounded-2xl border border-white/10 shadow-lg">
          <button onClick={handleBack} className="text-gray-400 hover:text-white font-bold px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl transition">⬅ BACK</button>
          <div className="text-center flex-1">
            <span className="text-yellow-400 font-black text-2xl italic tracking-tighter uppercase">Gully Cards</span>
          </div>
          <div className="flex items-center gap-2 bg-black/60 px-4 py-2 rounded-xl border border-yellow-400/30">
            <span className="text-[10px] text-gray-400 uppercase font-bold">Player</span>
            <span className="text-sm text-yellow-400 font-black truncate max-w-[100px]">{playerName}</span>
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-widest mb-8 text-gray-200">Select Your Deck</h2>

        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-4">
          {games.map((game) => (
            <div 
              key={game.id}
              onClick={() => handleGameSelect(game.id)}
              className={`relative group cursor-pointer flex flex-col items-center bg-gradient-to-b ${game.color} p-1 rounded-3xl transition-all duration-300 hover:-translate-y-4 hover:scale-105 shadow-xl hover:${game.shadow}`}
            >
              <div className="w-full h-full bg-gray-900/90 backdrop-blur-sm rounded-[22px] p-6 flex flex-col items-center text-center border border-white/10">
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

  if (step === "lobby") {
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-gray-900 to-black text-white p-6 font-sans relative">
        <div className="absolute top-6 left-6">
          <button onClick={handleBack} className="text-gray-400 hover:text-white font-bold px-4 py-2 bg-white/5 rounded-xl border border-white/10 transition">⬅ DECKS</button>
        </div>
        <div className="text-center mb-8">
          <h2 className={`text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r ${selectedGame.color} uppercase italic drop-shadow-lg`}>
            {selectedGame.name}
          </h2>
          <p className="text-sm uppercase tracking-widest text-gray-400 font-bold mt-2">{selectedGame.desc}</p>
        </div>
        <div className="w-full max-w-sm bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 shadow-2xl flex flex-col gap-6">
          <button onClick={() => setStep("playing")} className={`w-full py-5 bg-gradient-to-r ${selectedGame.color} rounded-2xl font-black text-xl uppercase shadow-lg hover:brightness-110 active:scale-95 transition border border-white/20`}>
            Create Room
          </button>
          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-white/20 w-full"></div>
            <span className="absolute bg-[#1a1c29] px-4 text-xs font-bold text-gray-400 uppercase tracking-widest">OR</span>
          </div>
          <div className="flex flex-col gap-3">
            <input className="p-4 bg-black/60 rounded-2xl border border-white/20 text-center uppercase tracking-widest text-xl font-black outline-none focus:border-white transition" placeholder="ENTER ROOM CODE" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} maxLength={6} />
            <button onClick={() => setStep("playing")} disabled={!joinCode.trim()} className="w-full py-4 bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-black text-lg uppercase transition border border-white/10">
              Join Room
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "playing") {
    if (selectedGame.id === "close_master") {
      return (
        <div className="h-[100dvh] w-full relative">
          <button onClick={handleBack} className="absolute top-4 left-4 z-[100] text-white font-bold px-3 py-1.5 bg-black/50 hover:bg-black/80 rounded-xl border border-white/20 transition text-xs">⬅ BACK TO HUB</button>
          <CloseMasterGame />
        </div>
      );
    }
    
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center text-white bg-gray-900">
        <h1 className={`text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r ${selectedGame.color}`}>{selectedGame.name} Loading...</h1>
        <p className="mt-4 text-gray-400">Game coming soon!</p>
        <button onClick={handleBack} className="mt-8 px-6 py-3 bg-white/10 rounded-xl border border-white/20">Back to Hub</button>
      </div>
    );
  }

  return null;
}
