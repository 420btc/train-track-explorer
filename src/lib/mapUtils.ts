
import * as turf from '@turf/turf';
import * as polyline from '@mapbox/polyline';
// Fix the import to use the correct export from nominatim-client
import nominatimClient from 'nominatim-client';

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
const MAX_TRACK_LENGTH = 1000; // Max track length in meters
const MIN_TRACK_LENGTH = 200; // Min track length in meters
const URBAN_AREA_RADIUS = 1500; // Max radius for urban rail network in meters
const MAX_STATIONS = 10; // Maximum number of stations

// Geocoding helper function
export const geocodeAddress = async (address: string): Promise<Coordinates> => {
  try {
    // Use the correct way to access nominatim-client
    const searchResults = await nominatimClient.search({
      q: address,
      addressdetails: 1,
      limit: 1
    });

    if (searchResults.length === 0) {
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
    
    // Generate 3-5 lines (like metro lines)
    const lineCount = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < lineCount; i++) {
      // Generate a random angle for this line's direction
      const angle = (i * (360 / lineCount)) + (Math.random() * 30 - 15);
      const color = trackColors[i % trackColors.length];
      
      // Create points for route calculation, staying within urban radius
      const distance = Math.min(URBAN_AREA_RADIUS * 0.7, 
                               Math.max(MIN_TRACK_LENGTH, Math.random() * MAX_TRACK_LENGTH));
      
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
        // Get route using OSRM API
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/` +
          `${center.lng},${center.lat};${endCoords.lng},${endCoords.lat}` +
          `?overview=full&geometries=polyline`
        );
        
        const data = await response.json();
        
        if (data.routes && data.routes.length > 0) {
          // Decode polyline to get path coordinates
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
          }
        }
      } catch (routeError) {
        console.error('Error getting route:', routeError);
        // Fallback to a straight line if route API fails
        tracks.push({
          id: `track-${i}`,
          path: [center, endCoords],
          distance: turf.distance(
            [center.lng, center.lat],
            [endCoords.lng, endCoords.lat]
          ) * 1000, // Convert km to meters
          color: color,
          weight: 4
        });
      }
    }
    
    // Ensure at least one track is added
    if (tracks.length === 0) {
      const randomAngle = Math.random() * 360;
      const randomDistance = Math.min(URBAN_AREA_RADIUS * 0.6, 
                                   Math.max(MIN_TRACK_LENGTH, Math.random() * MAX_TRACK_LENGTH));
      
      const endPoint = turf.destination(
        [center.lng, center.lat],
        randomDistance / 1000,
        randomAngle
      );
      
      tracks.push({
        id: 'track-default',
        path: [
          center,
          {
            lat: endPoint.geometry.coordinates[1],
            lng: endPoint.geometry.coordinates[0]
          }
        ],
        distance: randomDistance,
        color: trackColors[0],
        weight: 4
      });
    }
    
    // Add connecting tracks to create a network
    if (tracks.length >= 2) {
      // Find potential connection points between tracks
      for (let i = 0; i < tracks.length - 1; i++) {
        for (let j = i + 1; j < tracks.length; j++) {
          // Only connect some tracks randomly
          if (Math.random() > 0.6) {
            const track1 = tracks[i];
            const track2 = tracks[j];
            
            // Choose random points on each track
            const point1Index = Math.floor(Math.random() * (track1.path.length - 1)) + 1;
            const point2Index = Math.floor(Math.random() * (track2.path.length - 1)) + 1;
            
            const point1 = track1.path[point1Index];
            const point2 = track2.path[point2Index];
            
            // Check if points are close enough for an urban connection (not too long)
            const distance = turf.distance(
              [point1.lng, point1.lat],
              [point2.lng, point2.lat]
            ) * 1000; // Convert km to meters
            
            if (distance < URBAN_AREA_RADIUS * 0.4) {
              try {
                // Get route between these points
                const response = await fetch(
                  `https://router.project-osrm.org/route/v1/driving/` +
                  `${point1.lng},${point1.lat};${point2.lng},${point2.lat}` +
                  `?overview=full&geometries=polyline`
                );
                
                const data = await response.json();
                
                if (data.routes && data.routes.length > 0) {
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
                      color: '#888888', // Different color for connections
                      weight: 3
                    });
                  }
                }
              } catch (connectionError) {
                console.error('Error creating connection:', connectionError);
              }
            }
          }
        }
      }
    }
    
    return tracks;
  } catch (error) {
    console.error('Error generating track network:', error);
    return [];
  }
};

