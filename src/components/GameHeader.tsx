
import React from 'react';
import { Button } from '@/components/ui/button';
import { CircleUser, Train, Menu } from 'lucide-react';

interface GameHeaderProps {
  speed: number;
  nextStation?: string;
  onToggleMenu: () => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({ speed, nextStation, onToggleMenu }) => {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm px-4 py-2 flex justify-between items-center">
      <div className="flex items-center space-x-2">
        <div className="flex items-center bg-train text-white p-1 rounded-full">
          <Train size={16} className="mr-1" />
          <span className="font-bold">Train Maps</span>
        </div>
        <div className="hidden sm:flex items-center text-xs bg-secondary/80 px-2 py-1 rounded-full">
          <span>{speed} km/h</span>
        </div>
        <div className="hidden sm:flex items-center text-xs bg-secondary/80 px-2 py-1 rounded-full">
          <span>{nextStation ? `Via: ${nextStation}` : 'N/A'}</span>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <Button variant="ghost" size="sm" className="hidden sm:flex">
          Desconectado
          <CircleUser size={16} className="ml-1 text-gray-400" />
        </Button>
        
        <Button variant="default" size="sm" className="hidden sm:flex">
          Próx. estación
        </Button>
        
        <Button variant="outline" size="icon" onClick={onToggleMenu}>
          <Menu size={18} />
        </Button>
      </div>
    </div>
  );
};

export default GameHeader;
