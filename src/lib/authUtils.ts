// Sistema de autenticación con almacenamiento local
import { toast } from 'sonner';

export interface User {
  id: string;
  username: string;
  password: string; // En una aplicación real, nunca almacenaríamos contraseñas en texto plano
  email?: string;
  createdAt: number;
  lastLogin: number;
  savedRoutes: SavedRoute[];
}

export interface SavedRoute {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  timestamp: number;
  description?: string;
}

// Clave para almacenar usuarios en localStorage
const USERS_STORAGE_KEY = 'metroEspanol_users';
const CURRENT_USER_KEY = 'metroEspanol_currentUser';

// Obtener todos los usuarios registrados
export const getUsers = (): User[] => {
  try {
    const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
    if (usersJson) {
      return JSON.parse(usersJson);
    }
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
  }
  return [];
};

// Guardar usuarios en localStorage
const saveUsers = (users: User[]): void => {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (error) {
    console.error('Error al guardar usuarios:', error);
    toast.error('Error al guardar información de usuario');
  }
};

// Registrar un nuevo usuario
export const registerUser = (username: string, password: string, email?: string): boolean => {
  const users = getUsers();
  
  // Verificar si el usuario ya existe
  if (users.some(user => user.username.toLowerCase() === username.toLowerCase())) {
    toast.error('El nombre de usuario ya está en uso');
    return false;
  }
  
  // Crear nuevo usuario
  const newUser: User = {
    id: Date.now().toString(),
    username,
    password, // En una aplicación real, usaríamos hash+salt
    email,
    createdAt: Date.now(),
    lastLogin: Date.now(),
    savedRoutes: []
  };
  
  // Guardar usuario
  users.push(newUser);
  saveUsers(users);
  
  // Iniciar sesión automáticamente
  setCurrentUser(newUser);
  
  toast.success('¡Registro exitoso!');
  return true;
};

// Iniciar sesión
export const loginUser = (username: string, password: string): boolean => {
  const users = getUsers();
  const user = users.find(
    u => u.username.toLowerCase() === username.toLowerCase() && u.password === password
  );
  
  if (!user) {
    toast.error('Nombre de usuario o contraseña incorrectos');
    return false;
  }
  
  // Actualizar último inicio de sesión
  user.lastLogin = Date.now();
  saveUsers(users);
  
  // Establecer usuario actual
  setCurrentUser(user);
  
  toast.success(`¡Bienvenido de nuevo, ${user.username}!`);
  return true;
};

// Cerrar sesión
export const logoutUser = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY);
  toast.info('Sesión cerrada');
};

// Obtener usuario actual
export const getCurrentUser = (): User | null => {
  try {
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    if (userJson) {
      return JSON.parse(userJson);
    }
  } catch (error) {
    console.error('Error al obtener usuario actual:', error);
  }
  return null;
};

// Establecer usuario actual
const setCurrentUser = (user: User): void => {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error al establecer usuario actual:', error);
  }
};

// Guardar una ruta para el usuario actual
export const saveRouteForCurrentUser = (
  name: string, 
  coordinates: { lat: number; lng: number },
  description?: string
): boolean => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    toast.error('Debes iniciar sesión para guardar rutas');
    return false;
  }
  
  const users = getUsers();
  const userIndex = users.findIndex(u => u.id === currentUser.id);
  
  if (userIndex === -1) {
    toast.error('Usuario no encontrado');
    return false;
  }
  
  // Crear nueva ruta
  const newRoute: SavedRoute = {
    id: Date.now().toString(),
    name,
    coordinates,
    timestamp: Date.now(),
    description
  };
  
  // Añadir ruta al usuario
  users[userIndex].savedRoutes.unshift(newRoute);
  
  // Limitar a 10 rutas
  if (users[userIndex].savedRoutes.length > 10) {
    users[userIndex].savedRoutes = users[userIndex].savedRoutes.slice(0, 10);
  }
  
  // Guardar cambios
  saveUsers(users);
  setCurrentUser(users[userIndex]);
  
  // También guardar en el almacenamiento general de rutas para acceso rápido
  saveToRouteHistory(newRoute);
  
  return true;
};

// Guardar en historial general de rutas (para acceso sin iniciar sesión)
export const saveToRouteHistory = (route: SavedRoute): void => {
  try {
    let routes: SavedRoute[] = [];
    const routesJson = localStorage.getItem('metroEspanol_savedRoutes');
    
    if (routesJson) {
      routes = JSON.parse(routesJson);
    }
    
    // Añadir nueva ruta al principio
    routes.unshift(route);
    
    // Limitar a 10 rutas
    if (routes.length > 10) {
      routes = routes.slice(0, 10);
    }
    
    localStorage.setItem('metroEspanol_savedRoutes', JSON.stringify(routes));
  } catch (error) {
    console.error('Error al guardar en historial de rutas:', error);
  }
};

// Obtener rutas del usuario actual
export const getCurrentUserRoutes = (): SavedRoute[] => {
  const currentUser = getCurrentUser();
  return currentUser?.savedRoutes || [];
};
