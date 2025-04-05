
import * as turf from '@turf/turf';
import * as polyline from '@mapbox/polyline';
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

// Constants
export const DEFAULT_COORDINATES: Coordinates = { lat: 40.416775, lng: -3.70379 }; // Madrid
export const DEFAULT_ZOOM = 15;
const MAX_TRACK_LENGTH = 2500; // Max track length in meters
const MIN_TRACK_LENGTH = 500; // Min track length in meters
const URBAN_AREA_RADIUS = 3000; // Max radius for urban rail network in meters
const STATIONS_PER_TRACK = 5; // Número fijo de estaciones por vía
const STATIONS_PER_CONNECTION = 2; // Número fijo de estaciones por conexión
const MIN_STATION_DISTANCE = 0.25; // Distancia mínima entre estaciones en km

// Geocoding helper function using direct fetch to Nominatim API
export const geocodeAddress = async (address: string): Promise<Coordinates> => {
  try {
    // Usar directamente la API de Nominatim
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&countrycodes=es&limit=1`,
      {
        headers: {
          'User-Agent': 'urban-rail-simulator',
          'Referer': 'https://lovableproject.com/'
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Nominatim API responded with status: ${response.status}`);
    }
    
    const searchResults = await response.json();

    if (!searchResults || searchResults.length === 0) {
      throw new Error('No results found');
    }

    const result = searchResults[0];
    return {
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon)
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to geocode address');
  }
};

// Generate urban track network based on real streets
export const generateTrackNetwork = async (center: Coordinates): Promise<TrackSegment[]> => {
  try {
    // Create a smaller urban area to stay within city limits
    const tracks: TrackSegment[] = [];
    const trackColors = ['#1a73e8', '#ea4335', '#34a853', '#fbbc04', '#673ab7'];
    
    // Generate 4-7 lines (like metro lines)
    const lineCount = Math.floor(Math.random() * 4) + 4;
    console.log(`Generating ${lineCount} metro lines...`);
    
    // Ordenar colores por longitud deseada: azul (más largo), amarillo, verde, rojo, morado
    const orderedTrackColors = ['#1a73e8', '#fbbc04', '#34a853', '#ea4335', '#673ab7'];
    
    // Función auxiliar para crear vías de respaldo si las APIs fallan
    const createFallbackTrack = (id: string, startPoint: Coordinates, endPoint: Coordinates, color: string, weight: number): TrackSegment => {
      // Crear puntos intermedios para que la vía no sea solo una línea recta
      const path: Coordinates[] = [startPoint];
      
      // Añadir 3-5 puntos intermedios con pequeñas variaciones
      const pointCount = Math.floor(Math.random() * 3) + 3;
      
      for (let i = 1; i <= pointCount; i++) {
        const ratio = i / (pointCount + 1);
        
        // Calcular punto base en la línea recta
        const baseLat = startPoint.lat + (endPoint.lat - startPoint.lat) * ratio;
        const baseLng = startPoint.lng + (endPoint.lng - startPoint.lng) * ratio;
        
        // Añadir una pequeña variación aleatoria
        const variation = 0.001 * (Math.random() - 0.5);
        
        path.push({
          lat: baseLat + variation,
          lng: baseLng + variation
        });
      }
      
      path.push(endPoint);
      
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
      // Generate a random angle for this line's direction
      const angle = (i * (360 / lineCount)) + (Math.random() * 30 - 15);
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
              tracks.push({
                id: `track-${i}`,
                path: path,
                distance: data.routes[0].distance,
                color: color,
                weight: 4
              });
              console.log(`Successfully created line ${i+1} with ${path.length} points`);
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
            tracks.push(fallbackTrack);
            console.log(`Created fallback line ${i+1} due to polyline error`);
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
        tracks.push(fallbackTrack);
        console.log(`Created fallback line ${i+1} due to API error`);
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
      
      // Find potential connection points between tracks
      for (let i = 0; i < tracks.length - 1 && connectionsAdded < 10; i++) {
        for (let j = i + 1; j < tracks.length && connectionsAdded < 10; j++) {
          // Aumentamos la probabilidad de conexión para tener una red más conectada
          if (Math.random() > 0.4) {
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
            
            // Check if points are close enough for an urban connection (not too long)
            const distance = turf.distance(
              [point1.lng, point1.lat],
              [point2.lng, point2.lat]
            ) * 1000; // Convert km to meters
            
            if (distance < URBAN_AREA_RADIUS * 0.6) {
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
                      tracks.push({
                        id: `connection-${i}-${j}`,
                        path: path,
                        distance: data.routes[0].distance,
                        color: '#9C27B0', // Color morado para conexiones
                        weight: 3
                      });
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
                      '#9C27B0',
                      3
                    );
                    tracks.push(fallbackTrack);
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
                    '#9C27B0',
                    3
                  );
                  tracks.push(fallbackTrack);
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
  
  // Nombres realistas para las estaciones de metro
  const stationNamePrefixes = [
    'Plaza', 'Avenida', 'Calle', 'Paseo', 'Gran Vía', 'Parque', 'Puerta', 'Estación', 
    'Universidad', 'Hospital', 'Palacio', 'Museo', 'Teatro', 'Mercado', 'Catedral'
  ];
  
  const stationNameSuffixes = [
    'Mayor', 'Central', 'Norte', 'Sur', 'Este', 'Oeste', 'Principal', 'Nuevo', 'Viejo',
    'del Sol', 'de España', 'de la Constitución', 'de las Artes', 'de los Deportes',
    'del Prado', 'de la Ciencia', 'de la Independencia', 'del Retiro'
  ];
  
  // Función para generar un nombre aleatorio para una estación
  const generateStationName = (index: number): string => {
    // Cada 5 estaciones, usar un nombre simple numérico
    if (index % 5 === 0) {
      return `Estación ${index + 1}`;
    }
    
    // Para el resto, generar un nombre más realista
    const usePrefix = Math.random() > 0.3;
    
    if (usePrefix) {
      const prefix = stationNamePrefixes[Math.floor(Math.random() * stationNamePrefixes.length)];
      const suffix = stationNameSuffixes[Math.floor(Math.random() * stationNameSuffixes.length)];
      return `${prefix} ${suffix}`;
    } else {
      // Algunos nombres son solo una palabra
      return stationNameSuffixes[Math.floor(Math.random() * stationNameSuffixes.length)];
    }
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
          isTerminal: i === 0 || i === points.length - 1
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
              isTerminal: false
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
