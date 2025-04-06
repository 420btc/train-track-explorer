import { toast } from 'sonner';

export interface LevelObjective {
  type: 'money' | 'passengers' | 'happiness' | 'time';
  target: number;
  current: number;
}

export interface GameLevel {
  id: number;
  name: string;
  description: string;
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard' | 'expert';
  passengerFrequency: number; // En segundos
  maxPassengers: number;
  eventFrequency: number; // En segundos, 0 = sin eventos
  objectives: LevelObjective[];
  unlocked: boolean;
  completed: boolean;
  timeLimit?: number; // En segundos, undefined = sin límite
  initialMoney: number; // Dinero inicial para el nivel
  initialHappiness?: number; // Felicidad inicial para el nivel
  trainCapacity: number; // Capacidad máxima de pasajeros en el tren
}

// Definición de los niveles del juego
export const gameLevels: GameLevel[] = [
  {
    id: 0,
    name: "Tutorial",
    description: "Aprende los conceptos básicos del juego",
    difficulty: "tutorial",
    passengerFrequency: 20, // Un pasajero cada 20 segundos
    maxPassengers: 3, // Máximo 3 pasajeros a la vez
    eventFrequency: 0, // Sin eventos
    objectives: [
      { type: 'passengers', target: 3, current: 0 },
      { type: 'money', target: 300, current: 0 }
    ],
    unlocked: true,
    completed: false,
    initialMoney: 1000,
    initialHappiness: 50,
    trainCapacity: 2 // Capacidad limitada en el tutorial
  },
  {
    id: 1,
    name: "Primeros Pasos",
    description: "Transporta pasajeros y gana dinero",
    difficulty: "easy",
    passengerFrequency: 15,
    maxPassengers: 5,
    eventFrequency: 0,
    objectives: [
      { type: 'money', target: 500, current: 0 },
      { type: 'happiness', target: 70, current: 0 }
    ],
    unlocked: false,
    completed: false,
    initialMoney: 800,
    initialHappiness: 40,
    trainCapacity: 3 // Capacidad baja en nivel fácil
  },
  {
    id: 2,
    name: "Hora Punta",
    description: "Gestiona más pasajeros simultáneamente",
    difficulty: "easy",
    passengerFrequency: 10,
    maxPassengers: 8,
    eventFrequency: 60, // Eventos cada minuto
    objectives: [
      { type: 'money', target: 1000, current: 0 },
      { type: 'happiness', target: 60, current: 0 },
      { type: 'passengers', target: 15, current: 0 }
    ],
    unlocked: false,
    completed: false,
    initialMoney: 1200,
    initialHappiness: 50,
    trainCapacity: 4 // Capacidad media
  },
  {
    id: 3,
    name: "Eventos Especiales",
    description: "Enfrenta eventos aleatorios en tu red de metro",
    difficulty: "medium",
    passengerFrequency: 8,
    maxPassengers: 10,
    eventFrequency: 45, // Eventos cada 45 segundos
    objectives: [
      { type: 'money', target: 2000, current: 0 },
      { type: 'happiness', target: 50, current: 0 }
    ],
    unlocked: false,
    completed: false,
    timeLimit: 600, // 10 minutos
    initialMoney: 1500,
    initialHappiness: 60,
    trainCapacity: 5 // Capacidad media-alta
  },
  {
    id: 4,
    name: "Red Compleja",
    description: "Gestiona una red de metro más grande y compleja",
    difficulty: "hard",
    passengerFrequency: 6,
    maxPassengers: 15,
    eventFrequency: 30, // Eventos cada 30 segundos
    objectives: [
      { type: 'money', target: 3000, current: 0 },
      { type: 'happiness', target: 40, current: 0 },
      { type: 'passengers', target: 30, current: 0 }
    ],
    unlocked: false,
    completed: false,
    timeLimit: 900, // 15 minutos
    initialMoney: 2000,
    initialHappiness: 70,
    trainCapacity: 6 // Capacidad alta
  },
  {
    id: 5,
    name: "Maestro del Metro",
    description: "Demuestra que eres un verdadero maestro del metro",
    difficulty: "expert",
    passengerFrequency: 4,
    maxPassengers: 20,
    eventFrequency: 20, // Eventos cada 20 segundos
    objectives: [
      { type: 'money', target: 5000, current: 0 },
      { type: 'happiness', target: 30, current: 0 },
      { type: 'passengers', target: 50, current: 0 },
      { type: 'time', target: 1200, current: 0 } // Completar en 20 minutos
    ],
    unlocked: false,
    completed: false,
    timeLimit: 1200, // 20 minutos
    initialMoney: 3000,
    initialHappiness: 80,
    trainCapacity: 8 // Capacidad máxima
  }
];

