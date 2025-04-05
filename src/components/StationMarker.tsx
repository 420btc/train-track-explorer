
import React from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Coordinates } from '@/lib/mapUtils';

interface Station {
  id: string;
  name: string;
  position: Coordinates;
  trackId: string;
  color?: string;
}

interface StationMarkerProps {
  position: [number, number]; // Leaflet usa [lat, lng] para las posiciones
  station: Station;
  onClick: (station: Station) => void;
}

const StationMarker: React.FC<StationMarkerProps> = ({ position, station, onClick }) => {
  // Create a custom icon for stations
  const stationIcon = L.divIcon({
    html: `
      <div class="bg-red-500 border border-black rounded-full w-3 h-3"></div>
    `,
    className: 'station-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

  return (
    <Marker 
      position={position} 
      icon={stationIcon}
      eventHandlers={{
        click: () => onClick(station)
      }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={1}>
        {station.name}
      </Tooltip>
    </Marker>
  );
};

export default StationMarker;
