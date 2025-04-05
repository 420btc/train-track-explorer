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
}

const PassengerSystem: React.FC<PassengerSystemProps> = ({
  stations,
  trainPosition,
  isTrainMoving,
  onPassengerPickup,
  onPassengerDelivery,
  onPassengerExpired,
  pickedUpPassengers
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

  // Generate passengers every 30 seconds
  useEffect(() => {
    const generatePassengers = () => {
      const newPassengers: Passenger[] = [];
      
      stations.forEach(station => {
        if (station.canGenerate) {
          // Generate between 1 and 6 passengers per station
          const passengerCount = Math.floor(Math.random() * 6) + 1;
          
          for (let i = 0; i < passengerCount; i++) {
            // Find a random destination station different from origin
            const availableDestinations = stations.filter(s => s.id !== station.id);
            if (availableDestinations.length === 0) continue;
            
            const destination = availableDestinations[Math.floor(Math.random() * availableDestinations.length)];
            
            // Create random offset within 5px radius
            const offsetX = (Math.random() * 10 - 5);
            const offsetY = (Math.random() * 10 - 5);
            const animationOffset = Math.random() * Math.PI * 2; // Random starting point for animation
            
            // Create passenger with offset position
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
        }
      });
      
      setPassengers(prev => [...prev, ...newPassengers]);
    };
    
    // Generate initial passengers
    generatePassengers();
    
    // Set up interval for generating passengers
    const intervalId = setInterval(generatePassengers, 30000);
    
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
  }, [stations]);

  // Handle passenger pickup, delivery, and expiration
  useEffect(() => {
    const checkPassengerInteractions = () => {
      const currentTime = Date.now();
      
      setPassengers(prevPassengers => {
        return prevPassengers.filter(passenger => {
          // Skip already picked up passengers
          if (passenger.isPickedUp) {
            // Check if train is at passenger's destination
            const destinationPos = passenger.destination.position;
            const distance = calculateDistance(
              trainPosition.lat, 
              trainPosition.lng, 
              destinationPos.lat, 
              destinationPos.lng
            );
            
            if (distance <= 10) {
              // Passenger delivered
              onPassengerDelivery(passenger);
              return false; // Remove from array
            }
            
            return true; // Keep in array
          }
          
          // Check if passenger has expired (90 seconds)
          if (currentTime - passenger.createdAt > 90000) {
            onPassengerExpired(passenger);
            return false; // Remove from array
          }
          
          // Check if train is close enough to pick up passenger
          const distance = calculateDistance(
            trainPosition.lat, 
            trainPosition.lng, 
            passenger.position.lat, 
            passenger.position.lng
          );
          
          if (distance <= 10) {
            onPassengerPickup(passenger);
            passenger.isPickedUp = true;
          }
          
          return true; // Keep in array
        });
      });
    };
    
    // Check interactions every 500ms for real-time updates
    const interactionInterval = setInterval(() => {
      if (!isTrainMoving) {
        checkPassengerInteractions();
      }
    }, 500);
    
    // También verificar inmediatamente cuando cambia la posición del tren
    if (!isTrainMoving) {
      checkPassengerInteractions();
    }
    
    return () => clearInterval(interactionInterval);
  }, [trainPosition, isTrainMoving, onPassengerPickup, onPassengerDelivery, onPassengerExpired]);

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
        
        // Draw passenger (green dot, 1/3 the size of stations)
        ctx.beginPath();
        ctx.arc(
          point.x + passenger.offsetX + animX, 
          point.y + passenger.offsetY + animY, 
          4, // 4px radius (stations are 12px)
          0, 
          Math.PI * 2
        );
        ctx.fillStyle = '#22c55e'; // Green color
        ctx.fill();
        ctx.strokeStyle = '#166534'; // Darker green border
        ctx.lineWidth = 1;
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
      className="absolute top-0 left-0 pointer-events-none z-10"
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
