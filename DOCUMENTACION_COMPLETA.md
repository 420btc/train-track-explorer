# 🚇 Train Track Explorer - Documentación Completa

## 📋 Índice
1. [Visión General del Proyecto](#visión-general-del-proyecto)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Sistema de Generación de Rutas](#sistema-de-generación-de-rutas)
4. [Sistema de Juego](#sistema-de-juego)
5. [Componentes Principales](#componentes-principales)
6. [Utilidades y Librerías](#utilidades-y-librerías)
7. [Flujo de Datos](#flujo-de-datos)
8. [APIs Externas](#apis-externas)

---

## 🎯 Visión General del Proyecto

**Train Track Explorer** es un juego de simulación de metro donde los jugadores gestionan una red de transporte urbano basada en calles reales. El objetivo es transportar pasajeros entre estaciones, ganar dinero y mantener la felicidad de los usuarios.

### Características Principales:
- **Mapas Reales**: Utiliza calles reales obtenidas de APIs de mapas
- **Generación Procedural**: Crea redes de metro dinámicamente
- **Sistema de Niveles**: Progresión con dificultad creciente
- **Mecánicas de Juego**: Pasajeros, dinero, felicidad, eventos
- **Interfaz Moderna**: React + TypeScript + Tailwind CSS

---

## 🏗️ Arquitectura del Sistema

### Estructura de Carpetas:
```
src/
├── components/          # Componentes React
│   ├── ui/             # Componentes de interfaz base
│   ├── TrainGame.tsx   # Componente principal del juego
│   ├── MapContainer.tsx # Contenedor del mapa
│   └── ...
├── contexts/           # Contextos de React
│   └── GameContext.tsx # Estado global del juego
├── lib/               # Utilidades y lógica de negocio
│   ├── mapUtils.ts    # Generación de rutas y mapas
│   ├── routeUtils.ts  # Cálculo de rutas
│   ├── levelSystem.ts # Sistema de niveles
│   └── ...
├── pages/             # Páginas de la aplicación
└── styles/            # Estilos CSS
```

### Stack Tecnológico:
- **Frontend**: React 18 + TypeScript
- **Estilos**: Tailwind CSS + shadcn/ui
- **Mapas**: Leaflet + OpenStreetMap
- **Geometría**: Turf.js para cálculos geoespaciales
- **Rutas**: OSRM API para routing
- **Geocoding**: MapBox API
- **Estado**: Context API + useState/useEffect

---

## 🗺️ Sistema de Generación de Rutas

### 📍 Coordenadas y Configuración Base

```typescript
// Coordenadas por defecto (Málaga, España)
export const DEFAULT_COORDINATES: Coordinates = { lat: 36.7213, lng: -4.4214 };

// Constantes de configuración
const MAX_TRACK_LENGTH = 1800;      // Longitud máxima de vía (metros)
const MIN_TRACK_LENGTH = 800;       // Longitud mínima de vía (metros)
const URBAN_AREA_RADIUS = 2500;     // Radio del área urbana (metros)
const STATIONS_PER_TRACK = 3;       // Estaciones por vía principal
const STATIONS_PER_CONNECTION = 2;  // Estaciones por conexión
const MIN_STATION_DISTANCE = 0.3;   // Distancia mínima entre estaciones (km)
```

### 🛤️ Proceso de Generación de Red de Metro

#### 1. **Inicialización**
```typescript
export const generateTrackNetwork = async (center: Coordinates): Promise<TrackSegment[]>
```

El proceso comienza con:
- Emisión de eventos de progreso para la UI
- Definición de colores para las líneas de metro
- Cálculo del número de líneas (6-9 líneas)

#### 2. **Distribución Direccional**
```typescript
const directions = [
  { name: 'norte', angle: 0 },
  { name: 'noreste', angle: 45 },
  { name: 'este', angle: 90 },
  // ... más direcciones
];
```

- **Direcciones Principales**: Norte, Sur, Este, Oeste (primeras 4 líneas)
- **Direcciones Secundarias**: Noreste, Sureste, Suroeste, Noroeste
- **Variación Aleatoria**: ±15° para naturalidad

#### 3. **Generación de Rutas Reales**

Para cada línea:

1. **Cálculo del Punto Final**:
   ```typescript
   const endPoint = turf.destination(
     [center.lng, center.lat],
     distance / 1000,
     angle
   );
   ```

2. **Consulta a OSRM API**:
   ```typescript
   const response = await fetch(
     `https://router.project-osrm.org/route/v1/driving/` +
     `${center.lng},${center.lat};${endCoords.lng},${endCoords.lat}` +
     `?overview=full&geometries=polyline`
   );
   ```

3. **Decodificación de Polyline**:
   ```typescript
   const decodedPath = polyline.decode(data.routes[0].geometry);
   const path = decodedPath.map(point => ({
     lat: point[0],
     lng: point[1]
   }));
   ```

#### 4. **Validación de Superposición**
```typescript
const checkOverlappingRoutes = (newPath: Coordinates[], existingTracks: TrackSegment[]): boolean
```

- Usa Turf.js para calcular distancias punto-línea
- Umbral de 30 metros para considerar superposición
- Si >60% de puntos se superponen, se rechaza la ruta

#### 5. **Sistema de Respaldo (Fallback)**
```typescript
const createFallbackTrack = (id: string, startPoint: Coordinates, endPoint: Coordinates, color: string, weight: number): TrackSegment
```

Si las APIs fallan:
- Crea rutas sintéticas con puntos intermedios
- Añade variaciones aleatorias para naturalidad
- Garantiza longitud mínima ajustando puntos finales

### 🚉 Generación de Estaciones

#### 1. **Distribución Uniforme**
```typescript
const distributeStationsEvenly = (track: TrackSegment, stationCount: number)
```

Proceso:
1. Calcula la longitud total de la vía
2. Divide en segmentos uniformes
3. Interpola posiciones exactas
4. Valida coordenadas (no NaN)
5. Verifica distancia mínima entre estaciones

#### 2. **Nomenclatura de Estaciones**
```typescript
export const reverseGeocode = async (coordinates: Coordinates): Promise<LocationInfo>
```

- **Cache**: Evita llamadas repetidas a la API
- **MapBox API**: Geocodificación inversa para nombres reales
- **Procesamiento**: Extrae nombres de calles limpiando prefijos
- **Fallback**: "Estación" si no se encuentra información

#### 3. **Validación y Filtrado**
- Elimina estaciones con coordenadas inválidas
- Asegura distancia mínima entre estaciones
- Garantiza al menos una estación por defecto

---

## 🎮 Sistema de Juego

### 🎯 GameContext - Estado Global

El contexto del juego maneja todo el estado:

```typescript
interface GameContextType {
  // Estado básico
  money: number;
  points: number;
  happiness: number;
  
  // Entidades del juego
  passengers: Passenger[];
  stations: Station[];
  desires: Desire[];
  events: GameEvent[];
  
  // Configuración
  difficulty: 'easy' | 'medium' | 'hard';
  trainCapacity: number;
  trainSpeed: number;
  
  // Estado del tren
  trainPosition: Coordinates | null;
  trainPassengers: Passenger[];
  
  // Sistema de niveles
  playerLevel: number;
  passengersToNextLevel: number;
  passengersCollected: number;
}
```

### 👥 Sistema de Pasajeros

#### Generación Dinámica:
```typescript
// Factores que afectan la generación
const isDaytime = currentHour >= 7 && currentHour < 19;
const gameTimeMinutes = Math.floor((Date.now() - gameStartTime) / 60000);

// Ajuste por dificultad
let maxPassengersAtOnce;
switch (difficulty) {
  case 'easy': maxPassengersAtOnce = Math.min(3, gameTimeMinutes + 1); break;
  case 'medium': maxPassengersAtOnce = Math.min(5, gameTimeMinutes + 2); break;
  case 'hard': maxPassengersAtOnce = Math.min(8, gameTimeMinutes + 3); break;
}
```

#### Mecánicas:
- **Origen/Destino**: Estaciones aleatorias diferentes
- **Motivación**: Razones procedurales para viajar
- **Tiempo Límite**: Paciencia limitada
- **Recompensas**: €10 y 5 puntos por entrega
- **Penalizaciones**: -5% felicidad por timeout

### 🎚️ Sistema de Niveles

#### Estructura de Niveles:
```typescript
export interface GameLevel {
  id: number;
  name: string;
  description: string;
  difficulty: 'tutorial' | 'easy' | 'medium' | 'hard' | 'expert';
  passengerFrequency: number;  // Segundos entre pasajeros
  maxPassengers: number;       // Máximo simultáneo
  eventFrequency: number;      // Segundos entre eventos
  objectives: LevelObjective[]; // Objetivos del nivel
  timeLimit?: number;          // Límite de tiempo opcional
  initialMoney: number;        // Dinero inicial
  trainCapacity: number;       // Capacidad del tren
}
```

#### Progresión:
1. **Tutorial** (Nivel 0): 3 pasajeros, €10
2. **Primeros Pasos** (Nivel 1): €20, 70% felicidad
3. **Hora Punta** (Nivel 2): €30, 60% felicidad, 15 pasajeros
4. **Eventos Especiales** (Nivel 3): €50, 50% felicidad, 10 min límite
5. **Red Compleja** (Nivel 4): €75, 40% felicidad, 30 pasajeros
6. **Maestro del Metro** (Nivel 5): €100, 30% felicidad, 50 pasajeros

### 🎲 Sistema de Eventos

#### Tipos de Eventos:
```typescript
export interface GameEvent {
  id: string;
  description: string;
  duration: number;
  type: 'cultural' | 'traffic';
  affectedStation: Station;
}
```

- **Culturales**: Doble pasajeros por 1 minuto
- **Tráfico**: Velocidad reducida 50% por 30 segundos
- **Frecuencia**: Cada 5 minutos en niveles avanzados

---

## 🧩 Componentes Principales

### 🚂 TrainGame.tsx
**Componente principal** que orquesta todo el juego:

#### Estados Principales:
```typescript
const [tracks, setTracks] = useState<TrackSegment[]>([]);
const [stations, setStations] = useState<Station[]>([]);
const [trainPosition, setTrainPosition] = useState<Coordinates>();
const [currentTrackId, setCurrentTrackId] = useState<string>("");
const [trainMoving, setTrainMoving] = useState<boolean>(false);
```

#### Funcionalidades:
- **Inicialización del Mapa**: Genera red de metro
- **Movimiento del Tren**: Animación y pathfinding
- **Gestión de Pasajeros**: Recogida y entrega
- **Interfaz de Usuario**: Sidebar, controles, información

### 🗺️ MapContainer.tsx
**Contenedor del mapa** con Leaflet:

```typescript
// Configuración del mapa
const mapOptions = {
  center: [mapCenter.lat, mapCenter.lng],
  zoom: mapZoom,
  zoomControl: false,
  attributionControl: false
};
```

#### Capas del Mapa:
- **Base**: OpenStreetMap o Satellite
- **Vías**: Polylines con colores distintivos
- **Estaciones**: Marcadores personalizados
- **Tren**: Marcador animado
- **Pasajeros**: Iconos en estaciones

### 🎮 GameContext.tsx
**Estado global** del juego con 950+ líneas:

#### Funciones Principales:
- `addPassenger()`: Añade pasajero al juego
- `addTrainPassenger()`: Sube pasajero al tren
- `removeTrainPassenger()`: Baja pasajero (entrega)
- `levelUp()`: Progresión de niveles
- `startGame()`: Inicia generación de pasajeros
- `resetGame()`: Reinicia estado del juego

---

## 🔧 Utilidades y Librerías

### 📍 mapUtils.ts (1291 líneas)
**Núcleo del sistema de mapas**:

#### Funciones Principales:
```typescript
// Geocodificación
export const geocodeAddress = async (address: string): Promise<Coordinates>
export const reverseGeocode = async (coordinates: Coordinates): Promise<LocationInfo>

// Generación de red
export const generateTrackNetwork = async (center: Coordinates): Promise<TrackSegment[]>
export const generateStations = (tracks: TrackSegment[]): Station[]

// Cálculos geométricos
export const calculateDistance = (p1: Coordinates, p2: Coordinates): number
export const findClosestTrack = (point: Coordinates, tracks: TrackSegment[]): string | null
export const findConnectingTrack = (currentTrack: TrackSegment, allTracks: TrackSegment[]): ConnectingTrackInfo | null
```

### 🛣️ routeUtils.ts
**Cálculo de rutas** entre vías:

```typescript
// Algoritmo BFS para encontrar caminos
export const findPathBetweenTracks = (
  startTrack: TrackSegment,
  endTrack: TrackSegment
): TrackSegment[] | null

// Historial de rutas
export const saveRouteToHistory = (name: string, coordinates: Coordinates, userId?: string): void
export const getRouteHistory = (): RouteHistoryItem[]
```

### 🎯 levelSystem.ts
**Sistema de progresión**:

```typescript
// Gestión de niveles
export const loadLevelProgress = (): GameLevel[]
export const saveLevelProgress = (levels: GameLevel[]) => void
export const unlockNextLevel = (levels: GameLevel[]): GameLevel[]
export const updateLevelObjectives = (levels: GameLevel[], levelId: number, updates: any[]): GameLevel[]
```

---

## 🔄 Flujo de Datos

### 1. **Inicialización**
```
Usuario inicia juego → TrainGame.tsx → generateTrackNetwork() → OSRM API → 
generateStations() → MapBox API → Renderizado del mapa
```

### 2. **Generación de Pasajeros**
```
GameContext timer → addPassenger() → Estación aleatoria → 
Destino aleatorio → Renderizado en mapa
```

### 3. **Movimiento del Tren**
```
Click en vía → findClosestTrack() → setSelectedTrack() → 
Animación de movimiento → Actualización de posición
```

### 4. **Recogida de Pasajeros**
```
Tren llega a estación → Verificar pasajeros → addTrainPassenger() → 
Actualizar UI → Verificar capacidad
```

### 5. **Entrega de Pasajeros**
```
Tren llega a destino → removeTrainPassenger() → 
Actualizar dinero/puntos → Verificar objetivos de nivel
```

---

## 🌐 APIs Externas

### 🗺️ OSRM (Open Source Routing Machine)
**URL**: `https://router.project-osrm.org/route/v1/driving/`

**Uso**: Generación de rutas reales entre puntos
```typescript
const response = await fetch(
  `https://router.project-osrm.org/route/v1/driving/` +
  `${startLng},${startLat};${endLng},${endLat}` +
  `?overview=full&geometries=polyline`
);
```

**Respuesta**: Polyline codificada con la ruta óptima

### 🏠 MapBox Geocoding API
**URL**: `https://api.mapbox.com/geocoding/v5/mapbox.places/`

**Token**: `pk.eyJ1IjoiNDIwYnRjIiwiYSI6ImNtOTN3ejBhdzByNjgycHF6dnVmeHl2ZTUifQ.Utq_q5wN6DHwpkn6rcpZdw`

**Usos**:
1. **Geocodificación**: Dirección → Coordenadas
2. **Geocodificación Inversa**: Coordenadas → Nombre de calle

```typescript
// Geocodificación inversa para nombres de estaciones
const response = await fetch(
  `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
  `?access_token=${MAPBOX_TOKEN}&language=es&limit=1`
);
```

### 🗺️ OpenStreetMap
**Tiles**: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`

**Uso**: Capa base del mapa para visualización

---

## 🚀 Optimizaciones y Rendimiento

### 📦 Cache de Geocodificación
```typescript
const geocodeCache: Record<string, LocationInfo> = {};
```
- Evita llamadas repetidas a MapBox API
- Agrupa coordenadas cercanas con la misma clave
- Reduce latencia y costos de API

### ⚡ Generación Asíncrona
- Emisión de eventos de progreso
- Timeouts para evitar bloqueos
- Fallbacks para APIs no disponibles

### 🎯 Validaciones Robustas
- Verificación de coordenadas NaN
- Distancias mínimas entre estaciones
- Límites de superposición de rutas

### 🔄 Estado Optimizado
- Context API para estado global
- useState local para UI específica
- Memoización de cálculos costosos

---

## 🐛 Manejo de Errores

### 🌐 APIs Externas
```typescript
try {
  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
} catch (error) {
  console.error('API call failed:', error);
  return fallbackValue;
}
```

### 🗺️ Generación de Mapas
- Fallback a rutas sintéticas si OSRM falla
- Coordenadas por defecto si geocoding falla
- Validación de geometrías antes de renderizar

### 🎮 Estado del Juego
- Valores por defecto para propiedades undefined
- Validación de rangos para índices de arrays
- Limpieza de timers y listeners

---

## 📝 Notas de Desarrollo

### 🔧 Configuración Importante
- **MapBox Token**: Necesario para geocodificación
- **CORS**: OSRM API permite requests desde cualquier origen
- **LocalStorage**: Persistencia de progreso de niveles

### 🎨 Estilos y UI
- **Tailwind CSS**: Framework de utilidades
- **shadcn/ui**: Componentes base consistentes
- **Lucide Icons**: Iconografía moderna

### 🚀 Despliegue
- **Build**: `npm run build`
- **Dev**: `npm run dev`
- **Dependencias**: Ver `package.json` para versiones exactas

---

## 🔮 Futuras Mejoras

### 🌟 Funcionalidades Pendientes
- [ ] Multijugador en tiempo real
- [ ] Más tipos de eventos (clima, festivales)
- [ ] Sistema de logros y badges
- [ ] Editor de mapas personalizado
- [ ] Integración con más APIs de mapas

### 🔧 Optimizaciones Técnicas
- [ ] Service Workers para cache offline
- [ ] WebGL para renderizado de mapas
- [ ] Compresión de datos de rutas
- [ ] Lazy loading de componentes

---

*Documentación generada automáticamente - Última actualización: $(date)*