import React from 'react';
import './SimpleTrainAnimation.css';

const SimpleTrainAnimation: React.FC = () => {
  return (
    <div className="simple-train">
      <div className="train-container">
        {/* Resplandor amarillo */}
        <div className="train-glow"></div>
        
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
        
        {/* Vagón */}
        <div>
          <div className="wagon">
            <div className="wagon-window wagon-window-1"></div>
            <div className="wagon-window wagon-window-2"></div>
          </div>
          <div className="wagon-base"></div>
          <div className="train-wheels">
            <div className="wheel"></div>
            <div className="wheel"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleTrainAnimation;
