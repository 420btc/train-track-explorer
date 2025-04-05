
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
import { Train, Menu, MapPin, Locate } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import UserProfile from './UserProfile';
import TrackLegend from './TrackLegend';

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
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');

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
  
  // Manejar la obtención de la ubicación actual
  const handleGetCurrentLocation = useCallback(async () => {
    if (!navigator.geolocation) {
      toast.error("Tu navegador no soporta la geolocalización");
      return;
    }
    
    setIsLoading(true);
    toast.info("Obteniendo tu ubicación actual...");
    
    try {
      // Obtener la ubicación actual del usuario
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        });
      });
      
      const coordinates: Coordinates = {
        lat: position.coords.latitude,
        lng: position.coords.longitude
      };
      
      setMapCenter(coordinates);
      setMapZoom(DEFAULT_ZOOM);
      
      // Generar vías de tren aleatoriamente por las calles cercanas
      toast.success("Ubicación encontrada. Generando vías de tren...");
      await initializeGame(coordinates);
    } catch (error) {
      console.error("Error obteniendo la ubicación:", error);
      toast.error("No se pudo obtener tu ubicación. Verifica los permisos de tu navegador.");
      setIsLoading(false);
    }
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
      <div className="absolute top-4 left-4 z-50">
        <div className="bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-primary/20 flex items-center gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[300px] sm:w-[400px]">
              <div className="py-4">
                <h2 className="text-lg font-medium">Train Maps</h2>
                <p className="text-sm text-muted-foreground">Explorador de redes ferroviarias</p>
                
                <div className="mt-6 space-y-4">
                  <Button 
                    className="w-full justify-start" 
                    variant="ghost"
                    onClick={() => {
                      toast.info("Buscando ciudades cercanas...");
                      // Aquí se implementaría la funcionalidad real
                    }}
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    Explorar ciudades
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="ghost"
                    onClick={() => {
                      toast.info("Cargando rutas guardadas...");
                      // Aquí se implementaría la funcionalidad real
                    }}
                  >
                    <Train className="mr-2 h-4 w-4" />
                    Mis rutas
                  </Button>
                </div>
              </div>
              <UserProfile />
            </SheetContent>
          </Sheet>
          
          <div className="flex items-center">
            <Train className="h-4 w-4 text-primary mr-1" />
            <h1 className="text-sm font-bold">Train Maps</h1>
          </div>
        </div>
      </div>

      {/* Panel de control unificado en la esquina superior derecha */}
      <div className="absolute top-4 right-4 z-50 max-w-xs">
        <div className="bg-background/80 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-primary/20">
          <div className="flex flex-col gap-2">
            {/* Fila superior: Búsqueda y ubicación */}
            <div className="flex gap-1 items-center">
              <div className="flex-grow">
                <SearchBar onSearch={handleSearch} isLoading={isLoading} />
              </div>
              <Button 
                variant="default" 
                size="icon" 
                className="h-8 w-8 bg-blue-500 hover:bg-blue-600 text-white flex-shrink-0"
                onClick={handleGetCurrentLocation}
                disabled={isLoading}
                title="Usar mi ubicación actual"
              >
                <Locate className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Fila inferior: Control de velocidad */}
            <div className="px-1">
              <GameHeader 
                speed={trainSpeed} 
                onSpeedChange={handleSpeedChange} 
              />
            </div>
          </div>
        </div>
      </div>
      
      <div className="relative flex-grow">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-xl text-primary animate-pulse">Cargando mapa con calles reales...</div>
          </div>
        ) : (
          <>
            <div className="absolute inset-0 z-0">
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
                mapStyle={mapStyle}
              />
            </div>
            
            {/* Leyenda de las vías como componente independiente */}
            <div className="absolute left-4 bottom-36 z-50">
              <TrackLegend tracks={tracks} />
            </div>
            
            {/* Panel de control superpuesto (50% más pequeño) */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center z-50 pointer-events-none">
              <div className="bg-background/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-primary/20 w-full max-w-xs mx-4 pointer-events-auto">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex w-full justify-between items-center mb-1">
                    <h3 className="text-sm font-semibold text-primary">Control de Tren</h3>
                    <Button 
                      onClick={() => setMapStyle(mapStyle === 'street' ? 'satellite' : 'street')}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                    >
                      {mapStyle === 'street' ? 'Ver Satélite' : 'Ver Calles'}
                    </Button>
                  </div>
                  <Button 
                    onClick={handleMoveTrainClick}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                    size="default"
                  >
                    <Train className="h-4 w-4 mr-2" />
                    Mover Tren
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    {selectedTrack ? `Vía actual: ${selectedTrack.id}` : 'Selecciona una vía'}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TrainGame;
