import React, { useState, useEffect, useCallback, useRef } from 'react';
import MiniMap from './MiniMap';
import PassengerNotification from './PassengerNotification';
import { 
  DEFAULT_COORDINATES, 
  DEFAULT_ZOOM,
  generateTrackNetwork, 
  generateStations, 
  Coordinates,
  TrackSegment,
  Station,
  findClosestTrack,
  findConnectingTrack,
  ConnectingTrackInfo,
  geocodeAddress,
  calculateDistance
} from '@/lib/mapUtils';
import { toast } from 'sonner';
import GameStartButton from './GameStartButton';
import { GameProvider, Passenger, Desire, GameEvent, GameMessage, useGame } from '@/contexts/GameContext';
import GameContent from './GameContent';
import { getCurrentUser } from '@/lib/authUtils';
import { saveRouteToHistory } from '@/lib/routeUtils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Train, Menu, MapPin, Locate, Users, User, Globe, LogIn, History, Search, Star, HelpCircle, X } from 'lucide-react';
import MapContainer from './MapContainer';
import StyledLoadingScreen from './StyledLoadingScreen';
import CityExplorer from './CityExplorer';
import MyRoutes from './MyRoutes';
import AuthDialog from './AuthDialog';
import TrackLegend from './TrackLegend';
import PassengerList from './PassengerList';
import PassengerInfo from './PassengerInfo';
import GameHeader from './GameHeader';
import UserProfile from './UserProfile';
import GameTutorial from './GameTutorial';
import LevelSelector from './LevelSelector';
import LevelProgress from './LevelProgress';
import TrainSeatsModal from './TrainSeatsModal';
import { gameLevels, loadLevelProgress, saveLevelProgress, updateLevelObjectives, getCurrentLevel } from '@/lib/levelSystem';

interface TrainGameProps {
  initialCoordinates?: Coordinates;
}

