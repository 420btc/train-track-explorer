import React from 'react';
import { Button } from './ui/button';
import { Train } from 'lucide-react';
import SimpleTrainAnimation from './SimpleTrainAnimation';

interface MainMenuProps {
  onStartGame: () => void;
}

const MainMenu: React.FC<MainMenuProps> = ({ onStartGame }) => {
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
      
      {/* Vías de tren en la parte inferior */}
      <div className="absolute bottom-0 left-0 right-0 h-[40px] bg-[#8B4513] flex items-center justify-center">
        <div className="w-full h-[10px] bg-[#A0522D] flex">
          {Array(30).fill(0).map((_, i) => (
            <div key={i} className="h-full w-[30px] border-l-2 border-r-2 border-[#CD853F]"></div>
          ))}
        </div>
      </div>
      
      {/* Tren animado */}
      <SimpleTrainAnimation />
      
      {/* Contenido superpuesto */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-lg">
            Metro Español
          </h1>
          <p className="text-2xl md:text-3xl text-white mb-12 drop-shadow-md">
            Explora las vías de tren por toda España
          </p>
          

          
          <Button 
            onClick={onStartGame}
            className="bg-[#FF5722] hover:bg-[#E64A19] text-white text-2xl py-8 px-16 rounded-full shadow-xl transform transition hover:scale-105 z-10 border-4 border-white"
            size="lg"
          >
            <Train className="h-8 w-8 mr-3" />
            JUGAR
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MainMenu;
