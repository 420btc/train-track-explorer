
import * as turf from '@turf/turf';
import * as polyline from '@mapbox/polyline';
import { trackGenerationEmitter } from './trackGenerationEmitter';
// Type definitions
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TrackSegment {
  id: string;
  path: Coordinates[];
  distance: number;
  color: string;
  weight: number;
}

export interface Station {
  id: string;
  name: string;
  position: Coordinates;
  trackId: string;
  color: string;
  type?: 'residential' | 'commercial' | 'tourist' | 'industrial';
}

// Constants
export const DEFAULT_COORDINATES: Coordinates = { lat: 36.7213, lng: -4.4214 }; // Málaga
export const DEFAULT_ZOOM = 15;
const MAX_TRACK_LENGTH = 1800; // Aumentado para vías más largas y mejor visualización
const MIN_TRACK_LENGTH = 800; // Aumentado para evitar vías demasiado cortas
const URBAN_AREA_RADIUS = 2500; // Mantiene la red compacta pero con vías más largas
const STATIONS_PER_TRACK = 3; // Estaciones distribuidas en vías más largas
const STATIONS_PER_CONNECTION = 2; // Número fijo de estaciones por conexión
const MIN_STATION_DISTANCE = 0.3; // Aumentado para distribuir mejor las estaciones en vías más largas

// Token de MapBox para geocodificación
const MAPBOX_TOKEN = 'pk.eyJ1IjoiNDIwYnRjIiwiYSI6ImNtOTN3ejBhdzByNjgycHF6dnVmeHl2ZTUifQ.Utq_q5wN6DHwpkn6rcpZdw';

// Interfaz simplificada para información de ubicación (solo calle)
export interface LocationInfo {
  streetName: string;
}

// Geocoding helper function using MapBox API
export const geocodeAddress = async (address: string): Promise<Coordinates> => {
  // Si no hay dirección, usar coordenadas predeterminadas
  if (!address || address.trim() === '') {
    return DEFAULT_COORDINATES;
  }
  
  try {
    // Usar la API de MapBox para geocodificación
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos de timeout
    
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${MAPBOX_TOKEN}&limit=1`,
      { 
        method: 'GET',
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`MapBox API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      // MapBox devuelve las coordenadas como [longitude, latitude]
      const [lng, lat] = data.features[0].center;
      console.log(`Ubicación encontrada: ${data.features[0].place_name}`);
      
      return { lat, lng };
    }
    
    console.log(`No se encontró la ubicación: ${address}`);
    return DEFAULT_COORDINATES;
  } catch (error) {
    console.error('Error en geocodificación:', error);
    return DEFAULT_COORDINATES;
  }
};

// Cache para almacenar resultados de geocodificación inversa y evitar llamadas repetidas
const geocodeCache: Record<string, LocationInfo> = {};

