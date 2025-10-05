import React from 'react';
import './MapFocusEffect.css';

interface MapFocusEffectProps {
  enabled: boolean;
}

const MapFocusEffect: React.FC<MapFocusEffectProps> = ({ enabled }) => {
  if (!enabled) return null;
  
  return (
    <div className="map-blur-overlay">
      <div className="focus-area"></div>
    </div>
  );
};

export default MapFocusEffect;
