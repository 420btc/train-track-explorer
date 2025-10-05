import { Coordinates, TrackSegment, findConnectingTrack } from './mapUtils';

interface RouteHistoryItem {
  id: string;
  name: string;
  coordinates: Coordinates;
  timestamp: number;
  userId?: string;
}

// Clave para almacenar el historial de rutas en localStorage
const ROUTE_HISTORY_KEY = 'metro-espanol-route-history';

// Función para obtener el historial de rutas
export const getRouteHistory = (): RouteHistoryItem[] => {
  try {
    const historyJson = localStorage.getItem(ROUTE_HISTORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('Error al cargar el historial de rutas:', error);
    return [];
  }
};

// Función para guardar una ruta en el historial
export const saveRouteToHistory = (
  name: string, 
  coordinates: Coordinates, 
  userId?: string
): void => {
  try {
    const history = getRouteHistory();
    
    // Crear nuevo elemento de historial
    const newItem: RouteHistoryItem = {
      id: Date.now().toString(),
      name,
      coordinates,
      timestamp: Date.now(),
      ...(userId && { userId })
    };
    
    // Añadir al inicio y limitar a 10 elementos
    const updatedHistory = [newItem, ...history].slice(0, 10);
    
    // Guardar en localStorage
    localStorage.setItem(ROUTE_HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (error) {
    console.error('Error al guardar la ruta en el historial:', error);
  }
};

// Función para obtener las rutas de un usuario específico
export const getUserRoutes = (userId: string): RouteHistoryItem[] => {
  const history = getRouteHistory();
  return history.filter(item => item.userId === userId);
};

// Función para guardar una ruta para el usuario actual
export const saveRouteForCurrentUser = (name: string, coordinates: Coordinates, userId: string): void => {
  saveRouteToHistory(name, coordinates, userId);
};

// Variable global para almacenar todas las vías del juego
// Esto permite que findPathBetweenTracks tenga acceso a todas las vías sin necesidad de pasarlas como parámetro
let globalTracks: TrackSegment[] = [];

// Función para establecer las vías globales
export const setGlobalTracks = (tracks: TrackSegment[]): void => {
  globalTracks = tracks;
};

// Función para encontrar un camino entre dos vías
// Utiliza un algoritmo de búsqueda en anchura (BFS) para encontrar el camino más corto
export const findPathBetweenTracks = (
  startTrack: TrackSegment,
  endTrack: TrackSegment
): TrackSegment[] | null => {
  // Usar las vías globales si están disponibles, o solo las vías proporcionadas si no
  const allTracks = globalTracks.length > 0 ? globalTracks : [startTrack, endTrack];
  // Si las vías son las mismas, devolver un array con la vía
  if (startTrack.id === endTrack.id) {
    return [startTrack];
  }
  
  // Conjunto para almacenar las vías visitadas
  const visited = new Set<string>();
  // Cola para el BFS
  const queue: { track: TrackSegment; path: TrackSegment[] }[] = [
    { track: startTrack, path: [startTrack] }
  ];
  
  while (queue.length > 0) {
    const { track, path } = queue.shift()!;
    
    // Si ya hemos visitado esta vía, continuar con la siguiente
    if (visited.has(track.id)) continue;
    
    // Marcar como visitada
    visited.add(track.id);
    
    // Buscar vías conectadas
    const connectingAtEnd = findConnectingTrack(track, allTracks, true);
    const connectingAtStart = findConnectingTrack(track, allTracks, false);
    
    // Comprobar conexiones al final de la vía
    if (connectingAtEnd && connectingAtEnd.trackId) {
      // Si la vía conectada es la vía objetivo, hemos encontrado un camino
      if (connectingAtEnd.trackId === endTrack.id) {
        return [...path, endTrack];
      }
      
      // Añadir la vía conectada a la cola
      const nextTrack = allTracks.find(t => t.id === connectingAtEnd.trackId);
      if (nextTrack && !visited.has(nextTrack.id)) {
        queue.push({ track: nextTrack, path: [...path, nextTrack] });
      }
    }
    
    // Comprobar conexiones al inicio de la vía
    if (connectingAtStart && connectingAtStart.trackId) {
      // Si la vía conectada es la vía objetivo, hemos encontrado un camino
      if (connectingAtStart.trackId === endTrack.id) {
        return [...path, endTrack];
      }
      
      // Añadir la vía conectada a la cola
      const nextTrack = allTracks.find(t => t.id === connectingAtStart.trackId);
      if (nextTrack && !visited.has(nextTrack.id)) {
        queue.push({ track: nextTrack, path: [...path, nextTrack] });
      }
    }
  }
  
  // Si no se encontró un camino, devolver null
  return null;
};
