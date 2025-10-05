import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Ticket } from 'lucide-react';

interface PassengerNotificationProps {
  type: 'pickup' | 'dropoff';
  count: number;
  isVisible: boolean;
  onAnimationComplete: () => void;
  position?: 'pickup' | 'dropoff'; // Nueva prop para controlar la posición
}

const PassengerNotification: React.FC<PassengerNotificationProps> = ({
  type,
  count,
  isVisible,
  onAnimationComplete,
  position = 'pickup' // Por defecto, usa la misma posición que el tipo
}) => {
  const isPickup = type === 'pickup';
  
  // Calcular posición vertical según el tipo de notificación
  // Las notificaciones de recogida aparecen más arriba que las de entrega
  const positionClass = position === 'pickup' 
    ? 'bottom-32 left-8' // Posición para recogidas
    : 'bottom-16 left-8'; // Posición para entregas
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.4, type: "spring", stiffness: 200 }}
          onAnimationComplete={() => {
            if (!isVisible) {
              onAnimationComplete();
            }
          }}
          className={`fixed ${positionClass} z-[2000] px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 ${
            isPickup ? 'bg-green-600' : 'bg-blue-600'
          } text-white font-medium max-w-[250px]`}
        >
          {isPickup ? (
            <>
              <Users size={20} className="flex-shrink-0" />
              <span className="text-sm">+{count} pasajero{count !== 1 ? 's' : ''} subido{count !== 1 ? 's' : ''}</span>
            </>
          ) : (
            <>
              <Ticket size={20} className="flex-shrink-0" />
              <span className="text-sm">-{count} pasajero{count !== 1 ? 's' : ''} bajado{count !== 1 ? 's' : ''}</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PassengerNotification;
