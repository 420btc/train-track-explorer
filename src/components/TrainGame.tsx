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
import { setGlobalTracks } from '@/lib/routeUtils';
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
  
  // Mapa para contar cuántas veces se ha visitado cada vía
  const [visitCountMap, setVisitCountMap] = useState<Map<string, number>>(new Map());
  
  // Estado para el modo de exploración completa (recorrer todas las vías)
  const [exploreAllMode, setExploreAllMode] = useState<boolean>(false);
  
  // Estado para rastrear si se ha completado la exploración de todas las vías
  const [explorationCompleted, setExplorationCompleted] = useState<boolean>(false);
  
  // Estado para almacenar las vías numeradas del 1 al 9 para acceso rápido
  const [numberedTracks, setNumberedTracks] = useState<TrackSegment[]>([]);
  
  // Función para registrar una vía como visitada
  const markTrackAsVisited = useCallback((trackId: string) => {
    // Actualizar el conjunto de vías visitadas
    setVisitedTracks(prev => {
      const updated = new Set(prev);
      updated.add(trackId);
      return updated;
    });
    
    // Actualizar el contador de visitas para esta vía
    setVisitCountMap(prev => {
      const updated = new Map(prev);
      const currentCount = updated.get(trackId) || 0;
      updated.set(trackId, currentCount + 1);
      return updated;
    });
  }, []);
  
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
  const setPersonalStation = useCallback((stationId: string) => {
    setPersonalStationId(stationId);
    // Actualizar el estado global de la estación personal
    setPersonalStationIdContext(stationId);
  }, [setPersonalStationIdContext]);

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
      
      // Inicializar las vías numeradas del 1 al 9 para acceso rápido
      const tracksToNumber = trackNetwork.slice(0, 9);
      setNumberedTracks(tracksToNumber);
      
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
  
  // Ya tenemos el contexto del juego declarado anteriormente (línea 153)
  
  // Actualizar objetivos cada 5 segundos
  useEffect(() => {
    // No podemos usar hooks dentro de efectos o funciones
    // Usamos el gameContext que ya está declarado en el componente
    
    // Función para actualizar objetivos del nivel actual usando el gameContext existente
    const updateObjectives = () => {
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
    
    // Ejecutar inmediatamente al montar el componente
    if (!isLoading) {
      updateObjectives();
    }
    
    // Configurar intervalo para actualizaciones periódicas
    const interval = setInterval(() => {
      if (isLoading) return;
      updateObjectives();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isLoading, currentLevel, levels, gameContext, gameTime]);
  
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
      // Si estamos en modo exploración completa, buscar una vía no visitada o menos visitada
      if (exploreAllMode) {
        // Obtener todas las vías y calcular su prioridad para exploración
        const tracksWithPriority = tracks.map(track => {
          // Contar cuántas veces se ha visitado esta vía
          const visitCount = visitedTracks instanceof Set && visitedTracks.has(track.id) ? 1 : 0;
          
          // Calcular distancia al inicio y al final de la vía
          const startDistance = calculateDistance(trainPosition, track.path[0]);
          const endDistance = calculateDistance(trainPosition, track.path[track.path.length - 1]);
          
          // Usar la menor distancia (inicio o final)
          const distance = Math.min(startDistance, endDistance);
          
          // Añadir un factor aleatorio (entre 0 y 0.3) para evitar patrones predecibles
          const randomFactor = Math.random() * 0.3;
          
          // Calcular prioridad: 
          // - Las vías no visitadas tienen prioridad máxima (100)
          // - Las vías visitadas tienen prioridad basada en la distancia
          // - El factor aleatorio ayuda a romper empates
          const priority = visitCount === 0 
            ? 100 + randomFactor - (distance * 0.5) // Vías no visitadas: prioridad máxima
            : 10 - (distance * 2) + randomFactor;   // Vías visitadas: prioridad baja
          
          return { track, priority, visitCount, distance };
        });
        
        // Ordenar por prioridad (mayor primero)
        tracksWithPriority.sort((a, b) => b.priority - a.priority);
        
        // Verificar si hay vías no visitadas
        const hasUnvisitedTracks = tracksWithPriority.some(item => item.visitCount === 0);
        
        // Seleccionar una vía con cierta aleatoriedad para evitar bucles
        // Si hay vías no visitadas, elegir entre las mejores no visitadas
        // Si todas han sido visitadas, elegir con más aleatoriedad
        const poolSize = hasUnvisitedTracks ? 3 : 5;
        const selectionPool = tracksWithPriority.slice(0, Math.min(poolSize, tracksWithPriority.length));
        const selectedOption = selectionPool[Math.floor(Math.random() * selectionPool.length)];
        
        if (selectedOption) {
          const trackToExplore = selectedOption.track;
          
          // Marcar la vía como visitada
          setVisitedTracks(prev => {
            const newSet = new Set(prev);
            newSet.add(trackToExplore.id);
            return newSet;
          });
          
          // Registrar información detallada para depuración
          console.log(`Explorando vía ${trackToExplore.id} con prioridad ${selectedOption.priority.toFixed(2)}`);
          console.log(`- Visitas: ${selectedOption.visitCount}, Distancia: ${selectedOption.distance.toFixed(2)}`);
          console.log(`- Vías no visitadas restantes: ${hasUnvisitedTracks ? tracksWithPriority.filter(t => t.visitCount === 0).length : 0}`);
          
          // Seleccionar la nueva vía
          setSelectedTrack(trackToExplore);
          setCurrentTrackId(trackToExplore.id);
          setIsReversed(false);
          setCurrentPathIndex(0);
          setTrainPosition(trackToExplore.path[0]);
          setTrainMoving(true);
          
          // Mostrar mensaje diferente según si la vía ha sido visitada o no
          if (selectedOption.visitCount === 0) {
            toast.success(`Explorando nueva vía: ${trackToExplore.id}`);
          } else {
            toast.info(`Revisitando vía: ${trackToExplore.id}`);
          }
          return;
        }
        
        // Si no hay más vías sin visitar, mostrar mensaje de éxito
        toast.success('¡Has explorado todas las vías del mapa!');
        setExploreAllMode(false);
        setAutoMode(false);
        return;
      }
      
          // SIMPLIFICADO: Modo automático que prioriza vías no visitadas
      // Dividir las vías en dos grupos: no visitadas y visitadas
      const unvisitedTracks = tracks.filter(track => !visitedTracks.has(track.id));
      const visitedTracks = tracks.filter(track => visitedTracks.has(track.id));
      
      // Decidir qué grupo de vías usar
      const tracksToConsider = unvisitedTracks.length > 0 ? unvisitedTracks : tracks;
      
      // Calcular distancia y prioridad para cada vía
      const tracksWithPriority = tracksToConsider.map(track => {
        // Calcular distancia al inicio y final de la vía (usar la menor)
        const distanceToStart = calculateDistance(trainPosition, track.path[0]);
        const distanceToEnd = calculateDistance(trainPosition, track.path[track.path.length - 1]);
        const distance = Math.min(distanceToStart, distanceToEnd);
        
        // Añadir un factor aleatorio para evitar patrones predecibles
        const randomFactor = Math.random() * 0.5;
        
        // Prioridad simple: vías no visitadas tienen prioridad máxima
        const isUnvisited = !visitedTracks.has(track.id);
        const priority = isUnvisited ? 
          100 + randomFactor - (distance * 0.1) : // No visitada: prioridad alta
          10 + randomFactor - (distance * 0.5);   // Visitada: prioridad baja
        
        return { track, priority, isUnvisited, distance };
      });
      
      // Ordenar por prioridad (mayor primero)
      tracksWithPriority.sort((a, b) => b.priority - a.priority);
      
      // Seleccionar una de las mejores opciones (con algo de aleatoriedad)
      const poolSize = unvisitedTracks.length > 0 ? 3 : 5; // Más opciones si todas han sido visitadas
      const selectionPool = tracksWithPriority.slice(0, Math.min(poolSize, tracksWithPriority.length));
      const selectedOption = selectionPool[Math.floor(Math.random() * selectionPool.length)];
      
      if (selectedOption) {
        const nextTrack = selectedOption.track;
        
        // Buscar un camino conectado desde la posición actual hasta la vía seleccionada
        // Esto es crucial para evitar teleportaciones
        let pathToTrack = null;
        if (selectedTrack) {
          pathToTrack = findPathBetweenTracks(selectedTrack, nextTrack);
        }
        
        if (pathToTrack && pathToTrack.length > 0) {
          // Hay un camino conectado, seguirlo
          console.log(`Encontrado camino conectado a vía ${nextTrack.id} (${pathToTrack.length} segmentos)`);
          setAutoModePath(pathToTrack);
          setAutoModePathIndex(0);
          
          // Marcar la vía como visitada
          setVisitedTracks(prev => {
            const newSet = new Set(prev);
            newSet.add(nextTrack.id);
            return newSet;
          });
          
          // Mostrar mensaje informativo
          const statusText = selectedOption.isUnvisited ? 
            `Explorando nueva vía: ${nextTrack.id}` : 
            `Revisitando vía: ${nextTrack.id}`;
          toast.info(statusText);
          return;
        } else {
          // No hay camino conectado, buscar otra vía
          console.log(`No hay camino conectado a vía ${nextTrack.id}, buscando alternativa...`);
          
          // Si no hay camino, simplemente seguir en la vía actual
          handleMoveTrainClick();
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
    
    // Guardar la posición actual para mantener la continuidad visual
    const currentPosition = trainPosition;
    
    if (isAtEnd || isAtStart) {
      // Registrar la posición exacta donde el tren llegó al final/inicio
      console.log(`Tren en ${isAtEnd ? 'final' : 'inicio'} de vía ${selectedTrack.id} en posición:`, currentPosition);
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
          setVisitedTracks(prev => {
            const newSet = new Set(prev);
            newSet.add(nextTrack.id);
            return newSet;
          });
          
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
          // Si no hay más vías cercanas, cambiar de dirección y esperar 5 segundos
          toast.info("Final de vía detectado. Cambiando dirección en 5 segundos...");
          
          // Programar el cambio de dirección después de 5 segundos
          setTimeout(() => {
            // Invertir la dirección del tren
            setIsReversed(!isReversed);
            
            // Establecer el índice de inicio según la nueva dirección
            const newIndex = isReversed ? selectedTrack.path.length - 1 : 0;
            setCurrentPathIndex(newIndex);
            setTrainPosition(selectedTrack.path[newIndex]);
            
            toast.success("Dirección cambiada. Continuando en sentido " + (isReversed ? "inverso" : "normal"));
          }, 5000);
          
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

  // Referencia para almacenar el ID del intervalo del modo automático
  const autoModeIntervalRef = useRef<number | null>(null);

  // Manejar el cambio de velocidad
  const handleSpeedChange = useCallback((speed: number) => {
    console.log(`Cambiando velocidad del tren a: ${speed}%`);
    setTrainSpeed(speed);
    
    // Si estamos en modo automático, reiniciar el intervalo con la nueva velocidad
    if (autoMode && autoModeIntervalRef.current !== null) {
      console.log("Reiniciando intervalo del modo automático con nueva velocidad");
      // Limpiar el intervalo anterior
      clearInterval(autoModeIntervalRef.current);
      autoModeIntervalRef.current = null;
      
      // Forzar la actualización del efecto del modo automático
      setAutoMode(false);
      setTimeout(() => setAutoMode(true), 50);
    }
  }, [autoMode]);



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
          // Actualizar la vía seleccionada sin teleportar el tren
          // Guardar la posición actual para mantener la continuidad visual
          const currentPosition = trainPosition;
          
          // Actualizar la vía seleccionada
          setSelectedTrack(nextTrack);
          setCurrentTrackId(nextTrack.id);
          
          // Si la conexión es al inicio de la nueva vía
          if (connectingInfo.isAtStart) {
            setCurrentPathIndex(0);
            // Mantener la posición actual para evitar teleportación
            // pero actualizar ligeramente para que coincida con el inicio de la nueva vía
            setTrainPosition({
              ...nextTrack.path[0],
              // Ajuste mínimo para mantener la continuidad visual
              lat: nextTrack.path[0].lat + (currentPosition.lat - nextTrack.path[0].lat) * 0.1,
              lng: nextTrack.path[0].lng + (currentPosition.lng - nextTrack.path[0].lng) * 0.1
            });
            setIsReversed(false);
          } else {
            // La conexión es al final de la nueva vía
            const lastIndex = nextTrack.path.length - 1;
            setCurrentPathIndex(lastIndex);
            // Mantener la posición actual para evitar teleportación
            // pero actualizar ligeramente para que coincida con el final de la nueva vía
            setTrainPosition({
              ...nextTrack.path[lastIndex],
              // Ajuste mínimo para mantener la continuidad visual
              lat: nextTrack.path[lastIndex].lat + (currentPosition.lat - nextTrack.path[lastIndex].lat) * 0.1,
              lng: nextTrack.path[lastIndex].lng + (currentPosition.lng - nextTrack.path[lastIndex].lng) * 0.1
            });
            setIsReversed(true);
          }
          
          toast.success(`Continuando a vía conectada: ${nextTrack.id}`);
        }
      }
      
      // ELIMINADA LA SECCIÓN QUE CAUSABA TELEPORTACIÓN
      // Ya no buscamos la vía más cercana cuando no hay conexión
      // En su lugar, siempre cambiaremos de dirección
      
      // Si no hay conexión, mostrar mensaje y manejar la situación
      if (isAtEnd) {
        toast.info("El tren ha llegado al final de la vía y no hay conexión disponible");
      } else {
        toast.info("El tren ha llegado al inicio de la vía y no hay conexión disponible");
      }
      
      // Registrar esta vía como visitada para evitar volver a ella frecuentemente
      if (selectedTrack) {
        // Registrar múltiples veces para penalizarla más en futuras selecciones
        markTrackAsVisited(selectedTrack.id);
        markTrackAsVisited(selectedTrack.id);
        console.log(`Vía sin salida ${selectedTrack.id} penalizada con visitas adicionales`);
      }
      
      // SIEMPRE cambiar de dirección automáticamente cuando se llega al final de una vía sin conexión
      // Esto evita que el tren se quede atascado o vuelva al punto de partida
      
      // Registrar la vía actual como visitada para evitar bucles
      if (selectedTrack) {
        // Actualizar el conjunto de vías visitadas
        const newVisitedTracks = new Set(visitedTracks);
        newVisitedTracks.add(selectedTrack.id);
        setVisitedTracks(newVisitedTracks);
        
        // Registrar esta vía como visitada varias veces si es un callejón sin salida
        // Esto reduce su prioridad para futuras exploraciones
        console.log(`Vía sin salida ${selectedTrack.id} registrada como visitada al cambiar dirección`);
      }
      
      // Cambiar la dirección del tren
      setIsReversed(!isReversed);
      toast.info("Cambiando dirección automáticamente");
      
      // El tren ya está en la posición correcta (final o inicio de la vía)
      // No necesitamos cambiar su posición, solo la dirección de movimiento
      console.log(`Tren permanece en posición actual: ${JSON.stringify(trainPosition)} y cambia dirección`);
      
      // IMPORTANTE: Pausar brevemente el modo automático para evitar bucles infinitos
      if (autoMode) {
        console.log("Pausando modo automático temporalmente para evitar bucle infinito");
        setAutoMode(false);
        
        // Reactivar el modo automático después de un breve delay
        setTimeout(() => {
          console.log("Reactivando modo automático después de cambio de dirección");
          setAutoMode(true);
        }, 2000); // 2 segundos de pausa
      }
      
      // Mantener el índice actual para que el tren continúe desde donde está
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
  // Prioriza estaciones con más pasajeros esperando y menor tiempo de espera
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
    
    // Calcular puntuación para cada estación basada en:
    // 1. Distancia (menor distancia = mayor puntuación)
    // 2. Número de pasajeros esperando (más pasajeros = mayor puntuación)
    // 3. Tiempo de espera de los pasajeros (más tiempo = mayor prioridad)
    const stationScores = stationsWithPassengers.map(station => {
      // Calcular distancia
      const distance = calculateHaversineDistance(
        trainPosition.lat, 
        trainPosition.lng, 
        station.position.lat, 
        station.position.lng
      );
      
      // Contar pasajeros en esta estación
      const passengers = activePassengers.filter(p => 
        !p.isPickedUp && p.origin.id === station.id
      );
      
      // Calcular tiempo promedio de espera (en ms)
      const now = Date.now();
      const avgWaitTime = passengers.reduce((sum, p) => sum + (now - p.createdAt), 0) / passengers.length;
      
      // Calcular puntuación mejorada:
      // Factor de distancia: mayor puntuación para estaciones más cercanas
      // Usamos una función exponencial para penalizar más las distancias grandes
      const distanceScore = Math.exp(-distance / 10000) * 5; // Escala de 0 a 5 puntos
      
      // Factor de pasajeros: mayor puntuación para estaciones con más pasajeros
      // Aumentamos el peso para priorizar estaciones con muchos pasajeros
      const passengerScore = passengers.length * 3; // Cada pasajero vale 3 puntos
      
      // Factor de tiempo de espera: mayor puntuación para pasajeros que llevan esperando más tiempo
      // Usamos una función logística para dar más importancia a tiempos de espera largos
      const waitTimeScore = Math.min(15, Math.log10(1 + avgWaitTime / 1000) * 5); // Máximo 15 puntos
      
      // Verificar si hay un camino conectado a esta estación desde la vía actual
      let connectionScore = 0;
      if (selectedTrack) {
        // Encontrar la vía más cercana a la estación
        const nearestTrackId = findClosestTrack(station.position, tracks);
        if (nearestTrackId) {
          // Buscar el objeto TrackSegment correspondiente al ID
          const nearestTrackObj = tracks.find(t => t.id === nearestTrackId);
          if (nearestTrackObj) {
            // Verificar si hay un camino desde la vía actual hasta la vía cercana a la estación
            const hasPath = findPathBetweenTracks(selectedTrack, nearestTrackObj) !== null;
            // Si hay un camino conectado, dar una bonificación importante
            connectionScore = hasPath ? 20 : 0;
            
            if (hasPath) {
              console.log(`Estación ${station.id} tiene un camino conectado desde la vía actual`);
            }
          }
        }
      }
      
      // Factor aleatorio para evitar que el tren siempre elija la misma estación
      // Este factor es pequeño para no interferir demasiado con la lógica principal
      const randomFactor = Math.random() * 0.5;
      
      // Calculamos la puntuación total, priorizando estaciones conectadas
      const totalScore = distanceScore + passengerScore + waitTimeScore + connectionScore + randomFactor;
      
      // Devolver la estación y su puntuación para ordenar
      return {
        station,
        score: totalScore,
        // Incluir detalles para depuración
        details: {
          distance,
          distanceScore,
          passengerCount: passengers.length,
          passengerScore,
          avgWaitTime,
          waitTimeScore,
          randomFactor
        }
      };
    });
    
    // Ordenar por puntuación y devolver la mejor estación
    stationScores.sort((a, b) => b.score - a.score);
    
    // Mostrar información de depuración en la consola para las 3 mejores estaciones
    if (stationScores.length > 0) {
      console.log("Mejores estaciones para recoger pasajeros:");
      stationScores.slice(0, Math.min(3, stationScores.length)).forEach((item, index) => {
        console.log(`${index + 1}. ${item.station.name} - Puntuación: ${item.score.toFixed(2)}`, item.details);
      });
    }
    
    return stationScores.length > 0 ? stationScores[0].station : null;
  }, [stations, trainPosition, activePassengers]);
  
  // Función para encontrar la mejor vía para llegar a una estación
  const findBestTrackToStation = useCallback((targetStation: Station) => {
    if (!targetStation || !tracks || tracks.length === 0 || !trainPosition) return null;
    
    // Encontrar la vía más cercana a la estación objetivo que no haya sido visitada recientemente
    // o que tenga la mejor puntuación considerando distancia y si ha sido visitada
    let bestTrack = null;
    let bestScore = -Infinity;
    
    // Calcular el número total de vías visitadas para ajustar la penalización
    const visitedCount = visitedTracks.size;
    const totalTracks = tracks.length;
    const visitedRatio = visitedCount / totalTracks;
    
    tracks.forEach(track => {
      // Calcular la distancia desde cada punto de la vía a la estación
      // Calcular la distancia mínima entre la estación y cualquier punto de la vía
      let trackMinDistance = Infinity;
      
      track.path.forEach(point => {
        const distance = calculateHaversineDistance(
          point.lat,
          point.lng,
          targetStation.position.lat,
          targetStation.position.lng
        );
        
        if (distance < trackMinDistance) {
          trackMinDistance = distance;
        }
      });
      
      // Calcular puntuación basada en:
      // 1. Distancia inversa (menor distancia = mayor puntuación)
      // 2. Penalización si la vía ha sido visitada recientemente (evitar bucles)
      const distanceScore = 1 / (trackMinDistance + 0.1); // Evitar división por cero
      
      // Penalizar vías visitadas basado en el número de veces que han sido visitadas
      let visitedPenalty = 0;
      const visitCount = visitCountMap.get(track.id) || 0;
      
      if (visitCount > 0) {
        // Penalización MUCHO MÁS AGRESIVA: aumenta exponencialmente con cada visita adicional
        // La penalización es extremadamente alta cuando pocas vías han sido visitadas
        const baseVisitPenalty = Math.pow(visitCount + 1, 1.5) * 1.0; // Penalización exponencial por número de visitas
        const dynamicPenalty = Math.max(1.0, 5.0 * (1 - visitedRatio));
        visitedPenalty = baseVisitPenalty * dynamicPenalty;
        
        // Penalización mucho mayor en modo exploración completa
        if (exploreAllMode) {
          visitedPenalty *= 3;
        }
        
        // Penalización adicional si estamos forzando exploración aleatoria
        if (forceRandomExploration) {
          visitedPenalty *= 5; // Penalización extrema para forzar nuevas áreas
        }
        
        // Penalizar vías que aparecen en las últimas visitadas recientemente
        if (lastVisitedTracks.slice(-8).includes(track.id)) {
          visitedPenalty *= 2; // Doble penalización para vías visitadas recientemente
        }
      }
      
      // Añadir un factor aleatorio MUCHO MÁS FUERTE para mejorar la exploración
      // Este factor es extremadamente significativo para garantizar exploración completa
      let randomFactor;
      
      if (forceRandomExploration) {
        // Factor aleatorio extremadamente alto cuando estamos forzando exploración
        randomFactor = Math.random() * 10.0; // 20 veces más fuerte que el original
      } else if (exploreAllMode) {
        // Factor aleatorio muy alto en modo exploración
        randomFactor = Math.random() * 3.0; // 6 veces más fuerte que el original
      } else {
        // Factor aleatorio moderado en modo normal
        randomFactor = Math.random() * 1.0; // 5 veces más fuerte que el original
      }
      
      const score = distanceScore - visitedPenalty + randomFactor;
      
      if (score > bestScore) {
        bestScore = score;
        bestTrack = track;
      }
    });
    
    return bestTrack;
  }, [tracks, trainPosition, visitedTracks, exploreAllMode]);
  
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
  
  // Estado para rastrear las últimas vías visitadas
  const [lastVisitedTracks, setLastVisitedTracks] = useState<string[]>([]);
  // Estado para detectar bucles entre vías
  const [loopDetectionCounter, setLoopDetectionCounter] = useState<Record<string, number>>({});
  
  // Estado para forzar exploración aleatoria periódicamente
  const [forceRandomExploration, setForceRandomExploration] = useState<boolean>(false);
  
  // Contador para forzar exploración aleatoria cada cierto número de movimientos
  const [movementCounter, setMovementCounter] = useState<number>(0);
  
  // Estado para almacenar la ruta actual en modo automático
  // Función para actualizar el registro de vías visitadas
  const updateVisitedTracksHistory = useCallback(() => {
    if (!selectedTrack) return;
    
    // Incrementar contador de movimientos
    setMovementCounter(prev => prev + 1);
    
    // Forzar exploración aleatoria cada 15-20 movimientos
    if (movementCounter >= 15 + Math.floor(Math.random() * 5)) {
      setForceRandomExploration(true);
      setMovementCounter(0);
      console.log("Activando exploración aleatoria forzada para descubrir nuevas áreas");
      toast.info("Buscando nuevas áreas para explorar...");
    }
    
    // Añadir la vía actual a la lista de últimas vías visitadas
    const updatedLastTracks = [...lastVisitedTracks, selectedTrack.id].slice(-15); // Mantener las últimas 15 vías
    setLastVisitedTracks(updatedLastTracks);
    
    // Marcar la vía como visitada para el modo de exploración completa
    setVisitedTracks(prev => {
      const newSet = new Set(prev);
      newSet.add(selectedTrack.id);
      return newSet;
    });
    
    // Actualizar el contador de visitas para esta vía
    setVisitCountMap(prev => {
      const updated = new Map(prev);
      const currentCount = updated.get(selectedTrack.id) || 0;
      updated.set(selectedTrack.id, currentCount + 1);
      return updated;
    });
    
    // Verificar si todas las vías han sido visitadas
    if (exploreAllMode && tracks.length > 0) {
      const allVisited = tracks.every(track => visitedTracks instanceof Set && visitedTracks.has(track.id));
      if (allVisited && !explorationCompleted) {
        setExplorationCompleted(true);
        toast.success('¡Exploración completa! Has recorrido todas las vías del mapa. 🎉');
      }
    }
    
    // DETECCIÓN DE BUCLES MEJORADA
    // 1. Detectar bucles entre dos vías (A-B-A-B)
    if (updatedLastTracks.length >= 4) {
      // Verificar si hay un patrón A-B-A-B (bucle entre dos vías)
      const last4Tracks = updatedLastTracks.slice(-4);
      if (
        last4Tracks[0] === last4Tracks[2] && 
        last4Tracks[1] === last4Tracks[3] && 
        last4Tracks[0] !== last4Tracks[1]
      ) {
        // Detectamos un bucle entre dos vías
        const trackA = last4Tracks[0];
        const trackB = last4Tracks[1];
        const loopKey = `${trackA}-${trackB}`;
        
        // Incrementar el contador de este bucle específico
        setLoopDetectionCounter(prev => {
          const newCounter = {...prev};
          newCounter[loopKey] = (newCounter[loopKey] || 0) + 1;
          return newCounter;
        });
        
        console.log(`Bucle A-B-A-B detectado entre vías ${trackA} y ${trackB}. Contador: ${(loopDetectionCounter[loopKey] || 0) + 1}`);
        
        // Activar exploración aleatoria forzada si detectamos un bucle
        if ((loopDetectionCounter[loopKey] || 0) >= 1) {
          setForceRandomExploration(true);
          setMovementCounter(0);
        }
      }
    }
    
    // Detectar patrones más complejos (repetición de secuencias)
    if (updatedLastTracks.length >= 6) {
      // Buscar patrones como A-B-C-A-B-C
      const last6Tracks = updatedLastTracks.slice(-6);
      if (
        last6Tracks[0] === last6Tracks[3] && 
        last6Tracks[1] === last6Tracks[4] && 
        last6Tracks[2] === last6Tracks[5] &&
        // Asegurarse de que no sean todas la misma vía
        new Set(last6Tracks.slice(0, 3)).size > 1
      ) {
        const pattern = last6Tracks.slice(0, 3).join('-');
        const loopKey = `pattern-${pattern}`;
        
        // Incrementar el contador de este patrón
        setLoopDetectionCounter(prev => {
          const newCounter = {...prev};
          newCounter[loopKey] = (newCounter[loopKey] || 0) + 1;
          return newCounter;
        });
        
        console.log(`Bucle de patrón ${pattern} detectado. Contador: ${(loopDetectionCounter[loopKey] || 0) + 1}`);
        setForceRandomExploration(true);
      }
    }
    
    // Detectar área de alta concentración (muchas visitas a las mismas vías)
    const recentTracks = new Set(updatedLastTracks.slice(-8));
    if (recentTracks.size <= 3 && updatedLastTracks.length >= 8) {
      // Estamos visitando solo 3 o menos vías diferentes en los últimos 8 movimientos
      const areaKey = `area-${Array.from(recentTracks).sort().join('-')}`;
      
      setLoopDetectionCounter(prev => {
        const newCounter = {...prev};
        newCounter[areaKey] = (newCounter[areaKey] || 0) + 1;
        return newCounter;
      });
      
      console.log(`Alta concentración en área ${areaKey}. Contador: ${(loopDetectionCounter[areaKey] || 0) + 1}`);
      
      // Si estamos atrapados en un área pequeña por mucho tiempo, forzar exploración aleatoria
      if ((loopDetectionCounter[areaKey] || 0) >= 1) {
        setForceRandomExploration(true);
        setMovementCounter(0);
      }
    }
    
    // TOMAR ACCIÓN CONTRA BUCLES PERSISTENTES
    Object.entries(loopDetectionCounter).forEach(([loopKey, count]) => {
      // Si un bucle se ha detectado más de 2 veces, tomar medidas drásticas
      if (count >= 2) {
        console.log(`Bucle persistente detectado: ${loopKey}. Contador: ${count}. Tomando medidas drásticas.`);
        toast.error(`Bucle detectado. Buscando una ruta completamente nueva.`);
        
        // Extraer las vías involucradas en el bucle
        let loopTracks: string[] = [];
        
        if (loopKey.includes('pattern-')) {
          loopTracks = loopKey.split('-').slice(1);
        } else if (loopKey.includes('area-')) {
          loopTracks = loopKey.split('-').slice(1);
        } else {
          loopTracks = loopKey.split('-');
        }
        
        // Buscar vías que no estén en el bucle
        const tracksNotInLoop = tracks.filter(t => !loopTracks.includes(t.id));
        
        if (tracksNotInLoop.length > 0) {
          // Seleccionar una vía aleatoria que no esté en el bucle, priorizando las menos visitadas
          const sortedTracks = [...tracksNotInLoop].sort((a, b) => {
            const visitsA = visitCountMap.get(a.id) || 0;
            const visitsB = visitCountMap.get(b.id) || 0;
            return visitsA - visitsB; // Ordenar por número de visitas (menos a más)
          });
          
          // Tomar una de las vías menos visitadas al azar
          const candidateTracks = sortedTracks.slice(0, Math.min(5, sortedTracks.length));
          const randomTrack = candidateTracks[Math.floor(Math.random() * candidateTracks.length)];
          
          // Intentar encontrar un camino hacia esta vía
          const escapePath = findPathBetweenTracks(selectedTrack, randomTrack);
          
          if (escapePath && escapePath.length > 0) {
            // Establecer esta ruta como la nueva ruta para escapar del bucle
            setAutoModePath(escapePath);
            setAutoModePathIndex(0);
            toast.success(`Rompiendo bucle: nueva ruta hacia vía ${randomTrack.id} encontrada.`);
            
            // Resetear el contador de bucles para estas vías
            setLoopDetectionCounter(prev => {
              const newCounter = {...prev};
              delete newCounter[loopKey];
              return newCounter;
            });
            
            // Desactivar la exploración forzada ya que estamos tomando una acción específica
            setForceRandomExploration(false);
            
            return; // Salir para evitar otras acciones
          }
        }
        
        // Si no se puede encontrar una ruta de escape y el bucle persiste
        if (count >= 4) {
          toast.error(`No se puede escapar del bucle. Desactivando modo automático.`);
          setAutoMode(false);
          
          // Resetear todos los contadores de bucles
          setLoopDetectionCounter({});
          setForceRandomExploration(false);
          return;
        }
      }
    });
    
    // Contar cuántas veces aparece la vía actual en las últimas visitadas
    const currentTrackOccurrences = updatedLastTracks.filter(id => id === selectedTrack.id).length;
    
    // Si la vía actual aparece más de 3 veces en las últimas 10, aumentar su penalización
    if (currentTrackOccurrences >= 3) {
      console.log(`Vía ${selectedTrack.id} detectada en un posible bucle, aumentando penalización`);
      
      // Notificar al usuario
      toast.warning(`Detectado posible bucle en vía ${selectedTrack.id}. Buscando rutas alternativas.`);
    }
  }, [selectedTrack, lastVisitedTracks, exploreAllMode, tracks, visitedTracks, explorationCompleted, loopDetectionCounter, findPathBetweenTracks, setAutoMode, movementCounter, visitCountMap, forceRandomExploration, setForceRandomExploration, setMovementCounter, setVisitedTracks, setVisitCountMap, setExplorationCompleted, autoModePath, setAutoModePath, setAutoModePathIndex, setLoopDetectionCounter, setLastVisitedTracks]);
  

  
  // Efecto para el modo automático inteligente
  useEffect(() => {
    if (!autoMode) return;
    
    // Asegurarse de que el tren esté en movimiento cuando se activa el modo automático
    setTrainMoving(true);
    
    // Calcular el intervalo de tiempo basado en la velocidad
    // Velocidad 1% = 3000ms (extremadamente lento), Velocidad 100% = 500ms (moderado)
    // Fórmula ajustada para que el tren vaya más lento en modo automático
    const interval = Math.max(500, 3000 - (trainSpeed * 25));
    
    console.log("Modo automático con velocidad:", trainSpeed, "% - Intervalo:", interval, "ms");
    
    // Resetear el historial de vías visitadas al iniciar el modo automático
    setLastVisitedTracks([]);
    
    // Mover el tren inmediatamente al activar el modo automático
    if (selectedTrack) {
      handleMoveTrainClick();
    }
    
    // Crear un temporizador para mover el tren automáticamente
    const intervalId = window.setInterval(() => {
      if (!selectedTrack || selectedTrack.path.length === 0) {
        setAutoMode(false);
        toast.error("No hay vía seleccionada");
        return;
      }
      
      // Actualizar el historial de vías visitadas y detectar posibles bucles
      updateVisitedTracksHistory();
      
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
          // Ordenar pasajeros por orden de recogida (entregar primero los que fueron recogidos primero)
          // Como no tenemos un timestamp de recogida, usamos el orden actual de la lista
          const sortedPassengers = [...pickedUpPassengers];
          const firstPassenger = sortedPassengers[0];
          const destinationStation = firstPassenger.destination;
          
          // Buscar la mejor vía para llegar a la estación de destino
          const bestTrackToDestination = findBestTrackToStation(destinationStation);
          
          if (bestTrackToDestination && bestTrackToDestination.id !== selectedTrack.id) {
            // Registrar la vía actual como visitada para evitar bucles
            if (selectedTrack) {
              markTrackAsVisited(selectedTrack.id);
            }
            
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
              // Registrar la vía actual como visitada para evitar bucles
              if (selectedTrack) {
                markTrackAsVisited(selectedTrack.id);
              }
              
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
            // No hay estaciones con pasajeros, explorar nuevas vías no visitadas
            // Implementar un algoritmo más sofisticado para la exploración completa del mapa
            
            // Calcular el porcentaje de vías visitadas
            const visitedCount = visitedTracks.size;
            const totalTracks = tracks.length;
            const visitedRatio = visitedCount / totalTracks;
            
            // Mostrar progreso de exploración
            const explorationProgress = Math.floor(visitedRatio * 100);
            
            // Estrategia 1: Priorizar vías no visitadas
            const unvisitedTracks = tracks.filter(track => !visitedTracks.has(track.id));
            
            if (unvisitedTracks.length > 0) {
              // Calcular la distancia desde la posición actual a cada vía no visitada
              const tracksWithDistance = unvisitedTracks.map(track => {
                // Encontrar el punto más cercano de la vía
                let minDistance = Infinity;
                track.path.forEach(point => {
                  const distance = calculateHaversineDistance(
                    trainPosition.lat,
                    trainPosition.lng,
                    point.lat,
                    point.lng
                  );
                  if (distance < minDistance) {
                    minDistance = distance;
                  }
                });
                
                return {
                  track,
                  distance: minDistance,
                  // Añadir un factor aleatorio extremadamente alto para garantizar exploración aleatoria
                  randomFactor: Math.random() * 5.0 // Factor aleatorio 5 veces más fuerte
                };
              });
              
              // Ordenar vías por una combinación de distancia y factor aleatorio
              // Esto garantiza que el tren no siempre elija la vía más cercana
              tracksWithDistance.sort((a, b) => {
                // Combinar distancia y factor aleatorio
                // Aumentamos EXTREMADAMENTE el peso del factor aleatorio para garantizar
                // que el tren explore todo el mapa de forma completamente aleatoria
                // Esto es crucial para evitar bucles y garantizar exploración completa
                const randomWeight = 10.0; // Peso fijo extremadamente alto para el factor aleatorio
                const scoreA = a.distance - (a.randomFactor * randomWeight * 50000); // Influencia masiva del factor aleatorio
                const scoreB = b.distance - (b.randomFactor * randomWeight * 50000);
                return scoreA - scoreB;
              });
              
              // Elegir una vía de forma EXTREMADAMENTE aleatoria para garantizar exploración completa
              // Aumentamos drásticamente el rango de selección para máxima aleatoriedad
              // Esto es crucial para evitar bucles y garantizar exploración completa
              const selectionIndex = Math.min(
                Math.floor(Math.random() * Math.min(20, tracksWithDistance.length)), // Elegir entre hasta 20 opciones
                tracksWithDistance.length - 1
              );
              
              // Usar let en lugar de const para poder reasignar
              let selectedTrackToExplore = tracksWithDistance[selectionIndex].track;
              
              // Verificar si esta vía aparece en las últimas visitadas (para evitar bucles)
              const recentlyVisited = lastVisitedTracks.includes(selectedTrackToExplore.id);
              
              // Si la vía seleccionada ha sido visitada recientemente, intentar con otra
              if (recentlyVisited && tracksWithDistance.length > 1) {
                // Elegir otra vía aleatoria que no sea la que acabamos de seleccionar
                const alternativeOptions = tracksWithDistance.filter(t => t.track.id !== selectedTrackToExplore.id);
                if (alternativeOptions.length > 0) {
                  const alternativeIndex = Math.floor(Math.random() * alternativeOptions.length);
                  const alternativeTrack = alternativeOptions[alternativeIndex].track;
                  console.log(`Vía ${selectedTrackToExplore.id} visitada recientemente, cambiando a ${alternativeTrack.id}`);
                  selectedTrackToExplore = alternativeTrack;
                }
              }
              
              // Verificar si hay un camino conectado desde la vía actual hasta la vía seleccionada
              // Esto es crucial para evitar que el tren intente ir a vías no conectadas
              const pathToSelectedTrack = findPathBetweenTracks(selectedTrack, selectedTrackToExplore);
              
              // Si no hay un camino conectado, buscar otra vía que sí esté conectada
              if (!pathToSelectedTrack && tracksWithDistance.length > 1) {
                console.log(`No hay camino conectado a vía ${selectedTrackToExplore.id}, buscando alternativa...`);
                
                // Buscar una vía alternativa que tenga un camino conectado
                for (let i = 0; i < tracksWithDistance.length; i++) {
                  const alternativeTrack = tracksWithDistance[i].track;
                  if (alternativeTrack.id !== selectedTrackToExplore.id) {
                    const alternativePath = findPathBetweenTracks(selectedTrack, alternativeTrack);
                    if (alternativePath) {
                      console.log(`Encontrada vía conectada alternativa: ${alternativeTrack.id}`);
                      selectedTrackToExplore = alternativeTrack;
                      break;
                    }
                  }
                }
              }
              
              // Usar la vía seleccionada (original o alternativa)
              const trackToExplore = selectedTrackToExplore;
              
              // Mostrar información de depuración sobre la exploración
              console.log("Exploración automática:", {
                totalTracks: tracks.length,
                unvisitedTracks: unvisitedTracks.length,
                selectedTrackId: trackToExplore.id,
                selectionIndex,
                randomFactor: tracksWithDistance[selectionIndex].randomFactor,
                distance: tracksWithDistance[selectionIndex].distance
              });
              
              // Buscar una ruta a esta vía
              const path = findPathBetweenTracks(selectedTrack, trackToExplore);
              
              if (path && path.length > 0) {
                // Registrar todas las vías de la ruta como visitadas
                path.forEach(track => markTrackAsVisited(track.id));
                
                setAutoModePath(path);
                setAutoModePathIndex(0);
                toast.info(`Explorando: ${explorationProgress}% del mapa (${visitedCount}/${totalTracks} vías)`);
              } else {
                // Si no se puede encontrar una ruta, mover el tren a lo largo de la vía actual
                // y marcarla como visitada
                if (selectedTrack) {
                  markTrackAsVisited(selectedTrack.id);
                }
                handleMoveTrainClick();
              }
            } else {
              // Todas las vías han sido visitadas al menos una vez
              if (!explorationCompleted && exploreAllMode) {
                toast.success("¡Exploración completa! Has recorrido todas las vías del mapa.");
                setExplorationCompleted(true);
              }
              
              // En lugar de reiniciar completamente, buscar las vías menos visitadas
              const trackVisitCounts = Array.from(tracks).map(track => ({
                track,
                visitCount: visitCountMap.get(track.id) || 0
              }));
              
              // Ordenar las vías por número de visitas (menos visitas primero)
              trackVisitCounts.sort((a, b) => a.visitCount - b.visitCount);
              
              // Obtener el número mínimo de visitas
              const minVisitCount = trackVisitCounts.length > 0 ? trackVisitCounts[0].visitCount : 0;
              
              // Calcular el rango de visitas para considerar vías "menos visitadas"
              // Esto permite incluir más vías en la selección para mayor aleatoriedad
              const visitThreshold = minVisitCount + 1; // Incluir vías con 1 visita más que el mínimo
              
              // Filtrar vías con pocas visitas (no solo las mínimas)
              const leastVisitedTracks = trackVisitCounts
                .filter(item => item.visitCount <= visitThreshold)
                .map(item => item.track);
              
              console.log("Exploración de vías menos visitadas:", {
                totalTracks: tracks.length,
                minVisitCount,
                visitThreshold,
                candidateTracks: leastVisitedTracks.length
              });
              
              if (leastVisitedTracks.length > 0) {
                // Calcular distancias a cada vía menos visitada
                const tracksWithDistance = leastVisitedTracks.map(track => {
                  // Encontrar el punto más cercano de la vía
                  let minDistance = Infinity;
                  track.path.forEach(point => {
                    const distance = calculateHaversineDistance(
                      trainPosition.lat,
                      trainPosition.lng,
                      point.lat,
                      point.lng
                    );
                    if (distance < minDistance) {
                      minDistance = distance;
                    }
                  });
                  
                  return {
                    track,
                    distance: minDistance,
                    // Factor aleatorio muy alto para garantizar exploración aleatoria
                    randomFactor: Math.random() * 2.0 // Factor aleatorio doble para máxima aleatoriedad
                  };
                });
                
                // Ordenar con un componente aleatorio muy fuerte
                tracksWithDistance.sort((a, b) => {
                  // El factor aleatorio tiene mucho más peso que la distancia
                  const scoreA = a.distance - (a.randomFactor * 30000);
                  const scoreB = b.distance - (b.randomFactor * 30000);
                  return scoreA - scoreB;
                });
                
                // Elegir una vía de forma muy aleatoria
                const selectionIndex = Math.min(
                  Math.floor(Math.random() * Math.min(15, tracksWithDistance.length)), // Hasta 15 opciones
                  tracksWithDistance.length - 1
                );
                const trackToExplore = tracksWithDistance[selectionIndex].track;
                
                console.log(`Seleccionada vía ${trackToExplore.id} para exploración (${minVisitCount} visitas)`, {
                  selectionIndex,
                  randomFactor: tracksWithDistance[selectionIndex].randomFactor,
                  distance: tracksWithDistance[selectionIndex].distance
                });
                
                toast.info(`Explorando vías menos visitadas (${minVisitCount} visitas)`);
                
                // Buscar una ruta a esta vía
                const newPath = findPathBetweenTracks(selectedTrack, trackToExplore);
                
                if (newPath && newPath.length > 0) {
                  setAutoModePath(newPath);
                  setAutoModePathIndex(0);
                } else {
                  // En lugar de seleccionar una vía aleatoria que podría no estar conectada,
                  // simplemente cambiamos de dirección en la vía actual
                  console.log("No se encontró ruta conectada, cambiando de dirección en la vía actual");
                  
                  // No hay necesidad de buscar una ruta alternativa que podría causar teleportación
                  const alternativePath = null;
                  
                  if (alternativePath && alternativePath.length > 0) {
                    setAutoModePath(alternativePath);
                    setAutoModePathIndex(0);
                  } else {
                    handleMoveTrainClick();
                  }
                }
              } else {
                // Si por alguna razón no hay vías, simplemente mover el tren
                handleMoveTrainClick();
              }
            }
          }
        }
      }
      
      // Si no hay una ruta en progreso, mover el tren a lo largo de la vía seleccionada
      if (autoModePath.length === 0) {
        handleMoveTrainClick();
      }
    }, interval);
    
    // Guardar la referencia al intervalo
    autoModeIntervalRef.current = intervalId as unknown as number;
    
    return () => {
      console.log("Limpiando intervalo del modo automático");
      clearInterval(intervalId);
      autoModeIntervalRef.current = null;
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
    if (!track) return;
    
    // Siempre resaltar la vía seleccionada para visualización
    setHighlightedTrack(track);
    
    // Si no hay una vía seleccionada actualmente, colocar el tren en la vía seleccionada
    if (!selectedTrack) {
      setSelectedTrack(track);
      setCurrentPathIndex(0);
      setTrainPosition(track.path[0]);
      setCurrentTrackId(track.id);
      setIsReversed(false); // Reiniciar dirección al seleccionar una nueva vía
      toast.success(`Tren colocado en vía: ${track.id}`);
      return;
    }
    
    // Si ya hay una vía seleccionada, buscar un camino hacia la nueva vía
    if (selectedTrack.id !== track.id) {
      // Verificar si la vía seleccionada está directamente conectada a la vía actual
      // Esto es importante para el cambio de vía con teclas A/D
      const isDirectlyConnected = findPathBetweenTracks(selectedTrack, track)?.length === 2;
      
      // Buscar un camino desde la vía actual hasta la vía seleccionada
      const path = findPathBetweenTracks(selectedTrack, track);
      
      if (path && path.length > 0) {
        // Si es una vía directamente conectada (cambio con A/D o teclas numéricas)
        // y el tren está cerca del punto de conexión, hacer un cambio suave sin teleportación
        if (isDirectlyConnected) {
          // Determinar si el tren está cerca del punto de conexión
          // Buscar el punto más cercano entre las dos vías
          let minDistance = Number.MAX_VALUE;
          let closestPointIndex = 0;
          
          // Encontrar el punto de la vía actual más cercano al tren
          for (let i = 0; i < selectedTrack.path.length; i++) {
            const distance = calculateDistance(trainPosition, selectedTrack.path[i]);
            if (distance < minDistance) {
              minDistance = distance;
              closestPointIndex = i;
            }
          }
          
          // Determinar si estamos cerca del inicio o del final de la vía
          const isNearStart = closestPointIndex < selectedTrack.path.length * 0.3;
          const isNearEnd = closestPointIndex > selectedTrack.path.length * 0.7;
          
          // Si estamos cerca del inicio o del final, podemos hacer un cambio suave
          if (isNearStart || isNearEnd) {
            // Cambiar directamente a la nueva vía sin teleportación
            setSelectedTrack(track);
            setCurrentTrackId(track.id);
            
            // Determinar la dirección inicial en la nueva vía
            // Si estamos cerca del inicio de la vía actual, comenzar desde el final de la nueva vía
            // Si estamos cerca del final de la vía actual, comenzar desde el inicio de la nueva vía
            const newIsReversed = isNearStart;
            setIsReversed(newIsReversed);
            
            // Establecer el índice de ruta adecuado
            if (newIsReversed) {
              setCurrentPathIndex(track.path.length - 1);
            } else {
              setCurrentPathIndex(0);
            }
            
            // Marcar la vía como visitada
            setVisitedTracks(prev => {
              const newSet = new Set(prev);
              newSet.add(track.id);
              return newSet;
            });
            
            toast.success(`Cambiando a vía ${track.id} (cambio suave)`);
            return;
          }
        }
        
        // Si no es un cambio suave, usar el método estándar con ruta
        setAutoModePath(path);
        setAutoModePathIndex(0);
        
        // Verificar si hay pasajeros en la vía seleccionada
        const stationsOnTrack = stations.filter(s => s.trackId === track.id);
        const hasPassengers = stationsOnTrack.some(station => {
          return activePassengers.some(p => !p.isPickedUp && p.origin.id === station.id);
        });
        
        // Mensaje personalizado según si hay pasajeros o no
        if (hasPassengers) {
          toast.success(`Ruta calculada a vía ${track.id} con pasajeros esperando (${path.length} vías)`);
        } else {
          toast.success(`Ruta calculada a vía ${track.id} (${path.length} vías)`);
        }
        
        // Si ya está en modo automático, simplemente cambiar la ruta
        // Si no está en modo automático, activarlo temporalmente para seguir la ruta
        if (!autoMode) {
          setAutoMode(true);
          
          // Configurar un temporizador para desactivar el modo automático cuando se complete la ruta
          setTimeout(() => {
            // Comprobar si el tren ha llegado a la vía objetivo
            if (selectedTrack && selectedTrack.id === track.id) {
              setAutoMode(false);
              toast.success(`Tren llegado a la vía ${track.id}`);
            }
          }, path.length * 2000); // Tiempo estimado para completar la ruta
        } else {
          // Si ya está en modo automático, informar que se ha cambiado la ruta
          toast.info(`Cambiando rumbo en modo automático hacia vía ${track.id}`);
          
          // Limpiar cualquier objetivo anterior
          setAutoModeTargetStation(null);
        }
      } else {
        toast.error(`No se encontró una ruta conectada a la vía ${track.id}`);
      }
    } else {
      // Si es la misma vía, solo mostrar un mensaje
      toast.info(`El tren ya está en la vía ${track.id}`);
    }
  }, [tracks, autoMode, selectedTrack, stations, activePassengers]);

  // Manejador de eventos de teclado para cambiar de vía con A/D o flechas izquierda/derecha
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Si no hay una vía seleccionada o el tren está en modo automático, no hacer nada
    if (!selectedTrack || autoMode) return;
    
    // Obtener todas las vías conectadas a la vía actual
    const connectedTracks = tracks.filter(track => {
      // Verificar si hay una conexión entre la vía actual y esta vía
      const path = findPathBetweenTracks(selectedTrack, track);
      return path && path.length === 2; // Solo considerar vías directamente conectadas (path incluye la vía actual)
    });
    
    // Si no hay vías conectadas, no hacer nada
    if (connectedTracks.length === 0) return;
    
    // Manejar las teclas A/D o flechas izquierda/derecha
    if (event.key === 'a' || event.key === 'A' || event.key === 'ArrowLeft') {
      // Seleccionar la vía conectada a la izquierda (si hay varias, elegir la primera)
      if (connectedTracks.length > 0) {
        const nextTrack = connectedTracks[0];
        handleTrackSelect(nextTrack.id);
        toast.info(`Cambiando a vía ${nextTrack.id} (izquierda)`);
      }
    } else if (event.key === 'd' || event.key === 'D' || event.key === 'ArrowRight') {
      // Seleccionar la vía conectada a la derecha (si hay varias, elegir la última)
      if (connectedTracks.length > 0) {
        const nextTrack = connectedTracks[connectedTracks.length - 1];
        handleTrackSelect(nextTrack.id);
        toast.info(`Cambiando a vía ${nextTrack.id} (derecha)`);
      }
    } else if (event.key >= '1' && event.key <= '9') {
      // Seleccionar una vía numerada del 1 al 9
      const trackIndex = parseInt(event.key) - 1;
      if (trackIndex < numberedTracks.length) {
        const selectedNumberedTrack = numberedTracks[trackIndex];
        handleTrackSelect(selectedNumberedTrack.id);
        toast.info(`Cambiando a vía ${selectedNumberedTrack.id} (tecla ${event.key})`);
      }
    }
  }, [selectedTrack, autoMode, tracks, numberedTracks, handleTrackSelect, findPathBetweenTracks]);
  
  // Efecto para registrar y limpiar el manejador de eventos de teclado
  useEffect(() => {
    // Registrar el manejador de eventos de teclado
    window.addEventListener('keydown', handleKeyDown);
    
    // Limpiar el manejador de eventos de teclado al desmontar el componente
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Efecto para actualizar las vías globales cuando cambian
  useEffect(() => {
    // Establecer las vías globales para que findPathBetweenTracks pueda usarlas
    if (tracks.length > 0) {
      setGlobalTracks(tracks);
      console.log(`Actualizadas ${tracks.length} vías globales para pathfinding`);
    }
  }, [tracks]);

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
                  onClick={() => searchQuery.trim() && handleSearchSubmit({ preventDefault: () => {} } as React.KeyboardEvent<HTMLInputElement>)}
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
                          onClick={() => setExploreAllMode(!exploreAllMode)}
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
