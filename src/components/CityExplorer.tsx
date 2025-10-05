import React from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Coordinates } from '@/lib/mapUtils';

interface CityExplorerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCitySelect: (coordinates: Coordinates) => void;
}

// Lista de ciudades famosas con sus coordenadas
const famousCities = [
  { name: 'Madrid', country: 'España', coordinates: { lat: 40.4168, lng: -3.7038 }, image: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&q=80&w=1000' },
  { name: 'Barcelona', country: 'España', coordinates: { lat: 41.3851, lng: 2.1734 }, image: 'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&q=80&w=1000' },
  { name: 'Valencia', country: 'España', coordinates: { lat: 39.4699, lng: -0.3763 }, image: 'https://images.unsplash.com/photo-1599418839342-2b3efd3b8a0d?auto=format&fit=crop&q=80&w=1000' },
  { name: 'Sevilla', country: 'España', coordinates: { lat: 37.3891, lng: -5.9845 }, image: 'https://images.unsplash.com/photo-1559636423-e43a13580400?auto=format&fit=crop&q=80&w=1000' },
  { name: 'Málaga', country: 'España', coordinates: { lat: 36.7213, lng: -4.4213 }, image: 'https://images.unsplash.com/photo-1591704121554-c46e177acf3c?auto=format&fit=crop&q=80&w=1000' },
  { name: 'París', country: 'Francia', coordinates: { lat: 48.8566, lng: 2.3522 }, image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&q=80&w=1000' },
  { name: 'Londres', country: 'Reino Unido', coordinates: { lat: 51.5074, lng: -0.1278 }, image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&q=80&w=1000' },
  { name: 'Roma', country: 'Italia', coordinates: { lat: 41.9028, lng: 12.4964 }, image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&q=80&w=1000' },
  { name: 'Berlín', country: 'Alemania', coordinates: { lat: 52.5200, lng: 13.4050 }, image: 'https://images.unsplash.com/photo-1599946347371-68eb71b16afc?auto=format&fit=crop&q=80&w=1000' },
  { name: 'Ámsterdam', country: 'Países Bajos', coordinates: { lat: 52.3676, lng: 4.9041 }, image: 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&q=80&w=1000' },
  { name: 'Nueva York', country: 'Estados Unidos', coordinates: { lat: 40.7128, lng: -74.0060 }, image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&q=80&w=1000' },
  { name: 'Tokio', country: 'Japón', coordinates: { lat: 35.6762, lng: 139.6503 }, image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&q=80&w=1000' },
];

const CityExplorer: React.FC<CityExplorerProps> = ({ open, onOpenChange, onCitySelect }) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Explorar Ciudades</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {famousCities.map((city) => (
            <div 
              key={`${city.name}-${city.country}`}
              className="relative group overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer h-48"
              onClick={() => {
                onCitySelect(city.coordinates);
                onOpenChange(false);
              }}
            >
              <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                style={{ backgroundImage: `url(${city.image})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                <h3 className="text-xl font-bold">{city.name}</h3>
                <p className="text-sm opacity-90">{city.country}</p>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CityExplorer;
