import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Train } from 'lucide-react';
import SimpleTrainAnimation from './SimpleTrainAnimation';
import HomeSearchBar from './HomeSearchBar';
import { Coordinates } from '@/lib/mapUtils';

interface MainMenuProps {
  onStartGame: (coordinates?: Coordinates) => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Efecto para actualizar el reloj cada segundo
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString());
    };
    
    updateClock(); // Actualizar inmediatamente
    const intervalId = setInterval(updateClock, 1000);
    
    return () => clearInterval(intervalId); // Limpieza
  }, []);
  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Fondo con gradiente que simula un paisaje español */}
      <div 
        className="absolute inset-0"
        style={{ 
          background: 'linear-gradient(to bottom, #6AADFF 0%, #6AADFF 50%, #8FBC8F 50%, #8FBC8F 75%, #E8C07D 75%, #E8C07D 100%)',
        }}
      />
      
      {/* Elementos decorativos: montañas */}
      <div className="absolute top-[30%] left-0 right-0 overflow-hidden">
        <div className="w-[300px] h-[150px] bg-[#5D9E31] rounded-[50%] absolute -left-[50px] -top-[75px]"></div>
        <div className="w-[400px] h-[200px] bg-[#4A8C2A] rounded-[50%] absolute left-[200px] -top-[100px]"></div>
        <div className="w-[350px] h-[175px] bg-[#5D9E31] rounded-[50%] absolute right-[100px] -top-[85px]"></div>
      </div>
      
      {/* Atribución superior */}
      <div className="absolute top-4 left-0 right-0 flex justify-center">
        <div className="bg-[#FF5722]/80 text-white px-4 py-1 rounded-full shadow-md backdrop-blur-sm">
          <p className="text-sm font-medium">Made By Carlos Freire in Málaga ❤️</p>
        </div>
      </div>
      
      {/* Vías de tren en la parte inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-[40px] bg-[#333333] flex items-center justify-center">
        {/* Base de las vías */}
        <div className="w-full h-[20px] bg-[#222222] flex items-center">
          {/* Traviesas */}
          <div className="w-full h-[6px] flex">
            {Array(60).fill(0).map((_, i) => (
              <div key={i} className="h-full w-[20px] mx-[10px] bg-[#444444]"></div>
            ))}
          </div>
        </div>
        
        {/* Rieles */}
        <div className="absolute bottom-[20px] left-0 right-0 h-[4px] flex justify-center">
          <div className="w-[95%] flex justify-between">
            <div className="h-full w-[10px] bg-[#111111]"></div>
            <div className="h-full w-[10px] bg-[#111111]"></div>
          </div>
        </div>
      </div>
      
      {/* Reloj en tiempo real */}
      <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-[#FF5722] hover:bg-[#E64A19] text-white font-bold py-2 px-6 rounded-full shadow-lg 
        transition-colors duration-300 flex items-center justify-center text-lg">
          {currentTime || '--:--:--'}
        </div>
      </div>
      
      {/* Tren animado */}
      <SimpleTrainAnimation />
      
      {/* Contenido superpuesto */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-0 mt-0">
        <div className="text-center transform -translate-y-16">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 drop-shadow-lg">
            Urban Metro Track
          </h1>
          <p className="text-xl md:text-2xl text-white mb-8 max-w-2xl mx-auto leading-tight drop-shadow-md bg-black/20 px-6 py-3 rounded-lg">
            Tu ciudad convertida en un juego de trenes!
          </p>
          

          
          <Button 
            onClick={() => setShowSearchBar(true)}
            className="bg-[#FF5722] hover:bg-[#E64A19] text-white text-2xl py-8 px-16 rounded-full shadow-xl transform transition hover:scale-105 z-10 border-4 border-white"
            size="lg"
          >
            <Train className="h-8 w-8 mr-3" />
            JUGAR
          </Button>
          
          {/* Banner de búsqueda */}
          {showSearchBar && (
            <div className="mt-8 w-full max-w-3xl animate-fadeIn">
              <HomeSearchBar 
                onLocationSelect={(coordinates) => {
                  onStartGame(coordinates);
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
