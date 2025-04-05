
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
    <header className="border-b bg-background px-4 py-2 sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
          
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Menú</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid gap-3 p-4 w-[200px]">
                    <li className="row-span-3">
                      <NavigationMenuLink asChild>
                        <a
                          className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-primary/20 to-primary p-6 no-underline outline-none focus:shadow-md"
                          href="#"
                        >
                          <div className="mb-2 text-lg font-medium text-primary-foreground">
                            Simulador de Tren
                          </div>
                          <p className="text-sm text-primary-foreground/80">
                            Conduce por las calles reales
                          </p>
                        </a>
                      </NavigationMenuLink>
                    </li>
                    <li>
                      <a
                        href="#"
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none">Mapa</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Explora nuevos lugares
                        </p>
                      </a>
                    </li>
                    <li>
                      <a
                        href="#"
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none">Configuración</div>
                        <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                          Cambia las preferencias
                        </p>
                      </a>
                    </li>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col justify-center">
            <span className="text-xs text-muted-foreground mb-1">Velocidad del tren</span>
            <div className="flex items-center gap-2">
              <Slider 
                defaultValue={[speed]} 
                max={100} 
                step={1}
                className="w-[150px]"
                onValueChange={(value) => onSpeedChange(value[0])}
              />
              <Badge variant="outline">{speed}%</Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="outline" size="icon">
              <UserCircle className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default GameHeader;