// Función de geocodificación inversa optimizada y cacheada
export const reverseGeocode = async (coordinates: Coordinates): Promise<LocationInfo> => {
  // Crear una clave para el cache basada en las coordenadas redondeadas (para agrupar puntos cercanos)
  const cacheKey = `${coordinates.lat.toFixed(5)},${coordinates.lng.toFixed(5)}`;
  
  // Verificar si ya tenemos este resultado en cache
  if (geocodeCache[cacheKey]) {
    return geocodeCache[cacheKey];
  }
  
  try {
    // Usar la API de MapBox para geocodificación inversa con timeout corto
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // Solo 2 segundos para mejorar rendimiento
    
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${coordinates.lng},${coordinates.lat}.json?access_token=${MAPBOX_TOKEN}&language=es&limit=1`,
      { 
        method: 'GET',
        signal: controller.signal
      }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`MapBox API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Procesar los resultados
    if (data.features && data.features.length > 0) {
      const feature = data.features[0]; // Usar solo el primer resultado para mayor velocidad
      
      // Extraer el nombre más relevante
      let streetName = '';
      
      // Si es una dirección, extraer solo el nombre de la calle
      if (feature.place_type.includes('address')) {
        // Extraer el primer componente que suele ser el nombre de la calle
        streetName = feature.text || '';
      } 
      // Si es un punto de interés, usar su nombre
      else if (feature.place_type.includes('poi')) {
        streetName = feature.text || '';
      }
      // Si es un lugar, usar su nombre
      else if (feature.text) {
        streetName = feature.text;
      }
      // Si todo falla, usar el primer componente del place_name
      else if (feature.place_name) {
        const parts = feature.place_name.split(',');
        streetName = parts[0].trim();
      }
      
      // Limpiar el nombre
      streetName = streetName.replace(/[0-9\/#-.,]/g, '').trim();
      
      // Extraer la parte significativa del nombre de la calle
      const words = streetName.split(' ');
      
      // Lista de prefijos comunes de calles en español
      const prefijos = ['calle', 'avenida', 'av', 'c/', 'av.', 'plaza', 'paseo', 'camino', 'carretera', 'bulevar', 'gran', 'vía', 'ronda', 'travesía', 'callejón', 'de', 'del', 'la', 'las', 'los', 'el'];
      
      if (words.length > 1) {
        // Comprobar si la primera palabra es un prefijo común
        if (prefijos.includes(words[0].toLowerCase())) {
          // Si la segunda palabra también es un prefijo (ej: "Calle de"), tomar la tercera
          if (words.length > 2 && prefijos.includes(words[1].toLowerCase())) {
            if (words.length > 3 && prefijos.includes(words[2].toLowerCase())) {
              // Si hay tres prefijos (ej: "Avenida de la"), tomar la cuarta palabra
              streetName = words.slice(3).join(' ');
            } else {
              // Si hay dos prefijos (ej: "Calle de"), tomar desde la tercera palabra
              streetName = words.slice(2).join(' ');
            }
          } else {
            // Si solo hay un prefijo (ej: "Calle"), tomar desde la segunda palabra
            streetName = words.slice(1).join(' ');
          }
        }
        
        // Si después de procesar quedó muy largo, acortar
        const processedWords = streetName.split(' ');
        if (processedWords.length > 2) {
          // Tomar solo las dos primeras palabras significativas
          streetName = processedWords.slice(0, 2).join(' ');
        }
      }
      
      // Guardar en cache
      const result = { streetName: streetName || 'Estación' };
      geocodeCache[cacheKey] = result;
      return result;
    }
    
    // Si no hay resultados
    const defaultResult = { streetName: 'Estación' };
    geocodeCache[cacheKey] = defaultResult;
    return defaultResult;
  } catch (error) {
    console.error('Error en geocodificación inversa:', error);
    // Guardar en cache incluso los errores para evitar reintentos
    const errorResult = { streetName: 'Estación' };
    geocodeCache[cacheKey] = errorResult;
    return errorResult;
  }
};

// Generate urban track network based on real streets
export const generateTrackNetwork = async (center: Coordinates): Promise<TrackSegment[]> => {
  // Emitir evento de inicio
  trackGenerationEmitter.emit({
    progress: 0,
    message: "Iniciando generación de la red de metro..."
  });
  try {
    // Create a smaller urban area to stay within city limits
    const tracks: TrackSegment[] = [];
    // Colores más distinguibles para las líneas principales
    const trackColors = [
      '#1a73e8', // Azul Google
      '#ea4335', // Rojo Google
      '#34a853', // Verde Google
      '#fbbc04', // Amarillo Google
      '#FF5722', // Naranja profundo
      '#009688', // Verde azulado
      '#E91E63'  // Rosa
    ];
    
    // Generate 6-9 lines (like metro lines) - Aumentado para una red más densa
    const lineCount = Math.floor(Math.random() * 4) + 6;
    console.log(`Generating ${lineCount} metro lines...`);
    
    trackGenerationEmitter.emit({
      progress: 5,
      message: `Generando ${lineCount} líneas de metro...`
    });
    
    // Mapa para controlar los intentos por línea y evitar bucles infinitos
    const lineAttempts = new Map<number, number>();
    
    // Ordenar colores por longitud deseada: azul (más largo), amarillo, verde, rojo, naranja, verde azulado, rosa
    const orderedTrackColors = ['#1a73e8', '#fbbc04', '#34a853', '#ea4335', '#FF5722', '#009688', '#E91E63'];
    
    // Definir direcciones cardinales para distribuir las vías en diferentes orientaciones
    const directions = [
      { name: 'norte', angle: 0 },
      { name: 'noreste', angle: 45 },
      { name: 'este', angle: 90 },
      { name: 'sureste', angle: 135 },
      { name: 'sur', angle: 180 },
      { name: 'suroeste', angle: 225 },
      { name: 'oeste', angle: 270 },
      { name: 'noroeste', angle: 315 }
    ];
    
    // Asignar direcciones a las líneas para asegurar cobertura en todas las direcciones
    const assignedDirections: {[key: number]: number} = {};
    
    // Asegurar que las primeras líneas cubran las direcciones principales (N, S, E, O)
    const mainDirectionIndices = [0, 4, 2, 6]; // norte, sur, este, oeste
    for (let i = 0; i < Math.min(4, lineCount); i++) {
      assignedDirections[i] = mainDirectionIndices[i % mainDirectionIndices.length];
    }
    
    // Asignar direcciones restantes aleatoriamente para las líneas adicionales
    for (let i = 4; i < lineCount; i++) {
      // Elegir una dirección no principal aleatoriamente
      const availableDirections = [1, 3, 5, 7]; // noreste, sureste, suroeste, noroeste
      const randomIndex = Math.floor(Math.random() * availableDirections.length);
      assignedDirections[i] = availableDirections[randomIndex];
    }
    
    // Función para verificar si una nueva ruta se superpone demasiado con rutas existentes
    const checkOverlappingRoutes = (newPath: Coordinates[], existingTracks: TrackSegment[]): boolean => {
      // Si no hay vías existentes, no hay superposición
      if (existingTracks.length === 0) return false;
      
      // Convertir la nueva ruta a una línea de turf
      const newLine = turf.lineString(newPath.map(p => [p.lng, p.lat]));
      
      // Verificar cada vía existente
      for (const track of existingTracks) {
        // Solo verificar vías principales, no conexiones
        if (!track.id.startsWith('track-')) continue;
        
        // Convertir la vía existente a una línea de turf
        const existingLine = turf.lineString(track.path.map(p => [p.lng, p.lat]));
        
        // Calcular la superposición entre las líneas
        try {
          // Usar una aproximación con distancias punto a línea
          let overlappingPoints = 0;
          const threshold = 0.03; // 30 metros - Reducido para ser más permisivo
          
          // Verificar cada punto de la nueva ruta
          for (let i = 0; i < newPath.length; i += Math.max(1, Math.floor(newPath.length / 10))) {
            const point = turf.point([newPath[i].lng, newPath[i].lat]);
            const distance = turf.pointToLineDistance(point, existingLine, {units: 'kilometers'});
            
            if (distance < threshold) {
              overlappingPoints++;
            }
          }
          
          // Si más del 60% de los puntos se superponen, consideramos que hay demasiada superposición
          // Aumentado del 40% al 60% para ser más permisivo
          if (overlappingPoints > (newPath.length / 10) * 0.6) {
            console.log(`Detected significant overlap with track ${track.id}, trying another route`);
            return true;
          }
        } catch (error) {
          console.error('Error checking route overlap:', error);
        }
      }
      
      return false;
    };
    
    // Función auxiliar para crear vías de respaldo si las APIs fallan
    const createFallbackTrack = (id: string, startPoint: Coordinates, endPoint: Coordinates, color: string, weight: number): TrackSegment => {
      // Verificar la distancia directa entre puntos para asegurar longitud mínima
      const directDistance = turf.distance(
        [startPoint.lng, startPoint.lat],
        [endPoint.lng, endPoint.lat]
      ) * 1000; // Convertir km a metros
      
      // Si la distancia es menor que el mínimo, ajustar el punto final para aumentar la distancia
      let adjustedEndPoint = {...endPoint};
      if (directDistance < MIN_TRACK_LENGTH) {
        // Calcular el vector de dirección
        const direction = {
          lat: endPoint.lat - startPoint.lat,
          lng: endPoint.lng - startPoint.lng
        };
        
        // Normalizar el vector
        const length = Math.sqrt(direction.lat * direction.lat + direction.lng * direction.lng);
        const normalizedDirection = {
          lat: direction.lat / length,
          lng: direction.lng / length
        };
        
        // Calcular factor de escala para alcanzar la distancia mínima
        const scaleFactor = MIN_TRACK_LENGTH / (directDistance || 1); // Evitar división por cero
        
        // Ajustar el punto final
        adjustedEndPoint = {
          lat: startPoint.lat + normalizedDirection.lat * scaleFactor * directDistance / 1000,
          lng: startPoint.lng + normalizedDirection.lng * scaleFactor * directDistance / 1000
        };
      }
      
      // Crear puntos intermedios para que la vía no sea solo una línea recta
      const path: Coordinates[] = [startPoint];
      
      // Añadir 4-7 puntos intermedios con variaciones para vías más naturales
      const pointCount = Math.floor(Math.random() * 4) + 4;
      
      for (let i = 1; i <= pointCount; i++) {
        const ratio = i / (pointCount + 1);
        
        // Calcular punto base en la línea recta usando el punto final ajustado
        const baseLat = startPoint.lat + (adjustedEndPoint.lat - startPoint.lat) * ratio;
        const baseLng = startPoint.lng + (adjustedEndPoint.lng - startPoint.lng) * ratio;
        
        // Añadir una variación aleatoria más pronunciada para vías más naturales
        // Variación proporcional a la distancia total para mantener la coherencia visual
        const distanceFactor = Math.min(1, directDistance / 1000) * 0.0015;
        const variation = distanceFactor * (Math.random() - 0.5);
        
        path.push({
          lat: baseLat + variation,
          lng: baseLng + variation
        });
      }
      
      // Usar el punto final ajustado en lugar del original
      path.push(adjustedEndPoint);
      
      // Calcular distancia aproximada usando turf.distance para cada segmento
      let distance = 0;
      for (let i = 0; i < path.length - 1; i++) {
        distance += turf.distance(
          [path[i].lng, path[i].lat],
          [path[i+1].lng, path[i+1].lat]
        );
      }
      distance = distance * 1000; // Convertir km a metros
      
      return {
        id,
        path,
        distance,
        color,
        weight
      };
    };
    
    // Generar líneas principales
    for (let i = 0; i < lineCount; i++) {
      // Calcular progreso basado en la línea actual (del 5% al 50%)
      const lineProgress = 5 + Math.floor((i / lineCount) * 45);
      trackGenerationEmitter.emit({
        progress: lineProgress,
        message: `Generando línea ${i+1} de ${lineCount}...`
      });
      
      // Usar la dirección asignada para esta línea con una pequeña variación aleatoria
      const directionIndex = assignedDirections[i];
      const baseAngle = directions[directionIndex].angle;
      // Añadir una pequeña variación aleatoria de +/- 15 grados para mantener algo de aleatoriedad
      const angle = baseAngle + (Math.random() * 30 - 15);
      
      console.log(`Línea ${i+1}: Dirección ${directions[directionIndex].name} (${baseAngle}°), ángulo final: ${angle}°`);
      
      const color = orderedTrackColors[i % orderedTrackColors.length];
      
      // Create points for route calculation, staying within urban radius
      // Ajustar la longitud según el color (azul más largo, amarillo medio, verde corto)
      let distanceFactor = 1.0;
      if (color === '#1a73e8') { // Azul - más largo
        distanceFactor = 1.0;
      } else if (color === '#fbbc04') { // Amarillo - medio-largo
        distanceFactor = 0.85;
      } else if (color === '#34a853') { // Verde - medio
        distanceFactor = 0.7;
      } else { // Rojo y morado - más cortos
        distanceFactor = 0.6;
      }
      
      const distance = Math.min(URBAN_AREA_RADIUS * 0.7 * distanceFactor, 
                               Math.max(MIN_TRACK_LENGTH, Math.random() * MAX_TRACK_LENGTH * distanceFactor));
      
      const endPoint = turf.destination(
        [center.lng, center.lat],
        distance / 1000, // Convert to km
        angle
      );
      
      const endCoords = {
        lat: endPoint.geometry.coordinates[1],
        lng: endPoint.geometry.coordinates[0]
      };
      
      try {
        console.log(`Fetching route for line ${i+1}...`);
        // Get route using OSRM API
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/` +
          `${center.lng},${center.lat};${endCoords.lng},${endCoords.lat}` +
          `?overview=full&geometries=polyline`
        );
        
        if (!response.ok) {
          throw new Error(`OSRM API responded with status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          // Decode polyline to get path coordinates
          try {
            const decodedPath = polyline.decode(data.routes[0].geometry);
            
            const path = decodedPath.map(point => ({
              lat: point[0],
              lng: point[1]
            }));
            
            if (path.length > 0) {
              // Verificar si la nueva ruta se superpone demasiado con rutas existentes
              const hasSignificantOverlap = checkOverlappingRoutes(path, tracks);
              
              if (!hasSignificantOverlap) {
                tracks.push({
                  id: `track-${i}`,
                  path: path,
                  distance: data.routes[0].distance,
                  color: color,
                  weight: 4
                });
                console.log(`Successfully created line ${i+1} with ${path.length} points`);
              } else {
                // Si hay superposición significativa, intentar con otro ángulo
                console.log(`Line ${i+1} has significant overlap with existing tracks, trying a different angle`);
                
                // Incrementar contador de intentos para esta línea
                const attempts = lineAttempts.get(i) || 0;
                lineAttempts.set(i, attempts + 1);
                
                // Si ya hemos intentado demasiadas veces, aceptar la superposición
                if (attempts >= 5) {
                  console.log(`Accepting line ${i+1} after ${attempts} attempts despite overlap`);
                  tracks.push({
                    id: `track-${i}`,
                    path: path,
                    distance: data.routes[0].distance,
                    color: color,
                    weight: 4
                  });
                } else {
                  // Cambiar el ángulo y reintentar en la próxima iteración
                  i--;
                  continue;
                }
              }
            } else {
              throw new Error('Decoded path is empty');
            }
          } catch (polylineError) {
            console.error('Error decoding polyline:', polylineError);
            // Fallback to a generated track if polyline decoding fails
            const fallbackTrack = createFallbackTrack(
              `track-${i}`,
              center,
              endCoords,
              color,
              4
            );
            
            // Verificar si la ruta de respaldo se superpone demasiado con rutas existentes
            const hasSignificantOverlap = checkOverlappingRoutes(fallbackTrack.path, tracks);
            
            if (!hasSignificantOverlap) {
              tracks.push(fallbackTrack);
              console.log(`Created fallback line ${i+1} due to polyline error`);
            } else {
              // Si hay superposición significativa, intentar con otro ángulo
              console.log(`Fallback line ${i+1} has significant overlap with existing tracks, trying a different angle`);
              
              // Incrementar contador de intentos para esta línea
              const attempts = lineAttempts.get(i) || 0;
              lineAttempts.set(i, attempts + 1);
              
              // Si ya hemos intentado demasiadas veces, aceptar la superposición
              if (attempts >= 5) {
                console.log(`Accepting fallback line ${i+1} after ${attempts} attempts despite overlap`);
                tracks.push(fallbackTrack);
              } else {
                // Cambiar el ángulo y reintentar en la próxima iteración
                i--;
                continue;
              }
            }
          }
        } else {
          throw new Error('No routes returned from OSRM API');
        }
      } catch (routeError) {
        console.error('Error getting route:', routeError);
        // Fallback to a generated track if route API fails
        const fallbackTrack = createFallbackTrack(
          `track-${i}`,
          center,
          endCoords,
          color,
          4
        );
        
        // Verificar si la ruta de respaldo se superpone demasiado con rutas existentes
        const hasSignificantOverlap = checkOverlappingRoutes(fallbackTrack.path, tracks);
        
        if (!hasSignificantOverlap) {
          tracks.push(fallbackTrack);
          console.log(`Created fallback line ${i+1} due to API error`);
        } else {
          // Si hay superposición significativa, intentar con otro ángulo
          console.log(`Fallback line ${i+1} has significant overlap with existing tracks, trying a different angle`);
          
          // Incrementar contador de intentos para esta línea
          const attempts = lineAttempts.get(i) || 0;
          lineAttempts.set(i, attempts + 1);
          
          // Si ya hemos intentado demasiadas veces, aceptar la superposición
          if (attempts >= 5) {
            console.log(`Accepting fallback line ${i+1} after ${attempts} attempts despite overlap`);
            tracks.push(fallbackTrack);
          } else {
            // Cambiar el ángulo y reintentar en la próxima iteración
            i--;
            continue;
          }
        }
      }
    }
    
    // Ensure at least one track is added
    if (tracks.length === 0) {
      console.log('No tracks were created, adding default track');
      const randomAngle = Math.random() * 360;
      const randomDistance = Math.min(URBAN_AREA_RADIUS * 0.6, 
                                   Math.max(MIN_TRACK_LENGTH, Math.random() * MAX_TRACK_LENGTH));
      
      const endPoint = turf.destination(
        [center.lng, center.lat],
        randomDistance / 1000,
        randomAngle
      );
      
      const endCoords = {
        lat: endPoint.geometry.coordinates[1],
        lng: endPoint.geometry.coordinates[0]
      };
      
      const fallbackTrack = createFallbackTrack(
        'track-default',
        center,
        endCoords,
        trackColors[0],
        4
      );
      tracks.push(fallbackTrack);
    }
    
    // Add connecting tracks to create a network
    if (tracks.length >= 2) {
      console.log('Creating connections between tracks...');
      let connectionsAdded = 0;
      const maxConnections = Math.min(25, lineCount * 3); // Más conexiones para una red más densa
      
      // Crear un grafo de conectividad para asegurar que todas las vías estén conectadas
      const trackConnectivity: {[key: string]: string[]} = {};
      
      // Inicializar el grafo con todas las vías principales (no conexiones)
      for (const track of tracks) {
        if (track.id.startsWith('track-')) {
          trackConnectivity[track.id] = [];
        }
      }
      
      // Función para verificar si hay un camino entre dos vías en el grafo actual
      const hasPath = (start: string, end: string, visited: Set<string> = new Set()): boolean => {
        if (start === end) return true;
        if (visited.has(start)) return false;
        
        visited.add(start);
        const neighbors = trackConnectivity[start] || [];
        
        for (const neighbor of neighbors) {
          if (hasPath(neighbor, end, visited)) return true;
        }
        
        return false;
      };
      
      // Función para actualizar el grafo de conectividad
      const updateConnectivity = (track1: string, track2: string) => {
        if (!trackConnectivity[track1]) trackConnectivity[track1] = [];
        if (!trackConnectivity[track2]) trackConnectivity[track2] = [];
        
        trackConnectivity[track1].push(track2);
        trackConnectivity[track2].push(track1);
      };
      
      // Primero, conectar todas las vías principales para asegurar que haya al menos un camino entre ellas
      const mainTracks = tracks.filter(t => t.id.startsWith('track-'));
      
      // Asegurar que todas las vías principales estén conectadas (formando un árbol de expansión mínima)
      for (let i = 1; i < mainTracks.length; i++) {
        // Buscar la vía más cercana que ya esté conectada al árbol
        let closestTrack = -1;
        let minDistance = Infinity;
        
        for (let j = 0; j < i; j++) {
          // Encontrar los puntos más cercanos entre las dos vías
          let trackDistance = Infinity;
          let point1Index = -1;
          let point2Index = -1;
          
          for (let p1 = 0; p1 < mainTracks[i].path.length; p1 += Math.max(1, Math.floor(mainTracks[i].path.length / 10))) {
            for (let p2 = 0; p2 < mainTracks[j].path.length; p2 += Math.max(1, Math.floor(mainTracks[j].path.length / 10))) {
              const dist = turf.distance(
                [mainTracks[i].path[p1].lng, mainTracks[i].path[p1].lat],
                [mainTracks[j].path[p2].lng, mainTracks[j].path[p2].lat]
              ) * 1000; // Convertir a metros
              
              if (dist < trackDistance && dist >= 400 && dist < URBAN_AREA_RADIUS * 0.6) {
                trackDistance = dist;
                point1Index = p1;
                point2Index = p2;
              }
            }
          }
          
          if (trackDistance < minDistance) {
            minDistance = trackDistance;
            closestTrack = j;
          }
        }
        
        // Si encontramos una conexión válida, crear la vía de conexión
        if (closestTrack >= 0 && minDistance < URBAN_AREA_RADIUS * 0.6) {
          // Encontrar los puntos más cercanos entre las dos vías nuevamente
          let minDist = Infinity;
          let point1 = mainTracks[i].path[0];
          let point2 = mainTracks[closestTrack].path[0];
          
          for (let p1 = 0; p1 < mainTracks[i].path.length; p1 += Math.max(1, Math.floor(mainTracks[i].path.length / 10))) {
            for (let p2 = 0; p2 < mainTracks[closestTrack].path.length; p2 += Math.max(1, Math.floor(mainTracks[closestTrack].path.length / 10))) {
              const dist = turf.distance(
                [mainTracks[i].path[p1].lng, mainTracks[i].path[p1].lat],
                [mainTracks[closestTrack].path[p2].lng, mainTracks[closestTrack].path[p2].lat]
              ) * 1000;
              
              if (dist < minDist) {
                minDist = dist;
                point1 = mainTracks[i].path[p1];
                point2 = mainTracks[closestTrack].path[p2];
              }
            }
          }
          
          // Crear la conexión entre estas dos vías
          try {
            const response = await fetch(
              `https://router.project-osrm.org/route/v1/driving/` +
              `${point1.lng},${point1.lat};${point2.lng},${point2.lat}` +
              `?overview=full&geometries=polyline`
            );
            
            if (response.ok) {
              const data = await response.json();
              
              if (data.routes && data.routes.length > 0) {
                try {
                  const decodedPath = polyline.decode(data.routes[0].geometry);
                  const path = decodedPath.map(point => ({
                    lat: point[0],
                    lng: point[1]
                  }));
                  
                  if (path.length > 0) {
                    const connectionId = `connection-${i}-${closestTrack}`;
                    tracks.push({
                      id: connectionId,
                      path: path,
                      distance: data.routes[0].distance,
                      color: '#00BCD4', // Color cian para conexiones
                      weight: 3
                    });
                    
                    // Actualizar el grafo de conectividad
                    updateConnectivity(mainTracks[i].id, mainTracks[closestTrack].id);
                    
                    connectionsAdded++;
                    console.log(`Added essential connection between lines ${i+1} and ${closestTrack+1}`);
                  }
                } catch (error) {
                  console.error('Error decoding connection polyline:', error);
                  // Crear una conexión de respaldo
                  const fallbackTrack = createFallbackTrack(
                    `connection-${i}-${closestTrack}`,
                    point1,
                    point2,
                    '#00BCD4',
                    3
                  );
                  tracks.push(fallbackTrack);
                  
                  // Actualizar el grafo de conectividad
                  updateConnectivity(mainTracks[i].id, mainTracks[closestTrack].id);
                  
                  connectionsAdded++;
                  console.log(`Added essential fallback connection between lines ${i+1} and ${closestTrack+1}`);
                }
              }
            } else {
              throw new Error(`OSRM API responded with status: ${response.status}`);
            }
          } catch (error) {
            console.error('Error creating essential connection:', error);
            // Crear una conexión de respaldo
            const fallbackTrack = createFallbackTrack(
              `connection-${i}-${closestTrack}`,
              point1,
              point2,
              '#00BCD4',
              3
            );
            tracks.push(fallbackTrack);
            
            // Actualizar el grafo de conectividad
            updateConnectivity(mainTracks[i].id, mainTracks[closestTrack].id);
            
            connectionsAdded++;
            console.log(`Added essential fallback connection between lines ${i+1} and ${closestTrack+1}`);
          }
        }
      }
      
      // Ahora añadir conexiones adicionales aleatorias para hacer la red más densa
      // Find potential connection points between tracks
      for (let i = 0; i < tracks.length - 1 && connectionsAdded < maxConnections; i++) {
        for (let j = i + 1; j < tracks.length && connectionsAdded < maxConnections; j++) {
          // Solo considerar vías principales para conexiones adicionales
          if (!tracks[i].id.startsWith('track-') || !tracks[j].id.startsWith('track-')) continue;
          
          // Verificar si ya existe un camino directo entre estas vías
          if (trackConnectivity[tracks[i].id]?.includes(tracks[j].id)) continue;
          
          // Probabilidad de conexión basada en si ya hay un camino indirecto
          const hasIndirectPath = hasPath(tracks[i].id, tracks[j].id);
          const connectionProbability = hasIndirectPath ? 0.3 : 0.7; // Mayor probabilidad si no hay camino
          
          if (Math.random() < connectionProbability) {
            const track1 = tracks[i];
            const track2 = tracks[j];
            
            // Choose random points on each track
            const point1Index = Math.floor(Math.random() * Math.max(1, track1.path.length - 1));
            const point2Index = Math.floor(Math.random() * Math.max(1, track2.path.length - 1));
            
            if (!track1.path[point1Index] || !track2.path[point2Index]) {
              console.warn('Invalid path index, skipping connection');
              continue;
            }
            
            const point1 = track1.path[point1Index];
            const point2 = track2.path[point2Index];
            
            // Check if points are within an appropriate distance range for a connection
            // No demasiado cerca (para evitar conexiones muy cortas) ni demasiado lejos
            const distance = turf.distance(
              [point1.lng, point1.lat],
              [point2.lng, point2.lat]
            ) * 1000; // Convert km to meters
            
            // Asegurar que la conexión no sea demasiado corta ni demasiado larga
            // Mínimo 400m para evitar conexiones demasiado cortas
            // Máximo URBAN_AREA_RADIUS * 0.6 para mantener conexiones urbanas razonables
            if (distance >= 400 && distance < URBAN_AREA_RADIUS * 0.6) {
              try {
                // Get route between these points
                const response = await fetch(
                  `https://router.project-osrm.org/route/v1/driving/` +
                  `${point1.lng},${point1.lat};${point2.lng},${point2.lat}` +
                  `?overview=full&geometries=polyline`
                );
                
                if (!response.ok) {
                  throw new Error(`OSRM API responded with status: ${response.status}`);
                }
                
                const data = await response.json();
                
                if (data.routes && data.routes.length > 0) {
                  try {
                    const decodedPath = polyline.decode(data.routes[0].geometry);
                    
                    const path = decodedPath.map(point => ({
                      lat: point[0],
                      lng: point[1]
                    }));
                    
                    if (path.length > 0) {
                      const connectionId = `connection-${i}-${j}`;
                      tracks.push({
                        id: connectionId,
                        path: path,
                        distance: data.routes[0].distance,
                        color: '#00BCD4', // Color cian para conexiones (más distintivo)
                        weight: 3
                      });
                      
                      // Actualizar el grafo de conectividad
                      updateConnectivity(tracks[i].id, tracks[j].id);
                      
                      connectionsAdded++;
                      console.log(`Added connection between lines ${i+1} and ${j+1}`);
                    } else {
                      throw new Error('Decoded connection path is empty');
                    }
                  } catch (polylineError) {
                    console.error('Error decoding connection polyline:', polylineError);
                    // Fallback to a generated track if polyline decoding fails
                    const fallbackTrack = createFallbackTrack(
                      `connection-${i}-${j}`,
                      point1,
                      point2,
                      '#00BCD4',
                      3
                    );
                    tracks.push(fallbackTrack);
                    
                    // Actualizar el grafo de conectividad
                    updateConnectivity(tracks[i].id, tracks[j].id);
                    
                    connectionsAdded++;
                    console.log(`Added fallback connection between lines ${i+1} and ${j+1} due to polyline error`);
                  }
                } else {
                  throw new Error('No connection routes returned from OSRM API');
                }
              } catch (connectionError) {
                console.error('Error creating connection:', connectionError);
                // Fallback to a simple connection if API fails
                if (Math.random() > 0.5) { // Only add some fallback connections
                  const fallbackTrack = createFallbackTrack(
                    `connection-${i}-${j}`,
                    point1,
                    point2,
                    '#00BCD4',
                    3
                  );
                  tracks.push(fallbackTrack);
                  
                  // Actualizar el grafo de conectividad
                  updateConnectivity(tracks[i].id, tracks[j].id);
                  
                  connectionsAdded++;
                  console.log(`Added fallback connection between lines ${i+1} and ${j+1} due to API error`);
                }
              }
            }
          }
        }
      }
      
      console.log(`Added ${connectionsAdded} connections between tracks`);
    }
    
    console.log(`Track network generated with ${tracks.length} segments`);
    return tracks;
  } catch (error) {
    console.error('Error generating track network:', error);
    // Return at least one track even if everything fails
    const fallbackTrack = {
      id: 'emergency-track',
      path: [
        center,
        {
          lat: center.lat + 0.01,
          lng: center.lng + 0.01
        },
        {
          lat: center.lat + 0.02,
          lng: center.lng - 0.01
        },
        {
          lat: center.lat + 0.03,
          lng: center.lng + 0.02
        }
      ],
      distance: 1000,
      color: '#ff0000',
      weight: 4
    };
    return [fallbackTrack];
  }
};

// Generate stations along the tracks
export const generateStations = (tracks: TrackSegment[]): any[] => {
  if (!tracks.length) return [];
  
  console.log('Generating stations...');
  
  // Función simplificada para generar nombres temporales de estaciones
  // Estos nombres serán reemplazados por los nombres reales de calles mediante geocodificación inversa
  const generateStationName = (index: number): string => {
    return `E${index + 1}`;
  };
  
  const stations: any[] = [];
  const allStationPoints = new Set<string>(); // To avoid duplicate stations
  const stationPositions: Coordinates[] = []; // Para verificar distancias mínimas
  const mainTracks = tracks.filter(track => !track.id.includes('connection'));
  const connectionTracks = tracks.filter(track => track.id.includes('connection'));
  
  // Función para verificar si un punto es válido (no NaN) y no está demasiado cerca de estaciones existentes
  const isValidPoint = (point: Coordinates): boolean => {
    // Verificar que las coordenadas no sean NaN
    if (isNaN(point.lat) || isNaN(point.lng)) {
      return false;
    }
    return true;
  };
  
  // Función para verificar si un punto está demasiado cerca de estaciones existentes
  const isTooCloseToExistingStations = (point: Coordinates): boolean => {
    if (!isValidPoint(point)) return true; // Puntos inválidos se consideran "demasiado cerca"
    
    for (const existingPoint of stationPositions) {
      try {
        const distance = turf.distance(
          [point.lng, point.lat],
          [existingPoint.lng, existingPoint.lat]
        );
        if (distance < MIN_STATION_DISTANCE) {
          return true;
        }
      } catch (error) {
        console.error('Error calculando distancia entre puntos:', error);
        return true; // Si hay error, consideramos que está demasiado cerca para ser conservadores
      }
    }
    return false;
  };
  
  // Función para distribuir estaciones uniformemente a lo largo de una vía
  const distributeStationsEvenly = (track: TrackSegment, stationCount: number) => {
    if (!track.path || track.path.length < 2) {
      console.warn(`Track ${track.id} has insufficient points, skipping station generation`);
      return [];
    }
    
    const trackStations: any[] = [];
    const isConnection = track.id.includes('connection');
    
    // Siempre incluir el punto inicial y final
    const startPoint = track.path[0];
    const endPoint = track.path[track.path.length - 1];
    
    // Calcular puntos intermedios distribuidos uniformemente
    const points: Coordinates[] = [];
    
    // Calcular la longitud total de la vía
    let totalLength = 0;
    const segmentLengths: number[] = [];
    
    for (let i = 1; i < track.path.length; i++) {
      const prevPoint = track.path[i - 1];
      const curPoint = track.path[i];
      const segmentLength = turf.distance(
        [prevPoint.lng, prevPoint.lat],
        [curPoint.lng, curPoint.lat]
      );
      segmentLengths.push(segmentLength);
      totalLength += segmentLength;
    }
    
    // Distribuir estaciones uniformemente a lo largo de la vía
    for (let i = 0; i < stationCount; i++) {
      // Calcular la posición relativa a lo largo de la vía
      const relativePosition = i / (stationCount - 1); // De 0 a 1
      const targetDistance = relativePosition * totalLength;
      
      // Encontrar el segmento donde cae este punto
      let accumulatedDistance = 0;
      let segmentIndex = 0;
      
      while (segmentIndex < segmentLengths.length && 
             accumulatedDistance + segmentLengths[segmentIndex] < targetDistance) {
        accumulatedDistance += segmentLengths[segmentIndex];
        segmentIndex++;
      }
      
      if (segmentIndex >= segmentLengths.length) {
        // Si hemos llegado al final, usar el último punto
        points.push(track.path[track.path.length - 1]);
      } else {
        // Calcular la posición exacta en este segmento
        const remainingDistance = targetDistance - accumulatedDistance;
        const ratio = remainingDistance / segmentLengths[segmentIndex];
        
        const startSegPoint = track.path[segmentIndex];
        const endSegPoint = track.path[segmentIndex + 1];
        
        // Verificar que los puntos de inicio y fin sean válidos
        if (isValidPoint(startSegPoint) && isValidPoint(endSegPoint)) {
          const interpolatedPoint: Coordinates = {
            lat: startSegPoint.lat + (endSegPoint.lat - startSegPoint.lat) * ratio,
            lng: startSegPoint.lng + (endSegPoint.lng - startSegPoint.lng) * ratio
          };
          
          // Verificar que el punto interpolado sea válido
          if (isValidPoint(interpolatedPoint)) {
            points.push(interpolatedPoint);
          }
        }
      }
    }
    
    // Crear estaciones en estos puntos
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const pointKey = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
      
      if (isValidPoint(point) && !allStationPoints.has(pointKey) && !isTooCloseToExistingStations(point)) {
        const stationName = generateStationName(stations.length);
        const newStation = {
          id: `station-${stations.length}`,
          position: point,
          name: stationName,
          trackId: track.id,
          color: track.color,
          isTerminal: i === 0 || i === points.length - 1,
          // No inicializamos locationInfo aquí, se cargará bajo demanda en StationMarker
        };
        
        trackStations.push(newStation);
        stations.push(newStation);
        allStationPoints.add(pointKey);
        stationPositions.push(point);
        
        const stationType = i === 0 ? 'inicial' : i === points.length - 1 ? 'final' : 'intermedia';
        console.log(`Añadida estación ${stationType}: ${stationName} en vía ${track.id}`);
      } else {
        // Si no podemos añadir esta estación porque está demasiado cerca de otra,
        // intentamos encontrar otro punto en la vía que esté a una distancia adecuada
        let found = false;
        
        // Buscar en los puntos originales de la vía
        for (let j = 0; j < track.path.length; j++) {
          const alternativePoint = track.path[j];
          const altPointKey = `${alternativePoint.lat.toFixed(5)},${alternativePoint.lng.toFixed(5)}`;
          
          if (!allStationPoints.has(altPointKey) && !isTooCloseToExistingStations(alternativePoint)) {
            const stationName = generateStationName(stations.length);
            const newStation = {
              id: `station-${stations.length}`,
              position: alternativePoint,
              name: stationName,
              trackId: track.id,
              color: track.color,
              isTerminal: false,
              // No inicializamos locationInfo aquí, se cargará bajo demanda en StationMarker
            };
            
            trackStations.push(newStation);
            stations.push(newStation);
            allStationPoints.add(altPointKey);
            stationPositions.push(alternativePoint);
            
            console.log(`Añadida estación alternativa: ${stationName} en vía ${track.id}`);
            found = true;
            break;
          }
        }
      }
    }
    
    return trackStations;
  };
  
  // Generar estaciones para vías principales
  mainTracks.forEach((track) => {
    try {
      console.log(`Generating stations for track ${track.id}...`);
      distributeStationsEvenly(track, STATIONS_PER_TRACK);
    } catch (error) {
      console.error(`Error generating stations for track ${track.id}:`, error);
    }
  });
  
  // Generar estaciones para vías de conexión
  connectionTracks.forEach((track) => {
    try {
      console.log(`Generating stations for connection ${track.id}...`);
      distributeStationsEvenly(track, STATIONS_PER_CONNECTION);
    } catch (error) {
      console.error(`Error generating stations for connection ${track.id}:`, error);
    }
  });
  
  // Filtrar estaciones con coordenadas válidas
  const validStations = stations.filter(station => 
    isValidPoint(station.position)
  );
  
  // Reemplazar el array de estaciones con solo las válidas
  stations.length = 0;
  validStations.forEach(station => stations.push(station));
  
  console.log(`Generated ${stations.length} valid stations in total`);
  
  // Asegurar que hay al menos una estación
  if (stations.length === 0 && tracks.length > 0) {
    const track = tracks[0];
    if (track.path && track.path.length > 0) {
      const point = track.path[0];
      if (isValidPoint(point)) {
        stations.push({
          id: 'station-default',
          position: point,
          name: 'Estación Central',
          trackId: track.id,
          color: track.color
        });
        console.log('Added default station as fallback');
      } else {
        // Si el punto no es válido, usar coordenadas por defecto
        stations.push({
          id: 'station-default',
          position: DEFAULT_COORDINATES,
          name: 'Estación Central',
          trackId: 'default',
          color: '#FF0000'
        });
        console.log('Added default station with default coordinates as ultimate fallback');
      }
    }
  }
  
  return stations;
};

