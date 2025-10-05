import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Coordinates, Station } from '@/lib/mapUtils';

// Tipos para el contexto del juego
export interface Passenger {
  id: string;
  origin: Station;
  destination: Station;
  motive: string;
  createdAt: number;
  position: Coordinates;
  isPickedUp: boolean;
  offsetX: number;
  offsetY: number;
  animationOffset: number;
}

export interface Desire {
  id: string;
  description: string;
  originStation: Station;
  destinationStation: Station;
  passengersRequired: number;
  passengersDelivered: number;
  timeLimit: number;
  timeRemaining: number;
}

export interface GameEvent {
  id: string;
  description: string;
  duration: number;
  type: 'cultural' | 'traffic';
  affectedStation: Station;
}

export interface GameMessage {
  id: string;
  text: string;
  color: string;
}

interface GameContextType {
  // Estado del juego
  money: number;
  points: number;
  happiness: number;
  passengers: Passenger[];
  stations: Station[];
  desires: Desire[];
  events: GameEvent[];
  difficulty: 'easy' | 'medium' | 'hard';
  trainCapacity: number;
  placeName: string;
  areaType: string;
  trainPosition: Coordinates | null;
  trainPassengers: Passenger[];
  hasUnlocked: boolean;
  messages: GameMessage[];
  trainSpeed: number;
  canGeneratePassengers: boolean;
  deliveredPassengers: Passenger[];
  gameStarted: boolean;
  showStartArrow: boolean;
  personalStationId: string | null;
  playerLevel: number;
  gameStartTime: number | null;
  passengersToNextLevel: number;
  passengersCollected: number;

  // Funciones para actualizar el estado
  setMoney: (money: number) => void;
  setPoints: (points: number) => void;
  setHappiness: (happiness: number) => void;
  addPassenger: (passenger: Passenger) => void;
  removePassenger: (passengerId: string) => void;
  addStation: (station: Station) => void;
  addDesire: (desire: Desire) => void;
  removeDesire: (desireId: string) => void;
  addEvent: (event: GameEvent) => void;
  removeEvent: (eventId: string) => void;
  setPlaceName: (name: string) => void;
  setAreaType: (type: string) => void;
  setTrainCapacity: (capacity: number) => void;
  setTrainPosition: (position: Coordinates) => void;
  addTrainPassenger: (passenger: Passenger) => void;
  removeTrainPassenger: (passengerId: string) => void;
  addMessage: (message: GameMessage) => void;
  removeMessage: (messageId: string) => void;
  setTrainSpeed: (speed: number) => void;
  setCanGeneratePassengers: (canGenerate: boolean) => void;
  resetGame: () => void;
  upgradeSpeed: () => void;
  addNewStation: () => void;
  startGame: () => void;
  setPersonalStationId: (id: string | null) => void;
  setDifficulty: (difficulty: 'easy' | 'medium' | 'hard') => void;
}

// Crear el contexto
const GameContext = createContext<GameContextType | undefined>(undefined);

