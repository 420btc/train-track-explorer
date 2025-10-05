import React from 'react';
import ConsoleBanner from './ConsoleBanner';
import { Train } from 'lucide-react';
import SimpleTrainAnimation from './SimpleTrainAnimation';

interface StyledLoadingScreenProps {
  isVisible: boolean;
}

const StyledLoadingScreen: React.FC<StyledLoadingScreenProps> = ({ isVisible }) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 z-50">
      {/* Fondo con gradiente que simula un paisaje español */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#87CEEB] to-[#F0E68C]">
        {/* Sol */}
        <div className="absolute top-[50px] right-[100px] w-[100px] h-[100px] bg-[#FFD700] rounded-full shadow-lg"></div>
        
        {/* Montañas */}
        <div className="absolute bottom-[100px] left-0 right-0">
          <div className="w-[300px] h-[150px] bg-[#8B4513] rounded-[50%] absolute left-[50px] -top-[75px]"></div>
          <div className="w-[400px] h-[200px] bg-[#A0522D] rounded-[50%] absolute left-[250px] -top-[100px]"></div>
          <div className="w-[350px] h-[175px] bg-[#5D9E31] rounded-[50%] absolute right-[100px] -top-[85px]"></div>
        </div>
        
        {/* Atribución superior */}
        <div className="absolute top-4 left-0 right-0 flex justify-center">
          <div className="bg-[#FF5722]/80 text-white px-4 py-1 rounded-full shadow-md backdrop-blur-sm">
            <p className="text-sm font-medium">Made By Carlos Freire in Málaga ❤️</p>
          </div>
        </div>
        
        {/* Vías de tren en la parte inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-[40px] bg-[#333333] flex items-center justify-center">
          {/* Base de las vías */}
          <div className="w-full h-[20px] bg-[#222222] flex items-center">
            {/* Traviesas */}
            <div className="w-full h-[6px] flex justify-center">
              <div className="w-[95%] flex justify-between">
                {Array(50).fill(0).map((_, i) => (
                  <div key={i} className="h-full w-[10px] bg-[#444444]"></div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Rieles */}
          <div className="absolute bottom-[20px] left-0 right-0 h-[4px] flex justify-center">
            <div className="w-[95%] flex justify-between">
              <div className="h-full w-[10px] bg-[#111111]"></div>
              <div className="h-full w-[10px] bg-[#111111]"></div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Vamos a usar directamente el mismo componente de animación del tren que en el menú principal */}
      <div className="absolute bottom-[40px] left-0 w-full overflow-hidden" style={{ height: '40px', zIndex: 30 }}>
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
          <div className="simple-train" style={{ animationDuration: '10s', position: 'absolute', bottom: '0px', display: 'flex', flexDirection: 'row' }}>
            <div className="train-container" style={{ display: 'flex', flexDirection: 'row' }}>
              {/* Locomotora */}
              <div>
                <div className="train-body">
                  <div className="train-cabin"></div>
                  <div className="train-window"></div>
                </div>
                <div className="train-base"></div>
                <div className="train-wheels">
                  <div className="wheel"></div>
                  <div className="wheel"></div>
                  <div className="wheel"></div>
                </div>
              </div>
              
              {/* Vagón 1 */}
              <div>
                <div className="wagon">
                  <div className="wagon-window wagon-window-1"></div>
                  <div className="wagon-window wagon-window-2"></div>
                </div>
                <div className="train-base"></div>
                <div className="train-wheels">
                  <div className="wheel"></div>
                  <div className="wheel"></div>
                </div>
              </div>
              
              {/* Vagón 2 */}
              <div>
                <div className="wagon" style={{ backgroundColor: '#E91E63' }}>
                  <div className="wagon-window wagon-window-1"></div>
                  <div className="wagon-window wagon-window-2"></div>
                </div>
                <div className="train-base"></div>
                <div className="train-wheels">
                  <div className="wheel"></div>
                  <div className="wheel"></div>
                </div>
              </div>
              
              {/* Vagón 3 */}
              <div>
                <div className="wagon" style={{ backgroundColor: '#009688' }}>
                  <div className="wagon-window wagon-window-1"></div>
                  <div className="wagon-window wagon-window-2"></div>
                </div>
                <div className="train-base"></div>
                <div className="train-wheels">
                  <div className="wheel"></div>
                  <div className="wheel"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Contenido central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="w-full max-w-3xl">
          <ConsoleBanner isVisible={true} />
        </div>
      </div>
    </div>
  );
};

export default StyledLoadingScreen;
