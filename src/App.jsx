if (step === "playing") {
    if (selectedGame.id === "close_master") {
      return (
        <div className="h-[100dvh] w-full relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900 via-indigo-950 to-black">
          <CloseMasterGame playerName={playerName} roomAction={{...roomAction, gameType: "close_master"}} onExit={handleBack} />
        </div>
      );
    }
    if (selectedGame.id === "cards_show") {
      return (
        <div className="h-[100dvh] w-full relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-900 via-blue-950 to-black">
          <CardsShowGame playerName={playerName} roomAction={{...roomAction, gameType: "cards_show"}} onExit={handleBack} />
        </div>
      );
    }
    
    // Set Show (Future game)
    return (
      <div className="h-[100dvh] w-full flex flex-col items-center justify-center text-white bg-gray-900">
        <h1 className={`text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r ${selectedGame.color}`}>{selectedGame.name} Loading...</h1>
        <button onClick={handleBack} className="mt-8 px-6 py-3 bg-white/10 rounded-xl">Back to Hub</button>
      </div>
    );
  }
