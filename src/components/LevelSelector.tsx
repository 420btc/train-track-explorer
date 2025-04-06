import React from 'react';
import { motion } from 'framer-motion';
import { GameLevel, getDifficultyColor } from '@/lib/levelSystem';
import { Button } from './ui/button';
import { Lock, Check, Star } from 'lucide-react';

interface LevelSelectorProps {
  levels: GameLevel[];
  onSelectLevel: (level: GameLevel) => void;
  onClose: () => void;
}

const LevelSelector: React.FC<LevelSelectorProps> = ({ 
  levels, 
  onSelectLevel, 
  onClose 
}) => {
  // Animación para los elementos de la lista
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background rounded-xl shadow-xl max-w-2xl w-full overflow-hidden">
        {/* Cabecera */}
        <div className="bg-primary/10 p-4">
          <h2 className="text-xl font-bold text-primary text-center">
            Selecciona un Nivel
          </h2>
        </div>
        
        {/* Lista de niveles */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {levels.map((level) => (
              <motion.div 
                key={level.id}
                variants={item}
                className={`
                  border rounded-lg p-4 relative
                  ${level.unlocked 
                    ? 'border-primary/30 hover:border-primary cursor-pointer' 
                    : 'border-gray-300 opacity-70 cursor-not-allowed'
                  }
                  ${level.completed ? 'bg-primary/5' : ''}
                `}
                onClick={() => level.unlocked && onSelectLevel(level)}
              >
                {/* Indicador de nivel completado */}
                {level.completed && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white rounded-full p-1">
                    <Check className="h-4 w-4" />
                  </div>
                )}
                
                {/* Indicador de nivel bloqueado */}
                {!level.unlocked && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-lg">
                    <Lock className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                
                <h3 className="text-lg font-bold mb-1 flex items-center">
                  {level.name}
                  <span className={`ml-2 text-sm ${getDifficultyColor(level.difficulty)}`}>
                    {level.difficulty === 'tutorial' ? 'Tutorial' : 
                     level.difficulty === 'easy' ? 'Fácil' :
                     level.difficulty === 'medium' ? 'Medio' :
                     level.difficulty === 'hard' ? 'Difícil' : 'Experto'}
                  </span>
                </h3>
                
                <p className="text-muted-foreground text-sm mb-3">
                  {level.description}
                </p>
                
                {/* Indicador de dificultad con estrellas */}
                <div className="flex mb-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i}
                      className={`h-4 w-4 ${
                        i < (
                          level.difficulty === 'tutorial' ? 1 :
                          level.difficulty === 'easy' ? 2 :
                          level.difficulty === 'medium' ? 3 :
                          level.difficulty === 'hard' ? 4 : 5
                        )
                          ? getDifficultyColor(level.difficulty)
                          : 'text-gray-300'
                      }`}
                      fill={i < (
                        level.difficulty === 'tutorial' ? 1 :
                        level.difficulty === 'easy' ? 2 :
                        level.difficulty === 'medium' ? 3 :
                        level.difficulty === 'hard' ? 4 : 5
                      ) ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
                
                {/* Objetivos del nivel */}
                <div className="text-xs space-y-1">
                  <p className="font-semibold">Objetivos:</p>
                  <ul className="list-disc list-inside">
                    {level.objectives.map((obj, index) => (
                      <li key={index}>
                        {obj.type === 'money' && `Consigue ${obj.target}€`}
                        {obj.type === 'passengers' && `Transporta ${obj.target} pasajeros`}
                        {obj.type === 'happiness' && `Mantén la felicidad ≥ ${obj.target}%`}
                        {obj.type === 'time' && `Completa en ${Math.floor(obj.target / 60)} minutos`}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Información adicional */}
                <div className="mt-3 text-xs text-muted-foreground">
                  {level.timeLimit && (
                    <p>Tiempo límite: {Math.floor(level.timeLimit / 60)} minutos</p>
                  )}
                  <p>Frecuencia de pasajeros: {level.passengerFrequency}s</p>
                  {level.eventFrequency > 0 && (
                    <p>Eventos aleatorios: {level.eventFrequency}s</p>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
        
        {/* Botones de acción */}
        <div className="p-4 bg-muted/30 flex justify-center">
          <Button
            variant="outline"
            onClick={onClose}
          >
            Volver
          </Button>
        </div>
      </div>
    </div>
  );
};

export default LevelSelector;