// Generate stations along the tracks
export const generateStations = (tracks: TrackSegment[]): any[] => {
  if (!tracks.length) return [];
  
  const stations: any[] = [];
  const stationSpacing = 0.3; // Approximate distance between stations in km
  const allStationPoints = new Set<string>(); // To avoid duplicate stations
  
  tracks.forEach(track => {
    if (!track.path.length) return;
    
    // For very short tracks, add just start and end stations
    if (track.distance < 300) {
      const startPoint = track.path[0];
      const endPoint = track.path[track.path.length - 1];
      
      const startKey = `${startPoint.lat.toFixed(5)},${startPoint.lng.toFixed(5)}`;
      const endKey = `${endPoint.lat.toFixed(5)},${endPoint.lng.toFixed(5)}`;
      
      if (!allStationPoints.has(startKey)) {
        stations.push({
          id: `station-${stations.length}`,
          position: startPoint,
          name: `Estación ${stations.length + 1}`,
          trackId: track.id
        });
        allStationPoints.add(startKey);
      }
      
      if (!allStationPoints.has(endKey)) {
        stations.push({
          id: `station-${stations.length}`,
          position: endPoint,
          name: `Estación ${stations.length + 1}`,
          trackId: track.id
        });
        allStationPoints.add(endKey);
      }
      
      return;
    }
    
    // For longer tracks, create stations along the path
    let totalAdded = 0;
    let currentDistance = 0;
    
    // Add first station at the beginning
    const firstPoint = track.path[0];
    const firstKey = `${firstPoint.lat.toFixed(5)},${firstPoint.lng.toFixed(5)}`;
    
    if (!allStationPoints.has(firstKey)) {
      stations.push({
        id: `station-${stations.length}`,
        position: firstPoint,
        name: `Estación ${stations.length + 1}`,
        trackId: track.id
      });
      allStationPoints.add(firstKey);
      totalAdded++;
    }
    
    // Calculate stations along the track
    for (let i = 1; i < track.path.length; i++) {
      const prevPoint = track.path[i - 1];
      const curPoint = track.path[i];
      
      const segmentDistance = turf.distance(
        [prevPoint.lng, prevPoint.lat],
        [curPoint.lng, curPoint.lat]
      ); // in km
      
      currentDistance += segmentDistance;
      
      if (currentDistance >= stationSpacing) {
        const pointKey = `${curPoint.lat.toFixed(5)},${curPoint.lng.toFixed(5)}`;
        
        if (!allStationPoints.has(pointKey)) {
          stations.push({
            id: `station-${stations.length}`,
            position: curPoint,
            name: `Estación ${stations.length + 1}`,
            trackId: track.id
          });
          allStationPoints.add(pointKey);
          totalAdded++;
        }
        
        currentDistance = 0;
      }
      
      // Make sure we don't add too many stations per track
      if (totalAdded >= MAX_STATIONS / tracks.length) break;
    }
    
    // Add last station if it's not already added
    const lastPoint = track.path[track.path.length - 1];
    const lastKey = `${lastPoint.lat.toFixed(5)},${lastPoint.lng.toFixed(5)}`;
    
    if (!allStationPoints.has(lastKey)) {
      stations.push({
        id: `station-${stations.length}`,
        position: lastPoint,
        name: `Estación ${stations.length + 1}`,
        trackId: track.id
      });
    }
  });
  
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
