import React, { useEffect, useRef } from 'react';
import { TrackSegment, Coordinates, Station } from '@/lib/mapUtils';

interface MiniMapProps {
  tracks: TrackSegment[];
  trainPosition: Coordinates;
  stations: Station[];
  isOpen: boolean;
  onClose: () => void;
}

const MiniMap: React.FC<MiniMapProps> = ({ 
  tracks, 
  trainPosition, 
  stations, 
  isOpen, 
  onClose 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Función para normalizar coordenadas al tamaño del canvas
  const normalizeCoordinates = (
    coords: Coordinates[], 
    canvasWidth: number, 
    canvasHeight: number
  ): { normalizedCoords: Coordinates[], minLat: number, maxLat: number, minLng: number, maxLng: number } => {
    if (coords.length === 0) return { 
      normalizedCoords: [], 
      minLat: 0, 
      maxLat: 0, 
      minLng: 0, 
      maxLng: 0 
    };
    
    // Encontrar los límites
    let minLat = coords[0].lat;
    let maxLat = coords[0].lat;
    let minLng = coords[0].lng;
    let maxLng = coords[0].lng;
    
    coords.forEach(coord => {
      minLat = Math.min(minLat, coord.lat);
      maxLat = Math.max(maxLat, coord.lat);
      minLng = Math.min(minLng, coord.lng);
      maxLng = Math.max(maxLng, coord.lng);
    });
    
    // Añadir un pequeño margen
    const latMargin = (maxLat - minLat) * 0.1;
    const lngMargin = (maxLng - minLng) * 0.1;
    
    minLat -= latMargin;
    maxLat += latMargin;
    minLng -= lngMargin;
    maxLng += lngMargin;
    
    // Normalizar coordenadas
    const normalizedCoords = coords.map(coord => {
      const x = ((coord.lng - minLng) / (maxLng - minLng)) * canvasWidth;
      const y = ((maxLat - coord.lat) / (maxLat - minLat)) * canvasHeight;
      return { lat: y, lng: x };
    });
    
    return { normalizedCoords, minLat, maxLat, minLng, maxLng };
  };
  
  // Renderizar el mapa en el canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Limpiar el canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Recopilar todas las coordenadas para normalización
    const allCoordinates: Coordinates[] = [];
    tracks.forEach(track => {
      allCoordinates.push(...track.path);
    });
    
    stations.forEach(station => {
      allCoordinates.push(station.position);
    });
    
    if (trainPosition) {
      allCoordinates.push(trainPosition);
    }
    
    // Normalizar coordenadas
    const { normalizedCoords, minLat, maxLat, minLng, maxLng } = 
      normalizeCoordinates(allCoordinates, canvasWidth, canvasHeight);
    
    // Dibujar las vías
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    
    tracks.forEach(track => {
      if (track.path.length < 2) return;
      
      ctx.beginPath();
      
      // Normalizar las coordenadas de la vía
      const trackCoords = track.path.map(coord => {
        const x = ((coord.lng - minLng) / (maxLng - minLng)) * canvasWidth;
        const y = ((maxLat - coord.lat) / (maxLat - minLat)) * canvasHeight;
        return { x, y };
      });
      
      // Dibujar la línea
      ctx.moveTo(trackCoords[0].x, trackCoords[0].y);
      for (let i = 1; i < trackCoords.length; i++) {
        ctx.lineTo(trackCoords[i].x, trackCoords[i].y);
      }
      
      ctx.stroke();
    });
    
    // Dibujar las estaciones
    ctx.fillStyle = '#4A8C2A';
    stations.forEach(station => {
      const x = ((station.position.lng - minLng) / (maxLng - minLng)) * canvasWidth;
      const y = ((maxLat - station.position.lat) / (maxLat - minLat)) * canvasHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Dibujar la posición del tren
    if (trainPosition) {
      const x = ((trainPosition.lng - minLng) / (maxLng - minLng)) * canvasWidth;
      const y = ((maxLat - trainPosition.lat) / (maxLat - minLat)) * canvasHeight;
      
      ctx.fillStyle = '#FF5722';
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      
      // Añadir un borde al tren para destacarlo
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }, [isOpen, tracks, trainPosition, stations]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed top-0 right-0 bottom-0 left-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg p-4 shadow-lg w-[80%] max-w-[500px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Mapa de Recorrido</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <canvas 
            ref={canvasRef} 
            width={450} 
            height={300} 
            className="w-full"
          />
        </div>
        
        <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#FF5722] mr-1"></div>
            <span>Tren</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#4A8C2A] mr-1"></div>
            <span>Estaciones</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-1 bg-[#333] mr-1"></div>
            <span>Vías</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MiniMap;
