
import React, { useState } from 'react';
<<<<<<< HEAD
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
      // Add España/Spain if not already included to focus on Spanish cities
      let searchQuery = searchValue;
      if (!searchQuery.toLowerCase().includes('españa') && 
          !searchQuery.toLowerCase().includes('spain') &&
          !searchQuery.toLowerCase().includes('espana')) {
        searchQuery = `${searchQuery}, España`;
      }
      
      const coordinates = await geocodeAddress(searchQuery);
      await onSearch(coordinates);
      toast.success(`Ubicación encontrada: ${searchValue}`);
    } catch (error) {
      console.error('Error searching location:', error);
      toast.error('No se pudo encontrar la ubicación. Intenta con otra dirección o especificar más (ej: Calle Mayor, Madrid)');
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex-grow">
      <div className="relative w-full">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Buscar ciudad o calle..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
          className="pl-7 h-8 text-sm w-full pr-2"
        />
      </div>
    </form>
=======
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { searchLocation } from '@/lib/mapUtils';
import { toast } from 'sonner';

interface SearchBarProps {
  onLocationSelect: (location: any) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onLocationSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isResultsVisible, setIsResultsVisible] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      toast.error("Por favor, introduce una ubicación");
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await searchLocation(query);
      setResults(searchResults);
      setIsResultsVisible(true);
      
      if (searchResults.length === 0) {
        toast.warning("No se encontraron resultados. Intenta una búsqueda más específica.");
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Error al buscar la ubicación");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (location: any) => {
    onLocationSelect(location);
    setIsResultsVisible(false);
    setResults([]);
    toast.success(`Ubicación seleccionada: ${location.display_name}`);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Buscar ubicación en España..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="w-full"
        />
        <Button 
          onClick={handleSearch} 
          disabled={isSearching}
          className="shrink-0"
        >
          <Search className="h-4 w-4 mr-2" />
          {isSearching ? 'Buscando...' : 'Buscar'}
        </Button>
      </div>

      {isResultsVisible && results.length > 0 && (
        <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          <ul className="py-1">
            {results.map((result, index) => (
              <li 
                key={index} 
                className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                onClick={() => handleSelectLocation(result)}
              >
                {result.display_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
>>>>>>> 81a8006f4dac1984b32564888a49dfbab218c3e5
  );
};

export default SearchBar;
