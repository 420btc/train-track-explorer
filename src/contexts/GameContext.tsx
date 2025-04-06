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
  const [canGeneratePassengers, setCanGeneratePassengers] = useState<boolean>(true);
  const [deliveredPassengers, setDeliveredPassengers] = useState<Passenger[]>([]);

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
    }
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
    setMoney(1000);
    setPoints(0);
    setHappiness(0);
    setPassengers([]);
    setDesires([]);
    setEvents([]);
    setTrainCapacity(1);
    setTrainPassengers([]);
    setHasUnlocked(false);
    setTrainSpeed(50);
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

  // Efecto para generar pasajeros cada 30 segundos
  useEffect(() => {
    if (stations.length < 2 || !canGeneratePassengers) return;
    
    const generatePassengers = () => {
      // Para cada estación, generar 1-4 pasajeros
      stations.forEach(station => {
        // Verificar si es la estación principal/inicial (donde reaparece el tren)
        const isMainStation = (
          station.id === 'central-station' || 
          station.id === 'main-station' || 
          station.id === 'starting-station' || 
          station.id.includes('main') || 
          (trainPosition && station.position.lat === trainPosition.lat && station.position.lng === trainPosition.lng)
        );
        
        // No generar pasajeros en la estación principal
        if (isMainStation) return;
        
        const numPassengers = Math.floor(Math.random() * 4) + 1;
        
        for (let i = 0; i < numPassengers; i++) {
          // Seleccionar una estación de destino aleatoria (diferente a la de origen)
          let destinationIndex;
          do {
            destinationIndex = Math.floor(Math.random() * stations.length);
          } while (stations[destinationIndex].id === station.id);
          
          const destination = stations[destinationIndex];
          
          // Seleccionar un motivo aleatorio
          const motives = ['Ir al trabajo', 'Visitar a un amigo', 'Ir de compras', 'Asistir a un evento'];
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
    
    // Limpiar el intervalo al desmontar
    return () => clearInterval(passengerInterval);
  }, [stations, canGeneratePassengers, events]);

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
    addNewStation
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
