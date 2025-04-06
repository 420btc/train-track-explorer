import React, { useState, useEffect } from 'react';
import { GameLevel, LevelObjective, formatTime, getObjectiveIcon } from '@/lib/levelSystem';
import { Progress } from './ui/progress';
import { Timer, AlertTriangle } from 'lucide-react';

interface LevelProgressProps {
  currentLevel: GameLevel;
  gameTime: number;
  onTimeUp?: () => void;
}

const LevelProgress: React.FC<LevelProgressProps> = ({ 
  currentLevel, 
  gameTime,
  onTimeUp
}) => {
  const [timeLeft, setTimeLeft] = useState<number | undefined>(currentLevel.timeLimit);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  
  // Actualizar tiempo restante
  useEffect(() => {
    if (!currentLevel.timeLimit) return;
    
    const remaining = Math.max(0, currentLevel.timeLimit - gameTime);
    setTimeLeft(remaining);
    
    // Mostrar advertencia cuando quede menos del 20% del tiempo
    setShowTimeWarning(remaining <= currentLevel.timeLimit * 0.2);
    
    // Notificar cuando se acabe el tiempo
    if (remaining === 0 && onTimeUp) {
      onTimeUp();
    }
  }, [currentLevel, gameTime, onTimeUp]);
  
  // Calcular progreso de un objetivo
  const calculateProgress = (objective: LevelObjective): number => {
    if (objective.target <= 0) return 100;
    return Math.min(100, Math.round((objective.current / objective.target) * 100));
  };
  
  return (
    <div className="bg-background/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-primary/20">
      <div className="mb-2 flex justify-between items-center">
        <h3 className="text-sm font-bold">
          Nivel {currentLevel.id}: {currentLevel.name}
        </h3>
        
        {/* Tiempo restante si hay límite */}
        {timeLeft !== undefined && (
          <div className={`flex items-center text-xs font-mono ${
            showTimeWarning ? 'text-red-500 animate-pulse' : 'text-muted-foreground'
          }`}>
            {showTimeWarning && <AlertTriangle className="h-3 w-3 mr-1" />}
            <Timer className="h-3 w-3 mr-1" />
            {formatTime(timeLeft)}
          </div>
        )}
      </div>
      
      {/* Objetivos del nivel */}
      <div className="space-y-2">
        {currentLevel.objectives.map((objective, index) => (
          <div key={index} className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <div className="flex items-center">
                <span className="mr-1">{getObjectiveIcon(objective.type)}</span>
                <span>
                  {objective.type === 'money' && 'Dinero'}
                  {objective.type === 'passengers' && 'Pasajeros'}
                  {objective.type === 'happiness' && 'Felicidad'}
                  {objective.type === 'time' && 'Tiempo'}
                </span>
              </div>
              <div className="font-mono">
                {objective.current}
                {objective.type === 'money' && '€'}
                {objective.type === 'happiness' && '%'}
                {' / '}
                {objective.target}
                {objective.type === 'money' && '€'}
                {objective.type === 'happiness' && '%'}
              </div>
            </div>
            <Progress 
              value={calculateProgress(objective)} 
              className={`h-1.5 ${
                objective.type === 'money' 
                  ? 'bg-yellow-500/20' 
                  : objective.type === 'passengers'
                  ? 'bg-blue-500/20'
                  : objective.type === 'happiness'
                  ? 'bg-red-500/20'
                  : 'bg-primary/20'
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default LevelProgress;
