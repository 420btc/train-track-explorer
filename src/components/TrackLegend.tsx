import React from 'react';
import { TrackSegment } from '@/lib/mapUtils';
import { Train, MapPin } from 'lucide-react';

// Nombres bonitos para las líneas de metro con destinos de diversas ciudades españolas
const metroLineNames = [
  { name: 'Línea Cervantes', destination: 'Madrid: Sol - Retiro' },
  { name: 'Línea Picasso', destination: 'Málaga: Centro - Playa' },
  { name: 'Línea Gaudí', destination: 'Barcelona: Pl. Catalunya - Barceloneta' },
  { name: 'Línea Dalí', destination: 'Figueres: Museo - Castillo' },
  { name: 'Línea Velázquez', destination: 'Sevilla: Triana - Alameda' },
  { name: 'Línea Miró', destination: 'Mallorca: Catedral - Puerto' },
  { name: 'Línea Sorolla', destination: 'Valencia: Ciudad Artes - Playa' },
  { name: 'Línea Almodóvar', destination: 'Toledo: Alcázar - Zocodover' },
  { name: 'Línea Buñuel', destination: 'Zaragoza: Pilar - Aljafería' },
  { name: 'Línea Lorca', destination: 'Granada: Alhambra - Albaicín' },
  { name: 'Línea Neruda', destination: 'Bilbao: Guggenheim - Casco Viejo' },
  { name: 'Línea Machado', destination: 'Córdoba: Mezquita - Judería' }
];

interface TrackLegendProps {
  tracks: TrackSegment[];
}

const TrackLegend: React.FC<TrackLegendProps> = ({ tracks }) => {
  // Filtrar solo las vías principales (no las conexiones)
  const mainTracks = tracks.filter(track => !track.id.includes('connection'));
  
  // Asignar nombres bonitos a cada vía principal
  const tracksWithNames = mainTracks.map((track, index) => ({
    ...track,
    lineName: metroLineNames[index % metroLineNames.length].name,
    destination: metroLineNames[index % metroLineNames.length].destination
  }));

  return (
    <div className="bg-white bg-opacity-90 p-4 rounded-md shadow-md max-w-[280px] border border-gray-200">
      <div className="flex items-center mb-2">
        <Train className="h-4 w-4 mr-2 text-primary" />
        <h3 className="text-sm font-bold border-b pb-1 w-full">Red de Metro Español</h3>
      </div>
      
      <ul className="space-y-2 mb-3">
        {tracksWithNames.map((track) => (
          <li key={track.id} className="text-xs">
            <div className="flex items-center">
              <div 
                className="w-4 h-4 rounded-full mr-2 flex-shrink-0" 
                style={{ backgroundColor: track.color }}
              />
              <span className="font-semibold">{track.lineName}</span>
            </div>
            <div className="ml-6 text-gray-600 text-[10px] mt-0.5">
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
