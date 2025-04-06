import React, { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

interface GameStartButtonProps {
  onStart: () => void;
  gameStarted: boolean;
  showArrow: boolean;
}

const GameStartButton: React.FC<GameStartButtonProps> = ({ onStart, gameStarted, showArrow }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isDaytime, setIsDaytime] = useState(true);

  // Actualizar la hora cada minuto
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      // Determinar si es día o noche (día: 7am-7pm)
      const hours = now.getHours();
      setIsDaytime(hours >= 7 && hours < 19);
    }, 60000);
    
    // Configuración inicial
    const now = new Date();
    setCurrentTime(now);
    const hours = now.getHours();
    setIsDaytime(hours >= 7 && hours < 19);
    
    return () => clearInterval(timer);
  }, []);

  // Formatear la hora en formato 24h
  const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Botón de inicio dorado */}
      <div className="relative">
        {showArrow && !gameStarted && (
          <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 animate-bounce">
            <div className="text-yellow-500 text-2xl">↓</div>
          </div>
        )}
        <button
          onClick={onStart}
          disabled={gameStarted}
          className={`px-4 py-2 rounded-md font-bold text-black shadow-md transition-all ${
            gameStarted 
              ? 'bg-gray-400 cursor-not-allowed opacity-70' 
              : 'bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 hover:shadow-lg'
          }`}
        >
          {gameStarted ? 'EN MARCHA' : 'INICIAR'}
        </button>
      </div>
      
      {/* Banner con la hora del sistema */}
      <div className="bg-background/80 backdrop-blur-sm px-3 py-1 rounded-lg shadow-sm border border-primary/20 flex items-center gap-2 text-sm">
        {isDaytime ? (
          <Sun className="h-4 w-4 text-yellow-500" />
        ) : (
          <Moon className="h-4 w-4 text-blue-400" />
        )}
        <span>{formattedTime}</span>
      </div>
    </div>
  );
};

export default GameStartButton;
