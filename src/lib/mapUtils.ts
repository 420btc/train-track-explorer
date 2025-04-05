
import NominatimClient from "nominatim-client";
import * as turf from '@turf/turf';
import polyline from '@mapbox/polyline';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TrackSegment {
  id: string;
  path: Coordinates[];
  next: string[];
}

export interface Station {
  id: string;
  name: string;
  position: Coordinates;
  trackId: string;
}

// Default coordinates for Barcelona, Spain
export const DEFAULT_COORDINATES: Coordinates = { lat: 41.3851, lng: 2.1734 };
export const DEFAULT_ZOOM = 16;

// Convert address to coordinates using Nominatim
export const geocodeAddress = async (address: string): Promise<Coordinates> => {
  try {
    // Usando la API correcta de NominatimClient
    const client = new NominatimClient({
      baseUrl: 'https://nominatim.openstreetmap.org',
      userAgent: 'train-simulator'
    });
    
    const results = await client.search({ q: address }).toArray();
    
    if (results && results.length > 0) {
      const location = results[0];
      return {
        lat: parseFloat(location.lat),
        lng: parseFloat(location.lon)
      };
    }
    
    throw new Error('No results found');
  } catch (error) {
    console.error('Geocoding error:', error);
    return DEFAULT_COORDINATES;
  }
};

