import React from 'react';
import { Passenger } from './PassengerSystem';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface TrainSeatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pickedUpPassengers: Passenger[];
  trainCapacity: number;
}

const TrainSeatsModal: React.FC<TrainSeatsModalProps> = ({
  isOpen,
  onClose,
  pickedUpPassengers,
  trainCapacity
}) => {
  // Calcular asientos ocupados y libres
  const occupiedSeats = pickedUpPassengers.length;
  const freeSeats = trainCapacity - occupiedSeats;
  
  // Crear array de asientos para visualización
  const totalSeats = trainCapacity;
  const leftSeats = Math.ceil(totalSeats / 2);
  const rightSeats = totalSeats - leftSeats;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay con efecto de desenfoque */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[1999]"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.3 }}
            className="fixed top-[70px] left-0 right-0 z-[2000] mx-auto max-w-md bg-white rounded-lg shadow-lg overflow-hidden"
          >
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Estado del Tren</h2>
              <button 
                onClick={onClose}
                className="p-1 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm">
                <span className="font-medium">Ocupación:</span> {occupiedSeats}/{trainCapacity} pasajeros
              </div>
              <div className="bg-gray-200 h-2 w-32 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full"
                  style={{ width: `${(occupiedSeats / trainCapacity) * 100}%` }}
                />
              </div>
            </div>
            
            {/* Visualización del tren */}
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              {/* Exterior del tren */}
              <div className="bg-blue-500 rounded-lg p-2 mb-2">
                <div className="bg-blue-600 h-4 rounded-t-lg" />
              </div>
              
              {/* Interior del tren con asientos */}
              <div className="bg-gray-200 rounded-lg p-3 relative">
                {/* Pasillo central */}
                <div className="absolute top-3 bottom-3 left-1/2 transform -translate-x-1/2 w-2 bg-gray-300 rounded" />
                
                {/* Ventanillas */}
                <div className="flex justify-between mb-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`window-${i}`} className="w-10 h-2 bg-blue-300 rounded" />
                  ))}
                </div>
                
                {/* Filas de asientos */}
                <div className="flex justify-between">
                  {/* Asientos izquierda */}
                  <div className="w-[45%]">
                    {Array.from({ length: leftSeats }).map((_, i) => {
                      const isOccupied = i < occupiedSeats;
                      return (
                        <div 
                          key={`seat-left-${i}`} 
                          className={`mb-2 h-10 rounded-lg flex items-center justify-center ${
                            isOccupied ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                          }`}
                        >
                          <span className="text-xs font-medium">
                            {isOccupied ? 'Ocupado' : 'Libre'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Asientos derecha */}
                  <div className="w-[45%]">
                    {Array.from({ length: rightSeats }).map((_, i) => {
                      const isOccupied = i + leftSeats < occupiedSeats;
                      return (
                        <div 
                          key={`seat-right-${i}`} 
                          className={`mb-2 h-10 rounded-lg flex items-center justify-center ${
                            isOccupied ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
                          }`}
                        >
                          <span className="text-xs font-medium">
                            {isOccupied ? 'Ocupado' : 'Libre'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Ventanillas inferiores */}
                <div className="flex justify-between mt-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={`window-bottom-${i}`} className="w-10 h-2 bg-blue-300 rounded" />
                  ))}
                </div>
              </div>
              
              {/* Información de pasajeros */}
              {pickedUpPassengers.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2">Pasajeros a bordo:</h3>
                  <div className="max-h-40 overflow-y-auto">
                    {pickedUpPassengers.map((passenger, index) => (
                      <div key={passenger.id} className="bg-white p-2 rounded mb-2 text-sm">
                        <div className="font-medium">Pasajero {index + 1}</div>
                        <div className="text-xs text-gray-600">
                          Origen: {passenger.origin.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          Destino: {passenger.destination.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button 
                onClick={onClose}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TrainSeatsModal;
