
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { geocodeAddress, Coordinates } from '@/lib/mapUtils';

interface SearchBarProps {
  onSearch: (location: Coordinates) => void;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, isLoading }) => {
  const [address, setAddress] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address.trim()) {
      toast.error('Por favor, introduce una dirección');
      return;
    }
    
    try {
      const coordinates = await geocodeAddress(address);
      onSearch(coordinates);
      toast.success(`Mapa generado para: ${address}`);
    } catch (error) {
      toast.error('Error al buscar la ubicación');
      console.error(error);
    }
  };

  return (
    <form 
      onSubmit={handleSearch} 
      className="flex w-full max-w-sm items-center space-x-2"
    >
      <Input
        type="text"
        placeholder="Introduce una dirección..."
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        className="flex-1"
        disabled={isLoading}
      />
      <Button type="submit" disabled={isLoading}>
        {isLoading ? 'Cargando...' : 'Buscar'}
      </Button>
    </form>
  );
};

export default SearchBar;