// Proveedor del contexto
export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Estado inicial
  const [money, setMoney] = useState<number>(100); // Dinero inicial predeterminado
  const [points, setPoints] = useState<number>(0);
  const [happiness, setHappiness] = useState<number>(0);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [desires, setDesires] = useState<Desire[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy'); // Dificultad del juego
  const [trainCapacity, setTrainCapacity] = useState<number>(1);
  const [placeName, setPlaceName] = useState<string>('');
  const [areaType, setAreaType] = useState<string>('');
  const [trainPosition, setTrainPosition] = useState<Coordinates | null>(null);
  const [trainPassengers, setTrainPassengers] = useState<Passenger[]>([]);
  const [hasUnlocked, setHasUnlocked] = useState<boolean>(false);
  const [messages, setMessages] = useState<GameMessage[]>([]);
  const [trainSpeed, setTrainSpeed] = useState<number>(50);
  const [canGeneratePassengers, setCanGeneratePassengers] = useState<boolean>(false); // Inicialmente desactivado
  const [deliveredPassengers, setDeliveredPassengers] = useState<Passenger[]>([]);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [showStartArrow, setShowStartArrow] = useState<boolean>(false);
  const [personalStationId, setPersonalStationId] = useState<string | null>(null);
  const [playerLevel, setPlayerLevel] = useState<number>(2); // Empezamos en nivel 2 después del tutorial
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [passengersToNextLevel, setPassengersToNextLevel] = useState<number>(5); // Inicialmente 5 pasajeros para pasar al nivel 3
  const [passengersCollected, setPassengersCollected] = useState<number>(0);

  // Función para añadir un pasajero
  const addPassenger = (passenger: Passenger) => {
    setPassengers(prev => [...prev, passenger]);
  };

  // Función para eliminar un pasajero
  const removePassenger = (passengerId: string) => {
    setPassengers(prev => prev.filter(p => p.id !== passengerId));
  };

  // Función para añadir una estación
  const addStation = (station: Station) => {
    setStations(prev => [...prev, station]);
  };

  // Función para añadir un deseo
  const addDesire = (desire: Desire) => {
    setDesires(prev => [...prev, desire]);
  };

  // Función para eliminar un deseo
  const removeDesire = (desireId: string) => {
    setDesires(prev => prev.filter(d => d.id !== desireId));
  };

  // Función para añadir un evento
  const addEvent = (event: GameEvent) => {
    setEvents(prev => [...prev, event]);
  };

  // Función para eliminar un evento
  const removeEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  // Función para añadir un pasajero al tren
  const addTrainPassenger = (passenger: Passenger) => {
    if (trainPassengers.length < trainCapacity) {
      setTrainPassengers(prev => [...prev, passenger]);
      removePassenger(passenger.id);
      
      // Incrementar contador de pasajeros recogidos para el sistema de niveles
      setPassengersCollected(prev => prev + 1);
      
      // Verificar si se ha alcanzado el objetivo para subir de nivel
      if (passengersCollected + 1 >= passengersToNextLevel) {
        levelUp();
      }
    }
  };
  
  // Función para subir de nivel
  const levelUp = () => {
    const newLevel = playerLevel + 1;
    setPlayerLevel(newLevel);
    
    // Calcular el número de pasajeros necesarios para el siguiente nivel
    // Nueva escala: nivel 1: 5, nivel 2: 10, nivel 3: 15, nivel 4: 20, nivel 5: 30, etc.
    let nextLevelTarget;
    switch (newLevel) {
      case 2: nextLevelTarget = 10; break;  // Para pasar al nivel 3
      case 3: nextLevelTarget = 15; break;  // Para pasar al nivel 4
      case 4: nextLevelTarget = 20; break;  // Para pasar al nivel 5
      case 5: nextLevelTarget = 30; break;  // Para pasar al nivel 6
      case 6: nextLevelTarget = 40; break;  // Para pasar al nivel 7
      case 7: nextLevelTarget = 50; break;  // Para pasar al nivel 8
      case 8: nextLevelTarget = 60; break;  // Para pasar al nivel 9
      case 9: nextLevelTarget = 70; break;  // Para pasar al nivel 10
      case 10: nextLevelTarget = 100; break; // Para pasar al nivel 11 (si se implementa)
      default: nextLevelTarget = Math.floor(100 + (newLevel - 10) * 20); // Incremento de 20 por nivel después del 10
    }
    
    setPassengersToNextLevel(nextLevelTarget);
    setPassengersCollected(0); // Reiniciar contador para el nuevo nivel
    
    // Añadir mensaje de subida de nivel
    addMessage({
      id: uuidv4(),
      text: `¡Has subido al nivel ${newLevel}! Ahora necesitas recoger ${nextLevelTarget} pasajeros para el siguiente nivel.`,
      color: 'gold'
    });
    
    // Dar bonificación por subir de nivel
    setMoney(prev => prev + newLevel * 10); // Bonificación de dinero basada en el nivel
    setPoints(prev => prev + newLevel * 5);  // Bonificación de puntos basada en el nivel
  };

  // Función para eliminar un pasajero del tren
  const removeTrainPassenger = (passengerId: string) => {
    // Obtener el pasajero antes de eliminarlo
    const passenger = trainPassengers.find(p => p.id === passengerId);
    
    // Eliminar el pasajero del tren
    setTrainPassengers(prev => prev.filter(p => p.id !== passengerId));
    
    // Si encontramos el pasajero, lo añadimos a la lista de entregados
    if (passenger) {
      setDeliveredPassengers(prev => [...prev, passenger]);
      
      // Aumentar dinero y puntos por entregar un pasajero
      setMoney(prev => prev + 10);
      setPoints(prev => prev + 5);
      setHappiness(prev => Math.min(100, prev + 5));
    }
  };

  // Función para añadir un mensaje
  const addMessage = (message: GameMessage) => {
    setMessages(prev => [...prev, message]);
  };

  // Función para eliminar un mensaje
  const removeMessage = (messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  };

  // Función para reiniciar el juego
  const resetGame = () => {
    // Limpiar todos los pasajeros existentes
    setPassengers([]);
    setDesires([]);
    setEvents([]);
    setTrainPassengers([]);
    setDeliveredPassengers([]);
    
    // Desactivar generación de pasajeros hasta que se presione el botón
    setCanGeneratePassengers(false);
    
    // Reiniciar el estado de inicio del juego
    setGameStarted(false);
    
    // Mostrar la flecha de inicio
    setShowStartArrow(true);
    
    // Reiniciar el sistema de niveles
    setPlayerLevel(1); // Volver al nivel 1
    setGameStartTime(null);
    setPassengersCollected(0);
    setPassengersToNextLevel(5); // 5 pasajeros para pasar al nivel 2
    
    // Mostrar mensaje informativo
    addMessage({
      id: uuidv4(),
      text: '¡Juego reiniciado! Pulsa el botón dorado INICIAR para que los pasajeros comiencen a llegar a las estaciones.',
      color: '#FFD700' // Color dorado
    });
  };

  // Función para mejorar la velocidad del tren
  const upgradeSpeed = () => {
    if (money >= 30) {
      setMoney(money - 30);
      setTrainSpeed(75);
      addMessage({
        id: uuidv4(),
        text: '¡Velocidad del tren mejorada! Ahora es un 50% más rápido.',
        color: 'green'
      });
    }
  };

  // Función para añadir una nueva estación
  const addNewStation = () => {
    if (money >= 20 && trainPosition) {
      setMoney(money - 20);
      
      // Crear una nueva estación en una posición aleatoria cercana
      const randomOffset = () => (Math.random() * 0.01) - 0.005; // Aproximadamente 0.5km
      const newStation: Station = {
        id: uuidv4(),
        name: `Estación Nueva`,
        position: {
          lat: trainPosition.lat + randomOffset(),
          lng: trainPosition.lng + randomOffset()
        },
        trackId: 'new-track',  // Asignar un ID de vía temporal
        color: '#' + Math.floor(Math.random()*16777215).toString(16) // Color aleatorio
      };
      
      addStation(newStation);
      setCanGeneratePassengers(true);
      
      addMessage({
        id: uuidv4(),
        text: '¡Nueva estación añadida! Los pasajeros comenzarán a aparecer pronto.',
        color: 'blue'
      });
    }
  };

  // Efecto para detectar cuando el dinero llega a 2000
  useEffect(() => {
    if (money >= 2000 && !hasUnlocked && stations.length >= 2) {
      setHasUnlocked(true);
      setTrainCapacity(2);
      
      // Añadir mensajes de desbloqueo
      addMessage({
        id: uuidv4(),
        text: '¡Nueva línea morada desbloqueada!',
        color: 'purple'
      });
      
      addMessage({
        id: uuidv4(),
        text: '¡Capacidad aumentada! Ahora puedes llevar 2 pasajeros.',
        color: 'green'
      });
    }
  }, [money, hasUnlocked, stations.length]);

  // Efecto para generar deseos cada 3 minutos
  useEffect(() => {
    if (stations.length < 2) return;
    
    const generateDesire = () => {
      if (stations.length >= 2) {
        // Seleccionar estaciones de origen y destino aleatorias
        let originIndex = Math.floor(Math.random() * stations.length);
        let destinationIndex;
        do {
          destinationIndex = Math.floor(Math.random() * stations.length);
        } while (destinationIndex === originIndex);
        
        const originStation = stations[originIndex];
        const destinationStation = stations[destinationIndex];
        
        // Crear descripción basada en el tipo de área
        let description = '';
        if (areaType === 'neighborhood') {
          description = `Los residentes de ${placeName} quieren ir a ${destinationStation.name} para trabajar.`;
        } else if (areaType === 'commercial') {
          description = `Los compradores en ${placeName} quieren ir a ${destinationStation.name} para un evento de compras.`;
        } else {
          description = `Los residentes de ${placeName} quieren ir a ${destinationStation.name} para un festival local.`;
        }
        
        // Añadir el deseo al estado
        addDesire({
          id: uuidv4(),
          description,
          originStation,
          destinationStation,
          passengersRequired: 3,
          passengersDelivered: 0,
          timeLimit: 120,
          timeRemaining: 120
        });
      }
    };
    
    // Generar un deseo cada 3 minutos
    const desireInterval = setInterval(generateDesire, 180000);
    
    // Limpiar el intervalo al desmontar
    return () => clearInterval(desireInterval);
  }, [stations, placeName, areaType]);

  // Efecto para actualizar el tiempo restante de los deseos
  useEffect(() => {
    if (desires.length === 0) return;
    
    const updateDesires = () => {
      setDesires(prev => 
        prev.map(desire => {
          if (desire.timeRemaining <= 0) {
            // Si el tiempo se acabó, reducir la felicidad
            setHappiness(h => Math.max(0, h - 1));
            
            // Añadir mensaje de deseo fallido
            addMessage({
              id: uuidv4(),
              text: `¡Deseo fallido! -1% Felicidad`,
              color: 'red'
            });
            
            // Eliminar el deseo
            return { ...desire, timeRemaining: -1 };
          }
          return { ...desire, timeRemaining: desire.timeRemaining - 1 };
        }).filter(desire => desire.timeRemaining >= 0)
      );
    };
    
    // Actualizar los deseos cada segundo
    const desireTimer = setInterval(updateDesires, 1000);
    
    // Limpiar el intervalo al desmontar
    return () => clearInterval(desireTimer);
  }, [desires]);

  // Efecto para generar eventos locales cada 5 minutos
  useEffect(() => {
    if (stations.length === 0) return;
    
    const generateEvent = () => {
      // Seleccionar una estación aleatoria
      const stationIndex = Math.floor(Math.random() * stations.length);
      const affectedStation = stations[stationIndex];
      
      // Seleccionar un tipo de evento aleatorio
      const eventType = Math.random() > 0.5 ? 'cultural' : 'traffic';
      let description = '';
      let duration = 0;
      
      if (eventType === 'cultural') {
        description = `Evento cultural en ${affectedStation.name}: doble de pasajeros durante 1 minuto`;
        duration = 60;
        setCanGeneratePassengers(true);
      } else {
        description = `Tráfico en ${affectedStation.name}: velocidad reducida al 50% durante 30 segundos`;
        duration = 30;
        setTrainSpeed(trainSpeed * 0.5);
      }
      
      // Añadir el evento al estado
      addEvent({
        id: uuidv4(),
        description,
        duration,
        type: eventType,
        affectedStation
      });
      
      // Añadir mensaje de evento
      addMessage({
        id: uuidv4(),
        text: description,
        color: 'orange'
      });
    };
    
    // Generar un evento cada 5 minutos
    const eventInterval = setInterval(generateEvent, 300000);
    
    // Limpiar el intervalo al desmontar
    return () => clearInterval(eventInterval);
  }, [stations, trainSpeed]);

  // Efecto para actualizar la duración de los eventos
  useEffect(() => {
    if (events.length === 0) return;
    
    const updateEvents = () => {
      setEvents(prev => 
        prev.map(event => {
          if (event.duration <= 0) {
            // Si el evento terminó, restaurar los valores normales
            if (event.type === 'traffic') {
              setTrainSpeed(50);
            }
            
            // Eliminar el evento
            return { ...event, duration: -1 };
          }
          return { ...event, duration: event.duration - 1 };
        }).filter(event => event.duration >= 0)
      );
    };
    
    // Actualizar los eventos cada segundo
    const eventTimer = setInterval(updateEvents, 1000);
    
    // Limpiar el intervalo al desmontar
    return () => clearInterval(eventTimer);
  }, [events]);



  // Función para iniciar la generación de pasajeros
  const startGame = () => {
    // Limpiar cualquier pasajero existente antes de comenzar
    setPassengers([]);
    
    // Activar la generación de pasajeros
    setGameStarted(true);
    setCanGeneratePassengers(true);
    setShowStartArrow(false);
    
    // Establecer la primera estación como estación personal
    if (stations.length > 0) {
      const personalStationId = stations[0].id;
      // Actualizar el estado global de la estación personal
      setPersonalStationId(personalStationId);
      console.log(`Estableciendo estación personal: ${personalStationId}, Nombre: ${stations[0].name}`);
    }
    
    // Inicializar el sistema de niveles
    setPlayerLevel(1); // Empezamos en nivel 1
    setGameStartTime(Date.now());
    setPassengersCollected(0);
    setPassengersToNextLevel(5); // 5 pasajeros para pasar al nivel 2
    
    // Añadir mensaje de inicio
    addMessage({
      id: uuidv4(),
      text: 'Los pasajeros comenzarán a llegar a las estaciones. Recoge 5 pasajeros para subir al nivel 2.',
      color: '#FFD700' // Color dorado
    });
  };
  
  // Efecto para mostrar la flecha y un mensaje inicial cuando se inicia el componente
  useEffect(() => {
    if (!gameStarted) {
      // Mostrar la flecha después de un breve retraso
      const arrowTimer = setTimeout(() => {
        setShowStartArrow(true);
        
        // Añadir mensaje inicial que indique al jugador que debe pulsar el botón dorado
        addMessage({
          id: uuidv4(),
          text: '¡Bienvenido! Pulsa el botón dorado INICIAR para que los pasajeros comiencen a llegar a las estaciones.',
          color: '#FFD700' // Color dorado
        });
      }, 1000);
      
      return () => clearTimeout(arrowTimer);
    }
  }, [gameStarted]);
  
  // Efecto para generar pasajeros progresivamente después de pulsar el botón de inicio
  useEffect(() => {
    // No generar pasajeros si no hay suficientes estaciones, si no se puede generar pasajeros o si el juego no ha comenzado
    if (stations.length < 2 || !canGeneratePassengers || !gameStarted) return;
    
    // Al iniciar el juego, limpiar cualquier pasajero existente para asegurar que empezamos desde cero
    if (gameStarted && passengers.length > 0) {
      setPassengers([]);
    }
    
    const generatePassengers = () => {
      // Obtener la hora actual para ajustar la generación de pasajeros
      const currentHour = new Date().getHours();
      const isDaytime = currentHour >= 7 && currentHour < 19; // Día: 7am-7pm
      
      // Calcular el tiempo transcurrido desde el inicio del juego (en minutos)
      const gameTimeMinutes = gameStartTime ? Math.floor((Date.now() - gameStartTime) / 60000) : 0;
      
      // Ajustar el máximo de pasajeros según la dificultad del juego
      let difficultyMultiplier;
      if (playerLevel <= 1) { // Tutorial y nivel fácil
        difficultyMultiplier = 0.5;
      } else if (playerLevel <= 3) { // Niveles medios
        difficultyMultiplier = 0.7;
      } else { // Niveles difíciles
        difficultyMultiplier = 1.0;
      }
      
      // Calcular el número total de pasajeros activos permitidos según el nivel y dificultad
      // Valores significativamente reducidos para todos los modos
      const maxTotalPassengers = Math.floor((2 + (playerLevel * 0.8)) * difficultyMultiplier);
      
      // Si ya hay demasiados pasajeros activos, no generar más
      if (passengers.filter(p => !p.isPickedUp).length >= maxTotalPassengers) {
        return;
      }
      
      // Ajustar la cantidad máxima de pasajeros por generación según nivel, hora y dificultad
      // Valores muy reducidos para evitar generación excesiva
      let maxPassengersPerGeneration;
      if (isDaytime) {
        // Durante el día: pocos pasajeros, escalando muy lentamente con el nivel
        maxPassengersPerGeneration = Math.floor((0.5 + (playerLevel - 2) * 0.2) * difficultyMultiplier);
      } else {
        // Durante la noche: casi ningún pasajero
        maxPassengersPerGeneration = Math.floor(((playerLevel - 2) * 0.1) * difficultyMultiplier);
      }
      
      // Asegurar que siempre haya al menos 1 pasajero en niveles superiores al tutorial
      maxPassengersPerGeneration = playerLevel > 0 ? Math.max(1, maxPassengersPerGeneration) : maxPassengersPerGeneration;
      
      // Para cada estación, generar pasajeros gradualmente (no todas las estaciones a la vez)
      // Seleccionar un subconjunto aleatorio de estaciones para esta generación
      // Probabilidad muy reducida de selección de estaciones para generar pasajeros
      const stationSelectionProbability = (0.05 + (playerLevel * 0.005)) * difficultyMultiplier; // Base muy reducida
      
      const stationsToGenerate = stations.filter(station => {
        // Verificar si es la estación personal/principal (donde reaparece el tren)
        const isPersonalStation = station.id === personalStationId;
        
        // No generar pasajeros en la estación personal/principal
        if (isPersonalStation) return false;
        
        // Probabilidad de selección basada en el nivel
        return Math.random() < stationSelectionProbability;
      });
      
      stationsToGenerate.forEach(station => {
        // Calcular cuántos pasajeros generar en esta estación
        const basePassengers = isDaytime ? 1 : 0;
        const numPassengers = Math.min(
          basePassengers + Math.floor(Math.random() * maxPassengersPerGeneration),
          maxPassengersPerGeneration
        );
        
        for (let i = 0; i < numPassengers; i++) {
          // Seleccionar la estación personal como destino para el objetivo del juego
          // Encontrar la estación personal
          const personalStation = stations.find(s => s.id === personalStationId);
          
          // Si no hay estación personal, seleccionar una aleatoria
          let destination;
          if (personalStation && Math.random() < 0.7) { // 70% de probabilidad de ir a la estación personal
            destination = personalStation;
          } else {
            // Seleccionar una estación de destino aleatoria (diferente a la de origen)
            let destinationIndex;
            do {
              destinationIndex = Math.floor(Math.random() * stations.length);
            } while (stations[destinationIndex].id === station.id);
            
            destination = stations[destinationIndex];
          }
          
          // Seleccionar un motivo aleatorio basado en la hora del día
          let motives;
          if (isDaytime) {
            motives = ['Ir al trabajo', 'Ir de compras', 'Asistir a un evento', 'Visitar a un amigo'];
          } else {
            motives = ['Volver a casa', 'Salir de fiesta', 'Visitar a un amigo', 'Turno nocturno'];
          }
          const motive = motives[Math.floor(Math.random() * motives.length)];
          
          // Añadir el pasajero al estado
          addPassenger({
            id: uuidv4(),
            origin: station,
            destination,
            motive,
            createdAt: Date.now(),
            position: { ...station.position },
            isPickedUp: false,
            offsetX: Math.random() * 10 - 5, // Offset aleatorio entre -5 y 5
            offsetY: Math.random() * 10 - 5, // Offset aleatorio entre -5 y 5
            animationOffset: Math.random() * Math.PI * 2 // Offset de animación aleatorio
          });
        }
      });
    };
    
    // Verificar si hay algún evento cultural activo
    const culturalEvent = events.find(e => e.type === 'cultural');
    
    // Generar un intervalo aleatorio entre 5 y 10 minutos para mayor realismo y menos frecuencia
    const getRandomInterval = () => {
      const minutes = Math.floor(Math.random() * 6) + 5; // 5 a 10 minutos
      return minutes * 60 * 1000; // Convertir a milisegundos
    };
    
    // Si hay un evento cultural, reducir el intervalo a la mitad
    const getNextInterval = () => culturalEvent ? getRandomInterval() / 2 : getRandomInterval();
    
    // Usar un timeout recursivo en lugar de setInterval para intervalos variables
    const scheduleNextGeneration = () => {
      const nextInterval = getNextInterval();
      return setTimeout(() => {
        generatePassengers();
        // Programar la siguiente generación con un nuevo intervalo aleatorio
        const nextTimeout = scheduleNextGeneration();
        // Guardar el timeout para limpiarlo después
        timeoutRefs.current.push(nextTimeout);
      }, nextInterval);
    };
    
    // Referencia para almacenar los timeouts y poder limpiarlos
    const timeoutRefs = { current: [] };
    
    // Generar el primer lote de pasajeros después de un retraso mayor para que sea más gradual
    const initialDelay = setTimeout(() => {
      // Generar menos pasajeros en la primera generación
      // Usamos una función temporal que simula un nivel más bajo
      const firstGenerationPassengers = () => {
        // Guardar temporalmente el nivel original
        const originalLevel = playerLevel;
        
        // Aplicar un modificador temporal para la primera generación
        // Esto reduce efectivamente el número de pasajeros generados
        const tempDifficultyMultiplier = 0.3; // Muy reducido para la primera generación
        
        // Calcular el número total de pasajeros activos permitidos (muy reducido)
        const maxTotalPassengers = Math.floor((1 + (originalLevel * 0.5)) * tempDifficultyMultiplier);
        
        // Si ya hay demasiados pasajeros activos, no generar más
        if (passengers.filter(p => !p.isPickedUp).length >= maxTotalPassengers) {
          return;
        }
        
        // Ajustar la cantidad máxima de pasajeros por generación (muy reducida)
        const maxPassengersPerGeneration = Math.max(1, Math.floor(0.5 * tempDifficultyMultiplier));
        
        // Probabilidad muy reducida de selección de estaciones
        const stationSelectionProbability = 0.03 * tempDifficultyMultiplier;
        
        // Seleccionar estaciones con probabilidad muy baja
        const stationsToGenerate = stations.filter(station => {
          const isPersonalStation = station.id === personalStationId;
          if (isPersonalStation) return false;
          return Math.random() < stationSelectionProbability;
        });
        
        // Generar muy pocos pasajeros en las estaciones seleccionadas
        stationsToGenerate.forEach(station => {
          // Máximo 1 pasajero por estación en la primera generación
          const numPassengers = Math.random() < 0.3 ? 1 : 0;
          
          if (numPassengers > 0) {
            // Seleccionar destino
            const personalStation = stations.find(s => s.id === personalStationId);
            let destination;
            
            if (personalStation && Math.random() < 0.7) {
              destination = personalStation;
            } else {
              let destinationIndex;
              do {
                destinationIndex = Math.floor(Math.random() * stations.length);
              } while (stations[destinationIndex].id === station.id);
              
              destination = stations[destinationIndex];
            }
            
            // Seleccionar motivo
            const currentHour = new Date().getHours();
            const isDaytime = currentHour >= 7 && currentHour < 19;
            const motives = isDaytime 
              ? ['Ir al trabajo', 'Ir de compras', 'Asistir a un evento', 'Visitar a un amigo']
              : ['Volver a casa', 'Salir de fiesta', 'Visitar a un amigo', 'Turno nocturno'];
            
            const motive = motives[Math.floor(Math.random() * motives.length)];
            
            // Añadir el pasajero
            addPassenger({
              id: uuidv4(),
              origin: station,
              destination,
              motive,
              createdAt: Date.now(),
              position: { ...station.position },
              isPickedUp: false,
              offsetX: Math.random() * 10 - 5,
              offsetY: Math.random() * 10 - 5,
              animationOffset: Math.random() * Math.PI * 2
            });
          }
        });
      };
      
      // Ejecutar la generación inicial con menos pasajeros
      firstGenerationPassengers();
      
      // Programar la siguiente generación normal
      const firstTimeout = scheduleNextGeneration();
      timeoutRefs.current.push(firstTimeout);
    }, 60000); // Retraso inicial de 1 minuto
    
    // Limpiar todos los timeouts al desmontar
    return () => {
      clearTimeout(initialDelay);
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    };
  }, [stations, canGeneratePassengers, events, gameStarted, passengers.length]);

  // Efecto para gestionar el tiempo de espera de los pasajeros y el límite máximo por estación
  useEffect(() => {
    if (!gameStarted || passengers.length === 0) return;
    
    // Definir el tiempo máximo de espera según la dificultad (en milisegundos)
    const maxWaitingTime = {
      easy: 5 * 60 * 1000, // 5 minutos en modo fácil
      medium: 4 * 60 * 1000, // 4 minutos en modo medio
      hard: 3 * 60 * 1000 // 3 minutos en modo difícil
    };
    
    // Definir el máximo de pasajeros por estación según la dificultad (valores reducidos)
    const maxPassengersPerStation = {
      easy: 2,
      medium: 3,
      hard: 5
    };
    
    // Comprobar cada segundo si hay pasajeros que han esperado demasiado tiempo
    const interval = setInterval(() => {
      const currentTime = Date.now();
      let passengersUpdated = false;
      
      // Contar pasajeros por estación
      const stationPassengerCount: Record<string, number> = {};
      passengers.forEach(passenger => {
        if (!passenger.isPickedUp) {
          const stationId = passenger.origin.id;
          stationPassengerCount[stationId] = (stationPassengerCount[stationId] || 0) + 1;
        }
      });
      
      // Filtrar pasajeros que han esperado demasiado tiempo o exceden el límite por estación
      const updatedPassengers = passengers.filter(passenger => {
        // Si ya está recogido, mantenerlo
        if (passenger.isPickedUp) return true;
        
        const waitingTime = currentTime - passenger.createdAt;
        const stationId = passenger.origin.id;
        const stationCount = stationPassengerCount[stationId] || 0;
        
        // Comprobar si ha esperado demasiado tiempo
        if (waitingTime > maxWaitingTime[difficulty]) {
          // El pasajero se va por esperar demasiado tiempo
          setHappiness(prev => Math.max(0, prev - 1)); // Reducir felicidad
          passengersUpdated = true;
          
          // Mostrar mensaje
          addMessage({
            id: uuidv4(),
            text: `Un pasajero se ha ido de ${passenger.origin.name} por esperar demasiado tiempo.`,
            color: 'amber'
          });
          
          return false;
        }
        
        // Si la estación tiene demasiados pasajeros y este es uno de los más antiguos que excede el límite
        if (stationCount > maxPassengersPerStation[difficulty]) {
          // Ordenar pasajeros de esta estación por tiempo de creación (más antiguos primero)
          const stationPassengers = passengers
            .filter(p => !p.isPickedUp && p.origin.id === stationId)
            .sort((a, b) => a.createdAt - b.createdAt);
          
          // Índice de este pasajero en la lista ordenada
          const passengerIndex = stationPassengers.findIndex(p => p.id === passenger.id);
          
          // Si este pasajero está entre los que exceden el límite (los más antiguos se quedan)
          if (passengerIndex >= maxPassengersPerStation[difficulty]) {
            passengersUpdated = true;
            return false;
          }
        }
        
        return true;
      });
      
      // Actualizar el estado de los pasajeros si ha habido cambios
      if (passengersUpdated) {
        setPassengers(updatedPassengers);
      }
    }, 1000); // Comprobar cada segundo
    
    return () => clearInterval(interval);
  }, [gameStarted, passengers, difficulty, addMessage]);


  // Valor del contexto
  const value = {
    money,
    points,
    happiness,
    passengers,
    stations,
    desires,
    events,
    difficulty,
    trainCapacity,
    placeName,
    areaType,
    trainPosition,
    trainPassengers,
    hasUnlocked,
    messages,
    trainSpeed,
    canGeneratePassengers,
    deliveredPassengers,
    gameStarted,
    showStartArrow,
    personalStationId,
    playerLevel,
    gameStartTime,
    passengersToNextLevel,
    passengersCollected,
    setMoney,
    setPoints,
    setHappiness,
    addPassenger,
    removePassenger,
    addStation,
    addDesire,
    removeDesire,
    addEvent,
    removeEvent,
    setPlaceName,
    setAreaType,
    setTrainCapacity,
    setTrainPosition,
    addTrainPassenger,
    removeTrainPassenger,
    addMessage,
    removeMessage,
    setTrainSpeed,
    setCanGeneratePassengers,
    resetGame,
    upgradeSpeed,
    addNewStation,
    startGame,
    setPersonalStationId,
    setDifficulty
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

// Hook personalizado para usar el contexto
export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame debe ser usado dentro de un GameProvider');
  }
  return context;
};
