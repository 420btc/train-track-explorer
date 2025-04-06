import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, MapPin, Locate } from 'lucide-react';
import { geocodeAddress, DEFAULT_COORDINATES } from '@/lib/mapUtils';
import { toast } from 'sonner';

interface HomeSearchBarProps {
  onLocationSelect: (coordinates: { lat: number; lng: number }) => void;
}

const HomeSearchBar: React.FC<HomeSearchBarProps> = ({ onLocationSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      toast.error('Por favor, introduce una ubicación');
      return;
    }
    
    setIsSearching(true);
    toast.info('Buscando ubicación...');
    
    try {
      // Buscar la dirección y obtener coordenadas
      const coordinates = await geocodeAddress(searchQuery);
      
      // Verificar si son las coordenadas por defecto (Málaga)
      const isMalaga = (
        Math.abs(coordinates.lat - DEFAULT_COORDINATES.lat) < 0.001 && 
        Math.abs(coordinates.lng - DEFAULT_COORDINATES.lng) < 0.001
      );
      
      if (isMalaga) {
        toast.info(`No se encontró "${searchQuery}". Usando Málaga como ubicación predeterminada.`);
      } else {
        toast.success(`Ubicación encontrada: ${searchQuery}`);
      }
      
      // Generar el mapa con las coordenadas
      onLocationSelect(coordinates);
    } catch (error) {
      console.error('Error en la búsqueda:', error);
      toast.error('Error al buscar la ubicación');
      onLocationSelect(DEFAULT_COORDINATES);
    } finally {
      setIsSearching(false);
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Tu navegador no soporta la geolocalización');
      return;
    }
    
    setIsSearching(true);
    toast.info('Obteniendo tu ubicación actual...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        onLocationSelect(coordinates);
        toast.success('Ubicación actual obtenida');
        setIsSearching(false);
      },
      (error) => {
        console.error('Error getting location:', error);
        toast.error('No se pudo obtener tu ubicación. Verifica los permisos de tu navegador.');
        setIsSearching(false);
      }
    );
  };

  const handleDefaultLocation = () => {
    // Usar Málaga como ubicación predeterminada
    onLocationSelect(DEFAULT_COORDINATES);
    toast.success('¡Bienvenido a Málaga!');
  };

  return (
    <div className="w-full max-w-3xl bg-background/90 backdrop-blur-sm p-4 rounded-xl shadow-lg border border-primary/20">
      <h2 className="text-xl font-bold text-center mb-3 text-primary">Elige tu ciudad</h2>
      
      <form onSubmit={handleSearch} className="flex flex-col gap-4">
        <div className="flex gap-2">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Buscar ubicación (ej. Madrid, Barcelona...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/80"
              disabled={isSearching}
            />
          </div>
          <Button 
            type="submit" 
            disabled={isSearching}
            className="bg-[#FF5722] hover:bg-[#E64A19] text-white"
          >
            Buscar
          </Button>
        </div>
        
        <div className="flex gap-2 justify-center">
          <Button 
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={isSearching}
            variant="outline"
            className="flex-1 max-w-[200px]"
          >
            <Locate className="mr-2 h-4 w-4" />
            Mi ubicación
          </Button>
          
          <Button 
            type="button"
            onClick={handleDefaultLocation}
            disabled={isSearching}
            variant="outline"
            className="flex-1 max-w-[200px]"
          >
            <MapPin className="mr-2 h-4 w-4" />
            Málaga
          </Button>
        </div>
      </form>
    </div>
  );
};

export default HomeSearchBar;
