
import React, { useState, useEffect } from 'react';
import MapContainer from './MapContainer';
import SearchBar from './SearchBar';
import GameHeader from './GameHeader';
import { 
  Coordinates, 
  DEFAULT_COORDINATES, 
  DEFAULT_ZOOM,
  generateTrackNetwork, 
  generateStations,
  calculateDistance
} from '@/lib/mapUtils';
import { cn } from '@/lib/utils';

const TrainGame: React.FC = () => {
  // Game state
  const [mapCenter, setMapCenter] = useState<Coordinates>(DEFAULT_COORDINATES);
  const [trainPosition, setTrainPosition] = useState<Coordinates>(DEFAULT_COORDINATES);
  const [currentTrackId, setCurrentTrackId] = useState<string>('');
  const [speed, setSpeed] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  
  // Game data
  const [tracks, setTracks] = useState<any[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  
  // Initialize the game with default location
  useEffect(() => {
    initializeGame(DEFAULT_COORDINATES);
  }, []);
  
  // Initialize game with a location
  const initializeGame = (location: Coordinates) => {
    setIsLoading(true);
    
    try {
      // Generate track network
      const trackNetwork = generateTrackNetwork(location);
      setTracks(trackNetwork);
      
      // Generate stations
      const gameStations = generateStations(trackNetwork);
      setStations(gameStations);
      
      // Set initial train position to the start of the first track
      const initialTrack = trackNetwork[0];
      const initialPosition = initialTrack.path[0];
      setTrainPosition(initialPosition);
      setCurrentTrackId(initialTrack.id);
      
      // Set map center to the location
      setMapCenter(location);
      
      // Reset speed
      setSpeed(0);
    } catch (error) {
      console.error("Error initializing game:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle search
  const handleSearch = (location: Coordinates) => {
    initializeGame(location);
  };
  
  // Handle train movement
  const handleTrainMove = (newPosition: Coordinates, newTrackId: string) => {
    // Calculate distance and update speed
    const distance = calculateDistance(trainPosition, newPosition);
    const newSpeed = Math.round(distance * 1000); // km to m for more realistic speed
    
    setTrainPosition(newPosition);
    setCurrentTrackId(newTrackId);
    setSpeed(newSpeed);
  };
  
  // Toggle menu
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Game Header */}
      <GameHeader 
        speed={speed} 
        nextStation={stations.find(s => s.trackId === currentTrackId)?.name}
        onToggleMenu={toggleMenu}
      />
      
      {/* Map Container */}
      <MapContainer
        center={mapCenter}
        zoom={DEFAULT_ZOOM}
        tracks={tracks}
        stations={stations}
        trainPosition={trainPosition}
        currentTrackId={currentTrackId}
        onTrainMove={handleTrainMove}
        speed={speed}
      />
      
      {/* Search Bar Overlay */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <SearchBar onSearch={handleSearch} isLoading={isLoading} />
      </div>
      
      {/* Side Menu */}
      <div 
        className={cn(
          "absolute top-0 right-0 h-full w-64 bg-background shadow-lg z-20 transform transition-transform duration-300",
          menuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="p-4">
          <h2 className="text-xl font-bold mb-4">Train Maps</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-1">Velocidad</h3>
              <p className="text-2xl font-bold">{speed} km/h</p>
            </div>
            
            <div>
              <h3 className="text-sm font-medium mb-1">Estaciones visitadas</h3>
              <p className="text-2xl font-bold">0/{stations.length}</p>
            </div>
            
            <button 
              className="w-full bg-track text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              onClick={() => initializeGame(mapCenter)}
            >
              Reiniciar juego
            </button>
          </div>
          
          <div className="absolute bottom-4 left-4 right-4">
            <div className="text-xs text-gray-500 text-center">
              Train Maps v1.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainGame;
