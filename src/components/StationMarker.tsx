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
  isPersonalStation?: boolean; // Nueva propiedad para identificar la estación personal
}

const StationMarker: React.FC<StationMarkerProps> = ({ position, station, onClick, waitingPassengers = [], isPersonalStation = false }) => {
  // Usar useEffect para la depuración
  useEffect(() => {
    if (isPersonalStation) {
      console.log(`ESTACIÓN PERSONAL DETECTADA: ${station.name} (ID: ${station.id})`);
    }
  }, [isPersonalStation, station.id, station.name]);
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
    // La estación personal siempre se maneja directamente en el HTML con estilo inline
    // para asegurar que siempre sea dorada
    if (isPersonalStation) {
      return '';
    }

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

  // Determinar el tamaño de la estación - Estación personal mucho más grande
  const stationSize = isPersonalStation 
    ? 22 // Estación personal significativamente más grande
    : 12 + Math.min(6, waitingPassengers.length * 1.5); // Estaciones normales

  // Crear un icono personalizado para la estación
  let stationIcon;
  
  // Forzar estilo para estación personal (siempre dorada)
  if (isPersonalStation) {
    console.log(`Creando icono para estación personal: ${station.name}`);
    stationIcon = L.divIcon({
      html: `
        <div style="
          background-color: #D4AF37 !important; 
          border: 4px solid black;
          border-radius: 50%;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 3px white, 0 0 10px rgba(0,0,0,0.8);
        ">
          ${waitingPassengers.length > 0 ? `<span style="font-size: 10px; color: black; font-weight: bold;">${waitingPassengers.length}</span>` : ''}
        </div>
      `,
      className: 'personal-station-marker',
      iconSize: [25, 25], // Tamaño fijo más grande para la estación personal
      iconAnchor: [12.5, 12.5],
    });
  } else {
    // Estación normal
    stationIcon = L.divIcon({
      html: `
        <div class="${stationColor}" style="
          border: 1px solid black;
          border-radius: 50%;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 5px rgba(0,0,0,0.3);
        ">
          ${waitingPassengers.length > 0 ? `<span style="font-size: 8px; color: white; font-weight: bold;">${waitingPassengers.length}</span>` : ''}
        </div>
      `,
      className: 'station-marker',
      iconSize: [stationSize, stationSize],
      iconAnchor: [stationSize/2, stationSize/2],
    });
  }

  // Ya no calculamos el tiempo restante para evitar la cuenta atrás innecesaria
  
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
