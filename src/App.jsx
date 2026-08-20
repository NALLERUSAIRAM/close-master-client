import React, { useState } from "react";
import CloseMasterGame from "./CloseMasterGame"; 
import CardsShowGame from "./CardsShowGame"; 
import SetShowGame from "./SetShowGame"; 
import RuleBookModal from "./RuleBookModal"; // ఇది యాడ్ చేయి

const BG_THEMES = [{ id: "t15", file: "gifs/15.mp4" }, { id: "t16", file: "gifs/16.mp4" }];

export default function App() {
  const [step, setStep] = useState("welcome"); 
  const [playerName, setPlayerName] = useState("");
  const [selectedGame, setSelectedGame] = useState(null);
  const [joinCode, setJoinCode] = useState("");
  const [roomAction, setRoomAction] = useState({ type: "", code: "" });

  // రూల్ బుక్ కోసం కొత్త స్టేట్స్
  const [isRuleOpen, setIsRuleOpen] = useState(false);
  const [selectedGameForRules, setSelectedGameForRules] = useState("close_master");

  const openRules = (gameId) => {
    setSelectedGameForRules(gameId);
    setIsRuleOpen(true);
  };

  const games = [
    { id: "close_master", name: "Close Master", desc: "UNO Style Drop & Show", color: "from-emerald-400 to-teal-600", shadow: "shadow-emerald-500/50" },
    { id: "cards_show", name: "Cards Show", desc: "13 Unique Cards Challenge", color: "from-sky-400 to-blue-600", shadow: "shadow-blue-500/50" },
    { id: "set_show", name: "Set Show", desc: "3x3 & 1x4 Sets with Secret Bonus", color: "from-pink-500 to-rose-600", shadow: "shadow-rose-500/50" }
  ];

  // ... (handleNameSubmit, handleGameSelect, handleBack ఫంక్షన్స్ అలాగే ఉంచు) ...
  const handleNameSubmit = (e) => { e.preventDefault(); if (playerName.trim()) setStep("select_game"); };
  const handleGameSelect = (gameId) => { setSelectedGame(games.find(g => g.id === gameId)); setStep("lobby"); };
  const handleBack = () => { if (step === "lobby") setStep("select_game"); if (step === "select_game") setStep("welcome"); if (step === "playing") setStep("select_game"); };

  return (
    <>
      {/* 1. WELCOME SCREEN */}
      {step === "welcome" && (
        <div className="h-[100dvh] w-full flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
           <video autoPlay loop muted playsInline preload="auto" className="absolute inset-0 w-full h-full object-cover z-0">
             <source src={BG_THEMES[1].file} type="video/mp4" />
           </video>
           <div className="absolute inset-0 bg-black/50 z-0"></div>
           {/* ... నీ వెల్‌కమ్ స్క్రీన్ కంటెంట్ ... */}
           <div className="z-10 text-center mb-10">
              <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-red-500 to-pink-500 italic uppercase">GULLY CARDS</h1>
           </div>
           {/* ... (ఇన్‌పుట్ ఫామ్ కోడ్ ఇక్కడ పెట్టు) ... */}
           <form onSubmit={handleNameSubmit} className="z-10 w-full max-w-sm bg-black/60 p-8 rounded-[32px] flex flex-col gap-6">
              <input value={playerName} onChange={e => setPlayerName(e.target.value.toUpperCase())} className="p-4 bg-black/70 rounded-2xl text-center font-black text-white" placeholder="PLAYER NAME" />
              <button type="submit" className="py-4 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-2xl font-black text-black">Enter Hub 🚀</button>
           </form>
        </div>
      )}

      {/* ... (select_game, lobby స్క్రీన్స్ కూడా ఇలాగే పెట్టు) ... */}

      {/* 4. PLAYING AREA (ఇక్కడ ఆ రూల్ బుక్ కాల్ చేయి) */}
      {step === "playing" && (
        <div className="h-[100dvh] w-full relative">
          {selectedGame.id === "close_master" && <CloseMasterGame playerName={playerName} roomAction={roomAction} onExit={handleBack} openRules={() => openRules("close_master")} />}
          {selectedGame.id === "cards_show" && <CardsShowGame playerName={playerName} roomAction={roomAction} onExit={handleBack} openRules={() => openRules("cards_show")} />}
          {selectedGame.id === "set_show" && <SetShowGame playerName={playerName} roomAction={roomAction} onExit={handleBack} openRules={() => openRules("set_show")} />}
        </div>
      )}

      {/* GLOBAL RULE MODAL (ఇది ఒక్కసారి ఇక్కడ పెడితే చాలు) */}
      <RuleBookModal 
        gameId={selectedGameForRules} 
        isOpen={isRuleOpen} 
        onClose={() => setIsRuleOpen(false)} 
      />
    </>
  );
}
