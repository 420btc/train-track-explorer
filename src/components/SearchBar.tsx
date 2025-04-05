
import React, { useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { geocodeAddress, Coordinates } from '@/lib/mapUtils';
import { toast } from 'sonner';

export interface SearchBarProps {
  onSearch: (coordinates: Coordinates) => Promise<void>;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [searchValue, setSearchValue] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchValue.trim()) return;
    
    try {
      const coordinates = await geocodeAddress(searchValue);
      await onSearch(coordinates);
      toast.success(`Ubicación encontrada: ${searchValue}`);
    } catch (error) {
      console.error('Error searching location:', error);
      toast.error('No se pudo encontrar la ubicación');
    }
  };

  return (
    <div className="bg-background p-4 border-b">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-grow">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Buscar ubicación (ej. Barcelona, Sagrada Familia)"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button 
          type="submit" 
          disabled={isLoading}
          className="gap-2"
        >
          <MapPin className="h-4 w-4" />
          {isLoading ? 'Cargando...' : 'Buscar'}
        </Button>
      </form>
    </div>
  );
};

export default SearchBar;
