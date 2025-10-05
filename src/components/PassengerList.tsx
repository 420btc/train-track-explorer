import React from 'react';
import { Passenger } from './PassengerSystem';

interface PassengerListProps {
  activePassengers: Passenger[];
  pickedUpPassengers: Passenger[];
}

const PassengerList: React.FC<PassengerListProps> = ({
  activePassengers,
  pickedUpPassengers
}) => {
  // Combine both lists for display, but mark picked up passengers
  const allPassengers = [
    ...pickedUpPassengers.map(p => ({ ...p, status: 'recogido' as const })),
    ...activePassengers.map(p => ({ ...p, status: 'esperando' as const }))
  ];

  return (
    <div className="bg-gray-100 rounded-md p-2 mt-2 max-h-[200px] overflow-y-auto text-xs">
      <h4 className="font-medium mb-1 text-gray-700">Lista de Pasajeros</h4>
      
      {allPassengers.length === 0 ? (
        <p className="text-gray-500 italic">No hay pasajeros activos</p>
      ) : (
        <ul className="space-y-1">
          {allPassengers.map(passenger => (
            <li 
              key={passenger.id} 
              className={`p-1 rounded ${
                passenger.status === 'recogido' 
                  ? 'bg-yellow-100 border-l-2 border-yellow-400' 
                  : 'bg-white border-l-2 border-green-400'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {passenger.origin.name} → {passenger.destination.name}
                </span>
                <span className={`text-xs px-1 rounded ${
                  passenger.status === 'recogido'
                    ? 'bg-yellow-200 text-yellow-800'
                    : 'bg-green-200 text-green-800'
                }`}>
                  {passenger.status === 'recogido' ? 'En tren' : 'Esperando'}
                </span>
              </div>
              <div className="text-gray-500 text-xs">
                {calculateTimeLeft(passenger)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Helper function to calculate and format time left
function calculateTimeLeft(passenger: Passenger & { status: 'recogido' | 'esperando' }): string {
  const currentTime = Date.now();
  const creationTime = passenger.createdAt;
  
  if (passenger.status === 'esperando') {
    // Passengers expire after 90 seconds
    const expirationTime = creationTime + 90000;
    const timeLeft = Math.max(0, expirationTime - currentTime);
    
    if (timeLeft <= 0) return "Expirando...";
    
    return `${Math.ceil(timeLeft / 1000)}s para expirar`;
  } else {
    // Check if eligible for bonus (delivered within 60 seconds)
    const bonusTime = creationTime + 60000;
    const timeLeft = Math.max(0, bonusTime - currentTime);
    
    if (timeLeft <= 0) return "Sin bono de tiempo";
    
    return `${Math.ceil(timeLeft / 1000)}s para bono`;
  }
}

export default PassengerList;
