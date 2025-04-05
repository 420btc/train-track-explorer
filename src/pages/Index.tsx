
import React, { useState } from 'react';
import TrainGame from '@/components/TrainGame';
import MainMenu from '@/components/MainMenu';

const Index = () => {
  const [showGame, setShowGame] = useState(false);
  
  const handleStartGame = () => {
    setShowGame(true);
  };
  
  return (
    <>
      {!showGame ? (
        <MainMenu onStartGame={handleStartGame} />
      ) : (
        <TrainGame />
      )}
    </>
  );
};

export default Index;
