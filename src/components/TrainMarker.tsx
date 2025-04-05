
import React from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { Train } from 'lucide-react';
import { renderToString } from 'react-dom/server';

const TrainMarker = ({ position, trackId }) => {
  // Create a custom icon using Lucide's Train icon
  const trainIcon = L.divIcon({
    html: renderToString(
      <div className="flex items-center justify-center bg-primary text-primary-foreground rounded-full p-2">
        <Train className="h-6 w-6" />
      </div>
    ),
    className: 'train-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  return (
    <Marker position={position} icon={trainIcon} />
  );
};

export default TrainMarker;
