import React, { useEffect, useRef, useState } from 'react';
import { Coordinates } from '@/lib/mapUtils';
import { useMap } from 'react-leaflet';
import L from 'leaflet';

// Interfaces
export interface Station {
  id: string;
  name: string;
  position: Coordinates;
  trackId: string;
  color?: string;
  canGenerate?: boolean;
}

export interface Passenger {
  id: string;
  origin: Station;
  destination: Station;
  position: Coordinates;
  createdAt: number;
  isPickedUp: boolean;
  offsetX: number;
  offsetY: number;
  animationOffset: number;
}

interface PassengerSystemProps {
  stations: Station[];
  trainPosition: Coordinates;
  isTrainMoving: boolean;
  onPassengerPickup: (passenger: Passenger) => void;
  onPassengerDelivery: (passenger: Passenger) => void;
  onPassengerExpired: (passenger: Passenger) => void;
  pickedUpPassengers: Passenger[];
  difficulty: 'easy' | 'medium' | 'hard';
  currentLevel?: {
    id: number; // ID del nivel (usaremos esto como nivel del jugador)
    name: string;
    passengerFrequency: number; // En segundos
    maxPassengers: number;
    trainCapacity?: number;
  };
  trainCapacity?: number;
  gameStarted: boolean; // Añadir propiedad para controlar si el juego ha comenzado
  canGeneratePassengers: boolean; // Añadir propiedad para controlar si se pueden generar pasajeros
}

