import React, { useEffect, useState } from 'react';
import { useGame } from '@/contexts/GameContext';
import MapContainer from './MapContainer';
import { Coordinates, TrackSegment, Station } from '@/lib/mapUtils';
import { Button } from './ui/button';
import { Train, Menu, MapPin, Locate, Users, History, LogIn, User, Globe } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import StyledLoadingScreen from './StyledLoadingScreen';
import { toast } from 'sonner';
import CityExplorer from './CityExplorer';
import MyRoutes from './MyRoutes';
import AuthDialog from './AuthDialog';
import { getCurrentUser, saveRouteForCurrentUser, saveToRouteHistory } from '@/lib/authUtils';
import Sidebar from './Sidebar';
import GameBanners from './GameBanners';
import GameMessages from './GameMessages';
import { GameLevel } from '@/lib/levelSystem';

interface GameContentProps {
  mapCenter: Coordinates;
  mapZoom: number;
  tracks: TrackSegment[];
  stations: Station[];
  trainPosition: Coordinates;
  currentTrackId: string;
  trainSpeed: number;
  isLoading: boolean;
  trainMoving: boolean;
  currentPathIndex: number;
  selectedTrack: TrackSegment | null;
  mapStyle: 'street' | 'satellite';
  showCityExplorer: boolean;
  showMyRoutes: boolean;
  showAuthDialog: boolean;
  isLoggedIn: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  showPassengersList?: boolean;
  currentLevel: GameLevel;
  setShowCityExplorer: (show: boolean) => void;
  setShowMyRoutes: (show: boolean) => void;
  setShowAuthDialog: (show: boolean) => void;
  initializeGame: (coordinates: Coordinates) => Promise<void>;
  setMapStyle: (style: 'street' | 'satellite') => void;
  toggleTrainMovement: () => void;
  handleTrackClick: (track: TrackSegment) => void;
}

