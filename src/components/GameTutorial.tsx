import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, Train, MapPin, Users, Coins, Heart } from 'lucide-react';
import { Button } from './ui/button';

interface TutorialStep {
  title: string;
  content: string;
  image?: string;
  icon?: React.ReactNode;
  highlight?: string;
}

interface GameTutorialProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  currentLevel: number;
  isFirstTime?: boolean;
}

const GameTutorial: React.FC<GameTutorialProps> = ({ 
  isOpen, 
  onClose, 
  onComplete,
  currentLevel,
  isFirstTime = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  
  // Tutorial steps basados en el nivel actual
  const getTutorialSteps = (): TutorialStep[] => {
    // Tutorial inicial para nuevos jugadores (nivel 0)
    if (currentLevel === 0) {
      return [
        {
          title: "¡Bienvenido a Metro Español!",
          content: "Construye y gestiona tu propia red de metro basada en calles reales. Conecta estaciones, transporta pasajeros y conviértete en el mejor gestor de transporte.",
          icon: <Train className="h-12 w-12 text-primary" />,
          highlight: "basics"
        },
        {
          title: "El Mapa",
          content: "El mapa muestra las vías de metro generadas a partir de calles reales. Las estaciones están marcadas con iconos de metro. Puedes moverte por el mapa arrastrando y hacer zoom con la rueda del ratón.",
          icon: <MapPin className="h-12 w-12 text-blue-500" />,
          highlight: "map"
        },
        {
          title: "Pasajeros",
          content: "Los pasajeros aparecerán en las estaciones. Cada uno tiene un origen y un destino. Tu objetivo es recogerlos y llevarlos a su destino para ganar puntos y dinero.",
          icon: <Users className="h-12 w-12 text-green-500" />,
          highlight: "passengers"
        },
        {
          title: "Controles del Tren",
          content: "Haz clic en una vía para mover tu tren. El tren seguirá la ruta automáticamente. Cuando llegues a una estación con pasajeros, estos subirán a tu tren si es su origen.",
          icon: <Train className="h-12 w-12 text-orange-500" />,
          highlight: "train"
        },
        {
          title: "Recursos",
          content: "Gana dinero (€) y puntos (★) por cada pasajero que lleves a su destino. La felicidad (♥) aumenta cuando entregas pasajeros a tiempo y disminuye si tardas demasiado.",
          icon: <div className="flex space-x-2">
            <Coins className="h-8 w-8 text-yellow-500" />
            <Heart className="h-8 w-8 text-red-500" />
          </div>,
          highlight: "resources"
        },
        {
          title: "¡Comienza tu aventura!",
          content: "¡Estás listo para empezar! Completa el primer nivel llevando a 5 pasajeros a su destino. ¡Buena suerte!",
          icon: <Train className="h-12 w-12 text-primary animate-bounce" />,
          highlight: "start"
        }
      ];
    }
    
    // Tutorial para el nivel 1 (cuando el jugador ya ha completado el tutorial inicial)
    if (currentLevel === 1) {
      return [
        {
          title: "Nivel 1: Primeros Pasos",
          content: "En este nivel, debes llevar a 5 pasajeros a su destino. Aparecerán pocos pasajeros a la vez para que puedas familiarizarte con el juego.",
          icon: <Train className="h-12 w-12 text-primary" />,
          highlight: "level1"
        },
        {
          title: "Objetivo del Nivel",
          content: "Consigue 20€ y mantén la felicidad por encima del 70% para completar este nivel. ¡No te preocupes si cometes errores, estás aprendiendo!",
          icon: <Coins className="h-12 w-12 text-yellow-500" />,
          highlight: "objective"
        }
      ];
    }
    
    // Tutorial para el nivel 2
    if (currentLevel === 2) {
      return [
        {
          title: "Nivel 2: Hora Punta",
          content: "¡Enhorabuena por completar el nivel 1! Ahora las cosas se ponen más interesantes. Aparecerán más pasajeros simultáneamente y tendrás que planificar mejor tus rutas.",
          icon: <Users className="h-12 w-12 text-green-500" />,
          highlight: "level2"
        },
        {
          title: "Nuevas Mecánicas",
          content: "Los pasajeros ahora tienen un tiempo límite más estricto. Si no los llevas a tiempo, perderás felicidad rápidamente. Planifica tus rutas con cuidado.",
          icon: <Heart className="h-12 w-12 text-red-500" />,
          highlight: "mechanics"
        },
        {
          title: "Objetivo del Nivel",
          content: "Consigue 30€ y mantén la felicidad por encima del 60% para completar este nivel. ¡Buena suerte!",
          icon: <Coins className="h-12 w-12 text-yellow-500" />,
          highlight: "objective"
        }
      ];
    }
    
    // Tutorial para el nivel 3
    if (currentLevel === 3) {
      return [
        {
          title: "Nivel 3: Eventos Especiales",
          content: "En este nivel se introducen eventos aleatorios que afectarán a tu red de metro. Pueden ser positivos o negativos.",
          icon: <Train className="h-12 w-12 text-primary" />,
          highlight: "level3"
        },
        {
          title: "Tipos de Eventos",
          content: "Pueden ocurrir eventos como: obras en la vía (reducen la velocidad), festivales (más pasajeros), o averías (vías temporalmente cerradas). ¡Adapta tu estrategia!",
          icon: <div className="flex space-x-2">
            <MapPin className="h-8 w-8 text-red-500" />
            <Users className="h-8 w-8 text-green-500" />
          </div>,
          highlight: "events"
        },
        {
          title: "Objetivo del Nivel",
          content: "Consigue 50€ y mantén la felicidad por encima del 50% mientras gestionas los eventos. ¡Demuestra tu capacidad de adaptación!",
          icon: <Coins className="h-12 w-12 text-yellow-500" />,
          highlight: "objective"
        }
      ];
    }
    
    // Tutorial para el nivel 4
    if (currentLevel === 4) {
      return [
        {
          title: "Nivel 4: Red Compleja",
          content: "¡Ahora estás gestionando una red de metro compleja! Más estaciones, más vías y más pasajeros. La planificación es clave.",
          icon: <MapPin className="h-12 w-12 text-blue-500" />,
          highlight: "level4"
        },
        {
          title: "Estrategia Avanzada",
          content: "Prioriza los pasajeros que van en la misma dirección. Intenta no dar vueltas innecesarias y planifica rutas eficientes.",
          icon: <Train className="h-12 w-12 text-orange-500" />,
          highlight: "strategy"
        },
        {
          title: "Objetivo del Nivel",
          content: "Consigue 75€ y mantén la felicidad por encima del 40%. Este nivel es un verdadero desafío para los gestores de metro experimentados.",
          icon: <Coins className="h-12 w-12 text-yellow-500" />,
          highlight: "objective"
        }
      ];
    }
    
    // Tutorial para el nivel 5 (nivel final en esta versión)
    if (currentLevel === 5) {
      return [
        {
          title: "Nivel 5: ¡Maestro del Metro!",
          content: "Has llegado al nivel final de esta versión. Aquí enfrentarás todos los desafíos anteriores combinados y algunos nuevos.",
          icon: <Train className="h-12 w-12 text-primary" />,
          highlight: "level5"
        },
        {
          title: "Desafío Final",
          content: "Pasajeros impacientes, eventos frecuentes, red compleja... ¡Todo a la vez! Solo los mejores gestores de metro podrán superar este nivel.",
          icon: <Users className="h-12 w-12 text-red-500" />,
          highlight: "challenge"
        },
        {
          title: "Objetivo del Nivel",
          content: "Consigue 100€ y mantén la felicidad por encima del 30%. Completa este nivel para demostrar que eres un verdadero Maestro del Metro Español.",
          icon: <div className="flex space-x-2">
            <Coins className="h-8 w-8 text-yellow-500" />
            <Heart className="h-8 w-8 text-red-500" />
          </div>,
          highlight: "objective"
        }
      ];
    }
    
    // Por defecto, devolver tutorial básico
    return [
      {
        title: "¡Bienvenido a Metro Español!",
        content: "Construye y gestiona tu propia red de metro basada en calles reales. Conecta estaciones, transporta pasajeros y conviértete en el mejor gestor de transporte.",
        icon: <Train className="h-12 w-12 text-primary" />,
        highlight: "basics"
      }
    ];
  };
  
  const tutorialSteps = getTutorialSteps();
  
  // Avanzar al siguiente paso
  const nextStep = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Completar tutorial
      onComplete();
      onClose();
    }
  };
  
  // Retroceder al paso anterior
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Reiniciar cuando cambie el nivel
  useEffect(() => {
    setCurrentStep(0);
  }, [currentLevel]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
      {/* Indicador de "Nuevo usuario" si es la primera vez */}
      {isFirstTime && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-white px-3 py-1 rounded-full text-sm font-medium animate-bounce shadow-lg">
          ¡Bienvenido a Metro Español!
        </div>
      )}
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="bg-background rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-primary/20"
        >
          {/* Cabecera */}
          <div className="bg-primary/10 p-4 flex justify-between items-center">
            <h2 className="text-lg font-bold text-primary">
              {tutorialSteps[currentStep].title}
            </h2>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Contenido */}
          <div className="p-6 flex flex-col items-center gap-4">
            {tutorialSteps[currentStep].icon && (
              <div className="mb-2">
                {tutorialSteps[currentStep].icon}
              </div>
            )}
            
            <p className="text-center text-muted-foreground">
              {tutorialSteps[currentStep].content}
            </p>
            
            {/* Elemento destacado del tutorial */}
            {tutorialSteps[currentStep].highlight && (
              <div className="mt-2 p-3 bg-primary/10 border border-primary/20 rounded-lg w-full">
                <p className="text-sm font-medium text-primary">
                  {tutorialSteps[currentStep].highlight === 'basics' && '¡Consejo! Haz clic en una vía para mover tu tren.'}
                  {tutorialSteps[currentStep].highlight === 'map' && '¡Consejo! Usa el ratón para moverte por el mapa y la rueda para hacer zoom.'}
                  {tutorialSteps[currentStep].highlight === 'passengers' && '¡Consejo! Los pasajeros aparecen cada cierto tiempo en las estaciones.'}
                  {tutorialSteps[currentStep].highlight === 'train' && '¡Consejo! Tu tren tiene una capacidad limitada de pasajeros.'}
                  {tutorialSteps[currentStep].highlight === 'resources' && '¡Consejo! Mantén la felicidad alta para atraer más pasajeros.'}
                  {tutorialSteps[currentStep].highlight === 'start' && '¡Consejo! Puedes volver a ver este tutorial desde el menú lateral.'}
                </p>
              </div>
            )}
            
            {/* Indicador de pasos */}
            <div className="flex gap-1 mt-2">
              {tutorialSteps.map((_, index) => (
                <div 
                  key={index}
                  className={`h-1.5 rounded-full ${
                    index === currentStep 
                      ? 'w-6 bg-primary' 
                      : 'w-1.5 bg-primary/30'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Botones de navegación */}
          <div className="p-4 bg-muted/30 flex justify-between items-center">
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
                disabled={currentStep === 0}
                className={currentStep === 0 ? 'opacity-0' : ''}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                Volver
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={nextStep}
              >
                {currentStep < tutorialSteps.length - 1 ? (
                  <>
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                ) : (
                  'Comenzar'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default GameTutorial;
