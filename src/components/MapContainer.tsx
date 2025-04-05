
import React, { useEffect, useRef, useState } from 'react';
import { MapContainer as LeafletMap, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import TrainMarker from './TrainMarker';
import StationMarker from './StationMarker';
import { toast } from 'sonner';
import { Coordinates, TrackSegment } from '@/lib/mapUtils';

// Helper component to update map view
interface MapControllerProps {
  center: Coordinates;
  zoom: number;
}

function MapController({ center, zoom }: MapControllerProps) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  return null;
}

interface Station {
  id: string;
  name: string;
  position: Coordinates;
  trackId: string;
  color?: string;
}

interface MapContainerProps {
  center: Coordinates;
  zoom: number;
  tracks: TrackSegment[];
  stations: Station[];
  trainPosition: Coordinates;
  currentTrackId: string;
  onTrainMove: (position: Coordinates, trackId: string) => void;
  speed: number;
  onTrackSelect: (trackId: string) => void;
  mapStyle?: 'street' | 'satellite';
}

const MapContainer: React.FC<MapContainerProps> = ({ 
  center,
  zoom,
  tracks,
  stations,
  trainPosition,
  currentTrackId,
  onTrainMove,
  speed,
  onTrackSelect,
  mapStyle = 'street'
}) => {
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const animationFrameRef = useRef(null);

  // Handle station click
  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    toast.info(`Estación: ${station.name}`);
  };

  // Handle track click
  const handleTrackClick = (trackId: string) => {
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
        {mapStyle === 'street' ? (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        ) : (
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}
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