// Función para calcular la distancia entre dos puntos geográficos (en kilómetros)
export const calculateDistance = (p1: Coordinates, p2: Coordinates): number => {
  // Usar turf.js para calcular la distancia (más preciso)
  const point1 = turf.point([p1.lng, p1.lat]);
  const point2 = turf.point([p2.lng, p2.lat]);
  return turf.distance(point1, point2, {units: 'kilometers'});
};

// Function to find the closest track segment to a point
export const findClosestTrack = (point: Coordinates, tracks: TrackSegment[]): string | null => {
  if (!tracks.length) return null;
  
  let closestTrack = null;
  let minDistance = Infinity;
  
  tracks.forEach(track => {
    if (!track.path.length) return;
    
    // Convert the point and track to turf objects
    const pointFeature = turf.point([point.lng, point.lat]);
    const trackLine = turf.lineString(track.path.map(p => [p.lng, p.lat]));
    
    // Calculate the minimum distance from the point to the track
    const distance = turf.pointToLineDistance(pointFeature, trackLine);
    
    if (distance < minDistance) {
      minDistance = distance;
      closestTrack = track.id;
    }
  });
  
  return closestTrack;
};

// Función para encontrar la vía más cercana al final de la vía actual
// y determinar si debemos empezar desde el principio o el final de la nueva vía
export interface ConnectingTrackInfo {
  trackId: string;      // ID de la vía conectada
  startIndex: number;   // Índice por donde empezar (0 o último)
  reversed: boolean;    // Si debemos recorrer la vía en sentido inverso
}

