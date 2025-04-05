
import React, { useState, useEffect, useCallback } from 'react';
import MapContainer from './MapContainer';
import GameHeader from './GameHeader';
import SearchBar from './SearchBar';
import { 
  DEFAULT_COORDINATES, 
  DEFAULT_ZOOM,
  generateTrackNetwork, 
  generateStations, 
  Coordinates,
  TrackSegment
} from '@/lib/mapUtils';
import { toast } from 'sonner';

const TrainGame: React.FC = () => {
  const [mapCenter, setMapCenter] = useState<Coordinates>(DEFAULT_COORDINATES);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [tracks, setTracks] = useState<TrackSegment[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [trainPosition, setTrainPosition] = useState<Coordinates>(DEFAULT_COORDINATES);
  const [currentTrackId, setCurrentTrackId] = useState<string>("");
  const [trainSpeed, setTrainSpeed] = useState<number>(50);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const initializeGame = useCallback(async (center: Coordinates) => {
    setIsLoading(true);
    try {
      // Generar la red de vías basada en calles reales
      const trackNetwork = await generateTrackNetwork(center);
      setTracks(trackNetwork);
      
      // Generar estaciones a lo largo de las vías
      const stationsList = generateStations(trackNetwork);
      setStations(stationsList);
      
      // Inicializar la posición del tren en la primera vía
      if (trackNetwork.length > 0) {
        const firstTrack = trackNetwork[0];
        setTrainPosition(firstTrack.path[0]);
        setCurrentTrackId(firstTrack.id);
      }
      
      toast.success("¡Mapa cargado con calles reales!");
    } catch (error) {
      console.error("Error initializing game:", error);
      toast.error("Error al cargar el mapa");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Inicializar el juego al cargar
  useEffect(() => {
    initializeGame(DEFAULT_COORDINATES);
  }, [initializeGame]);

  // Manejar la búsqueda de direcciones
  const handleSearch = useCallback(async (coordinates: Coordinates) => {
    setMapCenter(coordinates);
    setMapZoom(DEFAULT_ZOOM);
    
    // Reiniciar el juego con la nueva ubicación
    await initializeGame(coordinates);
  }, [initializeGame]);

  // Manejar el movimiento del tren
  const handleTrainMove = useCallback((position: Coordinates, trackId: string) => {
    setTrainPosition(position);
    setCurrentTrackId(trackId);
  }, []);

  // Manejar el cambio de velocidad
  const handleSpeedChange = useCallback((speed: number) => {
    setTrainSpeed(speed);
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <GameHeader 
        speed={trainSpeed} 
        onSpeedChange={handleSpeedChange} 
      />
      <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      
      {isLoading ? (
        <div className="flex items-center justify-center flex-grow">
          <div className="text-xl text-primary animate-pulse">Cargando mapa con calles reales...</div>
        </div>
      ) : (
        <MapContainer 
          center={mapCenter}
          zoom={mapZoom}
          tracks={tracks}
          stations={stations}
          trainPosition={trainPosition}
          currentTrackId={currentTrackId}
          onTrainMove={handleTrainMove}
          speed={trainSpeed}
        />
      )}
    </div>
  );
};

export default TrainGame;
