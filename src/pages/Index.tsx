
<<<<<<< HEAD
import React, { useState } from 'react';
import TrainGame from '@/components/TrainGame';
import MainMenu from '@/components/MainMenu';
import { Coordinates, DEFAULT_COORDINATES } from '@/lib/mapUtils';
import { GameProvider } from '@/contexts/GameContext';
import '../styles/animations.css';

const Index = () => {
  const [showGame, setShowGame] = useState(false);
  const [startCoordinates, setStartCoordinates] = useState<Coordinates>(DEFAULT_COORDINATES);
  
  const handleStartGame = (coordinates?: Coordinates) => {
    if (coordinates) {
      setStartCoordinates(coordinates);
    }
    setShowGame(true);
  };
  
  return (
    <>
      {!showGame ? (
        <MainMenu onStartGame={handleStartGame} />
      ) : (
        <GameProvider>
          <TrainGame initialCoordinates={startCoordinates} />
        </GameProvider>
      )}
    </>
=======
import React, { useState } from "react";
import SearchBar from "@/components/SearchBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Index = () => {
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  const handleLocationSelect = (location: any) => {
    setSelectedLocation(location);
    console.log("Selected location:", location);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Tren Urbano Aleatorio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Busca cualquier ubicación en España para generar vías de tren urbanas aleatorias.</p>
            <SearchBar onLocationSelect={handleLocationSelect} />
          </CardContent>
        </Card>

        {selectedLocation && (
          <Card>
            <CardHeader>
              <CardTitle>Ubicación Seleccionada</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">{selectedLocation.display_name}</p>
              <p>Latitud: {selectedLocation.lat}</p>
              <p>Longitud: {selectedLocation.lon}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
>>>>>>> 81a8006f4dac1984b32564888a49dfbab218c3e5
  );
};

export default Index;
