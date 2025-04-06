
import React, { useState, useEffect } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import { Coordinates, LocationInfo, reverseGeocode } from '@/lib/mapUtils';
import { Passenger } from './PassengerSystem';

interface Station {
  id: string;
  name: string;
  position: Coordinates;
  trackId: string;
  color?: string;
  canGenerate?: boolean;
  locationInfo?: LocationInfo;
}

interface StationMarkerProps {
  position: [number, number]; // Leaflet usa [lat, lng] para las posiciones
  station: Station;
  onClick: (station: Station) => void;
  waitingPassengers?: Passenger[];
}

const StationMarker: React.FC<StationMarkerProps> = ({ position, station, onClick, waitingPassengers = [] }) => {
  // Usar useRef para evitar actualizaciones innecesarias
  const hasTriedFetch = React.useRef(false);
  
  // Cargar el nombre de la calle usando geocodificación inversa inmediatamente al montar
  useEffect(() => {
    // Solo intentar obtener el nombre de la calle una vez por estación
    if (!hasTriedFetch.current && !station.locationInfo) {
      hasTriedFetch.current = true;
      
      const fetchStreetName = async () => {
        try {
          console.log(`Obteniendo nombre para estación ${station.id}`);
          const info = await reverseGeocode(station.position);
          
          // Actualizar la estación con el nombre de la calle
          station.locationInfo = info;
          
          // Reemplazar el nombre de la estación con el nombre de la calle
          if (info.streetName && info.streetName !== 'Estación') {
            station.name = info.streetName;
            // No llamamos a onClick aquí para evitar el bucle infinito
          }
        } catch (error) {
          console.error('Error al obtener nombre de calle:', error);
        }
      };
      
      // Ejecutar inmediatamente
      fetchStreetName();
    }
  }, [station.id, station.position]); // Solo dependemos de id y position, no del objeto station completo
  
  // Determinar el color de la estación basado en la cantidad de pasajeros y su estado
  const getStationColor = () => {
    if (waitingPassengers.length === 0) {
      return 'bg-gray-500'; // Gris si no hay pasajeros
    }
    
    const currentTime = Date.now();
    let urgentPassengers = 0;
    let warningPassengers = 0;
    
    // Verificar cuántos pasajeros están en estado urgente o de advertencia
    waitingPassengers.forEach(passenger => {
      const creationTime = passenger.createdAt;
      const elapsedTime = currentTime - creationTime;
      
      // Más de 4 minutos (240000ms) - Estado urgente (rojo)
      if (elapsedTime > 240000) {
        urgentPassengers++;
      }
      // Más de 3 minutos (180000ms) - Estado de advertencia (naranja)
      else if (elapsedTime > 180000) {
        warningPassengers++;
      }
    });
    
    // Determinar el color basado en la proporción de pasajeros urgentes y de advertencia
    if (urgentPassengers > 0) {
      // Si hay pasajeros urgentes, usar un degradado de rojo según la cantidad
      const intensity = Math.min(100, 50 + (urgentPassengers / waitingPassengers.length) * 50);
      return `bg-red-${Math.round(intensity / 10) * 100}`;
    } else if (warningPassengers > 0) {
      // Si hay pasajeros en advertencia, usar un degradado de naranja según la cantidad
      const intensity = Math.min(100, 50 + (warningPassengers / waitingPassengers.length) * 50);
      return `bg-orange-${Math.round(intensity / 10) * 100}`;
    } else {
      // Si todos los pasajeros están en buen estado, usar un degradado de verde según la cantidad
      const intensity = Math.min(100, 50 + (waitingPassengers.length / 5) * 50); // Máximo 5 pasajeros para intensidad máxima
      return `bg-green-${Math.round(intensity / 10) * 100}`;
    }
  };
  
  // Obtener el color de la estación
  const stationColor = getStationColor();
  
  // Determinar el tamaño de la estación basado en la cantidad de pasajeros
  const stationSize = 12 + Math.min(6, waitingPassengers.length * 1.5); // Aumentar tamaño según pasajeros, máximo +6px
  
  // Create a custom icon for stations
  const stationIcon = L.divIcon({
    html: `
      <div class="${stationColor} border border-black rounded-full w-full h-full flex items-center justify-center shadow-md">
        ${waitingPassengers.length > 0 ? `<span class="text-[8px] text-white font-bold">${waitingPassengers.length}</span>` : ''}
      </div>
    `,
    className: 'station-marker',
    iconSize: [stationSize, stationSize],
    iconAnchor: [stationSize/2, stationSize/2],
  });

  // Calcular tiempo restante para el pasajero más próximo a expirar
  const calculateTimeLeft = () => {
    if (waitingPassengers.length === 0) return null;
    
    const currentTime = Date.now();
    let minTimeLeft = Infinity;
    
    waitingPassengers.forEach(passenger => {
      const expirationTime = passenger.createdAt + 300000; // 5 minutos (300000ms)
      const timeLeft = Math.max(0, expirationTime - currentTime);
      if (timeLeft < minTimeLeft) {
        minTimeLeft = timeLeft;
      }
    });
    
    return minTimeLeft === Infinity ? null : Math.ceil(minTimeLeft / 1000);
  };
  
  const timeLeft = calculateTimeLeft();
  
  return (
    <Marker 
      position={position} 
      icon={stationIcon}
      eventHandlers={{
        click: () => onClick(station)
      }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={1} permanent={false}>
        <div className="text-xs">
          <div className="font-medium">{station.name}</div>
          
          {/* Información de pasajeros */}
          {waitingPassengers.length > 0 && (
            <div className="mt-1 text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-green-600 font-medium">{waitingPassengers.length} pasajero{waitingPassengers.length !== 1 ? 's' : ''}</span>
                {timeLeft !== null && (
                  <span className={`font-medium ${timeLeft < 60 ? 'text-red-500' : timeLeft < 120 ? 'text-orange-500' : 'text-green-500'}`}>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
              {waitingPassengers.map(passenger => (
                <div key={passenger.id} className="text-[9px] text-gray-500 truncate">
                  → {passenger.destination.name}
                </div>
              )).slice(0, 3)}
              {waitingPassengers.length > 3 && (
                <div className="text-[9px] text-gray-500">+ {waitingPassengers.length - 3} más...</div>
              )}
            </div>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
};

export default StationMarker;
