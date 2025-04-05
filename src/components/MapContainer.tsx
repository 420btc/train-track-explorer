
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer as LeafletMap, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import TrainMarker from './TrainMarker';
import StationMarker from './StationMarker';
import { toast } from 'sonner';

// Helper component to update map view
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  return null;
}

const MapContainer = ({ 
  center,
  zoom,
  tracks,
  stations,
  trainPosition,
  currentTrackId,
  onTrainMove,
  speed,
  onTrackSelect
}) => {
  const [selectedStation, setSelectedStation] = useState(null);
  const animationFrameRef = useRef(null);

  // Handle station click
  const handleStationClick = (station) => {
    setSelectedStation(station);
    toast.info(`Estación: ${station.name}`);
  };

  // Handle track click
  const handleTrackClick = (trackId) => {
    onTrackSelect(trackId);
  };

  return (
    <div className="flex-grow relative">
      <LeafletMap 
        center={[center.lat, center.lng]} 
        zoom={zoom} 
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapController center={center} zoom={zoom} />
        
        {/* Render tracks */}
        {tracks.map((track) => (
          <Polyline
            key={track.id}
            positions={track.path.map(p => [p.lat, p.lng])}
            pathOptions={{ 
              color: track.color,
              weight: track.id === currentTrackId ? 6 : track.weight,
              opacity: track.id === currentTrackId ? 1 : 0.8
            }}
            eventHandlers={{
              click: () => handleTrackClick(track.id)
            }}
          />
        ))}
        
        {/* Render stations */}
        {stations.map((station) => (
          <StationMarker
            key={station.id}
            station={station}
            position={[station.position.lat, station.position.lng]}
            onClick={() => handleStationClick(station)}
          />
        ))}
        
        {/* Render train */}
        {trainPosition && (
          <TrainMarker
            position={[trainPosition.lat, trainPosition.lng]}
            trackId={currentTrackId}
          />
        )}
      </LeafletMap>
      
      {/* Station info popup */}
      {selectedStation && (
        <div className="absolute bottom-4 left-4 bg-background border rounded-md p-3 shadow-md max-w-xs">
          <h3 className="font-medium">{selectedStation.name}</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Línea: {selectedStation.trackId}
          </p>
          <button 
            onClick={() => setSelectedStation(null)}
            className="absolute top-1 right-1 text-muted-foreground text-xs"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default MapContainer;
