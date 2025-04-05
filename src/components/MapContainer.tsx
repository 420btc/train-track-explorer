
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer as LeafletMap, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import TrainMarker from './TrainMarker';
import StationMarker from './StationMarker';
import { toast } from 'sonner';
import { Coordinates, TrackSegment } from '@/lib/mapUtils';
import PassengerSystem, { Passenger } from './PassengerSystem';
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
  currentTrackId: string;
  onTrainMove: (position: Coordinates, trackId: string) => void;
  speed: number;
  onTrackSelect: (trackId: string) => void;
  mapStyle?: 'street' | 'satellite';
  isTrainMoving: boolean;
  activePassengers: Passenger[];
  pickedUpPassengers: Passenger[];
  onPassengerPickup: (passenger: Passenger) => void;
  onPassengerDelivery: (passenger: Passenger) => void;
  onPassengerExpired: (passenger: Passenger) => void;
  setActivePassengers: Dispatch<SetStateAction<Passenger[]>>;
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
  mapStyle = 'street',
  isTrainMoving,
  activePassengers,
  pickedUpPassengers,
  onPassengerPickup,
  onPassengerDelivery,
  onPassengerExpired,
  setActivePassengers
}) => {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const animationFrameRef = useRef(null);

  // Handle station click
  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    toast.info(`Estación: ${station.name}`);
  };

  // Handle track click
  const handleTrackClick = (trackId: string) => {
    onTrackSelect(trackId);
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
        
        {/* Render tracks */}
        {tracks.map((track) => (
          <Polyline
            key={track.id}
            positions={track.path.map(p => [p.lat, p.lng])}
            pathOptions={{ 
              color: track.color,
              // Usar un ancho consistente de 4 para todas las vías, excepto la seleccionada que será 6
              weight: track.id === currentTrackId ? 6 : 4,
              opacity: track.id === currentTrackId ? 1 : 0.8
            }}
            eventHandlers={{
              click: () => handleTrackClick(track.id)
            }}
          />
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
  setActivePassengers
}) => {
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Generar pasajeros cada 30 segundos
  useEffect(() => {
    // Inicializar estaciones con canGenerate si no está definido
    stations.forEach(station => {
      if (station.canGenerate === undefined) {
        station.canGenerate = Math.random() > 0.5;
      }
    });
    
    const generatePassengers = () => {
      const newPassengers: Passenger[] = [];
      
      stations.forEach(station => {
        if (station.canGenerate) {
          // Generar entre 1 y 6 pasajeros por estación
          const passengerCount = Math.floor(Math.random() * 6) + 1;
          
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
        }
      });
      
      setActivePassengers(prev => [...prev, ...newPassengers]);
    };
    
    // Generar pasajeros iniciales
    generatePassengers();
    
    // Configurar intervalo para generar pasajeros
    const intervalId = setInterval(generatePassengers, 30000);
    
    return () => clearInterval(intervalId);
  }, [stations, setActivePassengers]);

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
      
      // Dibujar pasajeros
      activePassengers.forEach(passenger => {
        // Convertir lat/lng a coordenadas de píxeles
        const latLng = L.latLng(passenger.position.lat, passenger.position.lng);
        const point = map.latLngToContainerPoint(latLng);
        
        // Aplicar offset animado (pequeño movimiento en círculo)
        const time = Date.now() * 0.001; // Convertir a segundos para una animación más suave
        const animX = Math.sin(time + passenger.animationOffset) * 2;
        const animY = Math.cos(time + passenger.animationOffset) * 2;
        
        // Dibujar pasajero (punto verde, 1/3 del tamaño de las estaciones)
        ctx.beginPath();
        ctx.arc(
          point.x + passenger.offsetX + animX, 
          point.y + passenger.offsetY + animY, 
          4, // Radio de 4px (estaciones son 12px)
          0, 
          Math.PI * 2
        );
        ctx.fillStyle = '#22c55e'; // Color verde
        ctx.fill();
        ctx.strokeStyle = '#166534'; // Borde verde oscuro
        ctx.lineWidth = 1;
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
  }, [map, activePassengers]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 pointer-events-none z-10"
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
