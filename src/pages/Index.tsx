
import React, { useState } from 'react';
import TrainGame from '@/components/TrainGame';
import MainMenu from '@/components/MainMenu';
import { Coordinates, DEFAULT_COORDINATES } from '@/lib/mapUtils';
import { GameProvider } from '@/contexts/GameContext';
import '../styles/animations.css';

const Index = () => {
  const [showGame, setShowGame] = useState(false);
  const [startCoordinates, setStartCoordinates] = useState<Coordinates>(DEFAULT_COORDINATES);
  
  const handleStartGame = (coordinates?: Coordinates) => {
    if (coordinates) {
      setStartCoordinates(coordinates);
    }
    setShowGame(true);
  };
  
  return (
    <>
      {!showGame ? (
        <MainMenu onStartGame={handleStartGame} />
      ) : (
        <GameProvider>
          <TrainGame initialCoordinates={startCoordinates} />
        </GameProvider>
      )}
    </>
  );
};

export default Index;
