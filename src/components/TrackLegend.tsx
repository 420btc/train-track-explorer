import React from 'react';
import { TrackSegment, Station } from '@/lib/mapUtils';
import { Train, MapPin } from 'lucide-react';

interface TrackLegendProps {
  tracks: TrackSegment[];
  stations?: Station[];
}

const TrackLegend: React.FC<TrackLegendProps> = ({ tracks, stations = [] }) => {
  // Filtrar solo las vías principales (no las conexiones)
  const mainTracks = tracks.filter(track => !track.id.includes('connection'));
  
  // Crear un mapa de estaciones por trackId para buscar rápidamente
  const stationsByTrack = {};
  stations.forEach(station => {
    if (!stationsByTrack[station.trackId]) {
      stationsByTrack[station.trackId] = [];
    }
    stationsByTrack[station.trackId].push(station);
  });
  
  // Asignar nombres reales a cada vía principal basados en sus estaciones
  const tracksWithNames = mainTracks.map((track, index) => {
    const trackStations = stationsByTrack[track.id] || [];
    const firstStation = trackStations[0]?.name || 'Estación Inicial';
    const lastStation = trackStations[trackStations.length - 1]?.name || 'Estación Final';
    
    return {
      ...track,
      lineName: `Línea ${index + 1}`,
      destination: trackStations.length > 0 ? `${firstStation} - ${lastStation}` : 'Ruta en construcción'
    };
  });

  return (
    <div className="bg-white bg-opacity-90 p-3 rounded-md shadow-md max-w-[260px] border border-gray-200">
      <div className="flex items-center mb-2">
        <Train className="h-4 w-4 mr-2 text-primary" />
        <h3 className="text-xs font-bold border-b pb-1 w-full">Red de Metro</h3>
      </div>
      
      <ul className="space-y-1 mb-2">
        {tracksWithNames.map((track) => (
          <li key={track.id} className="text-[10px]">
            <div className="flex items-center">
              <div 
                className="w-3 h-3 rounded-full mr-1.5 flex-shrink-0" 
                style={{ backgroundColor: track.color }}
              />
              <span className="font-semibold">{track.lineName}</span>
            </div>
            <div className="ml-4.5 text-gray-600 text-[9px] mt-0.5 truncate max-w-[220px]">
              {track.destination}
            </div>
          </li>
        ))}
      </ul>
      
      {mainTracks.length === 0 && (
        <p className="text-xs text-gray-500 italic">No hay líneas disponibles</p>
      )}
      
      <div className="mt-2 pt-2 border-t text-xs">
        <div className="flex items-center mb-1">
          <div className="w-3 h-3 rounded-full mr-2 bg-[#9C27B0]" />
          <span className="font-medium">Conexiones</span>
        </div>
        <div className="flex items-center mt-2">
          <div className="w-3 h-3 rounded-full mr-2 bg-red-500 border border-black" />
          <span className="font-medium">Estaciones</span>
        </div>
      </div>
    </div>
  );
};

export default TrackLegend;
