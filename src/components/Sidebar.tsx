import React, { useMemo } from 'react';
import { useGame } from '@/contexts/GameContext';
import { Button } from './ui/button';

const Sidebar: React.FC = () => {
  const { 
    desires, 
    trainPassengers, 
    passengers, 
    money, 
    upgradeSpeed, 
    addNewStation 
  } = useGame();

  // Memoizar el contenido para evitar renderizados innecesarios
  const desiresContent = useMemo(() => {
    return desires.map(desire => (
      <div key={desire.id} className="mb-2 p-2 bg-slate-800 rounded-md">
        <p className="text-sm">{desire.description}</p>
        <div className="flex justify-between items-center mt-1">
          <span className="text-xs text-amber-400">
            {desire.passengersDelivered}/{desire.passengersRequired} pasajeros
          </span>
          <span className="text-xs text-red-400">
            {Math.floor(desire.timeRemaining / 60)}:
            {(desire.timeRemaining % 60).toString().padStart(2, '0')}
          </span>
        </div>
      </div>
    ));
  }, [desires]);

  // Memoizar la lista de pasajeros en el tren
  const trainPassengersContent = useMemo(() => {
    return trainPassengers.map(passenger => (
      <div key={passenger.id} className="mb-2 p-2 bg-slate-700 rounded-md">
        <p className="text-xs font-medium">
          {passenger.origin.name} → {passenger.destination.name}
        </p>
        <p className="text-xs text-slate-300">{passenger.motive}</p>
      </div>
    ));
  }, [trainPassengers]);

  // Memoizar el conteo de pasajeros por estación
  const stationPassengersContent = useMemo(() => {
    const stationCounts: Record<string, number> = {};
    
    passengers.forEach(passenger => {
      const stationId = passenger.origin.id;
      stationCounts[stationId] = (stationCounts[stationId] || 0) + 1;
    });
    
    return Object.entries(stationCounts).map(([stationId, count]) => {
      const station = passengers.find(p => p.origin.id === stationId)?.origin;
      if (!station) return null;
      
      return (
        <div key={stationId} className="flex justify-between text-xs mb-1">
          <span>{station.name}:</span>
          <span className="font-medium">{count} pasajeros</span>
        </div>
      );
    });
  }, [passengers]);

  return (
    <div className="w-[280px] h-full bg-slate-900 text-white p-4 overflow-y-auto flex flex-col">
      <h2 className="text-lg font-bold mb-4">Panel de Control</h2>
      
      {/* Sección de Mejoras */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-2 border-b border-slate-700 pb-1">Mejoras</h3>
        <div className="space-y-2">
          <Button 
            onClick={addNewStation} 
            disabled={money < 500}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            variant="default"
            size="sm"
          >
            Añadir Estación (500 €)
          </Button>
          
          <Button 
            onClick={upgradeSpeed} 
            disabled={money < 1000}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            variant="default"
            size="sm"
          >
            Mejorar Velocidad (1000 €)
          </Button>
        </div>
      </div>
      
      {/* Sección de Deseos del Barrio */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-2 border-b border-slate-700 pb-1">
          Deseos del Barrio
        </h3>
        {desires.length > 0 ? (
          <div className="space-y-2">{desiresContent}</div>
        ) : (
          <p className="text-sm text-slate-400">No hay deseos activos</p>
        )}
      </div>
      
      {/* Sección de Pasajeros en el Tren */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-2 border-b border-slate-700 pb-1">
          Pasajeros en el Tren
        </h3>
        {trainPassengers.length > 0 ? (
          <div className="space-y-2">{trainPassengersContent}</div>
        ) : (
          <p className="text-sm text-slate-400">No hay pasajeros en el tren</p>
        )}
      </div>
      
      {/* Sección de Pasajeros por Estación */}
      <div className="mb-6">
        <h3 className="text-md font-semibold mb-2 border-b border-slate-700 pb-1">
          Pasajeros por Estación
        </h3>
        {passengers.length > 0 ? (
          <div className="space-y-1">{stationPassengersContent}</div>
        ) : (
          <p className="text-sm text-slate-400">No hay pasajeros esperando</p>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