// Guardar progreso de niveles en localStorage
export const saveLevelProgress = (levels: GameLevel[]) => {
  try {
    localStorage.setItem('metroEspanol_levels', JSON.stringify(levels));
  } catch (error) {
    console.error('Error al guardar progreso de niveles:', error);
  }
};

// Cargar progreso de niveles desde localStorage
export const loadLevelProgress = (): GameLevel[] => {
  try {
    const savedLevels = localStorage.getItem('metroEspanol_levels');
    if (savedLevels) {
      return JSON.parse(savedLevels);
    }
  } catch (error) {
    console.error('Error al cargar progreso de niveles:', error);
  }
  return gameLevels;
};

// Desbloquear siguiente nivel
export const unlockNextLevel = (levels: GameLevel[]): GameLevel[] => {
  const updatedLevels = [...levels];
  const currentLevelIndex = updatedLevels.findIndex(level => level.unlocked && !level.completed);
  
  if (currentLevelIndex !== -1) {
    // Marcar nivel actual como completado
    updatedLevels[currentLevelIndex].completed = true;
    
    // Desbloquear siguiente nivel si existe
    if (currentLevelIndex + 1 < updatedLevels.length) {
      updatedLevels[currentLevelIndex + 1].unlocked = true;
      toast.success(`¡Nivel ${updatedLevels[currentLevelIndex].name} completado! Desbloqueado: ${updatedLevels[currentLevelIndex + 1].name}`);
    } else {
      toast.success(`¡Felicidades! Has completado todos los niveles disponibles.`);
    }
  }
  
  saveLevelProgress(updatedLevels);
  return updatedLevels;
};

// Actualizar progreso de objetivos
export const updateLevelObjectives = (
  levels: GameLevel[], 
  levelId: number, 
  updates: { type: LevelObjective['type'], value: number }[]
): GameLevel[] => {
  const updatedLevels = [...levels];
  const levelIndex = updatedLevels.findIndex(level => level.id === levelId);
  
  if (levelIndex === -1) return levels;
  
  updates.forEach(update => {
    const objectiveIndex = updatedLevels[levelIndex].objectives.findIndex(
      obj => obj.type === update.type
    );
    
    if (objectiveIndex !== -1) {
      updatedLevels[levelIndex].objectives[objectiveIndex].current = update.value;
    }
  });
  
  // Verificar si se han completado todos los objetivos
  const allObjectivesCompleted = updatedLevels[levelIndex].objectives.every(
    obj => obj.current >= obj.target
  );
  
  if (allObjectivesCompleted && !updatedLevels[levelIndex].completed) {
    return unlockNextLevel(updatedLevels);
  }
  
  saveLevelProgress(updatedLevels);
  return updatedLevels;
};

// Verificar si un nivel está completado
export const isLevelCompleted = (levels: GameLevel[], levelId: number): boolean => {
  const level = levels.find(l => l.id === levelId);
  return level ? level.completed : false;
};

// Obtener el nivel actual (el primer nivel desbloqueado pero no completado)
export const getCurrentLevel = (levels: GameLevel[]): GameLevel | undefined => {
  return levels.find(level => level.unlocked && !level.completed);
};

// Formatear tiempo (segundos a formato mm:ss)
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Obtener color según dificultad
export const getDifficultyColor = (difficulty: GameLevel['difficulty']): string => {
  switch (difficulty) {
    case 'tutorial':
      return 'text-blue-500';
    case 'easy':
      return 'text-green-500';
    case 'medium':
      return 'text-yellow-500';
    case 'hard':
      return 'text-orange-500';
    case 'expert':
      return 'text-red-500';
    default:
      return 'text-primary';
  }
};

// Obtener icono según tipo de objetivo
export const getObjectiveIcon = (type: LevelObjective['type']): string => {
  switch (type) {
    case 'money':
      return '€';
    case 'passengers':
      return '👤';
    case 'happiness':
      return '♥';
    case 'time':
      return '⏱️';
    default:
      return '✓';
  }
};
