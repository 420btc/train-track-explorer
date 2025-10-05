
import React from 'react';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import { Train } from 'lucide-react';
import { renderToString } from 'react-dom/server';
import { Coordinates } from '@/lib/mapUtils';

// Estilos CSS para la animación del resplandor
const pulseStyle = `
  @keyframes strongPulse {
    0% { transform: scale(1); opacity: 0.7; }
    50% { transform: scale(1.3); opacity: 0.9; }
    100% { transform: scale(1); opacity: 0.7; }
  }
  
  .train-marker-pulse {
    animation: strongPulse 1.5s infinite ease-in-out;
  }
`;

// Añadir los estilos al documento
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = pulseStyle;
  document.head.appendChild(styleEl);
}

interface TrainMarkerProps {
  position: [number, number]; // Leaflet usa [lat, lng] para las posiciones
  trackId: string;
}

const TrainMarker: React.FC<TrainMarkerProps> = ({ position, trackId }) => {
  // Create a custom icon using Lucide's Train icon
  const trainIcon = L.divIcon({
    html: renderToString(
      <div className="flex items-center justify-center bg-primary text-primary-foreground rounded-full p-1 relative">
        {/* Resplandor amarillo con animación personalizada pero más sutil (reducido en un 15%) */}
        <div className="absolute -inset-[2.5px] rounded-full bg-yellow-300 opacity-60 train-marker-pulse blur-sm"></div>
        <div className="absolute -inset-[0.5px] rounded-full bg-yellow-400 opacity-50 animate-pulse"></div>
        <Train className="h-4 w-4 relative z-10" />
      </div>
    ),
    className: 'train-marker',
    iconSize: [20, 20], // Tamaño original
    iconAnchor: [10, 10],
  });

  return (
    <Marker position={position} icon={trainIcon} />
  );
};

export default TrainMarker;
