
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
            // Forzar actualización
            onClick(station);
          }
        } catch (error) {
          console.error('Error al obtener nombre de calle:', error);
        }
      };
      
      // Ejecutar inmediatamente
      fetchStreetName();
    }
  }, [station]);
  
  // Create a custom icon for stations
  const stationIcon = L.divIcon({
    html: `
      <div class="bg-red-500 border border-black rounded-full w-3 h-3"></div>
    `,
    className: 'station-marker',
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });

  // Calcular tiempo restante para el pasajero más próximo a expirar
  const calculateTimeLeft = () => {
    if (waitingPassengers.length === 0) return null;
    
    const currentTime = Date.now();
    let minTimeLeft = Infinity;
    
    waitingPassengers.forEach(passenger => {
      const expirationTime = passenger.createdAt + 90000; // 90 segundos
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
                  <span className="text-orange-500 font-medium">{timeLeft}s</span>
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