const GameContent: React.FC<GameContentProps> = ({
  mapCenter,
  mapZoom,
  tracks,
  stations,
  trainPosition,
  currentTrackId,
  trainSpeed,
  isLoading,
  trainMoving,
  currentPathIndex,
  selectedTrack,
  mapStyle,
  showCityExplorer,
  showMyRoutes,
  showAuthDialog,
  isLoggedIn,
  difficulty: propDifficulty,
  showPassengersList: propShowPassengersList,
  currentLevel,
  setShowCityExplorer,
  setShowMyRoutes,
  setShowAuthDialog,
  initializeGame,
  setMapStyle,
  toggleTrainMovement,
  handleTrackClick
}) => {
  const { 
    money, 
    points, 
    happiness, 
    addPassenger, 
    removePassenger, 
    trainPassengers,
    passengers,
    addMessage,
    addStation,
    setTrainPosition,
    setTrainSpeed,
    setCanGeneratePassengers
  } = useGame();

  // Usar los valores de props si existen, o los valores por defecto
  const [showPassengersList, setShowPassengersList] = useState<boolean>(propShowPassengersList || false);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(propDifficulty || 'medium');
  const [autoMode, setAutoMode] = useState<boolean>(false);
  
  // Ajustar la dificultad basada en el nivel actual
  useEffect(() => {
    // Ajustar la dificultad según el nivel
    if (currentLevel) {
      if (currentLevel.difficulty === 'tutorial' || currentLevel.difficulty === 'easy') {
        setDifficulty('easy');
      } else if (currentLevel.difficulty === 'medium') {
        setDifficulty('medium');
      } else {
        setDifficulty('hard');
      }
    }
  }, [currentLevel]);

  // Efecto para actualizar las estaciones en el contexto
  useEffect(() => {
    if (stations.length > 0) {
      // Actualizar las estaciones en el contexto
      stations.forEach(station => {
        addStation(station);
      });
    }
  }, [stations, addStation]);

  // Efecto para actualizar la posición del tren en el contexto
  useEffect(() => {
    setTrainPosition(trainPosition);
  }, [trainPosition, setTrainPosition]);

  // Efecto para actualizar la velocidad del tren en el contexto
  useEffect(() => {
    setTrainSpeed(trainSpeed);
  }, [trainSpeed, setTrainSpeed]);

  // Efecto para habilitar/deshabilitar la generación de pasajeros
  useEffect(() => {
    setCanGeneratePassengers(trainMoving);
  }, [trainMoving, setCanGeneratePassengers]);
  
  // Efecto para ajustar la frecuencia de generación de pasajeros según el nivel
  useEffect(() => {
    if (!currentLevel) return;
    
    // Mostrar información del nivel actual
    if (currentLevel && !isLoading) {
      toast.info(`Nivel ${currentLevel.id}: ${currentLevel.name}`, {
        description: currentLevel.description,
        duration: 5000
      });
    }
  }, [currentLevel, isLoading]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Banners de dinero, puntos y felicidad */}
      <div className="absolute top-0 left-0 right-0 z-10">
        <GameBanners />
      </div>
      
      {/* Mensajes animados */}
      <GameMessages />
      
      {/* Contenido principal */}
      <div className="flex h-full">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Mapa y controles */}
        <div className="flex-1 relative">
          {isLoading ? (
            <StyledLoadingScreen isVisible={true} />
          ) : (
            <>
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                tracks={tracks}
                stations={stations}
                trainPosition={trainPosition}
                mapStyle={mapStyle}
                onTrackClick={handleTrackClick}
              />
              
              {/* Panel de control inferior */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm border-t border-primary/20">
                <div className="flex items-center justify-between">
                  {/* Sección 1: Menú y controles principales */}
                  <div className="flex items-center space-x-2">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="h-8 w-8">
                          <Menu className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="left" className="w-[250px] sm:w-[300px]">
                        <div className="py-6">
                          <h2 className="text-lg font-semibold mb-4">Metro Español</h2>
                          <div className="space-y-2">
                            <Button 
                              onClick={() => setShowCityExplorer(true)}
                              variant="outline" 
                              className="w-full justify-start"
                            >
                              <Globe className="mr-2 h-4 w-4" />
                              Explorar Ciudades
                            </Button>
                            
                            <Button 
                              onClick={() => setShowMyRoutes(true)}
                              variant="outline" 
                              className="w-full justify-start"
                            >
                              <History className="mr-2 h-4 w-4" />
                              Mis Rutas
                            </Button>
                            
                            <Button 
                              onClick={() => setShowAuthDialog(true)}
                              variant="outline" 
                              className="w-full justify-start"
                            >
                              {isLoggedIn ? (
                                <>
                                  <User className="mr-2 h-4 w-4" />
                                  Mi Perfil
                                </>
                              ) : (
                                <>
                                  <LogIn className="mr-2 h-4 w-4" />
                                  Iniciar Sesión
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      </SheetContent>
                    </Sheet>
                    
                    <Button 
                      onClick={toggleTrainMovement}
                      variant={trainMoving ? "default" : "outline"}
                      size="sm"
                      className={`h-8 ${trainMoving ? 'bg-red-600 hover:bg-red-700' : ''}`}
                    >
                      <Train className="mr-2 h-4 w-4" />
                      {trainMoving ? 'Detener' : 'Iniciar'}
                    </Button>
                    
                    <Button 
                      onClick={() => setMapStyle(mapStyle === 'street' ? 'satellite' : 'street')}
                      variant="outline"
                      size="sm"
                      className="h-8"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {mapStyle === 'street' ? 'Satélite' : 'Calles'}
                    </Button>
                    
                    <Button 
                      onClick={() => setAutoMode(!autoMode)}
                      variant={autoMode ? "default" : "outline"}
                      size="sm"
                      className={`h-8 ${autoMode ? 'bg-green-600 hover:bg-green-700' : ''}`}
                    >
                      <Locate className="mr-2 h-4 w-4" />
                      {autoMode ? 'Auto: ON' : 'Auto: OFF'}
                    </Button>
                  </div>
                  
                  {/* Sección 2: Dificultad */}
                  <div className="flex-grow max-w-[150px] mx-4">
                    <div>
                      <h3 className="text-xs font-semibold text-primary mb-1">Dificultad</h3>
                      <div className="flex space-x-1">
                        <Button 
                          onClick={() => setDifficulty('easy')}
                          variant={difficulty === 'easy' ? "default" : "outline"}
                          size="sm"
                          className={`h-6 text-xs px-2 ${difficulty === 'easy' ? 'bg-green-600 hover:bg-green-700' : ''}`}
                        >
                          Fácil
                        </Button>
                        <Button 
                          onClick={() => setDifficulty('medium')}
                          variant={difficulty === 'medium' ? "default" : "outline"}
                          size="sm"
                          className={`h-6 text-xs px-2 ${difficulty === 'medium' ? 'bg-amber-600 hover:bg-amber-700' : ''}`}
                        >
                          Medio
                        </Button>
                        <Button 
                          onClick={() => setDifficulty('hard')}
                          variant={difficulty === 'hard' ? "default" : "outline"}
                          size="sm"
                          className={`h-6 text-xs px-2 ${difficulty === 'hard' ? 'bg-red-600 hover:bg-red-700' : ''}`}
                        >
                          Difícil
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Separador vertical */}
                  <div className="h-[60px] w-px bg-gray-200"></div>
                  
                  {/* Sección 4: Lista de pasajeros */}
                  <div className="flex-grow max-w-[150px]">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="text-xs font-semibold text-primary">Pasajeros</h3>
                      <Button
                        onClick={() => setShowPassengersList(!showPassengersList)}
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs px-2"
                      >
                        <Users className="h-3 w-3 mr-1" />
                        {showPassengersList ? '-' : '+'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Diálogos modales */}
      <CityExplorer 
        open={showCityExplorer} 
        onOpenChange={setShowCityExplorer} 
        onCitySelect={(coordinates) => {
          initializeGame(coordinates);
          toast.success("¡Cargando nueva ciudad!");
          
          // Guardar en historial
          const locationName = `Ciudad ${new Date().toLocaleDateString('es-ES')}`;
          if (getCurrentUser()) {
            saveRouteForCurrentUser(locationName, coordinates);
          } else {
            saveToRouteHistory({
              id: Date.now().toString(),
              name: locationName,
              coordinates,
              timestamp: Date.now()
            });
          }
        }}
      />
      
      <MyRoutes 
        open={showMyRoutes} 
        onOpenChange={setShowMyRoutes} 
        onRouteSelect={(coordinates) => {
          initializeGame(coordinates);
          toast.success("¡Cargando ruta guardada!");
        }}
      />
      
      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={(open) => {
          setShowAuthDialog(open);
          // Actualizar estado de login cuando se cierra el diálogo
          if (!open) {
            // Usamos isLoggedIn directamente ya que no tenemos setIsLoggedIn en este componente
            // Esta lógica debería estar en TrainGame.tsx
          }
        }}
      />
    </div>
  );
};

export default GameContent;
