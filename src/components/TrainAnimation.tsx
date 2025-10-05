import React from 'react';
import './TrainAnimation.css';

const TrainAnimation: React.FC = () => {
  return (
    <div className="train-container">
      {/* Locomotora */}
      <div className="locomotive">
        <div className="locomotive-body">
          <div className="locomotive-cabin">
            <div className="locomotive-window"></div>
            <div className="locomotive-face">
              <div className="locomotive-eye left"></div>
              <div className="locomotive-eye right"></div>
              <div className="locomotive-mouth"></div>
            </div>
          </div>
          <div className="locomotive-chimney"></div>
          <div className="locomotive-front"></div>
        </div>
        <div className="locomotive-wheels">
          <div className="wheel front"></div>
          <div className="wheel middle"></div>
          <div className="wheel back"></div>
        </div>
      </div>
      
      {/* Vagones */}
      <div className="wagon green">
        <div className="wagon-body">
          <div className="wagon-window"></div>
        </div>
        <div className="wagon-wheels">
          <div className="wheel"></div>
          <div className="wheel"></div>
        </div>
      </div>
      
      <div className="wagon yellow">
        <div className="wagon-body">
          <div className="wagon-window"></div>
        </div>
        <div className="wagon-wheels">
          <div className="wheel"></div>
          <div className="wheel"></div>
        </div>
      </div>
    </div>
  );
};

export default TrainAnimation;
