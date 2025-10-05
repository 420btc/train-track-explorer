
import React from 'react';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import { UserCircle, Menu, Bell, Settings } from 'lucide-react';
import { Button } from './ui/button';
import { 
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from './ui/navigation-menu';
import { cn } from '@/lib/utils';

export interface GameHeaderProps {
  speed: number;
  onSpeedChange: (speed: number) => void;
}

const GameHeader: React.FC<GameHeaderProps> = ({ speed, onSpeedChange }) => {
  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">Velocidad</span>
        <Badge variant="outline" className="text-xs h-4 px-1">{speed}%</Badge>
      </div>
      <div className="flex items-center gap-1">
        <Slider 
          defaultValue={[speed]} 
          max={100} 
          step={5}
          className="w-full"
          onValueChange={(value) => onSpeedChange(value[0])}
        />
        <Button 
          variant="outline" 
          size="icon" 
          className="h-5 w-5 flex-shrink-0"
          onClick={() => {
            // Configuración de velocidad
            const newSpeed = speed >= 100 ? 25 : speed + 25;
            onSpeedChange(newSpeed);
          }}
        >
          <Settings className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

export default GameHeader;
