import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Ticket } from 'lucide-react';

interface PassengerNotificationProps {
  type: 'pickup' | 'dropoff';
  count: number;
  isVisible: boolean;
  onAnimationComplete: () => void;
}

const PassengerNotification: React.FC<PassengerNotificationProps> = ({
  type,
  count,
  isVisible,
  onAnimationComplete
}) => {
  const isPickup = type === 'pickup';
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          onAnimationComplete={() => {
            if (!isVisible) {
              onAnimationComplete();
            }
          }}
          className={`fixed top-1/4 left-1/2 transform -translate-x-1/2 z-[2000] px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
            isPickup ? 'bg-green-500' : 'bg-red-500'
          } text-white font-medium`}
        >
          {isPickup ? (
            <>
              <Users size={24} />
              <span>+{count} pasajero{count !== 1 ? 's' : ''} subido{count !== 1 ? 's' : ''}</span>
            </>
          ) : (
            <>
              <Ticket size={24} />
              <span>-{count} pasajero{count !== 1 ? 's' : ''} bajado{count !== 1 ? 's' : ''}</span>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PassengerNotification;