const PassengerSystem: React.FC<PassengerSystemProps> = ({
  stations,
  trainPosition,
  isTrainMoving,
  onPassengerPickup,
  onPassengerDelivery,
  onPassengerExpired,
  pickedUpPassengers,
  difficulty,
  currentLevel,
  trainCapacity = 20, // Capacidad por defecto si no se especifica
  gameStarted = false, // Valor por defecto
  canGeneratePassengers = false // Valor por defecto
}) => {
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const map = useMap();
  const animationFrameRef = useRef<number | null>(null);
  
  // Initialize stations with canGenerate property if not already set
  useEffect(() => {
    stations.forEach(station => {
      if (station.canGenerate === undefined) {
        station.canGenerate = Math.random() > 0.5;
      }
    });
  }, [stations]);

  // Configuración basada en la dificultad
  const difficultySettings = {
    easy: {
      maxPassengersPerStation: 5,
      generationInterval: 90000, // 90 segundos (1.5 minutos)
      expirationTime: 360000,    // 6 minutos
      stationProbability: 0.55,  // 55% de estaciones generan pasajeros
      pickupRadius: 5           // Radio de recogida más grande
    },
    medium: {
      maxPassengersPerStation: 10,
      generationInterval: 60000, // 60 segundos (1 minuto)
      expirationTime: 300000,    // 5 minutos
      stationProbability: 0.25,   // 25% de estaciones generan pasajeros
      pickupRadius: 4           // Radio de recogida estándar
    },
    hard: {
      maxPassengersPerStation: 15,
      generationInterval: 45000, // 45 segundos
      expirationTime: 270000,    // 4.5 minutos
      stationProbability: 0.15,   // 15% de estaciones generan pasajeros
      pickupRadius: 2           // Radio de recogida más pequeño
    }
  };
  
  // Obtener configuración base según dificultad
  const baseSettings = difficultySettings[difficulty];
  
  // Calcular un factor de ajuste basado en el nivel del jugador (1-10)
  // Nivel 1: factor 1.0 (más lento), Nivel 10: factor 0.5 (más rápido)
  const playerLevel = currentLevel?.id || 1;
  const levelFactor = Math.max(0.5, 1.0 - (playerLevel - 1) * 0.05);
  
  // Si hay un nivel actual, ajustar la configuración según sus parámetros
  const currentSettings = {
    ...baseSettings,
    // Ajustar el intervalo de generación según el nivel del jugador
    generationInterval: currentLevel?.passengerFrequency ? 
      currentLevel.passengerFrequency * 10000 : // Convertir segundos a milisegundos
      Math.round(baseSettings.generationInterval * levelFactor),
    // Ajustar la probabilidad de generación según el nivel
    stationProbability: Math.min(0.5, baseSettings.stationProbability + ((playerLevel - 1) * 0.03)),
    // Usar el máximo de pasajeros del nivel si está disponible
    maxTotalPassengers: currentLevel?.maxPassengers || 
      (difficulty === 'easy' ? 8 + playerLevel : difficulty === 'medium' ? 16 + playerLevel : 12 + playerLevel)
  }
  
  // Generate passengers based on difficulty and level settings
  useEffect(() => {
    // Si el juego no ha comenzado o no se pueden generar pasajeros, no hacer nada
    if (!gameStarted || !canGeneratePassengers) {
      return;
    }
    
    // Reinicializar las estaciones que pueden generar pasajeros según dificultad
    stations.forEach(station => {
      station.canGenerate = Math.random() < currentSettings.stationProbability;
    });
    
    const generatePassengers = () => {
      // Si el juego no ha comenzado o no se pueden generar pasajeros, no generar
      if (!gameStarted || !canGeneratePassengers) {
        return;
      }
      
      // Si hay demasiados pasajeros activos, no generar más
      // Usar el máximo de pasajeros del nivel o la configuración base
      const maxTotalPassengers = currentSettings.maxTotalPassengers;
      
      if (passengers.length >= maxTotalPassengers) {
        console.log(`Límite de pasajeros alcanzado (${passengers.length}/${maxTotalPassengers}). No se generarán más hasta que se recojan algunos.`);
        return;
      }
      
      const newPassengers: Passenger[] = [];
      
      // Seleccionar solo algunas estaciones para generar pasajeros (más realista)
      const stationsToGenerate = stations.filter(station => {
        if (!station.canGenerate) return false;
        // Solo generar en algunas estaciones cada vez (20% de probabilidad)
        return Math.random() < 0.2;
      });
      
      stationsToGenerate.forEach(station => {
        // Generar pasajeros según dificultad
        const passengerCount = Math.floor(Math.random() * currentSettings.maxPassengersPerStation) + 1;
        
        for (let i = 0; i < passengerCount; i++) {
          // Encontrar una estación de destino diferente al origen
          const availableDestinations = stations.filter(s => s.id !== station.id);
          if (availableDestinations.length === 0) continue;
          
          const destination = availableDestinations[Math.floor(Math.random() * availableDestinations.length)];
          
          // Crear offset aleatorio dentro de un radio de 5px
          const offsetX = (Math.random() * 10 - 5);
          const offsetY = (Math.random() * 10 - 5);
          const animationOffset = Math.random() * Math.PI * 2; // Punto de inicio aleatorio para la animación
          
          // Crear pasajero con posición desplazada
          const passenger: Passenger = {
            id: `passenger-${station.id}-${Date.now()}-${i}`,
            origin: station,
            destination,
            position: {
              lat: station.position.lat,
              lng: station.position.lng
            },
            createdAt: Date.now(),
            isPickedUp: false,
            offsetX,
            offsetY,
            animationOffset
          };
          
          newPassengers.push(passenger);
        }
      });
      
      setPassengers(prev => [...prev, ...newPassengers]);
    };
    
    // NO generar pasajeros iniciales automáticamente
    // Solo configurar el intervalo para generarlos periódicamente
    const intervalId = setInterval(generatePassengers, currentSettings.generationInterval);
    
    // Actualizar la posición de los pasajeros cada 100ms para animación fluida
    const updateInterval = setInterval(() => {
      setPassengers(prev => prev.map(passenger => {
        if (passenger.isPickedUp) return passenger;
        
        // Actualizar posición con un pequeño movimiento aleatorio
        const time = Date.now() * 0.001;
        const animX = Math.sin(time + passenger.animationOffset) * 2;
        const animY = Math.cos(time + passenger.animationOffset) * 2;
        
        return {
          ...passenger,
          position: {
            lat: passenger.origin.position.lat + (passenger.offsetX + animX) * 0.00001,
            lng: passenger.origin.position.lng + (passenger.offsetY + animY) * 0.00001
          }
        };
      }));
    }, 100);
    
    return () => {
      clearInterval(intervalId);
      clearInterval(updateInterval);
    };
  }, [stations, difficulty, currentSettings, gameStarted, canGeneratePassengers]);

  // Handle passenger pickup, delivery, and expiration
  useEffect(() => {
    // Referencia a los valores actuales para evitar dependencias circulares
    const trainPos = trainPosition;
    const isMoving = isTrainMoving;
    const pickupFn = onPassengerPickup;
    const deliveryFn = onPassengerDelivery;
    const expiredFn = onPassengerExpired;
    const settings = {...currentSettings};
    
    // Usamos una variable de referencia para evitar actualizaciones en cascada
    const passengerInteractionRef = useRef(false);
    // Referencia para la última posición del tren
    const lastPositionRef = useRef(trainPos);
    
    const checkPassengerInteractions = () => {
      // Si ya estamos procesando interacciones, salir para evitar bucles
      if (passengerInteractionRef.current) return;
      passengerInteractionRef.current = true;
      
      // Si el tren no está en movimiento, no procesar interacciones de pasajeros
      if (!isMoving) {
        setTimeout(() => {
          passengerInteractionRef.current = false;
        }, 50);
        return;
      }
      
      const currentTime = Date.now();
      let hasChanges = false;
      
      setPassengers(prevPassengers => {
        const updatedPassengers = prevPassengers.filter(passenger => {
          // Skip already picked up passengers
          if (passenger.isPickedUp) {
            // Check if train is at passenger's destination
            const destinationPos = passenger.destination.position;
            const distance = calculateDistance(
              trainPos.lat, 
              trainPos.lng, 
              destinationPos.lat, 
              destinationPos.lng
            );
            
            // Radio de entrega aumentado para mayor fiabilidad
            const deliveryRadius = settings.pickupRadius * 1.00;
            
            if (distance <= deliveryRadius && isMoving) {
              // Passenger delivered - solo si el tren está en movimiento
              deliveryFn(passenger);
              hasChanges = true;
              return false; // Remove from array
            }
            
            return true; // Keep in array
          }
          
          // Check if passenger has expired (tiempo según dificultad)
          // Solo notificar expiración si el tren está en movimiento
          if (currentTime - passenger.createdAt > settings.expirationTime && isMoving) {
            expiredFn(passenger);
            hasChanges = true;
            return false; // Remove from array
          } else if (currentTime - passenger.createdAt > settings.expirationTime) {
            // Si el tren no está en movimiento, eliminar silenciosamente
            return false;
          }
          
          // Check if train is close enough to pick up passenger
          const distance = calculateDistance(
            trainPos.lat, 
            trainPos.lng, 
            passenger.position.lat, 
            passenger.position.lng
          );
          
          // Radio de recogida aumentado para mayor fiabilidad
          const enhancedPickupRadius = settings.pickupRadius * 1.00; // Duplicado para asegurar la recogida
          
          if (distance <= enhancedPickupRadius && isMoving) {
            // Solo recoger pasajeros si el tren está en movimiento
            // Verificar si hay espacio en el tren para recoger pasajeros
            const currentPickedUpCount = pickedUpPassengers.length;
            
            // Imprimir información de depuración
            console.log(`Pasajero cerca: Distancia=${distance.toFixed(2)}, Radio=${enhancedPickupRadius.toFixed(2)}`);
            console.log(`Capacidad del tren: ${currentPickedUpCount}/${trainCapacity}`);
            
            if (currentPickedUpCount >= trainCapacity) {
              // No hacer nada si el tren está lleno
              console.log(`Tren lleno (${currentPickedUpCount}/${trainCapacity}), no se pueden recoger más pasajeros`);
            } else {
              // Hay espacio, recoger al pasajero
              console.log(`Recogiendo pasajero en posición (${passenger.position.lat.toFixed(4)}, ${passenger.position.lng.toFixed(4)})`);
              pickupFn(passenger);
              passenger.isPickedUp = true;
              hasChanges = true;
            }
          }
          
          return true; // Keep in array
        });
        
        // Liberar el bloqueo después de procesar
        setTimeout(() => {
          passengerInteractionRef.current = false;
        }, 50); // Reducido para permitir verificaciones más frecuentes
        
        // Solo actualizar si hay cambios
        return hasChanges ? updatedPassengers : prevPassengers;
      });
    };
    
    // Verificar interacciones aún más frecuentemente (100ms en lugar de 200ms)
    const interactionInterval = setInterval(() => {
      checkPassengerInteractions();
    }, 100);
    
    // Verificar cuando cambia la posición del tren
    if (trainPos && 
        (lastPositionRef.current.lat !== trainPos.lat || 
         lastPositionRef.current.lng !== trainPos.lng)) {
      lastPositionRef.current = trainPos;
      setTimeout(checkPassengerInteractions, 10);
    }
    
    return () => clearInterval(interactionInterval);
  }, [trainPosition]);  // Añadimos trainPosition como dependencia para detectar cambios

  // Render passengers on canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size to match map container
    const mapContainer = map.getContainer();
    canvas.width = mapContainer.clientWidth;
    canvas.height = mapContainer.clientHeight;
    
    const drawPassengers = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw passengers
      passengers.forEach(passenger => {
        if (passenger.isPickedUp) return; // Don't draw picked up passengers
        
        // Convert lat/lng to pixel coordinates
        const latLng = L.latLng(passenger.position.lat, passenger.position.lng);
        const point = map.latLngToContainerPoint(latLng);
        
        // Apply animated offset (small movement in a circle)
        const time = Date.now() * 0.001; // Convert to seconds for smoother animation
        const animX = Math.sin(time + passenger.animationOffset) * 2;
        const animY = Math.cos(time + passenger.animationOffset) * 2;
        
        // Draw passenger (green dot, más pequeño para que se vean mejor los números)
        ctx.beginPath();
        ctx.arc(
          point.x + passenger.offsetX + animX, 
          point.y + passenger.offsetY + animY, 
          3, // 3px radius (reducido de 4px)
          0, 
          Math.PI * 2
        );
        ctx.fillStyle = '#22c55e'; // Green color
        ctx.fill();
        ctx.strokeStyle = '#166534'; // Darker green border
        ctx.lineWidth = 0.8;
        ctx.stroke();
      });
      
      // Request next animation frame
      animationFrameRef.current = requestAnimationFrame(drawPassengers);
    };
    
    // Start animation
    drawPassengers();
    
    // Clean up
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [map, passengers, trainPosition]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 pointer-events-none z-[1000]"
    />
  );
};

// Helper function to calculate distance between two points in pixels
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  // Simple Euclidean distance calculation
  // This is an approximation that works for small distances
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c * 1000; // Convert to meters
  
  return distance;
}

export default PassengerSystem;
