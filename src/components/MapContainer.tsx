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
  personalStationId
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
            {/* Efecto de resplandor para la vía seleccionada */}
            {track.id === selectedTrackId && (
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
                weight: track.id === selectedTrackId ? 10 : track.id === currentTrackId ? 8 : 6,
                opacity: track.id === selectedTrackId ? 1 : 0.8
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
                weight: track.id === selectedTrackId ? 8 : track.id === currentTrackId ? 6 : 4,
                opacity: track.id === selectedTrackId ? 1 : track.id === currentTrackId ? 1 : 0.9
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
  canGeneratePassengers = false // Valor por defecto
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
    
    const generatePassengers = () => {
      // Si el juego no ha comenzado o no se pueden generar pasajeros, no generar
      if (!gameStarted || !canGeneratePassengers) {
        return;
      }
      
      const newPassengers: Passenger[] = [];
      
      // Seleccionar solo algunas estaciones para generar pasajeros (más realista)
      const stationsToGenerate = stations.filter(station => {
        if (!station.canGenerate) return false;
        // Solo generar en algunas estaciones cada vez (30% de probabilidad)
        return Math.random() < 0.3;
      });
      
      stationsToGenerate.forEach(station => {
        // Generar entre 1 y 4 pasajeros por estación (reducido para ser más realista)
        const passengerCount = Math.floor(Math.random() * 4) + 1;
        
        for (let i = 0; i < passengerCount; i++) {
          // Encontrar una estación de destino aleatoria diferente del origen
          const availableDestinations = stations.filter(s => s.id !== station.id);
          if (availableDestinations.length === 0) continue;
          
          const destination = availableDestinations[Math.floor(Math.random() * availableDestinations.length)];
          
          // Crear offset aleatorio dentro de un radio de 5px
          const offsetX = (Math.random() * 10 - 5);
          const offsetY = (Math.random() * 10 - 5);
          const animationOffset = Math.random() * Math.PI * 2; // Punto de inicio aleatorio para la animación
          
          // Crear pasajero con posición offset
          const passenger: Passenger = {
            id: `passenger-${station.id}-${Date.now()}-${i}`,
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
        }
      });
      
      setActivePassengers(prev => [...prev, ...newPassengers]);
    };
    
    // NO generar pasajeros iniciales automáticamente
    // Configurar intervalo para generar pasajeros
    const intervalId = setInterval(generatePassengers, 30000);
    
    // Generar el primer lote de pasajeros después de un breve retraso para que sea gradual
    const initialDelay = setTimeout(generatePassengers, 2000);
    
    return () => {
      clearInterval(intervalId);
      clearTimeout(initialDelay);
    };
  }, [stations, setActivePassengers, gameStarted, canGeneratePassengers, activePassengers.length]);

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