const TrainGame: React.FC<TrainGameProps> = ({ initialCoordinates = DEFAULT_COORDINATES }) => {
  const [mapCenter, setMapCenter] = useState<Coordinates>(initialCoordinates);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [tracks, setTracks] = useState<TrackSegment[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [trainPosition, setTrainPosition] = useState<Coordinates>(DEFAULT_COORDINATES);
  const [currentTrackId, setCurrentTrackId] = useState<string>("");
  const [trainSpeed, setTrainSpeed] = useState<number>(50);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [trainMoving, setTrainMoving] = useState<boolean>(false);
  const [currentPathIndex, setCurrentPathIndex] = useState<number>(0);
  const [selectedTrack, setSelectedTrack] = useState<TrackSegment | null>(null);
  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('satellite');
  
  // Estado para controlar la dirección del tren en la vía actual
  const [isReversed, setIsReversed] = useState<boolean>(false);
  
  // Estados para los diálogos
  const [showCityExplorer, setShowCityExplorer] = useState<boolean>(false);
  const [showMyRoutes, setShowMyRoutes] = useState<boolean>(false);
  const [showAuthDialog, setShowAuthDialog] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  
  // Estados para el modo automático
  const [autoMode, setAutoMode] = useState<boolean>(false);
  
  // Estado para rastrear vías visitadas (evitar bucles)
  const [visitedTracks, setVisitedTracks] = useState<Set<string>>(new Set());

  // Estado para el modo de exploración completa (recorrer todas las vías)
  const [exploreAllMode, setExploreAllMode] = useState<boolean>(false);
  
  // La dificultad ahora se gestiona desde el contexto del juego
  
  // Estado para mostrar lista de pasajeros
  const [showPassengersList, setShowPassengersList] = useState<boolean>(false);
  
  // Estado para mostrar el minimapa
  const [showMiniMap, setShowMiniMap] = useState<boolean>(false);
  
  // Estado para la búsqueda
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Estados para el sistema de niveles y tutorial
  const [levels, setLevels] = useState(loadLevelProgress());
  const [currentLevel, setCurrentLevel] = useState(getCurrentLevel(loadLevelProgress()) || levels[0]);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false); // Estado para detectar si es la primera vez
  const [showLevelSelector, setShowLevelSelector] = useState(false);
  const [gameTime, setGameTime] = useState(0); // Tiempo de juego en segundos
  const [seatsModalVisible, setSeatsModalVisible] = useState(false); // Estado para el modal de asientos
  
  // Estados para pasajeros
  const [activePassengers, setActivePassengers] = useState<Passenger[]>([]);
  const [pickedUpPassengers, setPickedUpPassengers] = useState<Passenger[]>([]);
  const [trainCapacity, setTrainCapacity] = useState<number>(8); // Capacidad inicial del tren (ajustable dinámicamente)
  
  // Estados para el juego - valores iniciales basados en el nivel actual
  const [money, setMoney] = useState<number>(currentLevel?.initialMoney || 100);
  const [points, setPoints] = useState<number>(0);
  const [happiness, setHappiness] = useState<number>(currentLevel?.initialHappiness || 50);
  const [gameStarted, setGameStarted] = useState<boolean>(false);

  // Variable para controlar si es la primera carga del juego
  const isFirstLoad = useRef(true);
  // Variable para controlar si el tutorial ya se ha mostrado en esta sesión
  const tutorialShown = useRef(false);
  // Variable para controlar si estamos en modo búsqueda (para evitar mostrar el tutorial)
  const isSearchMode = useRef(false);
  
  // Estados para las notificaciones de pasajeros
  const [pickupNotification, setPickupNotification] = useState({ visible: false, count: 0 });
  const [dropoffNotification, setDropoffNotification] = useState({ visible: false, count: 0 });
  
  // Estado para la estación personal
  const [personalStationId, setPersonalStationId] = useState<string | null>(null);

  // Obtener el contexto del juego
  const gameContext = useGame();
  const { 
    canGeneratePassengers, 
    showStartArrow, 
    startGame: startGameContext,
    setCanGeneratePassengers,
    stations: contextStations,
    setPersonalStationId: setPersonalStationIdContext,
    difficulty,
    setDifficulty
  } = gameContext;

  // Función para establecer la estación personal
  const setPersonalStation = (stationId: string) => {
    setPersonalStationId(stationId);
    // Actualizar el estado global de la estación personal
    setPersonalStationIdContext(stationId);
  };

  // Efecto para establecer la estación personal cuando el juego comienza
  useEffect(() => {
    if (gameStarted && !personalStationId) {
      // Establecer la primera estación como estación personal
      if (contextStations.length > 0) {
        setPersonalStation(contextStations[0].id);
      }
    }
  }, [gameStarted, personalStationId, setPersonalStation, contextStations]);

  // Efecto para manejar el inicio del juego
  useEffect(() => {
    if (gameStarted && contextStations.length > 0) {
      // Iniciar el juego usando el contexto
      startGameContext();
      setCanGeneratePassengers(true);
    }
  }, [gameStarted, contextStations, startGameContext, setCanGeneratePassengers]);

  const initializeGame = useCallback(async (center: Coordinates) => {
    setIsLoading(true);
    
    // Verificar si es un usuario nuevo o si no hay progreso guardado
    // pero solo en la primera carga, no durante búsquedas
    if (isFirstLoad.current) {
      const savedProgress = loadLevelProgress();
      if (!savedProgress || savedProgress.length === 0) {
        setIsFirstTimeUser(true);
        // No mostrar el tutorial aquí, lo mostraremos después de cargar el mapa
      }
      isFirstLoad.current = false; // Marcar que ya no es la primera carga
    }
    
    // Siempre desactivar el tutorial durante las búsquedas o recargas
    if (!isFirstLoad.current) {
      setShowTutorial(false);
    }
    
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
      
      // Reiniciar valores del juego según el nivel actual
      if (currentLevel) {
        setMoney(currentLevel.initialMoney);
        setHappiness(currentLevel.initialHappiness || 50);
        setPoints(0);
        
        // Reiniciar objetivos del nivel
        const updatedLevels = [...levels];
        const levelIndex = updatedLevels.findIndex(l => l.id === currentLevel.id);
        if (levelIndex !== -1) {
          updatedLevels[levelIndex].objectives.forEach(obj => obj.current = 0);
          setLevels(updatedLevels);
          saveLevelProgress(updatedLevels);
        }
        
        toast.info(`Nivel ${currentLevel.id}: ${currentLevel.name} - €${currentLevel.initialMoney} iniciales`);
      }
      
      // El tutorial se mostrará después de que el mapa esté completamente cargado
      // Lo controlamos con un evento de carga completa en lugar de un temporizador
      // Esto se maneja en el useEffect que observa isLoading
    } catch (error) {
      console.error("Error initializing game:", error);
      toast.error("Error al cargar el mapa");
    } finally {
      setIsLoading(false);
      
      // Mostrar el tutorial siempre después de cargar el mapa, independientemente de si es usuario nuevo o no
      // Marcar que el tutorial ya se ha mostrado para evitar que aparezca de nuevo en esta sesión
      tutorialShown.current = true;
      
      // Mostrar el tutorial con un retraso para asegurar que el mapa esté completamente cargado
      setTimeout(() => {
        setShowTutorial(true);
      }, 1500); // 1.5 segundos de retraso
    }
  }, []);

  // Función para manejar la búsqueda de ubicaciones
  const handleSearchSubmit = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    // Marcar que estamos en modo búsqueda para evitar que aparezca el tutorial
    isSearchMode.current = true;
    // Asegurarse de que el tutorial esté cerrado durante las búsquedas
    setShowTutorial(false);
    
    if (!searchQuery.trim()) {
      toast.error('Por favor, introduce una ubicación');
      return;
    }
    
    setIsLoading(true);
    toast.info('Buscando ubicación...');
    
    try {
      // Buscar la dirección y obtener coordenadas usando la función geocodeAddress
      const coordinates = await geocodeAddress(searchQuery);
      
      // Verificar si son las coordenadas por defecto
      const isDefault = (
        Math.abs(coordinates.lat - DEFAULT_COORDINATES.lat) < 0.001 && 
        Math.abs(coordinates.lng - DEFAULT_COORDINATES.lng) < 0.001
      );
      
      if (isDefault) {
        toast.info(`No se encontró "${searchQuery}". Usando ubicación predeterminada.`);
      } else {
        toast.success(`Ubicación encontrada: ${searchQuery}`);
      }
      
      // Inicializar el juego con las coordenadas
      initializeGame(coordinates);
    } catch (error) {
      console.error('Error en la búsqueda:', error);
      toast.error('Error al buscar la ubicación');
      initializeGame(DEFAULT_COORDINATES);
    } finally {
      setIsLoading(false);
      setSearchQuery(''); // Limpiar el campo de búsqueda
    }
  };
  
  // Mostrar tutorial al iniciar si es el primer nivel
  useEffect(() => {
    if (currentLevel.id === 0 && !currentLevel.completed) {
      setShowTutorial(true);
    }
  }, [currentLevel]);
  
  // Temporizador para el tiempo de juego
  useEffect(() => {
    const timer = setInterval(() => {
      if (isLoading) return;
      setGameTime(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isLoading]);
  
  // Actualizar objetivos del nivel actual
  const updateCurrentLevelObjectives = () => {
    // Usar el hook useGame para acceder al contexto del juego
    const gameContext = useGame();
    if (!gameContext) return;
    
    const { money, happiness, deliveredPassengers } = gameContext;
    
    const updatedLevels = updateLevelObjectives(
      levels,
      currentLevel.id,
      [
        { type: 'money', value: money },
        { type: 'happiness', value: happiness },
        { type: 'passengers', value: deliveredPassengers.length },
        { type: 'time', value: gameTime }
      ]
    );
    
    setLevels(updatedLevels);
    
    // Actualizar nivel actual si ha cambiado
    const newCurrentLevel = getCurrentLevel(updatedLevels);
    if (newCurrentLevel && newCurrentLevel.id !== currentLevel.id) {
      setCurrentLevel(newCurrentLevel);
      // Solo mostrar tutorial si no estamos en modo búsqueda
      if (!isSearchMode.current) {
        setShowTutorial(true); // Mostrar tutorial del nuevo nivel
      }
    }
  };
  
  // Actualizar objetivos cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (isLoading) return;
      updateCurrentLevelObjectives();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isLoading, currentLevel, levels]);
  
  // Seleccionar un nivel
  const handleSelectLevel = (level: typeof levels[0]) => {
    if (!level.unlocked) return;
    
    setCurrentLevel(level);
    setShowLevelSelector(false);
    initializeGame(initialCoordinates); // Reiniciar el juego con el nuevo nivel
    // Solo mostrar tutorial si no estamos en modo búsqueda
    if (!isSearchMode.current) {
      setShowTutorial(true); // Mostrar tutorial del nivel seleccionado
    }
  };
  
  // Completar tutorial
  const handleCompleteTutorial = () => {
    toast.success(`¡Tutorial completado! Comienza a jugar el nivel ${currentLevel.name}`)
  };
  
  // Tiempo agotado
  const handleTimeUp = () => {
    toast.error('¡Se ha agotado el tiempo! Inténtalo de nuevo.');
    // Reiniciar nivel
    initializeGame(initialCoordinates);
  };
  
  // Inicializar el juego al cargar
  useEffect(() => {
    initializeGame(initialCoordinates);
    
    // Verificar si hay un usuario logueado
    const user = getCurrentUser();
    setIsLoggedIn(!!user);
    
    // Guardar esta ubicación en el historial
    const locationName = `Ubicación ${new Date().toLocaleDateString('es-ES')}`;
    if (user) {
      // Función para guardar ruta para el usuario actual (implementar en routeUtils)
      saveRouteToHistory(locationName, initialCoordinates, user.id);
    } else {
      // Función para guardar en el historial general (implementar en routeUtils)
      saveRouteToHistory(locationName, initialCoordinates);
    }
  }, [initializeGame, initialCoordinates]);
  

  
  // Función para mover el tren automáticamente
  const moveTrainAuto = useCallback(() => {
    // Si no hay vía seleccionada o la vía está vacía
    if (!selectedTrack || selectedTrack.path.length === 0) {
      // Si estamos en modo exploración completa, buscar una vía no visitada
      if (exploreAllMode) {
        // Buscar vías no visitadas
        const unvisitedTracks = tracks.filter(track => !visitedTracks.has(track.id));
        
        if (unvisitedTracks.length > 0) {
          // Seleccionar la vía no visitada más cercana
          let closestUnvisitedTrack = null;
          let minDistance = Infinity;
          
          unvisitedTracks.forEach(track => {
            // Calcular distancia al inicio de la vía
            const startDistance = calculateDistance(
              trainPosition,
              track.path[0]
            );
            
            if (startDistance < minDistance) {
              minDistance = startDistance;
              closestUnvisitedTrack = track;
            }
          });
          
          if (closestUnvisitedTrack) {
            // Marcar la vía como visitada
            const newVisitedTracks = new Set(visitedTracks);
            newVisitedTracks.add(closestUnvisitedTrack.id);
            setVisitedTracks(newVisitedTracks);
            
            // Seleccionar la nueva vía
            setSelectedTrack(closestUnvisitedTrack);
            setCurrentTrackId(closestUnvisitedTrack.id);
            setIsReversed(false);
            setCurrentPathIndex(0);
            setTrainPosition(closestUnvisitedTrack.path[0]);
            setTrainMoving(true);
            
            toast.success(`Explorando nueva vía: ${closestUnvisitedTrack.id}`);
            return;
          }
        }
        
        // Si no hay más vías sin visitar, mostrar mensaje de éxito
        toast.success('¡Has explorado todas las vías del mapa!');
        setExploreAllMode(false);
        setAutoMode(false);
        return;
      }
      
      // Modo automático normal: buscar la vía más cercana
      const closestTrackId = findClosestTrack(trainPosition, tracks);
      if (closestTrackId) {
        const nextTrack = tracks.find(t => t.id === closestTrackId);
        if (nextTrack) {
          // Marcar la vía como visitada
          const newVisitedTracks = new Set(visitedTracks);
          newVisitedTracks.add(nextTrack.id);
          setVisitedTracks(newVisitedTracks);
          
          setSelectedTrack(nextTrack);
          setCurrentTrackId(nextTrack.id);
          setIsReversed(false);
          setCurrentPathIndex(0);
          setTrainPosition(nextTrack.path[0]);
          setTrainMoving(true);
          return;
        }
      }
      toast.error('No se encontró ninguna vía cercana');
      setAutoMode(false);
      return;
    }
    
    // Verificar si estamos al final o al inicio de la vía
    const isAtEnd = !isReversed && currentPathIndex >= selectedTrack.path.length - 1;
    const isAtStart = isReversed && currentPathIndex <= 0;
    
    if (isAtEnd || isAtStart) {
      // Marcar la vía actual como visitada
      if (!visitedTracks.has(selectedTrack.id)) {
        const newVisitedTracks = new Set(visitedTracks);
        newVisitedTracks.add(selectedTrack.id);
        setVisitedTracks(newVisitedTracks);
      }
      
      // Buscar una vía conectada
      const connectingInfo = findConnectingTrack(selectedTrack, tracks, isAtEnd);
      
      if (connectingInfo) {
        // Encontramos una vía conectada
        const nextTrack = tracks.find(t => t.id === connectingInfo.trackId);
        if (nextTrack) {
          // En modo exploración completa, priorizar vías no visitadas
          if (exploreAllMode && visitedTracks.has(nextTrack.id)) {
            // Buscar otras vías no visitadas cercanas
            const unvisitedTracks = tracks.filter(track => !visitedTracks.has(track.id));
            
            if (unvisitedTracks.length > 0) {
              // Buscar la mejor vía no visitada considerando estaciones, pasajeros y distancia
              let bestTrack = null;
              let bestScore = -Infinity;
              
              unvisitedTracks.forEach(track => {
                // Calcular distancia al inicio de la vía
                const startDistance = calculateDistance(
                  trainPosition,
                  track.path[0]
                );
                
                // Calcular puntuación de la vía (prioridad menos penalización por distancia)
                const priority = evaluateTrackPriority(track);
                const distancePenalty = Math.min(startDistance * 10, 50); // Penalizar distancias largas, máximo 50 puntos
                const score = priority - distancePenalty;
                
                if (score > bestScore) {
                  bestScore = score;
                  bestTrack = track;
                }
              });
              
              // Si todas las vías tienen una puntuación muy baja, usar la más cercana
              if (bestScore < -30) {
                let closestTrack = null;
                let minDistance = Infinity;
                
                unvisitedTracks.forEach(track => {
                  const startDistance = calculateDistance(trainPosition, track.path[0]);
                  if (startDistance < minDistance) {
                    minDistance = startDistance;
                    closestTrack = track;
                  }
                });
                
                bestTrack = closestTrack;
              }
              
              if (bestTrack) {
                // Marcar la vía como visitada
                const newVisitedTracks = new Set(visitedTracks);
                newVisitedTracks.add(bestTrack.id);
                setVisitedTracks(newVisitedTracks);
                
                // Seleccionar la nueva vía
                setSelectedTrack(bestTrack);
                setCurrentTrackId(bestTrack.id);
                setIsReversed(false);
                setCurrentPathIndex(0);
                setTrainPosition(bestTrack.path[0]);
                
                toast.success(`Explorando nueva vía: ${bestTrack.id}`);
                return;
              }
            }
          }
          
          // Si no estamos en modo exploración o no hay vías no visitadas, seguir con la vía conectada
          // Marcar la vía como visitada
          const newVisitedTracks = new Set(visitedTracks);
          newVisitedTracks.add(nextTrack.id);
          setVisitedTracks(newVisitedTracks);
          
          // Actualizar la vía seleccionada
          setSelectedTrack(nextTrack);
          setCurrentTrackId(nextTrack.id);
          setIsReversed(connectingInfo.reversed);
          
          // Establecer el índice inicial en la nueva vía
          setCurrentPathIndex(connectingInfo.startIndex);
          setTrainPosition(nextTrack.path[connectingInfo.startIndex]);
          
          toast.success(`Conectando con vía ${nextTrack.id}`);
          return;
        }
      } else {
        // Si no hay conexión, buscar la vía más cercana
        // En modo exploración completa, priorizar vías no visitadas
        if (exploreAllMode) {
          const unvisitedTracks = tracks.filter(track => !visitedTracks.has(track.id));
          
          if (unvisitedTracks.length > 0) {
            // Buscar la mejor vía no visitada considerando estaciones, pasajeros y distancia
            let bestTrack = null;
            let bestScore = -Infinity;
            
            unvisitedTracks.forEach(track => {
              // Calcular distancia al inicio de la vía
              const startDistance = calculateDistance(
                trainPosition,
                track.path[0]
              );
              
              // Calcular puntuación de la vía (prioridad menos penalización por distancia)
              const priority = evaluateTrackPriority(track);
              const distancePenalty = Math.min(startDistance * 10, 50); // Penalizar distancias largas, máximo 50 puntos
              const score = priority - distancePenalty;
              
              if (score > bestScore) {
                bestScore = score;
                bestTrack = track;
              }
            });
            
            // Si todas las vías tienen una puntuación muy baja, usar la más cercana
            if (bestScore < -30) {
              let closestTrack = null;
              let minDistance = Infinity;
              
              unvisitedTracks.forEach(track => {
                const startDistance = calculateDistance(trainPosition, track.path[0]);
                if (startDistance < minDistance) {
                  minDistance = startDistance;
                  closestTrack = track;
                }
              });
              
              bestTrack = closestTrack;
            }
            
            if (bestTrack) {
              // Marcar la vía como visitada
              const newVisitedTracks = new Set(visitedTracks);
              newVisitedTracks.add(bestTrack.id);
              setVisitedTracks(newVisitedTracks);
              
              // Seleccionar la nueva vía
              setSelectedTrack(bestTrack);
              setCurrentTrackId(bestTrack.id);
              setIsReversed(false);
              setCurrentPathIndex(0);
              setTrainPosition(bestTrack.path[0]);
              
              toast.success(`Explorando nueva vía: ${bestTrack.id}`);
              return;
            }
          }
          
          // Si no hay más vías sin visitar, mostrar mensaje de éxito
          toast.success('¡Has explorado todas las vías del mapa!');
          setExploreAllMode(false);
          setAutoMode(false);
          return;
        }
        
        // Modo automático normal: buscar la vía más cercana que no sea la actual
        const closestTrackId = findClosestTrack(trainPosition, tracks);
        if (closestTrackId && closestTrackId !== selectedTrack.id) {
          const nextTrack = tracks.find(t => t.id === closestTrackId);
          if (nextTrack) {
            // Marcar la vía como visitada
            const newVisitedTracks = new Set(visitedTracks);
            newVisitedTracks.add(nextTrack.id);
            setVisitedTracks(newVisitedTracks);
            
            setSelectedTrack(nextTrack);
            setCurrentTrackId(nextTrack.id);
            setIsReversed(false);
            setCurrentPathIndex(0);
            setTrainPosition(nextTrack.path[0]);
            toast.success(`Modo automático: Cambiando a vía ${nextTrack.id}`);
            return;
          }
        } else {
          // Si no hay más vías cercanas, cambiar de dirección inmediatamente
          toast.info("Final de vía detectado. Cambiando dirección automáticamente...");
          
          // Invertir la dirección del tren
          const newDirection = !isReversed;
          setIsReversed(newDirection);
          
          // Establecer el índice de inicio según la nueva dirección
          const newIndex = newDirection ? selectedTrack.path.length - 1 : 0;
          setCurrentPathIndex(newIndex);
          setTrainPosition(selectedTrack.path[newIndex]);
          
          toast.success("Dirección cambiada. Continuando en sentido " + (newDirection ? "inverso" : "normal"));
          return;
        }
      }
    } else {
      // Avanzar a la siguiente posición en la vía actual
      const nextIndex = isReversed ? currentPathIndex - 1 : currentPathIndex + 1;
      setCurrentPathIndex(nextIndex);
      setTrainPosition(selectedTrack.path[nextIndex]);
    }
  }, [selectedTrack, trainPosition, tracks, currentPathIndex, isReversed, visitedTracks, exploreAllMode]);
  
  // Función para alternar el modo automático del tren
  const toggleAutoMode = useCallback(() => {
    if (!selectedTrack && !autoMode) {
      toast.error('Selecciona una vía primero');
      return;
    }
    
    const newAutoMode = !autoMode;
    setAutoMode(newAutoMode);
    
    // Si desactivamos el modo automático, también desactivamos el modo de exploración completa
    if (!newAutoMode) {
      setExploreAllMode(false);
    }
    
    if (newAutoMode) {
      // Si activamos el modo automático, iniciamos el movimiento
      if (!trainMoving && selectedTrack) {
        // Iniciar con la primera coordenada de la vía
        setTrainMoving(true);
        setCurrentPathIndex(0);
        setCurrentTrackId(selectedTrack.id);
        setTrainPosition(selectedTrack.path[0]);
        setIsReversed(false);
      }
      
      // Mostrar información sobre el modo automático inteligente
      const pasajerosPendientes = activePassengers.filter(p => !p.isPickedUp).length;
      const pasajerosRecogidos = pickedUpPassengers.length;
      
      if (pasajerosPendientes > 0 || pasajerosRecogidos > 0) {
        toast.success(`Piloto automático activado: ${pasajerosPendientes} pasajeros esperando, ${pasajerosRecogidos} en el tren`);
      } else {
        toast.success('Piloto automático activado: Esperando nuevos pasajeros');
      }
    } else {
      toast.info('Piloto automático desactivado');
    }
  }, [autoMode, selectedTrack, trainMoving, activePassengers, pickedUpPassengers]);
  
  // Efecto para manejar el movimiento automático del tren
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (autoMode && selectedTrack) {
      // Configurar un intervalo para mover el tren automáticamente
      // La velocidad del intervalo depende de la velocidad del tren
      const intervalSpeed = Math.max(50, 500 - trainSpeed * 4); // Entre 50ms y 500ms
      
      intervalId = setInterval(() => {
        // Mover el tren automáticamente
        if (selectedTrack && trainMoving) {
          // Calcular el siguiente índice basado en la dirección actual
          let nextIndex;
          if (!isReversed) {
            // Movimiento normal (hacia adelante)
            nextIndex = currentPathIndex + 1;
          } else {
            // Movimiento inverso (hacia atrás)
            nextIndex = currentPathIndex - 1;
          }
          
          // Verificar si hemos llegado al final o al inicio de la vía
          const isAtEnd = !isReversed && nextIndex >= selectedTrack.path.length;
          const isAtStart = isReversed && nextIndex < 0;
          
          if (isAtEnd || isAtStart) {
            // Buscar una vía conectada
            const connectingInfo = findConnectingTrack(selectedTrack, tracks, isAtEnd);
            
            if (connectingInfo) {
              // Encontramos una vía conectada
              const nextTrack = tracks.find(t => t.id === connectingInfo.trackId);
              if (nextTrack) {
                // Actualizar la vía seleccionada
                setSelectedTrack(nextTrack);
                setCurrentTrackId(nextTrack.id);
                setIsReversed(connectingInfo.reversed);
                
                // Establecer el índice inicial en la nueva vía
                setCurrentPathIndex(connectingInfo.startIndex);
                setTrainPosition(nextTrack.path[connectingInfo.startIndex]);
                
                toast.success(`Conectando con vía ${nextTrack.id}`);
                return;
              }
            } else {
              // Si no hay conexión, cambiar de dirección automáticamente
              const newDirection = !isReversed;
              setIsReversed(newDirection);
              
              // Establecer el índice de inicio según la nueva dirección
              const newIndex = newDirection ? selectedTrack.path.length - 1 : 0;
              setCurrentPathIndex(newIndex);
              setTrainPosition(selectedTrack.path[newIndex]);
              
              toast.success("Dirección cambiada. Continuando en sentido " + (newDirection ? "inverso" : "normal"));
              return;
            }
          } else {
            // Movimiento normal dentro de la misma vía
            setCurrentPathIndex(nextIndex);
            setTrainPosition(selectedTrack.path[nextIndex]);
          }
        }
      }, intervalSpeed);
      
      // Asegurarse de que el tren esté en movimiento
      if (!trainMoving) {
        setTrainMoving(true);
      }
    }
    
    // Limpiar el intervalo cuando se desmonta el componente o cambia el modo automático
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoMode, selectedTrack, trainSpeed, currentPathIndex, isReversed, trainMoving, tracks]);
  
  // Función para activar/desactivar el modo de exploración completa
  const toggleExploreAllMode = useCallback(() => {
    // Solo se puede activar si el modo automático está activo
    if (!autoMode) {
      toast.error('Activa primero el piloto automático');
      return;
    }
    
    const newExploreAllMode = !exploreAllMode;
    setExploreAllMode(newExploreAllMode);
    
    // Reiniciar el registro de vías visitadas al activar el modo
    if (newExploreAllMode) {
      // Marcar la vía actual como visitada si existe
      const newVisitedTracks = new Set<string>();
      if (selectedTrack) {
        newVisitedTracks.add(selectedTrack.id);
      }
      setVisitedTracks(newVisitedTracks);
      
      toast.success('Modo exploración completa activado. El tren recorrerá todas las vías del mapa.');
    } else {
      toast.info('Modo exploración completa desactivado');
    }
  }, [autoMode, exploreAllMode, selectedTrack]);



  // Manejo de pasajeros
  const handlePassengerPickup = useCallback((passenger: Passenger) => {
    // Actualizar pasajeros activos (eliminar el recogido)
    setActivePassengers(prev => prev.filter(p => p.id !== passenger.id));
    
    // Actualizar pasajeros recogidos y ajustar capacidad del tren si es necesario
    setPickedUpPassengers(prev => {
      const newPickedUp = [...prev, passenger];
      
      // Si el número de pasajeros supera la capacidad actual, aumentarla
      if (newPickedUp.length >= trainCapacity) {
        setTrainCapacity(Math.max(8, Math.ceil(newPickedUp.length * 1.5))); // Aumentar capacidad con margen
      }
      
      // Acumular pasajeros para notificaciones agrupadas
      // Si ya hay una notificación visible, aumentar el contador
      if (pickupNotification.visible) {
        setPickupNotification(prev => ({ visible: true, count: prev.count + 1 }));
      } else {
        // Si no hay notificación visible, mostrar una nueva
        setPickupNotification({ visible: true, count: 1 });
        
        // Programar para ocultar la notificación después de un tiempo basado en la velocidad
        // A mayor velocidad, menos tiempo se muestra la notificación para evitar acumulación
        const hideDelay = trainSpeed > 80 ? 1500 : 2500;
        setTimeout(() => {
          setPickupNotification({ visible: false, count: 0 });
        }, hideDelay);
      }
      
      return newPickedUp;
    });
    
    // Mostrar notificación toast solo a velocidades bajas o medias para evitar spam
    if (trainSpeed < 70) {
      toast.success(`Pasajero recogido en ${passenger.origin.name}`);
    }
  }, [trainCapacity, trainSpeed]);
  
  const handlePassengerDelivery = useCallback((passenger: Passenger) => {
    // Eliminar pasajero de los recogidos
    setPickedUpPassengers(prev => prev.filter(p => p.id !== passenger.id));
    
    // Calcular recompensa
    const currentTime = Date.now();
    const timeTaken = currentTime - passenger.createdAt;
    const basePoints = 10; // 10 puntos base
    
    // Tiempo límite para entrega (3 minutos = 180000ms)
    const timeLimit = 180000;
    
    // Recompensa monetaria y puntos
    let moneyReward = 0;
    let bonusPoints = 0;
    let bonusText = '';
    let timeText = '';
    
    // Solo dar 1€ si se entrega dentro del tiempo límite
    if (timeTaken <= timeLimit) {
      moneyReward = 1; // 1€ por pasajero entregado a tiempo
      timeText = ' (a tiempo)';
      
      // Bono adicional por entrega rápida (menos de 60 segundos)
      if (timeTaken < 60000) {
        bonusPoints = 20;
        bonusText = ' +20 puntos por entrega rápida!';
      }
    } else {
      timeText = ' (fuera de tiempo)';
    }
    
    // Actualizar dinero y puntos
    setMoney(prev => prev + moneyReward);
    setPoints(prev => prev + basePoints + bonusPoints);
    
    // Mostrar notificación toast solo a velocidades bajas o medias para evitar spam
    if (trainSpeed < 70) {
      toast.success(`Pasajero entregado en ${passenger.destination.name}${timeText}. +$${moneyReward}, +${basePoints + bonusPoints} puntos${bonusText}`);
    }
    
    // Acumular pasajeros para notificaciones agrupadas
    // Si ya hay una notificación visible, aumentar el contador
    if (dropoffNotification.visible) {
      setDropoffNotification(prev => ({ visible: true, count: prev.count + 1 }));
    } else {
      // Si no hay notificación visible, mostrar una nueva
      setDropoffNotification({ visible: true, count: 1 });
      
      // Programar para ocultar la notificación después de un tiempo basado en la velocidad
      // A mayor velocidad, menos tiempo se muestra la notificación para evitar acumulación
      const hideDelay = trainSpeed > 80 ? 1500 : 2500;
      setTimeout(() => {
        setDropoffNotification({ visible: false, count: 0 });
      }, hideDelay);
    }
    
    // Verificar si se ha alcanzado algún hito
    if (points + basePoints + bonusPoints >= 100 || money + moneyReward >= 500) {
      // Reiniciar canGenerate para todas las estaciones
      setStations(prev => prev.map(station => ({
        ...station,
        canGenerate: true
      })));
      
      toast.info('¡Hito alcanzado! Todas las estaciones pueden generar pasajeros nuevamente.');
    }
  }, [points, money, trainSpeed]);
  
  const handlePassengerExpired = useCallback((passenger: Passenger) => {
    setActivePassengers(prev => prev.filter(p => p.id !== passenger.id));
    setPoints(prev => Math.max(0, prev - 5)); // Restar 5 puntos, mínimo 0
    toast.error(`Pasajero perdido en ${passenger.origin.name}. -5 puntos`);
  }, []);
  
  // Función para evaluar la prioridad de una vía según el número de estaciones y pasajeros cercanos
  const evaluateTrackPriority = useCallback((track: TrackSegment): number => {
    if (!track || !track.path || track.path.length === 0) return 0;
    
    let priority = 0;
    
    // Contar estaciones cercanas a la vía
    const stationsNearTrack = stations.filter(station => {
      // Verificar si alguna parte de la vía está cerca de la estación
      return track.path.some(point => {
        const distance = calculateDistance(point, station.position);
        return distance < 0.2; // 200 metros
      });
    });
    
    // Añadir puntos por cada estación cercana
    priority += stationsNearTrack.length * 10;
    
    // Añadir puntos por cada pasajero esperando en estas estaciones
    const passengersAtStations = activePassengers.filter(passenger => 
      stationsNearTrack.some(station => station.id === passenger.origin.id)
    );
    priority += passengersAtStations.length * 20;
    
    // Penalizar vías ya visitadas si estamos en modo exploración
    if (exploreAllMode && visitedTracks.has(track.id)) {
      priority -= 50;
    }
    
    return priority;
  }, [stations, activePassengers, visitedTracks, exploreAllMode]);
  
  // Función para verificar si el tren está cerca de una estación y manejar pasajeros automáticamente
  const checkPassengersAtStations = useCallback(() => {
    if (!trainPosition) return;
    
    // Distancia máxima para considerar que el tren está cerca de una estación (en km)
    // Ajustamos el radio de detección según la velocidad del tren
    const baseRadius = 0.08; // Radio base en km
    const speedFactor = trainSpeed / 100; // Factor de velocidad (0.5 para 50km/h, 1.0 para 100km/h)
    const detectionRadius = autoMode ? 
      Math.min(0.20, baseRadius + (speedFactor * 0.15)) : // Máximo 200m en modo auto
      baseRadius;
    
    // Optimización: Crear un mapa de estaciones cercanas para evitar cálculos repetidos
    const nearbyStations = new Map<string, number>(); // Map<stationId, distance>
    
    // Procesar recogidas y entregas en lotes para mayor eficiencia
    const passengersToPickup: Passenger[] = [];
    const passengersToDeliver: Passenger[] = [];
    
    // Verificar pasajeros para recoger (que estén esperando en estaciones cercanas)
    if (pickedUpPassengers.length < trainCapacity) {
      activePassengers.forEach(passenger => {
        const stationId = passenger.origin.id;
        let distance;
        
        // Reutilizar distancia calculada si ya existe
        if (nearbyStations.has(stationId)) {
          distance = nearbyStations.get(stationId)!;
        } else {
          distance = calculateDistance(trainPosition, passenger.origin.position);
          nearbyStations.set(stationId, distance);
        }
        
        // Si el tren está lo suficientemente cerca y hay capacidad, añadir a la lista de recogida
        if (distance <= detectionRadius) {
          passengersToPickup.push(passenger);
        }
      });
    }
    
    // Verificar pasajeros para dejar (que estén en el tren y su destino está cerca)
    pickedUpPassengers.forEach(passenger => {
      const stationId = passenger.destination.id;
      let distance;
      
      // Reutilizar distancia calculada si ya existe
      if (nearbyStations.has(stationId)) {
        distance = nearbyStations.get(stationId)!;
      } else {
        distance = calculateDistance(trainPosition, passenger.destination.position);
        nearbyStations.set(stationId, distance);
      }
      
      // Si el tren está lo suficientemente cerca de la estación de destino, añadir a la lista de entrega
      if (distance <= detectionRadius) {
        passengersToDeliver.push(passenger);
      }
    });
    
    // Procesar las recogidas (limitadas por la capacidad disponible)
    const availableCapacity = trainCapacity - pickedUpPassengers.length;
    passengersToPickup.slice(0, availableCapacity).forEach(passenger => {
      handlePassengerPickup(passenger);
    });
    
    // Procesar las entregas
    passengersToDeliver.forEach(passenger => {
      handlePassengerDelivery(passenger);
    });
  }, [trainPosition, activePassengers, pickedUpPassengers, trainCapacity, autoMode, trainSpeed, handlePassengerPickup, handlePassengerDelivery]);

  // Efecto para verificar la proximidad a estaciones cuando el tren se mueve
  useEffect(() => {
    if (trainPosition && (autoMode || trainSpeed >= 50)) {
      // Verificar si hay pasajeros para recoger o dejar en estaciones cercanas
      checkPassengersAtStations();
    }
  }, [trainPosition, autoMode, trainSpeed, checkPassengersAtStations]);

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

    // Calcular el siguiente índice basado en la dirección actual
    let nextIndex;
    if (!isReversed) {
      // Movimiento normal (hacia adelante)
      nextIndex = currentPathIndex + 1;
    } else {
      // Movimiento inverso (hacia atrás)
      nextIndex = currentPathIndex - 1;
    }

    // Verificar si hemos llegado al final o al inicio de la vía
    const isAtEnd = !isReversed && nextIndex >= selectedTrack.path.length;
    const isAtStart = isReversed && nextIndex < 0;

    // Si estamos al final o al inicio, buscar una vía conectada
    if (isAtEnd || isAtStart) {
      // Buscar una vía conectada
      const connectingInfo = findConnectingTrack(selectedTrack, tracks, isAtEnd);

      if (connectingInfo) {
        // Encontramos una vía conectada
        const nextTrack = tracks.find(t => t.id === connectingInfo.trackId);
        if (nextTrack) {
          // Actualizar la vía seleccionada
          setSelectedTrack(nextTrack);
          setCurrentPathIndex(0);
          setTrainPosition(nextTrack.path[0]);
          setCurrentTrackId(nextTrack.id);
          setIsReversed(false); // Reiniciar dirección al seleccionar una nueva vía
          toast.success(`Vía seleccionada: ${nextTrack.id}`);
        }
      }
      
      // Si no hay conexión, pero estamos en modo automático, buscar la vía más cercana
      if (autoMode) {
        const closestTrackId = findClosestTrack(trainPosition, tracks);
        if (closestTrackId && closestTrackId !== selectedTrack.id) {
          // Encontrar el objeto de vía completo a partir del ID
          const nextTrack = tracks.find(t => t.id === closestTrackId);
          if (nextTrack) {
            // Actualizar la vía seleccionada
            setSelectedTrack(nextTrack);
            setCurrentTrackId(nextTrack.id);
            setIsReversed(false);
            
            // Establecer el índice inicial en la nueva vía
            setCurrentPathIndex(0);
            setTrainPosition(nextTrack.path[0]);
            
            toast.success(`Modo automático: Cambiando a vía ${nextTrack.id}`);
            return;
          }
        }
      }
      
      // Si no hay conexión, mostrar mensaje y detener el tren
      if (isAtEnd) {
        toast.info("El tren ha llegado al final de la vía y no hay conexión disponible");
      } else {
        toast.info("El tren ha llegado al inicio de la vía y no hay conexión disponible");
      }
      
      // Si estamos en modo automático, cambiar de dirección automáticamente
      if (autoMode) {
        // Cambiar la dirección del tren
        setIsReversed(!isReversed);
        toast.info("Cambiando dirección automáticamente");
        
        // Ajustar el índice para que el tren comience a moverse en la dirección opuesta
        if (isAtEnd) {
          setCurrentPathIndex(selectedTrack.path.length - 2);
          setTrainPosition(selectedTrack.path[selectedTrack.path.length - 2]);
        } else {
          setCurrentPathIndex(1);
          setTrainPosition(selectedTrack.path[1]);
        }
        return;
      }
      
      return;
    }

    // Movimiento normal dentro de la misma vía
    setCurrentPathIndex(nextIndex);
    setTrainPosition(selectedTrack.path[nextIndex]);
  }, [selectedTrack, currentPathIndex, isReversed, tracks, autoMode]);
  
  // Función para calcular la distancia entre dos puntos geográficos (haversine)
  const calculateHaversineDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);
  
  // Función para encontrar la mejor estación para recoger pasajeros
  const findBestStationToPickup = useCallback(() => {
    if (!stations || stations.length === 0 || !trainPosition) return null;
    
    // Obtener todas las estaciones con pasajeros esperando
    const stationsWithPassengers = stations.filter(station => {
      const waitingPassengers = activePassengers.filter(p => 
        !p.isPickedUp && p.origin.id === station.id
      );
      return waitingPassengers.length > 0;
    });
    
    if (stationsWithPassengers.length === 0) return null;
    
    // Encontrar la estación más cercana con pasajeros
    let closestStation = null;
    let minDistance = Infinity;
    
    stationsWithPassengers.forEach(station => {
      const distance = calculateHaversineDistance(
        trainPosition.lat, 
        trainPosition.lng, 
        station.position.lat, 
        station.position.lng
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestStation = station;
      }
    });
    
    return closestStation;
  }, [stations, trainPosition, activePassengers]);
  
  // Función para encontrar la mejor vía para llegar a una estación
  const findBestTrackToStation = useCallback((targetStation: Station) => {
    if (!targetStation || !tracks || tracks.length === 0 || !trainPosition) return null;
    
    // Encontrar la vía más cercana a la estación objetivo
    let closestTrack = null;
    let minDistance = Infinity;
    
    tracks.forEach(track => {
      // Calcular la distancia desde cada punto de la vía a la estación
      track.path.forEach(point => {
        const distance = calculateHaversineDistance(
          point.lat,
          point.lng,
          targetStation.position.lat,
          targetStation.position.lng
        );
        
        if (distance < minDistance) {
          minDistance = distance;
          closestTrack = track;
        }
      });
    });
    
    return closestTrack;
  }, [tracks, trainPosition]);
  
  // Función para encontrar una ruta entre vías conectadas
  const findPathBetweenTracks = useCallback((startTrack: TrackSegment, targetTrack: TrackSegment): TrackSegment[] | null => {
    if (!startTrack || !targetTrack || !tracks || tracks.length === 0) return null;
    
    // Si es la misma vía, devolver solo esa vía
    if (startTrack.id === targetTrack.id) return [startTrack];
    
    // Implementar un algoritmo de búsqueda en anchura (BFS) para encontrar la ruta
    const queue: { track: TrackSegment, path: TrackSegment[] }[] = [];
    const visited = new Set<string>();
    
    // Añadir la vía inicial a la cola
    queue.push({ track: startTrack, path: [startTrack] });
    visited.add(startTrack.id);
    
    while (queue.length > 0) {
      const { track, path } = queue.shift()!;
      
      // Comprobar conexiones desde el final de la vía
      const connectingFromEnd = findConnectingTrack(track, tracks, true);
      if (connectingFromEnd) {
        const nextTrack = tracks.find(t => t.id === connectingFromEnd.trackId);
        if (nextTrack && !visited.has(nextTrack.id)) {
          const newPath = [...path, nextTrack];
          
          // Si hemos encontrado la vía objetivo, devolver la ruta
          if (nextTrack.id === targetTrack.id) {
            return newPath;
          }
          
          // Añadir la nueva vía a la cola
          queue.push({ track: nextTrack, path: newPath });
          visited.add(nextTrack.id);
        }
      }
      
      // Comprobar conexiones desde el inicio de la vía
      const connectingFromStart = findConnectingTrack(track, tracks, false);
      if (connectingFromStart) {
        const nextTrack = tracks.find(t => t.id === connectingFromStart.trackId);
        if (nextTrack && !visited.has(nextTrack.id)) {
          const newPath = [...path, nextTrack];
          
          // Si hemos encontrado la vía objetivo, devolver la ruta
          if (nextTrack.id === targetTrack.id) {
            return newPath;
          }
          
          // Añadir la nueva vía a la cola
          queue.push({ track: nextTrack, path: newPath });
          visited.add(nextTrack.id);
        }
      }
    }
    
    // Si no se encuentra una ruta, devolver null
    return null;
  }, [tracks]);
  
  // Estado para almacenar la ruta actual en modo automático
  const [autoModePath, setAutoModePath] = useState<TrackSegment[]>([]);
  const [autoModePathIndex, setAutoModePathIndex] = useState<number>(0);
  const [autoModeTargetStation, setAutoModeTargetStation] = useState<Station | null>(null);
  
  // Efecto para el modo automático inteligente
  useEffect(() => {
    if (!autoMode) return;
    
    // Calcular el intervalo de tiempo basado en la velocidad
    // Velocidad 1% = 2000ms (muy lento), Velocidad 100% = 100ms (muy rápido)
    const interval = Math.max(100, 2000 - (trainSpeed * 19));
    
    // Crear un temporizador para mover el tren automáticamente
    const intervalId = setInterval(() => {
      if (!selectedTrack || selectedTrack.path.length === 0) {
        setAutoMode(false);
        toast.error("No hay vía seleccionada");
        return;
      }
      
      // Si tenemos una ruta en progreso, seguirla
      if (autoModePath.length > 0 && autoModePathIndex < autoModePath.length) {
        // Si estamos en la vía actual de la ruta, mover el tren a lo largo de ella
        if (selectedTrack.id === autoModePath[autoModePathIndex].id) {
          // Verificar si hemos llegado al final de la vía actual
          const isAtEnd = !isReversed && currentPathIndex >= selectedTrack.path.length - 1;
          const isAtStart = isReversed && currentPathIndex <= 0;
          
          if (isAtEnd || isAtStart) {
            // Hemos llegado al final de la vía actual, pasar a la siguiente vía en la ruta
            if (autoModePathIndex < autoModePath.length - 1) {
              // Buscar la conexión a la siguiente vía
              const nextTrack = autoModePath[autoModePathIndex + 1];
              const connectingInfo = findConnectingTrack(selectedTrack, tracks, isAtEnd);
              
              if (connectingInfo && connectingInfo.trackId === nextTrack.id) {
                // Cambiar a la siguiente vía en la ruta
                setSelectedTrack(nextTrack);
                setCurrentTrackId(nextTrack.id);
                
                // Establecer el índice inicial en la nueva vía
                if (connectingInfo.startIndex === 0) {
                  // Si debemos empezar desde el inicio de la vía
                  setCurrentPathIndex(0);
                  setIsReversed(connectingInfo.reversed);
                  setTrainPosition(nextTrack.path[0]);
                } else {
                  // Si debemos empezar desde el final de la vía
                  setCurrentPathIndex(nextTrack.path.length - 1);
                  setIsReversed(connectingInfo.reversed);
                  setTrainPosition(nextTrack.path[nextTrack.path.length - 1]);
                }
                
                // Actualizar el índice de la ruta
                setAutoModePathIndex(autoModePathIndex + 1);
                
                // Mostrar mensaje de progreso
                toast.success(`Cambiando a vía ${nextTrack.id} (${autoModePathIndex + 1}/${autoModePath.length - 1})`);
              } else {
                // No se encontró una conexión directa, recalcular la ruta
                setAutoModePath([]);
                setAutoModePathIndex(0);
              }
            } else {
              // Hemos llegado al final de la ruta
              setAutoModePath([]);
              setAutoModePathIndex(0);
              
              // Verificar si hemos llegado a la estación objetivo
              if (autoModeTargetStation) {
                toast.success(`Llegamos a la estación ${autoModeTargetStation.name}`);
                setAutoModeTargetStation(null);
              }
            }
          } else {
            // Seguir moviendo el tren a lo largo de la vía actual
            handleMoveTrainClick();
          }
        } else {
          // Estamos en una vía diferente a la de la ruta, recalcular
          setAutoModePath([]);
          setAutoModePathIndex(0);
        }
      } else {
        // No tenemos una ruta en progreso, calcular una nueva
        
        // Verificar si hay pasajeros en el tren que necesitan ser entregados
        if (pickedUpPassengers.length > 0) {
          // Priorizar la entrega de pasajeros ya recogidos
          const firstPassenger = pickedUpPassengers[0];
          const destinationStation = firstPassenger.destination;
          
          // Buscar la mejor vía para llegar a la estación de destino
          const bestTrackToDestination = findBestTrackToStation(destinationStation);
          
          if (bestTrackToDestination && bestTrackToDestination.id !== selectedTrack.id) {
            // Buscar una ruta desde la vía actual hasta la vía objetivo
            const path = findPathBetweenTracks(selectedTrack, bestTrackToDestination);
            
            if (path && path.length > 0) {
              // Establecer la ruta y comenzar a seguirla
              setAutoModePath(path);
              setAutoModePathIndex(0);
              setAutoModeTargetStation(destinationStation);
              toast.info(`Modo automático: Ruta calculada a estación ${destinationStation.name} para entregar pasajero (${path.length} vías)`);
            } else {
              // No se encontró una ruta conectada, usar la mejor vía disponible
              toast.warning(`No se encontró una ruta conectada a ${destinationStation.name}. Usando la mejor vía disponible.`);
              setSelectedTrack(bestTrackToDestination);
              setCurrentTrackId(bestTrackToDestination.id);
              setCurrentPathIndex(0);
              setTrainPosition(bestTrackToDestination.path[0]);
              setIsReversed(false);
            }
          }
        } else {
          // Si no hay pasajeros en el tren, buscar la mejor estación para recoger pasajeros
          const bestStation = findBestStationToPickup();
          
          if (bestStation) {
            // Buscar la mejor vía para llegar a la estación
            const bestTrackToStation = findBestTrackToStation(bestStation);
            
            if (bestTrackToStation && bestTrackToStation.id !== selectedTrack.id) {
              // Buscar una ruta desde la vía actual hasta la vía objetivo
              const path = findPathBetweenTracks(selectedTrack, bestTrackToStation);
              
              if (path && path.length > 0) {
                // Establecer la ruta y comenzar a seguirla
                setAutoModePath(path);
                setAutoModePathIndex(0);
                setAutoModeTargetStation(bestStation);
                toast.info(`Modo automático: Ruta calculada a estación ${bestStation.name} para recoger pasajeros (${path.length} vías)`);
              } else {
                // No se encontró una ruta conectada, usar la mejor vía disponible
                toast.warning(`No se encontró una ruta conectada a ${bestStation.name}. Usando la mejor vía disponible.`);
                setSelectedTrack(bestTrackToStation);
                setCurrentTrackId(bestTrackToStation.id);
                setCurrentPathIndex(0);
                setTrainPosition(bestTrackToStation.path[0]);
                setIsReversed(false);
              }
            }
          } else {
            // No hay estaciones con pasajeros, simplemente mover el tren
            handleMoveTrainClick();
          }
        }
      }
      
      // Si no hay una ruta en progreso, mover el tren a lo largo de la vía seleccionada
      if (autoModePath.length === 0) {
        handleMoveTrainClick();
      }
    }, interval);
    
    return () => {
      clearInterval(intervalId);
      // Limpiar la ruta al desactivar el modo automático
      setAutoModePath([]);
      setAutoModePathIndex(0);
      setAutoModeTargetStation(null);
    };
  }, [autoMode, selectedTrack, handleMoveTrainClick, trainSpeed, pickedUpPassengers, findBestStationToPickup, findBestTrackToStation, currentPathIndex, isReversed, tracks, autoModePath, autoModePathIndex, autoModeTargetStation, findPathBetweenTracks]);

  // Estado para la vía resaltada (solo para visualización)
  const [highlightedTrack, setHighlightedTrack] = useState<TrackSegment | null>(null);

  // Manejar la selección de una vía
  const handleTrackSelect = useCallback((trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      // Siempre resaltar la vía seleccionada para visualización
      setHighlightedTrack(track);
      
      // Solo cambiar la ruta del tren si no está en movimiento (ni automático ni manual)
      if (!autoMode && !selectedTrack) {
        setSelectedTrack(track);
        setCurrentPathIndex(0);
        setTrainPosition(track.path[0]);
        setCurrentTrackId(track.id);
        setIsReversed(false); // Reiniciar dirección al seleccionar una nueva vía
        toast.success(`Tren colocado en vía: ${track.id}`);
      } else {
        // Solo mostrar un mensaje informativo
        toast.info(`Visualizando vía: ${track.id}`);
      }
    }
  }, [tracks, autoMode, selectedTrack]);

  // Efecto para manejar el inicio del juego
  useEffect(() => {
    if (gameStarted && contextStations.length > 0) {
      // Iniciar el juego usando el contexto
      startGameContext();
      setCanGeneratePassengers(true);
    }
  }, [gameStarted, contextStations, startGameContext, setCanGeneratePassengers]);

  // Efecto para inicializar el juego cuando las estaciones estén listas
  useEffect(() => {
    if (contextStations.length > 0 && !gameStarted) {
      initializeGame(DEFAULT_COORDINATES);
    }
  }, [contextStations, gameStarted, initializeGame]);

  return (
    <div className="flex flex-col h-screen">
      {/* Panel superior izquierdo con menú */}
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
                <h2 className="text-lg font-medium">Metro Español</h2>
                <p className="text-sm text-muted-foreground">Explorador de redes ferroviarias</p>
                
                <div className="mt-6 space-y-4">
                  <Button 
                    className="w-full justify-start" 
                    variant="ghost"
                    onClick={() => setShowCityExplorer(true)}
                  >
                    <Globe className="mr-2 h-4 w-4" />
                    Explorar ciudades
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="ghost"
                    onClick={() => setShowMyRoutes(true)}
                  >
                    <History className="mr-2 h-4 w-4" />
                    Mis rutas
                  </Button>
                  <Button 
                    className="w-full justify-start" 
                    variant="ghost"
                    onClick={() => {
                      // Solo mostrar tutorial si no estamos en modo búsqueda
                      if (!isSearchMode.current) {
                        setShowTutorial(true);
                      }
                    }}
                  >
                    <HelpCircle className="mr-2 h-4 w-4" />
                    Ver tutorial
                  </Button>
                  
                  <Button 
                    className="w-full justify-start" 
                    variant="ghost"
                    onClick={() => setShowAuthDialog(true)}
                  >
                    {isLoggedIn ? (
                      <>
                        <User className="mr-2 h-4 w-4" />
                        Mi perfil
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Iniciar sesión
                      </>
                    )}
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
            {/* Barra de búsqueda integrada */}
            <div className="flex gap-1 items-center">
              <div className="relative flex-grow">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Buscar ubicación..."
                  className="pl-8 pr-10 h-8 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(e)}
                  disabled={isLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                  onClick={() => searchQuery.trim() && handleSearchSubmit({ preventDefault: () => {} } as any)}
                  disabled={isLoading || !searchQuery.trim()}
                >
                  <MapPin className="h-3 w-3 text-primary" />
                </Button>
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
          <StyledLoadingScreen isVisible={isLoading} />
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
                isTrainMoving={trainMoving}
                activePassengers={activePassengers}
                pickedUpPassengers={pickedUpPassengers}
                onPassengerPickup={handlePassengerPickup}
                onPassengerDelivery={handlePassengerDelivery}
                onPassengerExpired={handlePassengerExpired}
                setActivePassengers={setActivePassengers}
                difficulty={difficulty}
                currentLevel={currentLevel} // Pasar el nivel actual
                trainCapacity={trainCapacity} // Usar la capacidad dinámica del tren
                gameStarted={gameStarted} // Pasar el estado del juego
                canGeneratePassengers={canGeneratePassengers} // Pasar si se pueden generar pasajeros
                personalStationId={personalStationId} // Pasar la estación personal
                highlightedTrack={highlightedTrack} // Pasar la vía resaltada
                autoMode={autoMode} // Pasar el estado del modo automático
              />
            </div>
            
            {/* Leyenda de las vías como componente independiente (ahora en esquina izquierda inferior) */}
            <div className="absolute left-4 bottom-8 z-50">
              <TrackLegend tracks={tracks} stations={stations} />
            </div>
            
            {/* Panel de control superpuesto (más alargado y mitad de altura) */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center items-center z-50 pointer-events-none">
              <div className="bg-background/85 backdrop-blur-md p-4 rounded-xl shadow-xl border border-primary/30 w-full max-w-[1080px] mx-4 pointer-events-auto">
                <div className="flex flex-row items-center gap-6 justify-between h-[100px]">
                  {/* Sección 1: Información de pasajeros integrada con botones de control */}
                  <div className="flex items-center gap-2">
                    <PassengerInfo 
                      money={money}
                      points={points}
                      activePassengers={activePassengers}
                      pickedUpPassengers={pickedUpPassengers}
                    />
                    <div className="flex items-center gap-2 ml-3">
                      {/* Botón dorado de inicio */}
                      <div className="mr-2 relative">
                        <GameStartButton 
                          onStart={() => {
                            setGameStarted(true);
                            startGameContext();
                          }} 
                          gameStarted={gameStarted} 
                          showArrow={showStartArrow} 
                        />
                      </div>
                      
                      <div className="h-7 w-[1px] bg-border mx-1" />
                      
                      <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground mb-1">Dificultad:</span>
                        <div className="flex gap-1">
                          <Button 
                            onClick={() => setDifficulty('easy')}
                            variant={difficulty === 'easy' ? "default" : "outline"}
                            size="sm"
                            className={`h-5 text-[10px] px-2 font-medium ${difficulty === 'easy' ? 'bg-green-600 hover:bg-green-700 shadow-md' : 'border-green-500/50'}`}
                          >
                            Fácil
                          </Button>
                          <Button 
                            onClick={() => setDifficulty('medium')}
                            variant={difficulty === 'medium' ? "default" : "outline"}
                            size="sm"
                            className={`h-5 text-[10px] px-2 font-medium ${difficulty === 'medium' ? 'bg-amber-600 hover:bg-amber-700 shadow-md' : 'border-amber-500/50'}`}
                          >
                            Medio
                          </Button>
                          <Button 
                            onClick={() => setDifficulty('hard')}
                            variant={difficulty === 'hard' ? "default" : "outline"}
                            size="sm"
                            className={`h-5 text-[10px] px-2 font-medium ${difficulty === 'hard' ? 'bg-red-600 hover:bg-red-700 shadow-md' : 'border-red-500/50'}`}
                          >
                            Difícil
                          </Button>
                        </div>
                      </div>
                      
                      <div className="h-7 w-[1px] bg-border mx-1" />
                      
                      <Button
                        onClick={() => setSeatsModalVisible(true)}
                        variant="outline"
                        size="sm"
                        className="h-7 text-[11px] px-2 border-blue-500/60 flex items-center justify-center hover:bg-blue-500/10 transition-colors"
                        title="Ver asientos del tren"
                      >
                        <Train className="h-3.5 w-3.5 mr-1" />
                        {pickedUpPassengers.length}/{trainCapacity}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Separador vertical */}
                  <div className="h-[80px] w-[2px] bg-gradient-to-b from-gray-200/30 via-gray-300/70 to-gray-200/30 rounded-full"></div>
                  
                  {/* Sección 2: Control de Tren (ahora en el centro) */}
                  <div className="flex-shrink-0 w-[320px] flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-sm font-semibold text-primary">Control de Tren</h3>
                      <div className="text-xs text-muted-foreground bg-background/70 px-2 py-1 rounded-md border border-border/50">
                        {selectedTrack ? `Vía: ${selectedTrack.id}` : 'Selecciona vía'}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-col bg-background/80 p-2 rounded-md border border-border/50 shadow-sm">
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleMoveTrainClick}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground flex-1 text-sm py-1 h-9"
                          size="sm"
                          disabled={autoMode}
                        >
                          <Train className="h-4 w-4 mr-1" />
                          Mover
                        </Button>
                        <Button 
                          onClick={() => {
                            // Solo cambiar la dirección sin mover el tren
                            setIsReversed(!isReversed);
                            toast.info(`Dirección cambiada: ${!isReversed ? 'marcha atrás' : 'adelante'}`);
                          }}
                          className={`${isReversed ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-500 hover:bg-blue-600'} text-white flex-1 text-sm py-1 h-9`}
                          size="sm"
                          disabled={autoMode}
                          title={isReversed ? "Dirección: Marcha atrás" : "Dirección: Adelante"}
                        >
                          {isReversed ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M18 15h-6v4l-7-7 7-7v4h8a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2z"/>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                              <path d="M6 15h6v4l7-7-7-7v4H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2z"/>
                            </svg>
                          )}
                          {isReversed ? 'Reversa' : 'Avance'}
                        </Button>
                        <Button 
                          onClick={toggleAutoMode}
                          className={`${autoMode ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white flex-1 text-sm py-1 h-9`}
                          size="sm"
                        >
                          <Train className="h-4 w-4 mr-1" />
                          {autoMode ? 'Detener' : 'Auto'}
                        </Button>
                      </div>
                      {autoMode && (
                        <Button 
                          onClick={toggleExploreAllMode}
                          className={`${exploreAllMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-500 hover:bg-gray-600'} text-white w-full text-xs py-1 h-7 mt-1 rounded-md flex items-center justify-center`}
                          size="sm"
                        >
                          <MapPin className="h-4 w-4 mr-1" />
                          <span className="font-medium">
                            {exploreAllMode ? 'Exploración Activa' : 'Explorar Todo el Mapa'}
                          </span>
                          {exploreAllMode && (
                            <span className="ml-1 bg-green-500 rounded-full h-2 w-2 animate-pulse"></span>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* Separador vertical */}
                  <div className="h-[80px] w-[2px] bg-gradient-to-b from-gray-200/30 via-gray-300/70 to-gray-200/30 rounded-full"></div>
                  
                  {/* Sección 3: Botones de visualización */}
                  <div className="flex-shrink-0 w-[120px] flex flex-col gap-2 justify-center">
                    <Button
                      onClick={() => setShowMiniMap(true)}
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] px-2 border-blue-500/60 flex items-center justify-center hover:bg-blue-500/10 transition-colors"
                      title="Ver minimapa"
                    >
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      Mapa
                    </Button>
                    <Button
                      onClick={() => setShowPassengersList(true)}
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] px-2 border-blue-500/60 flex items-center justify-center hover:bg-blue-500/10 transition-colors"
                      title="Ver lista de pasajeros"
                    >
                      <Users className="h-3.5 w-3.5 mr-1" />
                      Pasajeros
                    </Button>
                    <Button
                      onClick={() => setMapStyle(mapStyle === 'street' ? 'satellite' : 'street')}
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] px-2 border-blue-500/60 flex items-center justify-center hover:bg-blue-500/10 transition-colors"
                      title="Cambiar vista del mapa"
                    >
                      <MapPin className="h-3.5 w-3.5 mr-1" />
                      {mapStyle === 'street' ? 'Satélite' : 'Calles'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
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
          const user = getCurrentUser();
          if (user) {
            saveRouteToHistory(locationName, coordinates, user.id);
          } else {
            saveRouteToHistory(locationName, coordinates);
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
            setIsLoggedIn(!!getCurrentUser());
          }
        }}
      />
      
      {/* Tutorial del juego */}
      <GameTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={() => {
          setShowTutorial(false);
          // Si es el nivel tutorial, marcarlo como completado
          if (currentLevel && currentLevel.id === 0) {
            const updatedLevels = [...levels];
            const tutorialLevel = updatedLevels.find(l => l.id === 0);
            if (tutorialLevel) {
              tutorialLevel.completed = true;
              // Desbloquear el siguiente nivel
              const nextLevel = updatedLevels.find(l => l.id === 1);
              if (nextLevel) nextLevel.unlocked = true;
              
              setLevels(updatedLevels);
              saveLevelProgress(updatedLevels);
              toast.success('¡Tutorial completado! Has desbloqueado el nivel 1.');
            }
          }
          // Ya no es primera vez
          setIsFirstTimeUser(false);
        }}
        currentLevel={currentLevel?.id || 0}
        isFirstTime={isFirstTimeUser}
      />
      
      {/* Selector de niveles */}
      {showLevelSelector && (
        <LevelSelector
          onClose={() => setShowLevelSelector(false)}
          levels={levels}
          onSelectLevel={(level) => {
            setCurrentLevel(level);
            
            // Inicializar valores del juego según el nivel seleccionado
            setMoney(level.initialMoney);
            setHappiness(level.initialHappiness || 50);
            setPoints(0);
            
            // Reiniciar objetivos del nivel
            const updatedLevels = [...levels];
            const levelIndex = updatedLevels.findIndex(l => l.id === level.id);
            if (levelIndex !== -1) {
              updatedLevels[levelIndex].objectives.forEach(obj => obj.current = 0);
              setLevels(updatedLevels);
              saveLevelProgress(updatedLevels);
            }
            
            // Reiniciar el mapa si es necesario
            if (mapCenter) {
              initializeGame(mapCenter);
            }
            
            setShowLevelSelector(false);
            toast.success(`Nivel ${level.id}: ${level.name} seleccionado - €${level.initialMoney} iniciales`);
          }}
        />
      )}
      
      {/* Modal de asientos del tren */}
      <TrainSeatsModal
        isOpen={seatsModalVisible}
        onClose={() => setSeatsModalVisible(false)}
        pickedUpPassengers={pickedUpPassengers}
        trainCapacity={trainCapacity}
      />
      
      {/* Notificaciones de pasajeros */}
      <PassengerNotification
        type="pickup"
        count={pickupNotification.count}
        isVisible={pickupNotification.visible}
        position="pickup"
        onAnimationComplete={() => setPickupNotification({ visible: false, count: 0 })}
      />
      
      <PassengerNotification
        type="dropoff"
        count={dropoffNotification.count}
        isVisible={dropoffNotification.visible}
        position="dropoff"
        onAnimationComplete={() => setDropoffNotification({ visible: false, count: 0 })}
      />
      
      {/* Explorador de ciudades */}
      <CityExplorer
        open={showCityExplorer}
        onOpenChange={setShowCityExplorer}
        onCitySelect={(coordinates) => {
          setMapCenter(coordinates);
          setMapZoom(14);
          initializeGame(coordinates);
        }}
      />
      
      {/* Mis rutas */}
      <MyRoutes
        open={showMyRoutes}
        onOpenChange={setShowMyRoutes}
        onRouteSelect={(coordinates) => {
          setMapCenter(coordinates);
          setMapZoom(14);
          initializeGame(coordinates);
        }}
      />

      {/* Modal para el minimapa */}
      <MiniMap 
        tracks={tracks} 
        stations={stations}
        trainPosition={trainPosition}
        isOpen={showMiniMap}
        onClose={() => setShowMiniMap(false)}
      />

      {/* Modal para la lista de pasajeros */}
      {showPassengersList && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-xl border border-primary/30 w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-3 border-b border-border">
              <h3 className="text-lg font-semibold text-primary">Lista de Pasajeros</h3>
              <Button
                onClick={() => setShowPassengersList(false)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-4 max-h-[400px] overflow-y-auto">
              <PassengerList 
                activePassengers={activePassengers}
                pickedUpPassengers={pickedUpPassengers}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrainGame;
