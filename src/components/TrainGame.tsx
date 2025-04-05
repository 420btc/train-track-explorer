
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
  TrackSegment,
  findClosestTrack
} from '@/lib/mapUtils';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { Train, Menu, MapPin } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import UserProfile from './UserProfile';

const TrainGame: React.FC = () => {
  const [mapCenter, setMapCenter] = useState<Coordinates>(DEFAULT_COORDINATES);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [tracks, setTracks] = useState<TrackSegment[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [trainPosition, setTrainPosition] = useState<Coordinates>(DEFAULT_COORDINATES);
  const [currentTrackId, setCurrentTrackId] = useState<string>("");
  const [trainSpeed, setTrainSpeed] = useState<number>(50);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [trainMoving, setTrainMoving] = useState<boolean>(false);
  const [currentPathIndex, setCurrentPathIndex] = useState<number>(0);
  const [selectedTrack, setSelectedTrack] = useState<TrackSegment | null>(null);

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
        setSelectedTrack(firstTrack);
        setCurrentPathIndex(0);
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

  // Manejar click en el botón de movimiento del tren
  const handleMoveTrainClick = useCallback(() => {
    if (!selectedTrack || selectedTrack.path.length === 0) {
      toast.error("No hay vía seleccionada");
      return;
    }

    // Avanzar a la siguiente posición en la vía
    const nextIndex = (currentPathIndex + 1) % selectedTrack.path.length;
    setCurrentPathIndex(nextIndex);
    setTrainPosition(selectedTrack.path[nextIndex]);
    
    // Mostrar información sobre la posición
    if (nextIndex === selectedTrack.path.length - 1) {
      toast.info("El tren ha llegado al final de la vía");
    }
  }, [selectedTrack, currentPathIndex]);

  // Manejar la selección de una vía
  const handleTrackSelect = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      setSelectedTrack(track);
      setCurrentPathIndex(0);
      setTrainPosition(track.path[0]);
      setCurrentTrackId(track.id);
      toast.success(`Vía seleccionada: ${track.id}`);
    }
  }, [tracks]);

  return (
    <div className="flex flex-col h-screen">
      <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <div className="py-4">
                <h2 className="text-lg font-medium">Metro Español</h2>
                <p className="text-sm text-muted-foreground">Simulador de metro en ciudades españolas</p>
                
                <div className="mt-6 space-y-4">
                  <Button className="w-full justify-start" variant="ghost">
                    <MapPin className="mr-2 h-4 w-4" />
                    Explorar ciudades
                  </Button>
                  <Button className="w-full justify-start" variant="ghost">
                    <Train className="mr-2 h-4 w-4" />
                    Mis rutas
                  </Button>
                </div>
              </div>
              <UserProfile />
            </SheetContent>
          </Sheet>
          
          <div className="hidden md:flex items-center gap-2">
            <Train className="h-6 w-6" />
            <h1 className="text-xl font-bold">Metro Español</h1>
          </div>
        </div>
        
        <UserProfile />
      </div>

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
        <>
          <MapContainer 
            center={mapCenter}
            zoom={mapZoom}
            tracks={tracks}
            stations={stations}
            trainPosition={trainPosition}
            currentTrackId={currentTrackId}
            onTrainMove={handleTrainMove}
            speed={trainSpeed}
            onTrackSelect={handleTrackSelect}
          />
          
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <Button 
              onClick={handleMoveTrainClick}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              <Train className="h-5 w-5 mr-2" />
              Mover Tren
            </Button>
          </div>
        </>
      )}
    </div>
  );
};

export default TrainGame;
