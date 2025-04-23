
// Import nominatim-client correctly
import nominatimClient from "nominatim-client";
import mapboxgl from "mapbox-gl";

// Create a nominatim client instance for geocoding
// The library exports a function that creates a client, not a class
const nominatimInstance = nominatimClient({
  useragent: "train-game-app", // Application identifier
  referer: "train-game-app", // Referer header
});

/**
 * Search for locations in Spain based on user input
 */
export async function searchLocation(query: string): Promise<any[]> {
  try {
    if (!query || query.trim() === "") {
      return [];
    }

    const response = await nominatimInstance.search({
      q: query,
      countrycodes: "es", // Limit to Spain
      addressdetails: 1,
      limit: 5,
      format: "json"
    });

    console.log("Search results:", response);
    return response || [];
  } catch (error) {
    console.error("Error searching location:", error);
    return [];
  }
}

/**
 * Generate random rail paths within urban areas
 */
export function generateUrbanRailPaths(center: mapboxgl.LngLat, maxDistance: number = 0.01): any[] {
  // Implementation for generating random urban rail paths
  const paths = [];
  const numPaths = 3 + Math.floor(Math.random() * 4); // 3-6 paths

  for (let i = 0; i < numPaths; i++) {
    const path = generateSinglePath(center, maxDistance);
    paths.push(path);
  }

  return paths;
}

/**
 * Helper to generate a single rail path
 */
function generateSinglePath(center: mapboxgl.LngLat, maxDistance: number): any {
  const points = [];
  const numPoints = 4 + Math.floor(Math.random() * 5); // 4-8 points per path
  
  // Start point near center
  const startOffset = {
    lng: (Math.random() - 0.5) * maxDistance * 0.5,
    lat: (Math.random() - 0.5) * maxDistance * 0.5
  };
  
  let prevPoint = {
    lng: center.lng + startOffset.lng,
    lat: center.lat + startOffset.lat
  };
  points.push(prevPoint);

  // Generate subsequent points with urban-like grid pattern
  for (let i = 1; i < numPoints; i++) {
    // In urban areas, paths tend to follow street grid (more right angles)
    const direction = Math.floor(Math.random() * 4); // 0: north, 1: east, 2: south, 3: west
    const distance = maxDistance * (0.2 + Math.random() * 0.3); // Shorter segments for urban feel
    
    let nextPoint;
    if (direction === 0 || direction === 2) {
      // North/South - change latitude
      nextPoint = {
        lng: prevPoint.lng,
        lat: prevPoint.lat + (direction === 0 ? distance : -distance)
      };
    } else {
      // East/West - change longitude
      nextPoint = {
        lng: prevPoint.lng + (direction === 1 ? distance : -distance),
        lat: prevPoint.lat
      };
    }
    
    points.push(nextPoint);
    prevPoint = nextPoint;
  }

  return {
    type: "LineString",
    coordinates: points.map(p => [p.lng, p.lat])
  };
}
