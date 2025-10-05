import React from 'react';
import { Passenger } from './PassengerSystem';

interface PassengerInfoProps {
  money: number;
  points: number;
  activePassengers: Passenger[];
  pickedUpPassengers: Passenger[];
}

const PassengerInfo: React.FC<PassengerInfoProps> = ({
  money,
  points,
  activePassengers,
  pickedUpPassengers
}) => {
  return (
    <div className="flex items-center gap-3 w-full">
      <div className="flex items-center gap-1">
        <div className="bg-green-600 text-white px-2 py-1 rounded-md shadow-sm text-xs font-medium">
          €{money}
        </div>
        <span className="text-[10px] text-muted-foreground">Dinero</span>
      </div>
      
      <div className="flex items-center gap-1">
        <div className="bg-blue-600 text-white px-2 py-1 rounded-md shadow-sm text-xs font-medium">
          {points}
        </div>
        <span className="text-[10px] text-muted-foreground">Puntos</span>
      </div>
      
      <div className="flex items-center gap-1">
        <div className="bg-gray-700 text-white px-2 py-1 rounded-md shadow-sm text-xs font-medium">
          {pickedUpPassengers.length}/{activePassengers.length + pickedUpPassengers.length}
        </div>
        <span className="text-[10px] text-muted-foreground">Pasajeros</span>
      </div>
    </div>
  );
};

export default PassengerInfo;
