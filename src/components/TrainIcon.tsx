import React from 'react';

interface TrainIconProps {
  className?: string;
}

const TrainIcon: React.FC<TrainIconProps> = ({ className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      {/* Locomotora */}
      <div className="relative">
        {/* Cuerpo principal */}
        <div className="w-32 h-20 bg-[#3D85C6] rounded-t-lg relative">
          {/* Ventana frontal */}
          <div className="absolute w-10 h-10 bg-[#CFE2F3] rounded-full top-2 left-2 border-2 border-[#2C5E91]"></div>
          {/* Detalles */}
          <div className="absolute w-4 h-4 bg-[#F1C232] rounded-full top-3 right-4"></div>
          <div className="absolute w-4 h-4 bg-[#F1C232] rounded-full top-12 right-4"></div>
          {/* Chimenea */}
          <div className="absolute w-6 h-8 bg-[#333333] -top-6 left-6 rounded-t-lg"></div>
        </div>
        {/* Base */}
        <div className="w-32 h-6 bg-[#FF9900] -mt-1"></div>
        {/* Ruedas */}
        <div className="flex justify-around -mt-2">
          <div className="w-8 h-8 bg-[#333333] rounded-full border-2 border-[#666666]"></div>
          <div className="w-8 h-8 bg-[#333333] rounded-full border-2 border-[#666666]"></div>
          <div className="w-8 h-8 bg-[#333333] rounded-full border-2 border-[#666666]"></div>
        </div>
      </div>
      
      {/* Vagón */}
      <div className="relative -mt-[78px] ml-32">
        {/* Cuerpo principal */}
        <div className="w-28 h-18 bg-[#6AA84F] rounded-t-sm relative">
          {/* Ventanas */}
          <div className="absolute w-8 h-8 bg-[#D9EAD3] rounded-sm top-2 left-2 border-2 border-[#274E13]"></div>
          <div className="absolute w-8 h-8 bg-[#D9EAD3] rounded-sm top-2 right-2 border-2 border-[#274E13]"></div>
        </div>
        {/* Base */}
        <div className="w-28 h-6 bg-[#FF9900] -mt-1"></div>
        {/* Ruedas */}
        <div className="flex justify-around -mt-2">
          <div className="w-8 h-8 bg-[#333333] rounded-full border-2 border-[#666666]"></div>
          <div className="w-8 h-8 bg-[#333333] rounded-full border-2 border-[#666666]"></div>
        </div>
      </div>
    </div>
  );
};

export default TrainIcon;
