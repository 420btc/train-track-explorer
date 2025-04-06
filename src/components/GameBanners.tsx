import React, { useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Coins, Award, Heart } from 'lucide-react';

// Función de debounce para limitar las actualizaciones de UI
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const GameBanners: React.FC = () => {
  const { money, points, happiness } = useGame();
  
  // Usar debounce para evitar actualizaciones frecuentes
  const debouncedMoney = useDebounce(money, 100);
  const debouncedPoints = useDebounce(points, 100);
  const debouncedHappiness = useDebounce(happiness, 100);

  // Memoizar los banners para evitar renderizados innecesarios
  const banners = useMemo(() => {
    return (
      <div className="flex justify-between items-center w-full px-4 py-2 bg-slate-900/80 backdrop-blur-sm">
        <div className="flex items-center px-3 py-1 bg-green-600 rounded-md text-white">
          <Coins className="mr-2 h-4 w-4" />
          <span className="font-medium">{debouncedMoney} €</span>
        </div>
        
        <div className="flex items-center px-3 py-1 bg-blue-600 rounded-md text-white">
          <Award className="mr-2 h-4 w-4" />
          <span className="font-medium">{debouncedPoints} puntos</span>
        </div>
        
        <div className="flex items-center px-3 py-1 bg-purple-600 rounded-md text-white">
          <Heart className="mr-2 h-4 w-4" />
          <span className="font-medium">{debouncedHappiness}% felicidad</span>
        </div>
      </div>
    );
  }, [debouncedMoney, debouncedPoints, debouncedHappiness]);

  return banners;
};

export default GameBanners;
