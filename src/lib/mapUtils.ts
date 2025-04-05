import NominatimClient from "nominatim-client";
import * as turf from '@turf/turf';

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
    const results = await NominatimClient.search({ q: address, limit: 1 });
    
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

// Generate track network based on coordinates
export const generateTrackNetwork = (center: Coordinates): TrackSegment[] => {
  // This is a simplified version that creates a predefined network
  // In a real app, we'd use real road data from OpenStreetMap
  
  const tracks: TrackSegment[] = [];
  
  // Create a simple network with a few segments
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
  
  return tracks;
};

// Generate stations along the tracks
export const generateStations = (tracks: TrackSegment[]): Station[] => {
  const stations: Station[] = [];
  
  // Create stations at strategic points along the tracks
  tracks.forEach((track) => {
    if (track.path.length > 1) {
      // Place a station at the middle point of the track
      const midIndex = Math.floor(track.path.length / 2);
      
      stations.push({
        id: `station-${track.id}`,
        name: `Station ${stations.length + 1}`,
        position: track.path[midIndex],
        trackId: track.id
      });
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
