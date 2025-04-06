import { Coordinates } from './mapUtils';

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
