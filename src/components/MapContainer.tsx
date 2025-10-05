import React, { useEffect, useRef, useState } from 'react';
import { MapContainer as LeafletMap, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import TrainMarker from './TrainMarker';
import StationMarker from './StationMarker';
import { toast } from 'sonner';
import { Coordinates, TrackSegment } from '@/lib/mapUtils';
import PassengerSystem, { Passenger } from './PassengerSystem';
import './TrackEffects.css'; // Importar los estilos para efectos de vías
import { Dispatch, SetStateAction } from 'react';

// Helper component to update map view
interface MapControllerProps {
  center: Coordinates;
  zoom: number;
}

function MapController({ center, zoom }: MapControllerProps) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  return null;
}

interface Station {
  id: string;
  name: string;
  position: Coordinates;
  trackId: string;
  color?: string;
  canGenerate?: boolean;
}

interface MapContainerProps {
  center: Coordinates;
  zoom: number;
  tracks: TrackSegment[];
  stations: Station[];
  trainPosition: Coordinates;
  currentTrackId?: string;
  onTrainMove?: (position: Coordinates, trackId: string) => void;
  speed?: number;
  onTrackSelect?: (trackId: string) => void;
  onTrackClick?: (track: TrackSegment) => void;
  mapStyle?: 'street' | 'satellite';
  isTrainMoving?: boolean;
  activePassengers?: Passenger[];
  pickedUpPassengers?: Passenger[];
  onPassengerPickup?: (passenger: Passenger) => void;
  onPassengerDelivery?: (passenger: Passenger) => void;
  onPassengerExpired?: (passenger: Passenger) => void;
  setActivePassengers?: Dispatch<SetStateAction<Passenger[]>>;
  difficulty?: 'easy' | 'medium' | 'hard';
  currentLevel?: {
    id: number;
    name: string;
    passengerFrequency: number;
    maxPassengers: number;
    trainCapacity?: number;
  };
  trainCapacity?: number;
  gameStarted?: boolean; // Añadir propiedad para controlar si el juego ha comenzado
  canGeneratePassengers?: boolean; // Añadir propiedad para controlar si se pueden generar pasajeros
  personalStationId?: string; // Nueva propiedad para identificar la estación personal
  highlightedTrack?: TrackSegment | null; // Nueva propiedad para la vía resaltada
  autoMode?: boolean; // Nueva propiedad para saber si el tren está en modo automático
}