// Función para obtener rutas reales usando la API OSRM
async function getRouteFromOSRM(start: Coordinates, end: Coordinates): Promise<Coordinates[]> {
  try {
    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=polyline6`
    );
    
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('OSRM route error:', data);
      // Fallback a una línea recta
      return [start, end];
    }
    
    // Decodificar el polyline recibido
    const encodedPolyline = data.routes[0].geometry;
    const decodedCoordinates = polyline.decode(encodedPolyline, 6);
    
    // Convertir al formato que necesitamos
    return decodedCoordinates.map(coord => ({ lat: coord[0], lng: coord[1] }));
  } catch (error) {
    console.error('Error fetching route:', error);
    // Fallback a una línea recta en caso de error
    return [start, end];
  }
}

// Generate track network based on real streets
export const generateTrackNetwork = async (center: Coordinates): Promise<TrackSegment[]> => {
  const tracks: TrackSegment[] = [];
  
  // Definir puntos importantes alrededor del centro
  const pointNorth = { lat: center.lat + 0.005, lng: center.lng + 0.002 };
  const pointEast = { lat: center.lat, lng: center.lng + 0.005 };
  const pointSouth = { lat: center.lat - 0.005, lng: center.lng + 0.002 };
  const pointWest = { lat: center.lat, lng: center.lng - 0.005 };
  
  try {
    // Obtener rutas reales usando OSRM
    const westToCenterPath = await getRouteFromOSRM(pointWest, center);
    const centerToEastPath = await getRouteFromOSRM(center, pointEast);
    const centerToNorthPath = await getRouteFromOSRM(center, pointNorth);
    const centerToSouthPath = await getRouteFromOSRM(center, pointSouth);
    const northLoopPath = await getRouteFromOSRM(pointNorth, { lat: center.lat + 0.002, lng: center.lng + 0.005 });
    const southLoopPath = await getRouteFromOSRM(pointSouth, { lat: center.lat - 0.002, lng: center.lng + 0.005 });
    
    // Crear segmentos de vía
    const mainWestLine: TrackSegment = {
      id: 'track-1',
      path: westToCenterPath,
      next: ['track-2', 'track-3', 'track-6']
    };
    
    const mainEastLine: TrackSegment = {
      id: 'track-6',
      path: centerToEastPath,
      next: []
    };
    
    const northBranch: TrackSegment = {
      id: 'track-2',
      path: centerToNorthPath,
      next: ['track-4']
    };
    
    const southBranch: TrackSegment = {
      id: 'track-3',
      path: centerToSouthPath,
      next: ['track-5']
    };
    
    const northLoop: TrackSegment = {
      id: 'track-4',
      path: northLoopPath,
      next: []
    };
    
    const southLoop: TrackSegment = {
      id: 'track-5',
      path: southLoopPath,
      next: []
    };
    
    tracks.push(mainWestLine, northBranch, southBranch, northLoop, southLoop, mainEastLine);
  } catch (error) {
    console.error('Error generating track network:', error);
    
    // En caso de error, volvemos al método anterior como fallback
    // Main horizontal line
    const mainLine: TrackSegment = {
      id: 'track-1',
      path: [
        { lat: center.lat, lng: center.lng - 0.005 },
        { lat: center.lat, lng: center.lng },
        { lat: center.lat, lng: center.lng + 0.005 },
      ],
      next: ['track-2', 'track-3']
    };
    
    // North branch
    const northBranch: TrackSegment = {
      id: 'track-2',
      path: [
        { lat: center.lat, lng: center.lng },
        { lat: center.lat + 0.003, lng: center.lng + 0.001 },
        { lat: center.lat + 0.005, lng: center.lng + 0.002 },
      ],
      next: ['track-4']
    };
    
    // South branch
    const southBranch: TrackSegment = {
      id: 'track-3',
      path: [
        { lat: center.lat, lng: center.lng },
        { lat: center.lat - 0.003, lng: center.lng + 0.001 },
        { lat: center.lat - 0.005, lng: center.lng + 0.002 },
      ],
      next: ['track-5']
    };
    
    // North loop
    const northLoop: TrackSegment = {
      id: 'track-4',
      path: [
        { lat: center.lat + 0.005, lng: center.lng + 0.002 },
        { lat: center.lat + 0.006, lng: center.lng + 0.004 },
        { lat: center.lat + 0.004, lng: center.lng + 0.006 },
        { lat: center.lat + 0.002, lng: center.lng + 0.005 },
      ],
      next: []
    };
    
    // South loop
    const southLoop: TrackSegment = {
      id: 'track-5',
      path: [
        { lat: center.lat - 0.005, lng: center.lng + 0.002 },
        { lat: center.lat - 0.006, lng: center.lng + 0.004 },
        { lat: center.lat - 0.004, lng: center.lng + 0.006 },
        { lat: center.lat - 0.002, lng: center.lng + 0.005 },
      ],
      next: []
    };
    
    tracks.push(mainLine, northBranch, southBranch, northLoop, southLoop);
  }
  
  return tracks;
};

// Generate stations along the tracks at meaningful points
export const generateStations = (tracks: TrackSegment[]): Station[] => {
  const stations: Station[] = [];
  
  // Create stations at strategic points along the tracks
  tracks.forEach((track) => {
    if (track.path.length > 1) {
      // Place a station at the beginning, middle, and end for longer tracks
      if (track.path.length >= 10) {
        // Start station
        stations.push({
          id: `station-start-${track.id}`,
          name: `Estación ${stations.length + 1}`,
          position: track.path[0],
          trackId: track.id
        });
        
        // Middle station
        const midIndex = Math.floor(track.path.length / 2);
        stations.push({
          id: `station-mid-${track.id}`,
          name: `Estación ${stations.length + 1}`,
          position: track.path[midIndex],
          trackId: track.id
        });
        
        // End station (only for tracks that don't connect to others)
        if (track.next.length === 0) {
          stations.push({
            id: `station-end-${track.id}`,
            name: `Estación ${stations.length + 1}`,
            position: track.path[track.path.length - 1],
            trackId: track.id
          });
        }
      } else {
        // For shorter tracks, just place a station at the middle
        const midIndex = Math.floor(track.path.length / 2);
        stations.push({
          id: `station-${track.id}`,
          name: `Estación ${stations.length + 1}`,
          position: track.path[midIndex],
          trackId: track.id
        });
      }
    }
  });
  
  return stations;
};

// Find closest point on track
export const findClosestPointOnTrack = (
  point: Coordinates, 
  tracks: TrackSegment[]
): { point: Coordinates; trackId: string; distance: number } => {
  let closestPoint: Coordinates | null = null;
  let closestTrackId = "";
  let minDistance = Infinity;
  
  tracks.forEach(track => {
    // Convert track path to a GeoJSON line
    const line = turf.lineString(track.path.map(coord => [coord.lng, coord.lat]));
    const pt = turf.point([point.lng, point.lat]);
    
    // Find the closest point on the line
    const snapped = turf.nearestPointOnLine(line, pt);
    const distance = snapped.properties.dist;
    
    if (distance < minDistance) {
      minDistance = distance;
      // Convert GeoJSON coordinates [lng, lat] back to our format {lat, lng}
      closestPoint = { 
        lat: snapped.geometry.coordinates[1], 
        lng: snapped.geometry.coordinates[0] 
      };
      closestTrackId = track.id;
    }
  });
  
  if (!closestPoint) {
    throw new Error("Could not find closest point on track");
  }
  
  return {
    point: closestPoint,
    trackId: closestTrackId,
    distance: minDistance
  };
};

// Find the next valid track segment to move to
export const findNextTrackSegment = (
  currentTrackId: string,
  trainPosition: Coordinates,
  tracks: TrackSegment[]
): string | null => {
  const currentTrack = tracks.find(track => track.id === currentTrackId);
  
  if (!currentTrack || currentTrack.next.length === 0) {
    return null;
  }
  
  // Find the closest next track
  let closestNextTrackId: string | null = null;
  let minDistance = Infinity;
  
  currentTrack.next.forEach(nextTrackId => {
    const nextTrack = tracks.find(track => track.id === nextTrackId);
    
    if (nextTrack) {
      // Calculate distance to the start of the next track
      const start = nextTrack.path[0];
      const distance = calculateDistance(trainPosition, start);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestNextTrackId = nextTrackId;
      }
    }
  });
  
  return closestNextTrackId;
};

// Calculate distance between two coordinates
export const calculateDistance = (
  point1: Coordinates, 
  point2: Coordinates
): number => {
  const from = turf.point([point1.lng, point1.lat]);
  const to = turf.point([point2.lng, point2.lat]);
  return turf.distance(from, to, { units: 'kilometers' });
};
