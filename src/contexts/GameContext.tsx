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
}

// Crear el contexto
const GameContext = createContext<GameContextType | undefined>(undefined);

// Proveedor del contexto
export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Estado inicial
  const [money, setMoney] = useState<number>(1000);
  const [points, setPoints] = useState<number>(0);
  const [happiness, setHappiness] = useState<number>(0);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [desires, setDesires] = useState<Desire[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
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
    setMoney(prev => prev + newLevel * 100); // Bonificación de dinero basada en el nivel
    setPoints(prev => prev + newLevel * 50);  // Bonificación de puntos basada en el nivel
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
      setMoney(prev => prev + 100);
      setPoints(prev => prev + 50);
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
    if (money >= 1000) {
      setMoney(money - 1000);
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
    if (money >= 500 && trainPosition) {
      setMoney(money - 500);
      
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
      
      // Calcular el número total de pasajeros activos permitidos según el nivel
      // Nivel 2: máximo 10 pasajeros, Nivel 3: máximo 15, etc.
      const maxTotalPassengers = Math.floor(5 + (playerLevel * 2.5));
      
      // Si ya hay demasiados pasajeros activos, no generar más
      if (passengers.filter(p => !p.isPickedUp).length >= maxTotalPassengers) {
        return;
      }
      
      // Ajustar la cantidad máxima de pasajeros por generación según nivel y hora
      let maxPassengersPerGeneration;
      if (isDaytime) {
        // Durante el día: más pasajeros, escalando con el nivel
        maxPassengersPerGeneration = Math.floor(1 + (playerLevel - 2) * 0.7);
      } else {
        // Durante la noche: menos pasajeros
        maxPassengersPerGeneration = Math.floor((playerLevel - 2) * 0.5);
      }
      
      // Asegurar que siempre haya al menos 1 pasajero en niveles superiores
      maxPassengersPerGeneration = Math.max(1, maxPassengersPerGeneration);
      
      // Para cada estación, generar pasajeros gradualmente (no todas las estaciones a la vez)
      // Seleccionar un subconjunto aleatorio de estaciones para esta generación
      // La probabilidad de selección aumenta con el nivel del jugador
      const stationSelectionProbability = 0.2 + (playerLevel * 0.02); // 20% base + 2% por nivel
      
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
    const interval = culturalEvent ? 15000 : 30000; // 15s si hay evento cultural, 30s normalmente
    
    // Generar pasajeros cada 30 segundos (o 15s si hay evento cultural)
    const passengerInterval = setInterval(generatePassengers, interval);
    
    // Generar el primer lote de pasajeros después de un breve retraso para que sea gradual
    const initialDelay = setTimeout(generatePassengers, 2000);
    
    // Limpiar el intervalo y el timeout al desmontar
    return () => {
      clearInterval(passengerInterval);
      clearTimeout(initialDelay);
    };
  }, [stations, canGeneratePassengers, events, gameStarted, passengers.length]);

  // Valor del contexto
  const value = {
    money,
    points,
    happiness,
    passengers,
    stations,
    desires,
    events,
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
    setPersonalStationId
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
