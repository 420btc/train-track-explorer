
import React from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { Train } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import { Coordinates } from '@/lib/mapUtils';

interface TrainMarkerProps {
  position: [number, number]; // Leaflet usa [lat, lng] para las posiciones
  trackId: string;
}

const TrainMarker: React.FC<TrainMarkerProps> = ({ position, trackId }) => {
  // Create a custom icon using Lucide's Train icon
  const trainIcon = L.divIcon({
    html: renderToString(
      <div className="flex items-center justify-center bg-primary text-primary-foreground rounded-full p-1">
        <Train className="h-4 w-4" />
      </div>
    ),
    className: 'train-marker',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

  return (
    <Marker position={position} icon={trainIcon} />
  );
};

export default TrainMarker;
