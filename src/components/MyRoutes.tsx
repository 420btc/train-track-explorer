import React from 'react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Coordinates } from '@/lib/mapUtils';
import { MapPin, Clock, Calendar } from 'lucide-react';

interface RouteHistory {
  id: string;
  name: string;
  coordinates: Coordinates;
  timestamp: number;
  description?: string;
}

interface MyRoutesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRouteSelect: (coordinates: Coordinates) => void;
}

const MyRoutes: React.FC<MyRoutesProps> = ({ open, onOpenChange, onRouteSelect }) => {
  // Obtener las rutas guardadas del almacenamiento local
  const [savedRoutes, setSavedRoutes] = React.useState<RouteHistory[]>([]);
  
  React.useEffect(() => {
    // Cargar rutas guardadas del localStorage
    const loadSavedRoutes = () => {
      try {
        const savedRoutesJson = localStorage.getItem('metroEspanol_savedRoutes');
        if (savedRoutesJson) {
          const routes = JSON.parse(savedRoutesJson) as RouteHistory[];
          // Ordenar por fecha más reciente
          routes.sort((a, b) => b.timestamp - a.timestamp);
          setSavedRoutes(routes.slice(0, 10)); // Mostrar solo las 10 más recientes
        }
      } catch (error) {
        console.error('Error al cargar rutas guardadas:', error);
      }
    };
    
    loadSavedRoutes();
  }, [open]); // Recargar cuando se abre el diálogo
  
  // Formatear fecha para mostrar
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Mis Rutas</DialogTitle>
        </DialogHeader>
        
        {savedRoutes.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted-foreground">No tienes rutas guardadas todavía.</p>
            <p className="text-sm mt-2">Explora nuevas ubicaciones para guardarlas automáticamente aquí.</p>
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {savedRoutes.map((route) => (
              <div 
                key={route.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/10 transition-colors cursor-pointer"
                onClick={() => {
                  onRouteSelect(route.coordinates);
                  onOpenChange(false);
                }}
              >
                <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                
                <div className="flex-grow min-w-0">
                  <h3 className="font-medium truncate">{route.name}</h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(route.timestamp)}
                    </span>
                    <span className="flex items-center">
                      <MapPin className="h-3 w-3 mr-1" />
                      {route.coordinates.lat.toFixed(4)}, {route.coordinates.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="flex-shrink-0"
                >
                  Cargar
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MyRoutes;
