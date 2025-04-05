
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Coordinates } from '@/lib/mapUtils';

interface TrainMarkerProps {
  position: Coordinates;
  speed: number;
  nextStationName?: string;
}

// Custom train icon
const trainIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNmZmZmZmYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI2VmNDQ0NCIvPjxwYXRoIGQ9Ik04IDEyaDgiLz48L3N2Zz4=',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

const TrainMarker: React.FC<TrainMarkerProps> = ({ position, speed, nextStationName }) => {
  return (
    <Marker 
      position={[position.lat, position.lng]} 
      icon={trainIcon}
      zIndexOffset={1000} // Make sure train is always on top
    >
      <Popup>
        <div className="flex flex-col items-center p-2">
          <h3 className="text-lg font-bold mb-1">Train</h3>
          <p className="text-sm mb-1">Speed: {speed} km/h</p>
          {nextStationName && (
            <p className="text-sm text-gray-600">Next: {nextStationName}</p>
          )}
        </div>
      </Popup>
    </Marker>
  );
};

export default TrainMarker;
