
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer as LeafletMapContainer, TileLayer, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { Coordinates, TrackSegment, findClosestPointOnTrack } from '@/lib/mapUtils';
import TrainMarker from './TrainMarker';
import StationMarker from './StationMarker';
import { Button } from './ui/button';
import { Train } from 'lucide-react';
import { toast } from 'sonner';
import 'leaflet/dist/leaflet.css';

interface MapContainerProps {
  center: Coordinates;
  zoom: number;
  tracks: TrackSegment[];
  stations: { id: string; name: string; position: Coordinates; trackId: string }[];
  trainPosition: Coordinates;
  currentTrackId: string;
  onTrainMove: (position: Coordinates, trackId: string) => void;
  speed: number;
}

// Helper component to recenter the map when the center changes
const ChangeMapView: React.FC<{ center: Coordinates; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom);
  }, [center, zoom, map]);
  
  return null;
};

// Helper component to handle map clicks
const MapEvents: React.FC<{
  tracks: TrackSegment[];
  onTrainMove: (position: Coordinates, trackId: string) => void;
}> = ({ tracks, onTrainMove }) => {
  const map = useMapEvents({
    click: (e) => {
      try {
        const clickedPoint = { lat: e.latlng.lat, lng: e.latlng.lng };
        const result = findClosestPointOnTrack(clickedPoint, tracks);
        
        // Only move the train if clicked close enough to a track (within ~100m)
        if (result.distance < 0.1) {
          onTrainMove(result.point, result.trackId);
        } else {
          toast.info("Por favor, haz clic más cerca de las vías");
        }
      } catch (error) {
        console.error("Error moving train:", error);
        toast.error("No se puede mover el tren a esa ubicación");
      }
    }
  });
  
  return null;
};

const MapContainer: React.FC<MapContainerProps> = ({
  center,
  zoom,
  tracks,
  stations,
  trainPosition,
  currentTrackId,
  onTrainMove,
  speed
}) => {
  const currentTrack = tracks.find(track => track.id === currentTrackId);
  const [currentPathIndex, setCurrentPathIndex] = useState(0);
  
  // Find the next station
  const nextStation = stations.find(station => station.trackId === currentTrackId);
  
  // Function to move train forward
  const moveTrainForward = () => {
    if (currentTrack && currentPathIndex < currentTrack.path.length - 1) {
      // Move to next point in the current track
      const nextPosition = currentTrack.path[currentPathIndex + 1];
      onTrainMove(nextPosition, currentTrackId);
      setCurrentPathIndex(currentPathIndex + 1);
    } else if (currentTrack && currentTrack.next.length > 0) {
      // Move to the next track
      const nextTrackId = currentTrack.next[0];
      const nextTrack = tracks.find(t => t.id === nextTrackId);
      
      if (nextTrack && nextTrack.path.length > 0) {
        onTrainMove(nextTrack.path[0], nextTrackId);
        setCurrentPathIndex(0);
        toast.info(`Cambiando a la vía ${nextTrackId}`);
      }
    } else {
      toast.info("Fin de la vía");
    }
  };
  
  // Update path index when current track changes
  useEffect(() => {
    if (currentTrack && currentTrack.path.length > 0) {
      // Find the closest point in the current track path to the train position
      let closestIndex = 0;
      let minDistance = Number.MAX_VALUE;
      
      currentTrack.path.forEach((point, index) => {
        const dx = point.lat - trainPosition.lat;
        const dy = point.lng - trainPosition.lng;
        const distance = dx * dx + dy * dy;
        
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = index;
        }
      });
      
      setCurrentPathIndex(closestIndex);
    }
  }, [currentTrackId, currentTrack, trainPosition]);
  
  return (
    <div className="relative w-full h-full">
      <LeafletMapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        zoomControl={false}
        attributionControl={false}
        className="h-full w-full"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Render all tracks */}
        {tracks.map((track) => (
          <Polyline
            key={track.id}
            positions={track.path.map(coord => [coord.lat, coord.lng])}
            color={track.id === currentTrackId ? "#ef4444" : "#3b82f6"}
            weight={track.id === currentTrackId ? 6 : 5}
            opacity={track.id === currentTrackId ? 1 : 0.7}
          />
        ))}
        
        {/* Render all stations */}
        {stations.map((station) => (
          <StationMarker 
            key={station.id} 
            station={station} 
            onArrive={() => {
              toast.success(`¡Llegaste a ${station.name}!`);
            }}
          />
        ))}
        
        {/* Render the train */}
        <TrainMarker 
          position={trainPosition} 
          speed={speed}
          nextStationName={nextStation?.name} 
        />
        
        <ChangeMapView center={center} zoom={zoom} />
        <MapEvents tracks={tracks} onTrainMove={onTrainMove} />
      </LeafletMapContainer>
      
      {/* Train movement button */}
      <div className="absolute bottom-5 right-5 z-[1000]">
        <Button 
          className="flex gap-2 h-16 w-16 rounded-full" 
          onClick={moveTrainForward}
          size="lg"
        >
          <Train className="h-8 w-8" />
        </Button>
      </div>
    </div>
  );
};

export default MapContainer;