export const findConnectingTrack = (
  currentTrack: TrackSegment,
  allTracks: TrackSegment[],
  isAtEnd: boolean = true // Por defecto, buscamos desde el final de la vía actual
): ConnectingTrackInfo | null => {
  if (!allTracks.length || !currentTrack.path.length) return null;
  
  // Punto desde el que buscamos la conexión (inicio o final de la vía actual)
  const connectionPoint = isAtEnd 
    ? currentTrack.path[currentTrack.path.length - 1] // Último punto si estamos al final
    : currentTrack.path[0]; // Primer punto si estamos al inicio
  
  let closestTrack: ConnectingTrackInfo | null = null;
  let minDistance = Infinity;
  
  // Buscar entre todas las vías excepto la actual
  allTracks.forEach(track => {
    // Ignorar la vía actual
    if (track.id === currentTrack.id || !track.path.length) return;
    
    // Comprobar distancia al inicio de la vía
    const startPoint = track.path[0];
    const startDistance = calculateDistance(connectionPoint, startPoint);
    
    // Comprobar distancia al final de la vía
    const endPoint = track.path[track.path.length - 1];
    const endDistance = calculateDistance(connectionPoint, endPoint);
    
    // Determinar el punto más cercano (inicio o final de la vía)
    if (startDistance < minDistance) {
      minDistance = startDistance;
      closestTrack = {
        trackId: track.id,
        startIndex: 0, // Empezar desde el principio
        reversed: false // No invertir el recorrido
      };
    }
    
    if (endDistance < minDistance) {
      minDistance = endDistance;
      closestTrack = {
        trackId: track.id,
        startIndex: track.path.length - 1, // Empezar desde el final
        reversed: true // Invertir el recorrido
      };
    }
  });
  
  // Solo conectar si la distancia es razonable (menos de 200 metros)
  return minDistance < 0.2 ? closestTrack : null;
};

// Utilizamos la función calculateDistance exportada anteriormente
