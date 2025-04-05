
import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Station } from '@/lib/mapUtils';

interface StationMarkerProps {
  station: Station;
  onArrive: (stationId: string) => void;
}

// Custom station icon
const stationIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMwMDAwMDAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSI0IiB5PSI0IiB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHJ4PSIyIiByeT0iMiIgZmlsbD0iI2ZiYmYyNCIvPjxwYXRoIGQ9Ik05IDhoNk0xMSA4djgiLz48L3N2Zz4=',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

const StationMarker: React.FC<StationMarkerProps> = ({ station, onArrive }) => {
  return (
    <Marker 
      position={[station.position.lat, station.position.lng]} 
      icon={stationIcon}
    >
      <Popup>
        <div className="flex flex-col items-center p-2">
          <h3 className="text-lg font-bold mb-2">{station.name}</h3>
          <button 
            onClick={() => onArrive(station.id)} 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
          >
            Arrive at Station
          </button>
        </div>
      </Popup>
    </Marker>
  );
};

export default StationMarker;
