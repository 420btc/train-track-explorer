
import React, { useState } from 'react';
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
  );
};

export default SearchBar;