const MapContainer: React.FC<MapContainerProps> = ({ 
  center,
  zoom,
  tracks,
  stations,
  trainPosition,
  currentTrackId,
  onTrainMove,
  speed,
  onTrackSelect,
  onTrackClick,
  mapStyle = 'street',
  isTrainMoving = false,
  activePassengers = [],
  pickedUpPassengers = [],
  onPassengerPickup,
  onPassengerDelivery,
  onPassengerExpired,
  setActivePassengers,
  difficulty = 'medium',
  currentLevel,
  trainCapacity = 4,
  gameStarted = false,
  canGeneratePassengers = false,
  personalStationId,
  highlightedTrack = null,
  autoMode = false
}) => {
  // Usar useEffect para la depuración en lugar de hacerlo durante el renderizado
  useEffect(() => {
    if (personalStationId) {
      console.log('MapContainer - personalStationId:', personalStationId);
      console.log('Estación personal encontrada:', stations.find(s => s.id === personalStationId)?.name);
    }
  }, [personalStationId, stations]);
  
  // Estado para la estación seleccionada
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  
  // Estado para la vía seleccionada y su temporizador
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);
  const [trackHighlightTimer, setTrackHighlightTimer] = useState<NodeJS.Timeout | null>(null);
  
  const animationFrameRef = useRef(null);

  // Handle station click
  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    toast.info(`Estación: ${station.name}`);
  };

  // Handle track click
  const handleTrackClick = (trackId: string) => {
    // Establecer la vía seleccionada
    setSelectedTrackId(trackId);
    
    // Limpiar cualquier temporizador existente
    if (trackHighlightTimer) {
      clearTimeout(trackHighlightTimer);
    }
    
    // Establecer un temporizador para quitar el resaltado después de 1.5 segundos
    const timer = setTimeout(() => {
      setSelectedTrackId(null);
    }, 1500);
    
    // Guardar la referencia al temporizador
    setTrackHighlightTimer(timer);
    
    // Llamar a las funciones de callback si existen
    if (onTrackSelect) {
      onTrackSelect(trackId);
    }
    
    // Si se proporciona onTrackClick, buscar el track y llamar a la función
    if (onTrackClick) {
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        onTrackClick(track);
      }
    }
  };

  return (
    <div className="flex-grow relative">
      <LeafletMap 
        center={[center.lat, center.lng]} 
        zoom={zoom} 
        className="h-full w-full"
        zoomControl={false}
      >
        {mapStyle === 'street' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}
        <MapController center={center} zoom={zoom} />
        
        {/* Ordenar las vías para que la vía seleccionada aparezca al final (encima) */}
        {[...tracks]
          .sort((a, b) => {
            // Si la vía A es la seleccionada, ponerla al final (encima)
            if (a.id === selectedTrackId) return 1;
            // Si la vía B es la seleccionada, ponerla al final (encima)
            if (b.id === selectedTrackId) return -1;
            // Mantener el orden original para las demás vías
            return 0;
          })
          .map((track) => (
          <div key={track.id} style={{ display: 'contents' }}>
            {/* Efecto de resplandor para la vía seleccionada o resaltada */}
            {(track.id === selectedTrackId || (highlightedTrack && track.id === highlightedTrack.id)) && (
              <Polyline
                positions={track.path.map(p => [p.lat, p.lng])}
                pathOptions={{ 
                  color: 'white',
                  weight: 14,
                  opacity: 0.5,
                  className: 'track-glow-effect'
                }}
              />
            )}
            
            {/* White outline layer */}
            <Polyline
              positions={track.path.map(p => [p.lat, p.lng])}
              pathOptions={{ 
                color: 'white',
                weight: (track.id === selectedTrackId || (highlightedTrack && track.id === highlightedTrack.id)) ? 10 : track.id === currentTrackId ? 8 : 6,
                opacity: (track.id === selectedTrackId || (highlightedTrack && track.id === highlightedTrack.id)) ? 1 : 0.8
              }}
              eventHandlers={{
                click: () => handleTrackClick(track.id)
              }}
            />
            {/* Colored track layer */}
            <Polyline
              positions={track.path.map(p => [p.lat, p.lng])}
              pathOptions={{ 
                color: track.color,
                weight: (track.id === selectedTrackId || (highlightedTrack && track.id === highlightedTrack.id)) ? 8 : track.id === currentTrackId ? 6 : 4,
                opacity: (track.id === selectedTrackId || (highlightedTrack && track.id === highlightedTrack.id)) ? 1 : track.id === currentTrackId ? 1 : 0.9
              }}
              eventHandlers={{
                click: () => handleTrackClick(track.id)
              }}
            />
          </div>
        ))}
        
        {/* Render stations */}
        {stations.map((station) => {
          // Filtrar pasajeros esperando en esta estación
          const stationPassengers = activePassengers.filter(p => 
            p.origin.id === station.id && !p.isPickedUp
          );
          
          return (
            <StationMarker
              key={station.id}
              station={station}
              position={[station.position.lat, station.position.lng]}
              onClick={() => handleStationClick(station)}
              waitingPassengers={stationPassengers}
              isPersonalStation={station.id === personalStationId} // Añadir propiedad isPersonalStation
            />
          );
        })}
        
        {/* Render train */}
        {trainPosition && (
          <TrainMarker
            position={[trainPosition.lat, trainPosition.lng]}
            trackId={currentTrackId}
          />
        )}
        
        {/* Sistema de pasajeros */}
        <PassengerSystemController
          stations={stations}
          trainPosition={trainPosition}
          isTrainMoving={isTrainMoving}
          onPassengerPickup={onPassengerPickup}
          onPassengerDelivery={onPassengerDelivery}
          onPassengerExpired={onPassengerExpired}
          pickedUpPassengers={pickedUpPassengers}
          activePassengers={activePassengers}
          setActivePassengers={setActivePassengers}
          difficulty={difficulty}
          currentLevel={currentLevel}
          trainCapacity={trainCapacity}
          gameStarted={gameStarted} // Pasar el estado del juego
          canGeneratePassengers={canGeneratePassengers} // Pasar si se pueden generar pasajeros
        />
      </LeafletMap>
      
      {/* Station info popup */}
      {selectedStation && (
        <div className="absolute bottom-4 left-4 bg-background border rounded-md p-3 shadow-md max-w-xs">
          <h3 className="font-medium">{selectedStation.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Línea: {selectedStation.trackId}
          </p>
          <button 
            onClick={() => setSelectedStation(null)}
            className="absolute top-1 right-1 text-muted-foreground text-xs"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

// Componente para manejar el sistema de pasajeros dentro del mapa
interface PassengerSystemControllerProps {
  stations: Station[];
  trainPosition: Coordinates;
  isTrainMoving: boolean;
  onPassengerPickup: (passenger: Passenger) => void;
  onPassengerDelivery: (passenger: Passenger) => void;
  onPassengerExpired: (passenger: Passenger) => void;
  pickedUpPassengers: Passenger[];
  activePassengers: Passenger[];
  setActivePassengers: Dispatch<SetStateAction<Passenger[]>>;
  difficulty: 'easy' | 'medium' | 'hard';
  currentLevel?: {
    id: number;
    name: string;
    passengerFrequency: number;
    maxPassengers: number;
  };
  trainCapacity?: number;
  gameStarted: boolean; // Añadir propiedad para controlar si el juego ha comenzado
  canGeneratePassengers: boolean; // Añadir propiedad para controlar si se pueden generar pasajeros
  personalStationId?: string; // ID de la estación personal del jugador
}

const PassengerSystemController: React.FC<PassengerSystemControllerProps> = ({
  stations,
  trainPosition,
  isTrainMoving,
  onPassengerPickup,
  onPassengerDelivery,
  onPassengerExpired,
  pickedUpPassengers,
  activePassengers,
  setActivePassengers,
  difficulty,
  currentLevel,
  trainCapacity = 4,
  gameStarted = false, // Valor por defecto
  canGeneratePassengers = false, // Valor por defecto
  personalStationId // Estación personal
}) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Generar pasajeros cada 30 segundos, pero solo si el juego ha comenzado
  useEffect(() => {
    // Si el juego no ha comenzado o no se pueden generar pasajeros, no hacer nada
    if (!gameStarted || !canGeneratePassengers) {
      // Limpiar los pasajeros existentes si hay alguno
      if (activePassengers.length > 0) {
        setActivePassengers([]);
      }
      return;
    }
    
    // Inicializar estaciones con canGenerate si no está definido
    stations.forEach(station => {
      if (station.canGenerate === undefined) {
        station.canGenerate = Math.random() > 0.5;
      }
    });
    
    // Variable para controlar si es la primera generación
    const isFirstGeneration = { current: true };
    
    const generatePassengers = () => {
      // Si el juego no ha comenzado o no se pueden generar pasajeros, no generar
      if (!gameStarted || !canGeneratePassengers) {
        return;
      }
      
      // Determinar si es la primera generación
      const firstGen = isFirstGeneration.current;
      if (firstGen) {
        isFirstGeneration.current = false;
      }
      
      // Definir límites máximos de pasajeros por estación según la dificultad
      const maxPassengersPerStation = {
        easy: 2,
        medium: 3,
        hard: 5
      };
      
      // Contar pasajeros actuales por estación
      const stationPassengerCount: Record<string, number> = {};
      activePassengers.forEach(passenger => {
        if (!passenger.isPickedUp) {
          const stationId = passenger.origin.id;
          stationPassengerCount[stationId] = (stationPassengerCount[stationId] || 0) + 1;
        }
      });
      
      const newPassengers: Passenger[] = [];
      
      // Seleccionar solo algunas estaciones para generar pasajeros (probabilidad muy reducida)
      const stationsToGenerate = stations.filter(station => {
        // Si es la estación personal, no generar pasajeros
        if (personalStationId && station.id === personalStationId) return false;
        
        // Si no puede generar pasajeros, saltar
        if (!station.canGenerate) return false;
        
        // Verificar si la estación ya tiene el máximo de pasajeros según la dificultad
        const currentCount = stationPassengerCount[station.id] || 0;
        if (currentCount >= maxPassengersPerStation[difficulty]) return false;
        
        // Probabilidad muy baja de generar pasajeros (5% en fácil, 8% en medio, 10% en difícil)
        const generationProbability = {
          easy: 0.05,
          medium: 0.08,
          hard: 0.10
        };
        
        return Math.random() < generationProbability[difficulty];
      });
      
      // Limitar el número total de estaciones que generan pasajeros a la vez
      const maxStationsToGenerate = {
        easy: 1,
        medium: 2,
        hard: 3
      };
      
      // Seleccionar estaciones para generar pasajeros
      let selectedStations;
      
      if (firstGen) {
        // En la primera generación, seleccionar más estaciones para garantizar pasajeros iniciales
        // Pero asegurarse de que no sean demasiadas
        const initialStationCount = Math.min(
          Math.ceil(stations.length * 0.3), // 30% de las estaciones
          maxStationsToGenerate[difficulty] * 2 // El doble del límite normal
        );
        selectedStations = stationsToGenerate.sort(() => Math.random() - 0.5)
          .slice(0, initialStationCount);
      } else {
        // Generación normal
        selectedStations = stationsToGenerate.sort(() => Math.random() - 0.5)
          .slice(0, maxStationsToGenerate[difficulty]);
      }
      
      selectedStations.forEach(station => {
        // Verificar cuántos pasajeros ya hay en esta estación
        const currentCount = stationPassengerCount[station.id] || 0;
        const availableSlots = maxPassengersPerStation[difficulty] - currentCount;
        
        if (availableSlots <= 0) return; // No hay espacio para más pasajeros
        
        // Determinar cuántos pasajeros generar
        let passengerCount;
        
        if (firstGen) {
          // En la primera generación, mayor probabilidad de generar pasajeros
          passengerCount = Math.random() < 0.7 ? 1 : 0; // 70% de probabilidad de generar 1 pasajero
        } else {
          // Generación normal con baja probabilidad
          passengerCount = Math.random() < 0.3 ? 1 : 0; // 30% de probabilidad de generar 1 pasajero
        }
        
        if (passengerCount === 0) return; // No generar pasajeros esta vez
        
        // Encontrar una estación de destino aleatoria diferente del origen
        const availableDestinations = stations.filter(s => s.id !== station.id);
        if (availableDestinations.length === 0) return;
        
        // Preferir la estación personal como destino si existe
        let destination;
        if (personalStationId) {
          const personalStation = stations.find(s => s.id === personalStationId);
          if (personalStation && Math.random() < 0.7) { // 70% de probabilidad
            destination = personalStation;
          } else {
            destination = availableDestinations[Math.floor(Math.random() * availableDestinations.length)];
          }
        } else {
          destination = availableDestinations[Math.floor(Math.random() * availableDestinations.length)];
        }
        
        // Crear offset aleatorio dentro de un radio de 5px
        const offsetX = (Math.random() * 10 - 5);
        const offsetY = (Math.random() * 10 - 5);
        const animationOffset = Math.random() * Math.PI * 2; // Punto de inicio aleatorio para la animación
        
        // Crear pasajero con posición offset
        const passenger: Passenger = {
          id: `passenger-${station.id}-${Date.now()}`,
          origin: station,
          destination,
          position: {
            lat: station.position.lat,
            lng: station.position.lng
          },
          createdAt: Date.now(),
          isPickedUp: false,
          offsetX,
          offsetY,
          animationOffset
        };
        
        newPassengers.push(passenger);
        
        // Actualizar el contador local para evitar generar demasiados pasajeros
        stationPassengerCount[station.id] = (stationPassengerCount[station.id] || 0) + 1;
      });
      
      // Añadir los nuevos pasajeros al estado
      if (newPassengers.length > 0) {
        setActivePassengers(prev => [...prev, ...newPassengers]);
      }
    };
    
    // Usar timeouts variables en lugar de intervalos fijos para una generación más realista
    const timeoutRefs = { current: [] as ReturnType<typeof setTimeout>[] };
    
    // Función para programar la próxima generación con un intervalo aleatorio
    const scheduleNextGeneration = () => {
      // Intervalo base de 2-3 minutos (mucho más lento que antes)
      const baseInterval = difficulty === 'easy' ? 180000 : difficulty === 'medium' ? 150000 : 120000;
      const randomVariation = Math.floor(Math.random() * 60000); // Variación de hasta 1 minuto
      const nextInterval = baseInterval + randomVariation;
      
      const timeoutId = setTimeout(() => {
        generatePassengers();
        
        // Verificar si necesitamos generar pasajeros mínimos
        setTimeout(() => {
          ensureMinimumPassengers();
        }, 5000); // Verificar 5 segundos después de la generación normal
        
        const nextTimeoutId = scheduleNextGeneration();
        timeoutRefs.current.push(nextTimeoutId);
      }, nextInterval);
      
      return timeoutId;
    };
    
    // Función para garantizar un mínimo de pasajeros en las estaciones
    const ensureMinimumPassengers = () => {
      // Si ya hay suficientes pasajeros, no hacer nada
      const currentPassengerCount = activePassengers.filter(p => !p.isPickedUp).length;
      
      if (currentPassengerCount >= 3) return; // Ya hay suficientes pasajeros
      
      // Determinar cuántos pasajeros necesitamos generar
      const passengersToGenerate = 3 - currentPassengerCount;
      
      // Filtrar estaciones que pueden generar pasajeros
      const availableStations = stations.filter(station => {
        if (!station.canGenerate) return false;
        if (personalStationId && station.id === personalStationId) return false;
        
        // Contar pasajeros actuales en esta estación
        const stationPassengers = activePassengers.filter(p => 
          !p.isPickedUp && p.origin.id === station.id
        ).length;
        
        // Verificar si la estación ya tiene el máximo de pasajeros según la dificultad
        const maxPassengersPerStation = {
          easy: 2,
          medium: 3,
          hard: 5
        };
        
        return stationPassengers < maxPassengersPerStation[difficulty];
      });
      
      if (availableStations.length === 0) return; // No hay estaciones disponibles
      
      // Seleccionar estaciones aleatorias para generar pasajeros
      const selectedStations = availableStations
        .sort(() => Math.random() - 0.5)
        .slice(0, Math.min(passengersToGenerate, availableStations.length));
      
      const newPassengers: Passenger[] = [];
      
      selectedStations.forEach(station => {
        // Encontrar una estación de destino aleatoria diferente del origen
        const availableDestinations = stations.filter(s => s.id !== station.id);
        if (availableDestinations.length === 0) return;
        
        // Preferir la estación personal como destino si existe
        let destination;
        if (personalStationId) {
          const personalStation = stations.find(s => s.id === personalStationId);
          if (personalStation && Math.random() < 0.7) { // 70% de probabilidad
            destination = personalStation;
          } else {
            destination = availableDestinations[Math.floor(Math.random() * availableDestinations.length)];
          }
        } else {
          destination = availableDestinations[Math.floor(Math.random() * availableDestinations.length)];
        }
        
        // Crear offset aleatorio dentro de un radio de 5px
        const offsetX = (Math.random() * 10 - 5);
        const offsetY = (Math.random() * 10 - 5);
        const animationOffset = Math.random() * Math.PI * 2;
        
        // Crear pasajero con posición offset
        const passenger: Passenger = {
          id: `passenger-${station.id}-${Date.now()}-min`,
          origin: station,
          destination,
          position: {
            lat: station.position.lat,
            lng: station.position.lng
          },
          createdAt: Date.now(),
          isPickedUp: false,
          offsetX,
          offsetY,
          animationOffset
        };
        
        newPassengers.push(passenger);
      });
      
      if (newPassengers.length > 0) {
        setActivePassengers(prev => [...prev, ...newPassengers]);
        console.log(`Generados ${newPassengers.length} pasajeros mínimos para asegurar jugabilidad`);
      }
    };
    
    // Generar el primer lote de pasajeros después de un breve retraso para que sea gradual (5 segundos)
    const initialDelay = setTimeout(() => {
      // Primera generación con menos pasajeros
      generatePassengers();
      
      // Asegurar un mínimo de pasajeros
      ensureMinimumPassengers();
      
      // Programar las siguientes generaciones con intervalos más largos
      const firstScheduledTimeout = scheduleNextGeneration();
      timeoutRefs.current.push(firstScheduledTimeout);
    }, 5000);
    
    timeoutRefs.current.push(initialDelay);
    
    return () => {
      // Limpiar todos los timeouts al desmontar
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    };
  }, [stations, setActivePassengers, gameStarted, canGeneratePassengers, activePassengers.length, difficulty, personalStationId]);

  // Efecto adicional para verificar periódicamente si hay suficientes pasajeros
  useEffect(() => {
    if (!gameStarted || !canGeneratePassengers) return;
    
    // Función para garantizar un mínimo de pasajeros en las estaciones
    const checkAndEnsureMinimumPassengers = () => {
      const currentPassengerCount = activePassengers.filter(p => !p.isPickedUp).length;
      
      // Si hay menos de 3 pasajeros, generar más
      if (currentPassengerCount < 3) {
        console.log(`Verificación periódica: Solo hay ${currentPassengerCount} pasajeros. Generando más...`);
        
        // Si ya hay suficientes pasajeros, no hacer nada
        if (currentPassengerCount >= 3) return; // Ya hay suficientes pasajeros
        
        // Determinar cuántos pasajeros necesitamos generar
        const passengersToGenerate = 3 - currentPassengerCount;
        
        // Filtrar estaciones que pueden generar pasajeros
        const availableStations = stations.filter(station => {
          if (!station.canGenerate) return false;
          if (personalStationId && station.id === personalStationId) return false;
          
          // Contar pasajeros actuales en esta estación
          const stationPassengers = activePassengers.filter(p => 
            !p.isPickedUp && p.origin.id === station.id
          ).length;
          
          // Verificar si la estación ya tiene el máximo de pasajeros según la dificultad
          const maxPassengersPerStation = {
            easy: 2,
            medium: 3,
            hard: 5
          };
          
          return stationPassengers < maxPassengersPerStation[difficulty];
        });
        
        if (availableStations.length === 0) return; // No hay estaciones disponibles
        
        // Seleccionar estaciones aleatorias para generar pasajeros
        const selectedStations = availableStations
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(passengersToGenerate, availableStations.length));
        
        const newPassengers: Passenger[] = [];
        
        selectedStations.forEach(station => {
          // Encontrar una estación de destino aleatoria diferente del origen
          const availableDestinations = stations.filter(s => s.id !== station.id);
          if (availableDestinations.length === 0) return;
          
          // Preferir la estación personal como destino si existe
          let destination;
          if (personalStationId) {
            const personalStation = stations.find(s => s.id === personalStationId);
            if (personalStation && Math.random() < 0.7) { // 70% de probabilidad
              destination = personalStation;
            } else {
              destination = availableDestinations[Math.floor(Math.random() * availableDestinations.length)];
            }
          } else {
            destination = availableDestinations[Math.floor(Math.random() * availableDestinations.length)];
          }
          
          // Crear offset aleatorio dentro de un radio de 5px
          const offsetX = (Math.random() * 10 - 5);
          const offsetY = (Math.random() * 10 - 5);
          const animationOffset = Math.random() * Math.PI * 2;
          
          // Crear pasajero con posición offset
          const passenger: Passenger = {
            id: `passenger-${station.id}-${Date.now()}-min-periodic`,
            origin: station,
            destination,
            position: {
              lat: station.position.lat,
              lng: station.position.lng
            },
            createdAt: Date.now(),
            isPickedUp: false,
            offsetX,
            offsetY,
            animationOffset
          };
          
          newPassengers.push(passenger);
        });
        
        if (newPassengers.length > 0) {
          setActivePassengers(prev => [...prev, ...newPassengers]);
          console.log(`Generados ${newPassengers.length} pasajeros mínimos periódicos para asegurar jugabilidad`);
        }
      }
    };
    
    // Verificar inmediatamente al iniciar
    checkAndEnsureMinimumPassengers();
    
    // Verificar cada minuto si hay suficientes pasajeros
    const minimumPassengersInterval = setInterval(checkAndEnsureMinimumPassengers, 60000); // Verificar cada minuto
    
    return () => clearInterval(minimumPassengersInterval);
  }, [gameStarted, canGeneratePassengers, activePassengers, stations, difficulty, personalStationId, setActivePassengers]);
  
  // Manejar recogida, entrega y expiración de pasajeros
  useEffect(() => {
    const checkPassengerInteractions = () => {
      const currentTime = Date.now();
      
      setActivePassengers(prevPassengers => {
        return prevPassengers.filter(passenger => {
          // Omitir pasajeros ya recogidos
          if (passenger.isPickedUp) return true;
          
          // Verificar si el pasajero ha expirado (90 segundos)
          if (currentTime - passenger.createdAt > 90000) {
            onPassengerExpired(passenger);
            return false; // Eliminar del array
          }
          
          // Verificar si el tren está lo suficientemente cerca para recoger al pasajero
          const distance = calculateDistance(
            trainPosition.lat, 
            trainPosition.lng, 
            passenger.position.lat, 
            passenger.position.lng
          );
          
          if (distance <= 10) {
            onPassengerPickup(passenger);
            return false; // Eliminar del array activo
          }
          
          return true; // Mantener en el array
        });
      });
      
      // Verificar entregas de pasajeros
      pickedUpPassengers.forEach(passenger => {
        const destinationPos = passenger.destination.position;
        const distance = calculateDistance(
          trainPosition.lat, 
          trainPosition.lng, 
          destinationPos.lat, 
          destinationPos.lng
        );
        
        if (distance <= 10) {
          // Pasajero entregado
          onPassengerDelivery(passenger);
        }
      });
    };
    
    // Solo verificar interacciones cuando el tren no está en movimiento
    if (!isTrainMoving) {
      checkPassengerInteractions();
    }
  }, [trainPosition, isTrainMoving, onPassengerPickup, onPassengerDelivery, onPassengerExpired, pickedUpPassengers, setActivePassengers]);

  // Renderizar pasajeros en canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Establecer tamaño del canvas para que coincida con el contenedor del mapa
    const mapContainer = map.getContainer();
    canvas.width = mapContainer.clientWidth;
    canvas.height = mapContainer.clientHeight;
    
    const drawPassengers = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Dibujar directamente todos los pasajeros activos sin agrupar
      // Esto asegura que todos los pasajeros se muestren correctamente
      activePassengers.forEach((passenger, index) => {
        if (passenger.isPickedUp) return; // No dibujar pasajeros recogidos
        
        // Obtener la estación de origen del pasajero
        const station = passenger.origin;
        
        // Convertir coordenadas de la estación a píxeles
        const latLng = L.latLng(station.position.lat, station.position.lng);
        const point = map.latLngToContainerPoint(latLng);
        
        // Radio base más pequeño alrededor de la estación (más cerca de la bola roja)
        const baseRadius = 8; // Reducido de 15 a 8 para estar más cerca de la estación
        
        // Crear un movimiento aleatorio pero consistente para cada pasajero
        // Usamos el ID del pasajero para crear un offset único
        const passengerId = parseInt(passenger.id.replace(/\D/g, '').slice(-4)) || index;
        const uniqueOffset = passengerId / 1000;
        
        // Obtener el tiempo actual para la animación, pero más lento
        const currentTime = Date.now() * 0.0005; // Reducido a la mitad para movimiento más lento
        
        // Crear un patrón de movimiento más aleatorio y menos elíptico
        const time1 = currentTime + uniqueOffset;
        
        // Movimiento más aleatorio y menos predecible
        // Usamos un patrón más simple con variaciones pequeñas
        const randomAngle = time1 * 0.5 + (passengerId * Math.PI * 2) / 10;
        const randomDistance = (Math.sin(time1 * 0.2) * 0.2 + 0.8) * baseRadius; // Distancia variable entre 0.6 y 1.0 del radio base
        
        // Convertir a coordenadas cartesianas para un movimiento circular aleatorio
        const moveX = Math.cos(randomAngle) * randomDistance;
        const moveY = Math.sin(randomAngle) * randomDistance;
        
        // Dibujar pasajero (punto verde pequeño)
        ctx.beginPath();
        ctx.arc(
          point.x + moveX, 
          point.y + moveY, 
          2.5, // Radio más pequeño de 2.5px
          0, 
          Math.PI * 2
        );
        ctx.fillStyle = '#22c55e'; // Color verde
        ctx.fill();
        ctx.strokeStyle = '#166534'; // Borde verde oscuro
        ctx.lineWidth = 0.5; // Línea más fina
        ctx.stroke();
      });
      
      // Solicitar el siguiente frame de animación
      animationFrameRef.current = requestAnimationFrame(drawPassengers);
    };
    
    // Iniciar animación
    drawPassengers();
    
    // Limpiar
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [map, activePassengers, stations, trainPosition]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 pointer-events-none z-[1000]"
    />
  );
};

// Función auxiliar para calcular la distancia entre dos puntos en píxeles
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Cálculo simple de distancia euclidiana
  // Esta es una aproximación que funciona para distancias pequeñas
  const R = 6371; // Radio de la Tierra en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c * 1000; // Convertir a metros
  
  return distance;
}

export default MapContainer;
