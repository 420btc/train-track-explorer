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
    <div className="w-full flex flex-col gap-2">
      <div className="grid grid-cols-3 gap-2 w-full">
        <div className="bg-green-600 text-white px-2 py-1 rounded-md shadow-md text-xs font-medium text-center">
          ${money}
        </div>
        <div className="bg-blue-600 text-white px-2 py-1 rounded-md shadow-md text-xs font-medium text-center">
          {points} pts
        </div>
        <div className="bg-gray-700 text-white px-2 py-1 rounded-md shadow-md text-xs font-medium text-center">
          {pickedUpPassengers.length}/{activePassengers.length + pickedUpPassengers.length}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 w-full text-[10px] text-muted-foreground text-center">
        <div>Dinero</div>
        <div>Puntos</div>
        <div>Pasajeros</div>
      </div>
    </div>
  );
};

export default PassengerInfo;
