
import React from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

const StationMarker = ({ position, station, onClick }) => {
  // Create a custom icon for stations
  const stationIcon = L.divIcon({
    html: `
      <div class="bg-background border-2 border-primary rounded-full w-4 h-4"></div>
    `,
    className: 'station-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
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
